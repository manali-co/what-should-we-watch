"""Read side of the catalog: assemble a deck of real, available films.

Ranking here is deliberately simple (availability filter + light shuffle); the
personalised LLM ranking arrives with the recommendation engine. What matters
now is that every card is a real film actually streaming in the country."""
from __future__ import annotations

import random
import time
from typing import Any

from ..db import ContainerLike


def _leaving_in_days(expires_on: Any) -> int | None:
    if not expires_on:
        return None
    try:
        secs = int(expires_on) - int(time.time())
    except (TypeError, ValueError):
        return None
    days = secs // 86400
    return days if 0 <= days <= 60 else None


def _is_expired(expires_on: Any) -> bool:
    """True if a known availability window has already ended (title left the service)."""
    if not expires_on:
        return False
    try:
        return int(expires_on) < int(time.time())
    except (TypeError, ValueError):
        return False


class CatalogRepo:
    def __init__(self, container: ContainerLike) -> None:
        self._c = container

    def deck(self, country: str, services: list[str], limit: int = 10) -> list[dict[str, Any]]:
        # Project ONLY the display fields. `SELECT *` dragged each doc's 3072-float embedding
        # vector (and vibeLine) across the wire for every film in the country — tens of MB per
        # deck request, and 6–13s of latency — all of it discarded here. The ranked/recs path
        # keeps the embeddings it needs; this popularity read never touches them.
        rows = self._c.query(
            "SELECT c.id, c.title, c.year, c.runtimeMin, c.rating, c.overview, "
            "c.poster, c.availability FROM c WHERE c.country = @country",
            [{"name": "@country", "value": country}],
            pk=country,
        )
        wanted = set(services) if services else None
        cards: list[dict[str, Any]] = []
        for r in rows:
            avail = r.get("availability") or []
            if wanted is not None:
                avail = [a for a in avail if a.get("service") in wanted]
            sub = next((a for a in avail if a.get("type") == "subscription"), None) or (
                avail[0] if avail else None
            )
            if sub is None or _is_expired(sub.get("expiresOn")):
                continue
            # No-poster films stay in the deck (the app renders a purpose-built card for them).
            poster = (r.get("poster") or {}).get("url") or ""
            overview = r.get("overview") or ""
            cards.append(
                {
                    "id": r["id"],
                    "title": r["title"],
                    "year": r.get("year"),
                    "runtimeMin": r.get("runtimeMin"),
                    "service": sub.get("service"),
                    "link": sub.get("link") or "",
                    "leavingInDays": _leaving_in_days(sub.get("expiresOn")),
                    "posterUrl": poster or None,
                    "why": overview[:160] + ("…" if len(overview) > 160 else ""),
                    "rating": r.get("rating"),
                }
            )
        # popularity-ish: higher rating first, then a little shuffle for variety
        cards.sort(key=lambda c: (c.get("rating") or 0), reverse=True)
        top = cards[: limit * 4]
        random.shuffle(top)
        return top[:limit]
