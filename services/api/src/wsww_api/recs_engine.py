# VENDORED from packages/recs/src/wsww_recs/engine.py (canonical + tested there).
# Kept here so the Functions deploy (which zips only services/api) can import it.
"""Recommendation engine: mood + context + history -> ranked, personalised deck.

Signals used, in order of weight:
  - this session's moods and the moment (time of day, weekday/weekend, season, holiday)
  - the running taste profile (a note the model rewrote last time)
  - the viewer's recent decisions (liked / passed / watched-and-rated)
  - vector similarity of the catalogue to the mood query

Kept free of Azure SDK imports; the caller injects a catalog container, an
embedder and a ranker so the prompt and JSON handling are unit-testable.
"""
from __future__ import annotations

import json
import random
import time
from dataclasses import dataclass, field
from typing import Any, Protocol


class Container(Protocol):
    def query_items(self, query: str, **kwargs: Any) -> Any: ...


class Embedder(Protocol):
    def embed(self, text: str) -> list[float]: ...


class Ranker(Protocol):
    def rank(self, prompt: str) -> str: ...


@dataclass
class Moment:
    daypart: str = ""       # morning | afternoon | evening | late night
    weekday: str = ""
    is_weekend: bool = False
    season: str = ""        # winter | spring | summer | autumn
    holiday: str = ""       # e.g. "Halloween run-up" or ""


@dataclass
class DeckRequest:
    country: str
    services: list[str]
    moods: list[str]
    limit: int = 10
    moment: Moment = field(default_factory=Moment)
    company: str = ""       # e.g. "the two of us"
    length: str = ""        # e.g. "under 2 hours"
    taste_notes: str = ""
    recent_decisions: list[dict[str, Any]] = field(default_factory=list)


@dataclass
class DeckResult:
    films: list[dict[str, Any]]
    taste_notes: str        # possibly-updated running notes to persist


def _leaving_in_days(expires_on: Any) -> int | None:
    if not expires_on:
        return None
    try:
        days = (int(expires_on) - int(time.time())) // 86400
    except (TypeError, ValueError):
        return None
    return days if 0 <= days <= 60 else None


def _decisions_block(decisions: list[dict[str, Any]]) -> str:
    if not decisions:
        return "(no history yet — this is early data)"
    lines = []
    for d in decisions[:80]:
        bit = f"{d.get('action')}: {d.get('title')}"
        if d.get("reaction"):
            bit += f" (they said {d['reaction']})"
        if d.get("moods"):
            bit += f" [mood: {', '.join(d['moods'][:3])}]"
        lines.append(bit)
    return "\n".join(lines)


def build_prompt(req: DeckRequest, candidates: list[dict[str, Any]]) -> str:
    lines = [
        f"{i}. {c['title']} ({c.get('year')}) — {', '.join(c.get('genres') or [])} — "
        f"on {c.get('_service')} — {(c.get('overview') or '')[:220]}"
        for i, c in enumerate(candidates)
    ]
    m = req.moment
    moment = (
        f"{m.daypart or 'unknown time'} on {m.weekday or 'a day'}"
        f"{' (weekend)' if m.is_weekend else ''}, {m.season or 'no season'}"
        f"{', ' + m.holiday if m.holiday else ''}"
    )
    return f"""You are the taste engine inside one person's movie-night app. Choose and rank the {req.limit} best films for THIS viewer, right now. Think about what separates their 'like' from their 'pass'.

RIGHT NOW: {moment}. Watching: {req.company or 'unspecified'}. Time they have: {req.length or 'any'}.
MOODS THEY PICKED: {', '.join(req.moods) or 'open to anything'}

YOUR RUNNING NOTES ON THIS VIEWER (you wrote these last time):
{req.taste_notes or '(none yet)'}

THEIR RECENT DECISIONS (newest first; weigh recent heavily, and weigh how the moment matched):
{_decisions_block(req.recent_decisions)}

CANDIDATES (already filtered to films they can actually stream tonight):
{chr(10).join(lines)}

Rules:
- Pick exactly {req.limit}: about 7 squarely right for this viewer and moment, 2 stretches their patterns suggest they'd enjoy but wouldn't find alone, and 1 wildcard (set "wildcard": true).
- Never invent films; pick only by index from the list.
- "why": at most 24 words, second person, tied to the mood, the moment, or something in their history. No spoilers, no generic praise.
- "taste_notes": rewrite your running notes in at most 120 words. Durable patterns only — what they love, what they pass on, tendencies by time of day, weekday, season, mood or company. Say "early data" where thin.

Reply with ONLY this JSON:
{{"picks":[{{"index":0,"why":"...","wildcard":false}}],"taste_notes":"..."}}"""


class RecsEngine:
    def __init__(self, container: Container, embedder: Embedder, ranker: Ranker) -> None:
        self._c = container
        self._embed = embedder
        self._rank = ranker

    def _candidates(self, country: str, services: list[str], vector: list[float], k: int) -> list[dict[str, Any]]:
        rows = list(
            self._c.query_items(
                query=(
                    "SELECT TOP @k c.id, c.title, c.year, c.runtimeMin, c.genres, c.overview, "
                    "c.availability, c.poster, c.rating FROM c "
                    "WHERE c.country = @country ORDER BY VectorDistance(c.embedding, @v)"
                ),
                parameters=[
                    {"name": "@k", "value": k},
                    {"name": "@country", "value": country},
                    {"name": "@v", "value": vector},
                ],
                partition_key=country,
            )
        )
        wanted = set(services) if services else None
        out: list[dict[str, Any]] = []
        for r in rows:
            avail = r.get("availability") or []
            if wanted is not None:
                avail = [a for a in avail if a.get("service") in wanted]
            sub = next((a for a in avail if a.get("type") == "subscription"), None) or (avail[0] if avail else None)
            if sub is None or not (r.get("poster") or {}).get("url"):
                continue
            r["_service"] = sub.get("service")
            r["_link"] = sub.get("link") or ""
            r["_leaving"] = _leaving_in_days(sub.get("expiresOn"))
            out.append(r)
        return out

    def _card(self, c: dict[str, Any], why: str, wildcard: bool) -> dict[str, Any]:
        return {
            "id": c["id"], "title": c["title"], "year": c.get("year"),
            "runtimeMin": c.get("runtimeMin"), "service": c["_service"], "link": c["_link"],
            "leavingInDays": c["_leaving"], "posterUrl": (c.get("poster") or {}).get("url"),
            "why": why, "wildcard": wildcard,
        }

    def deck(self, req: DeckRequest) -> DeckResult:
        vector = self._embed.embed(", ".join(req.moods) or "a good film tonight")
        candidates = self._candidates(req.country, req.services, vector, k=40)
        if not candidates:
            return DeckResult(films=[], taste_notes=req.taste_notes)
        data = _parse(self._rank.rank(build_prompt(req, candidates)))
        picks = data.get("picks") if isinstance(data, dict) else None
        cards: list[dict[str, Any]] = []
        for p in picks or []:
            i = p.get("index")
            if isinstance(i, int) and 0 <= i < len(candidates):
                cards.append(self._card(candidates[i], p.get("why") or "", bool(p.get("wildcard"))))
            if len(cards) >= req.limit:
                break
        if not cards:  # unusable ranking; fall back to nearest vector hits
            random.shuffle(candidates)
            cards = [self._card(c, (c.get("overview") or "")[:150], False) for c in candidates[: req.limit]]
        notes = (data.get("taste_notes") if isinstance(data, dict) else "") or req.taste_notes
        return DeckResult(films=cards, taste_notes=str(notes)[:1200])


def _parse(raw: str) -> dict[str, Any]:
    for candidate in (raw, _between_braces(raw)):
        if not candidate:
            continue
        try:
            data = json.loads(candidate)
            if isinstance(data, dict):
                return data
        except json.JSONDecodeError:
            continue
    return {}


def _between_braces(t: str) -> str:
    a, b = t.find("{"), t.rfind("}")
    return t[a : b + 1] if a >= 0 and b > a else ""
