"""Catalog deck: LLM-ranked when moods are given, popularity fallback otherwise."""
from __future__ import annotations

from fastapi import APIRouter, Query, Request

from ._common import deps_of

router = APIRouter(tags=["catalog"])


@router.get("/catalog/deck")
async def deck(
    request: Request,
    country: str = Query("us"),
    services: str = Query(""),
    moods: str = Query(""),
    limit: int = Query(10, ge=1, le=20),
) -> dict[str, list[dict[str, object]]]:
    deps = deps_of(request)
    svc = [s for s in services.split(",") if s]
    mood_list = [m for m in moods.split(",") if m]
    if mood_list and deps.recs is not None:
        try:
            films = deps.recs.deck(country.lower(), svc, mood_list, limit)
            if films:
                return {"films": films}
        except Exception:  # noqa: BLE001 - never fail the deck; fall back to popularity
            pass
    films = deps.catalog.deck(country.lower(), svc, limit)
    return {"films": films}
