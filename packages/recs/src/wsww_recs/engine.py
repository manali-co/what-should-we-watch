"""Recommendation engine: mood -> embedding -> vector search -> LLM ranking.

Kept free of Azure SDK imports at module load; the caller injects a catalog
container (anything with query_items) and an OpenAI client. This makes the
ranking prompt and JSON handling unit-testable without a cloud.
"""
from __future__ import annotations

import json
import random
import time
from typing import Any, Protocol


class Container(Protocol):
    def query_items(self, query: str, **kwargs: Any) -> Any: ...


class Embedder(Protocol):
    def embed(self, text: str) -> list[float]: ...


class Ranker(Protocol):
    def rank(self, prompt: str) -> str: ...


def _leaving_in_days(expires_on: Any) -> int | None:
    if not expires_on:
        return None
    try:
        days = (int(expires_on) - int(time.time())) // 86400
    except (TypeError, ValueError):
        return None
    return days if 0 <= days <= 60 else None


def build_prompt(moods: list[str], candidates: list[dict[str, Any]], limit: int) -> str:
    lines = []
    for i, c in enumerate(candidates):
        lines.append(
            f"{i}. {c['title']} ({c.get('year')}) — {', '.join(c.get('genres') or [])} — "
            f"on {c.get('_service')} — {(c.get('overview') or '')[:220]}"
        )
    catalogue = "\n".join(lines)
    return f"""You are the taste engine inside a movie-night app. The viewer wants something for this mood: {', '.join(moods)}.

Choose the {limit} best films from the numbered list below and rank them. Prefer films that truly fit the mood. Include one pleasant surprise as a "wildcard".

For each pick write a "why" of at most 24 words, in second person, tied to the mood and to something concrete about the film. No spoilers, no generic praise. Never invent films; only pick from the list by their index.

CANDIDATES:
{catalogue}

Reply with ONLY this JSON, nothing else:
{{"picks":[{{"index":0,"why":"...","wildcard":false}}]}}"""


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

    def deck(self, country: str, services: list[str], moods: list[str], limit: int = 10) -> list[dict[str, Any]]:
        vector = self._embed.embed(", ".join(moods) or "a good film tonight")
        candidates = self._candidates(country, services, vector, k=40)
        if not candidates:
            return []
        raw = self._rank.rank(build_prompt(moods, candidates, limit))
        picks = _parse_picks(raw)
        cards: list[dict[str, Any]] = []
        for p in picks:
            i = p.get("index")
            if not isinstance(i, int) or not (0 <= i < len(candidates)):
                continue
            c = candidates[i]
            cards.append(
                {
                    "id": c["id"], "title": c["title"], "year": c.get("year"),
                    "runtimeMin": c.get("runtimeMin"), "service": c["_service"],
                    "link": c["_link"], "leavingInDays": c["_leaving"],
                    "posterUrl": (c.get("poster") or {}).get("url"),
                    "why": p.get("why") or "", "wildcard": bool(p.get("wildcard")),
                }
            )
            if len(cards) >= limit:
                break
        if not cards:  # LLM produced nothing usable; fall back to top vector hits
            random.shuffle(candidates)
            for c in candidates[:limit]:
                cards.append({
                    "id": c["id"], "title": c["title"], "year": c.get("year"),
                    "runtimeMin": c.get("runtimeMin"), "service": c["_service"], "link": c["_link"],
                    "leavingInDays": c["_leaving"], "posterUrl": (c.get("poster") or {}).get("url"),
                    "why": (c.get("overview") or "")[:150], "wildcard": False,
                })
        return cards


def _parse_picks(raw: str) -> list[dict[str, Any]]:
    for candidate in (raw, _between_braces(raw)):
        if not candidate:
            continue
        try:
            data = json.loads(candidate)
            picks = data.get("picks")
            if isinstance(picks, list):
                return picks
        except (json.JSONDecodeError, AttributeError):
            continue
    return []


def _between_braces(t: str) -> str:
    a, b = t.find("{"), t.rfind("}")
    return t[a : b + 1] if a >= 0 and b > a else ""
