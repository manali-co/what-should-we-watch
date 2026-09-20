"""Sign-in, refresh rotation, and logout."""
from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

from fastapi import APIRouter, Request, Response

from ..deps import Deps
from ..errors import AppError
from ..models import AppleAuthIn, GoogleAuthIn, LogoutIn, RefreshIn, TokenPair
from ..repositories import UsersRepo
from ._common import deps_of

router = APIRouter(tags=["auth"])


def _issue_pair(deps: Deps, user_id: str, family: str | None = None) -> TokenPair:
    access = deps.signer.issue_access(user_id)
    raw, digest = deps.signer.new_refresh()
    family = family or uuid.uuid4().hex
    expires = (datetime.now(UTC) + timedelta(days=deps.settings.refresh_ttl_days)).isoformat()
    deps.tokens_repo.store(digest, user_id, family, expires)
    return TokenPair(access_token=access, refresh_token=raw, expires_in=deps.signer.access_ttl)


def _sign_in(deps: Deps, provider: str, subject: str, name: str | None) -> TokenPair:
    user = deps.users.find_by_provider(provider, subject)
    if user is None:
        user = UsersRepo.new(provider, subject, name)
        deps.users.upsert(user)
    return _issue_pair(deps, user.id)


@router.post("/auth/apple", response_model=TokenPair)
async def apple(body: AppleAuthIn, request: Request) -> TokenPair:
    deps = deps_of(request)
    ident = deps.verify_apple(body.identity_token, deps.settings.apple_bundle_ids, deps.apple_jwks)
    return _sign_in(deps, "apple", ident.subject, body.name or ident.name)


@router.post("/auth/google", response_model=TokenPair)
async def google(body: GoogleAuthIn, request: Request) -> TokenPair:
    deps = deps_of(request)
    ident = deps.verify_google(body.id_token, deps.settings.google_client_ids, deps.google_jwks)
    return _sign_in(deps, "google", ident.subject, ident.name)


@router.post("/auth/refresh", response_model=TokenPair)
async def refresh(body: RefreshIn, request: Request) -> TokenPair:
    deps = deps_of(request)
    digest = deps.signer.hash_refresh(body.refresh_token)
    # The refresh token does not carry the user id; find its row by scanning families is not
    # needed because we store hash as id partitioned by user. We look it up via the access-less
    # path: the client also holds the user via the access token, but refresh must work alone, so
    # we store a reverse lookup keyed by hash in the same container (id == hash, pk == userId).
    row = _find_refresh(deps, digest)
    if row is None:
        raise AppError("session_expired", "Sign in again.", 401)
    user_id = row["userId"]
    if row.get("usedAt") is not None:
        deps.tokens_repo.revoke_family(row["family"], user_id)
        raise AppError("session_expired", "Sign in again.", 401)
    deps.tokens_repo.mark_used(digest, user_id)
    return _issue_pair(deps, user_id, family=row["family"])


@router.post("/auth/logout", status_code=204)
async def logout(body: LogoutIn, request: Request) -> Response:
    deps = deps_of(request)
    digest = deps.signer.hash_refresh(body.refresh_token)
    row = _find_refresh(deps, digest)
    if row is not None:
        deps.tokens_repo.revoke_family(row["family"], row["userId"])
    return Response(status_code=204)


def _find_refresh(deps: Deps, digest: str) -> dict[str, Any] | None:
    # tokens_repo.get requires the user id (partition). Refresh must work with only the token, so
    # we query cross-partition by id. The repo exposes a helper for this.
    return deps.tokens_repo.find_by_hash(digest)
