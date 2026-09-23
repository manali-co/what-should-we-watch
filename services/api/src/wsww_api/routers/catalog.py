"""Personalised deck: mood + moment + taste + history, LLM-ranked over vector search.

Identity is a per-device id header (X-Device-Id) for now; it becomes the real
user id once Apple/Google sign-in ships. With no device id or no recs engine, it
degrades to an anonymous popularity deck."""
from __future__ import annotations

import logging

from fastapi import APIRouter, Query, Request

from ._common import deps_of

router = APIRouter(tags=["catalog"])
# The recs paths never fail the request (they fall back), but the failure MUST be visible
# in App Insights — silent fallbacks are how deck-intelligence bugs went unnoticed.
log = logging.getLogger("wsww.catalog")


def _identity(request: Request) -> str:
    """A stable id for personalisation: the verified Clerk user when signed in,
    else the device id. Namespaced so the two never collide."""
    deps = deps_of(request)
    auth = request.headers.get("authorization", "")
    if auth.lower().startswith("bearer ") and deps.clerk_jwks is not None:
        from ..auth.clerk import verify_clerk_token
        try:
            sub = verify_clerk_token(auth.split(" ", 1)[1], deps.clerk_jwks)
            return "clerk:" + sub
        except Exception:  # noqa: BLE001 - bad token -> fall back to device id
            pass
    dev = request.headers.get("x-device-id", "").strip()[:64]
    return "dev:" + dev if dev else ""


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
    device = _identity(request)

    if mood_list and deps.recs is not None:
        from ..recs_engine import DeckRequest, Moment

        taste_notes = deps.taste.get_notes(device) if device else ""
        recent = deps.decisions.recent(device, 80) if device else []
        req = DeckRequest(
            country=country.lower(), services=svc, moods=mood_list, limit=limit,
            moment=Moment(
                daypart=daypart, weekday=weekday, is_weekend=is_weekend,
                season=season, holiday=holiday,
            ),
            company=company, length=length, taste_notes=taste_notes, recent_decisions=recent,
        )
        try:
            result = deps.recs.deck(req)
            if result.films:
                if device and result.taste_notes and result.taste_notes != taste_notes:
                    deps.taste.set_notes(device, result.taste_notes)
                return {"films": result.films}
        except Exception:  # noqa: BLE001 - never fail the deck; fall back to popularity
            log.exception("deck recs failed (moods=%s) — falling back to popularity", mood_list)

    return {"films": deps.catalog.deck(country.lower(), svc, limit)}


@router.post("/catalog/decisions", status_code=204)
async def record_decision(request: Request) -> None:
    deps = deps_of(request)
    device = _identity(request)
    if not device:
        return None
    body = await request.json()
    deps.decisions.add(device, {
        "titleId": body.get("titleId"), "title": body.get("title"),
        "action": body.get("action"), "reaction": body.get("reaction"),
        "moods": body.get("moods") or [],
        "moment": body.get("moment") or {},
    })
    return None


@router.get("/catalog/taste")
async def taste(request: Request) -> dict[str, object]:
    """The viewer's real taste: the model's running notes plus honest decision
    tallies. Empty everything for a brand-new (or guest, no device) viewer, so the
    UI shows a truthful cold-start rather than invented patterns."""
    empty = {"total": 0, "actions": {"like": 0, "maybe": 0, "dislike": 0, "watched": 0},
             "reactions": {"loved": 0, "okay": 0, "disliked": 0}, "topMoods": [], "patterns": []}
    deps = deps_of(request)
    device = _identity(request)
    if not device:
        return {"notes": "", **empty}
    return {
        "notes": deps.taste.get_notes(device),
        **deps.decisions.stats(device),
        "patterns": deps.decisions.patterns(device),
    }


@router.post("/catalog/results")
async def results(request: Request) -> dict[str, object]:
    """Rank a kept shortlist into tonight's decision. Solo unless `participants`
    are supplied (group session), in which case it ranks for group satisfaction.
    Falls back to the given order if there's no engine or the model is unusable."""
    deps = deps_of(request)
    device = _identity(request)
    body = await request.json()
    kept = body.get("kept") or []
    if not kept or deps.recs is None:
        return {"films": kept, "verdict": ""}

    from ..recs_engine import Moment, Participant, ShortlistRequest

    mo = body.get("moment") or {}
    participants = [
        Participant(name=p.get("name") or "", taste_notes=p.get("tasteNotes") or "",
                    votes=p.get("votes") or {})
        for p in (body.get("participants") or [])
    ]
    req = ShortlistRequest(
        kept=kept, moods=body.get("moods") or [],
        moment=Moment(daypart=mo.get("daypart") or "", weekday=mo.get("weekday") or "",
                      is_weekend=bool(mo.get("isWeekend")), season=mo.get("season") or ""),
        company=body.get("company") or "", length=body.get("length") or "",
        taste_notes=deps.taste.get_notes(device) if device else "",
        participants=participants,
    )
    try:
        res = deps.recs.rank_shortlist(req)
        return {"films": res.films, "verdict": res.verdict}
    except Exception:  # noqa: BLE001 - never fail results; hand back the original order
        log.exception("results ranking failed (kept=%d, participants=%d) — kept order",
                      len(kept), len(participants))
        return {"films": kept, "verdict": ""}
