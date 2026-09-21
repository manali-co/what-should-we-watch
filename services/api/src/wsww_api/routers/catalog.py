"""Personalised deck: mood + moment + taste + history, LLM-ranked over vector search.

Identity is a per-device id header (X-Device-Id) for now; it becomes the real
user id once Apple/Google sign-in ships. With no device id or no recs engine, it
degrades to an anonymous popularity deck."""
from __future__ import annotations

from fastapi import APIRouter, Query, Request

from ._common import deps_of

router = APIRouter(tags=["catalog"])


def _device_id(request: Request) -> str:
    return request.headers.get("x-device-id", "").strip()[:64]


@router.get("/catalog/deck")
async def deck(
    request: Request,
    country: str = Query("us"),
    services: str = Query(""),
    moods: str = Query(""),
    company: str = Query(""),
    length: str = Query(""),
    daypart: str = Query(""),
    weekday: str = Query(""),
    is_weekend: bool = Query(False),
    season: str = Query(""),
    holiday: str = Query(""),
    limit: int = Query(10, ge=1, le=20),
) -> dict[str, list[dict[str, object]]]:
    deps = deps_of(request)
    svc = [s for s in services.split(",") if s]
    mood_list = [m for m in moods.split(",") if m]
    device = _device_id(request)

    if mood_list and deps.recs is not None:
        from ..recs_engine import DeckRequest, Moment

        taste_notes = deps.taste.get_notes(device) if device else ""
        recent = deps.decisions.recent(device, 80) if device else []
        req = DeckRequest(
            country=country.lower(), services=svc, moods=mood_list, limit=limit,
            moment=Moment(daypart=daypart, weekday=weekday, is_weekend=is_weekend, season=season, holiday=holiday),
            company=company, length=length, taste_notes=taste_notes, recent_decisions=recent,
        )
        try:
            result = deps.recs.deck(req)
            if result.films:
                if device and result.taste_notes and result.taste_notes != taste_notes:
                    deps.taste.set_notes(device, result.taste_notes)
                return {"films": result.films}
        except Exception:  # noqa: BLE001 - never fail the deck; fall back to popularity
            pass

    return {"films": deps.catalog.deck(country.lower(), svc, limit)}


@router.post("/catalog/decisions", status_code=204)
async def record_decision(request: Request) -> None:
    deps = deps_of(request)
    device = _device_id(request)
    if not device:
        return None
    body = await request.json()
    deps.decisions.add(device, {
        "titleId": body.get("titleId"), "title": body.get("title"),
        "action": body.get("action"), "reaction": body.get("reaction"),
        "moods": body.get("moods") or [],
    })
    return None
