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


@dataclass
class Participant:
    """One person in a group session: their durable taste and tonight's votes."""
    name: str
    taste_notes: str = ""
    votes: dict[str, str] = field(default_factory=dict)  # filmId -> like | maybe | pass


@dataclass
class ShortlistRequest:
    """Rank the films a viewer (or a room) kept, into a decision for tonight."""
    kept: list[dict[str, Any]]              # each: {id, title, year, runtimeMin, service, action?, why?}
    moods: list[str] = field(default_factory=list)
    moment: Moment = field(default_factory=Moment)
    company: str = ""
    length: str = ""
    taste_notes: str = ""                    # solo viewer's running notes
    participants: list[Participant] = field(default_factory=list)  # non-empty => group


@dataclass
class ShortlistResult:
    films: list[dict[str, Any]]   # the kept films, reordered best-first, each with a fresh fit "why"
    verdict: str                  # one confident line naming the #1 as tonight's call


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


def _moment_str(m: Moment) -> str:
    return (
        f"{m.daypart or 'unknown time'} on {m.weekday or 'a day'}"
        f"{' (weekend)' if m.is_weekend else ''}, {m.season or 'no season'}"
        f"{', ' + m.holiday if m.holiday else ''}"
    )


def build_prompt(req: DeckRequest, candidates: list[dict[str, Any]]) -> str:
    lines = [
        f"{i}. {c['title']} ({c.get('year')}) — {', '.join(c.get('genres') or [])} — "
        f"on {c.get('_service')} — {(c.get('overview') or '')[:220]}"
        for i, c in enumerate(candidates)
    ]
    moment = _moment_str(req.moment)
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


_SHORTLIST_JSON = (
    '\n\nReply with ONLY this JSON:\n'
    '{"order":["id1","id2"],"picks":[{"id":"id1","why":"..."}],"verdict":"..."}'
)


def build_shortlist_prompt(req: ShortlistRequest) -> str:
    """Rank the kept films into a decision. Solo unless participants are given,
    in which case rank for group satisfaction (maximise the floor)."""
    films = [
        f"- {f['id']}: {f['title']} ({f.get('year')}) — {f.get('runtimeMin')} min on {f.get('service')}"
        + (f" — swiped {f['action']}" if f.get("action") else "")
        for f in req.kept
    ]
    moment = _moment_str(req.moment)

    if req.participants:
        who = "\n".join(
            f"{p.name}:\n  taste: {p.taste_notes or '(early data)'}\n  votes tonight: "
            + (", ".join(f"{fid}={v}" for fid, v in p.votes.items()) or "(didn't vote)")
            for p in req.participants
        )
        return f"""You are the taste engine settling what a GROUP watches together tonight. Rank their shared shortlist so the TOP pick satisfies EVERYONE — maximise the floor (nobody stuck with something they'd hate), not just the average. A film several people liked and nobody passed hard on beats a film one person loved and another disliked.

RIGHT NOW: {moment}. A group of {len(req.participants)}.
MOODS IN THE BLEND: {', '.join(req.moods) or 'open to anything'}

THE PEOPLE (durable taste + how they voted tonight):
{who}

THE SHORTLIST (films the room kept):
{chr(10).join(films)}

Rules:
- "order": every shortlist id, best-for-the-group first.
- "picks": for EACH id a "why" of at most 22 words. For the #1, name how it works across the different people (e.g. "cosy enough for Jo, strange enough for Sam, short enough for Ana").
- "verdict": one confident line naming the #1 as the group's watch tonight, at most 22 words.
- Use only ids from the shortlist; never invent a film.{_SHORTLIST_JSON}"""

    return f"""You are the taste engine calling what ONE viewer should watch tonight, from the films they kept. Rank so #1 is the single best call for THIS viewer, right now — the strongest fit of their taste, tonight's mood, and the moment. Break ties toward what leaves the service soonest and toward what their history says they'd actually finish.

RIGHT NOW: {moment}. Watching: {req.company or 'solo'}. Time they have: {req.length or 'any'}.
MOODS TONIGHT: {', '.join(req.moods) or 'open to anything'}

YOUR RUNNING NOTES ON THIS VIEWER:
{req.taste_notes or '(early data)'}

THE SHORTLIST (films they kept, with how they swiped):
{chr(10).join(films)}

Rules:
- "order": every shortlist id, best-first.
- "picks": for EACH id a "why" of at most 22 words, second person, tied to their taste, the mood, or the moment. No generic praise, no spoilers.
- "verdict": one confident line — the title and the reason it's tonight's one — at most 22 words.
- Use only ids from the shortlist; never invent a film.{_SHORTLIST_JSON}"""


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

    def rank_shortlist(self, req: ShortlistRequest) -> ShortlistResult:
        """Order the kept films into tonight's decision, with a fresh fit 'why' per
        film and a headline verdict. Group-aware when participants are supplied.
        Never drops a kept film; on an unusable ranking, keeps the original order."""
        if not req.kept:
            return ShortlistResult(films=[], verdict="")
        data = _parse(self._rank.rank(build_shortlist_prompt(req)))
        order = data.get("order") if isinstance(data, dict) else None
        whys = (
            {p.get("id"): p.get("why") for p in (data.get("picks") or []) if isinstance(p, dict)}
            if isinstance(data, dict)
            else {}
        )
        by_id = {f["id"]: f for f in req.kept}
        films: list[dict[str, Any]] = []
        seen: set[str] = set()
        for fid in order or []:
            f = by_id.get(fid)
            if f is not None and fid not in seen:
                films.append({**f, "why": whys.get(fid) or f.get("why", "")})
                seen.add(fid)
        for f in req.kept:  # any film the model omitted keeps its place at the end
            if f["id"] not in seen:
                films.append(f)
        verdict = str(data.get("verdict", "")) if isinstance(data, dict) else ""
        return ShortlistResult(films=films, verdict=verdict[:200])


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
