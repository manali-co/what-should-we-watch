"""Public catalog endpoints (no personalisation yet)."""
from __future__ import annotations

from fastapi import APIRouter, Query, Request

from ._common import deps_of

router = APIRouter(tags=["catalog"])


@router.get("/catalog/deck")
async def deck(
    request: Request,
    country: str = Query("us"),
    services: str = Query(""),
    limit: int = Query(10, ge=1, le=20),
) -> dict[str, list[dict[str, object]]]:
    deps = deps_of(request)
    svc = [s for s in services.split(",") if s]
    films = deps.catalog.deck(country.lower(), svc, limit)
    return {"films": films}
