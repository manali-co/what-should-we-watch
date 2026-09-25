"""Profile read/update, data export, and account deletion."""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Request, Response

from ..deps import Deps
from ..errors import AppError
from ..models import MeOut, MePatch, User
from ._common import deps_of

router = APIRouter(tags=["me"])


def current_user(request: Request) -> User:
    deps: Deps = deps_of(request)
    header = request.headers.get("authorization", "")
    if not header.lower().startswith("bearer "):
        raise AppError("session_expired", "Sign in again.", 401)
    user_id = deps.signer.verify_access(header.split(" ", 1)[1])
    user = deps.users.get(user_id)
    if user is None or user.deleted_at is not None:
        raise AppError("session_expired", "Sign in again.", 401)
    return user


@router.get("/me", response_model=MeOut)
async def get_me(request: Request) -> MeOut:
    user = current_user(request)
    return MeOut(
        id=user.id, display_name=user.display_name, country=user.country,
        services=user.services, settings=user.settings,
    )


@router.patch("/me", response_model=MeOut)
async def patch_me(body: MePatch, request: Request) -> MeOut:
    deps = deps_of(request)
    user = current_user(request)
    if body.country is not None:
        user.country = body.country
    if body.services is not None:
        user.services = body.services
    if body.settings is not None:
        user.settings = body.settings
    deps.users.upsert(user)
    return MeOut(
        id=user.id, display_name=user.display_name, country=user.country,
        services=user.services, settings=user.settings,
    )


@router.get("/me/export")
async def export_me(request: Request) -> dict[str, Any]:
    """The user's own data, for portability: profile, every decision, and taste notes."""
    deps = deps_of(request)
    user = current_user(request)
    return {
        "user": user.model_dump(),
        "decisions": deps.decisions.export_for_user(user.id),
        "taste": deps.taste.export_for_user(user.id),
    }


@router.delete("/me", status_code=204)
async def delete_me(request: Request) -> Response:
    """Delete the account and the data we hold: decisions, taste, and the user's PII."""
    deps = deps_of(request)
    user = current_user(request)
    deps.decisions.purge_for_user(user.id)
    deps.taste.purge_for_user(user.id)
    deps.users.soft_delete(user.id)  # scrubs name + identity, keeps a tombstone
    # Revoke every refresh family the user holds.
    for row in deps.tokens_repo.list_for_user(user.id):
        deps.tokens_repo.revoke_family(row["family"], user.id)
    return Response(status_code=204)
