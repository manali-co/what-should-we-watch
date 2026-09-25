"""Clerk webhooks (Svix-verified).

The mobile app deletes accounts via Clerk's client-side user.delete(), which removes the
Clerk user but leaves the server-side data (decisions, taste keyed by clerk:<sub>) behind.
This handler closes that gap: on `user.deleted`, purge that user's data. Required for
App Store account-deletion + GDPR/CCPA.

Public endpoint (no bearer auth) — authenticity comes from the Svix signature over the raw
body, verified against the webhook signing secret (WSWW_CLERK_WEBHOOK_SECRET, from KV).
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import logging
import time
from typing import Any

from fastapi import APIRouter, Request, Response
from starlette.concurrency import run_in_threadpool

from ._common import deps_of

router = APIRouter(tags=["webhooks"])
log = logging.getLogger("wsww.webhooks")

_TOLERANCE_SECONDS = 300  # reject replayed/stale deliveries


def _verify_svix(secret: str, headers: Any, body: bytes) -> dict[str, Any] | None:
    """Verify a Svix signature (HMAC-SHA256 over `id.timestamp.body`) and return the parsed
    payload, or None if it doesn't check out. Implements Svix's documented scheme so we
    don't take a runtime dependency just for verification."""
    svix_id = headers.get("svix-id")
    svix_ts = headers.get("svix-timestamp")
    svix_sig = headers.get("svix-signature") or ""
    if not (svix_id and svix_ts and svix_sig):
        return None
    try:
        if abs(time.time() - int(svix_ts)) > _TOLERANCE_SECONDS:
            return None
    except (TypeError, ValueError):
        return None
    # whsec_<base64secret>
    raw_secret = secret.split("_", 1)[1] if secret.startswith("whsec_") else secret
    try:
        key = base64.b64decode(raw_secret)
    except (ValueError, TypeError):
        return None
    signed = f"{svix_id}.{svix_ts}.{body.decode('utf-8', 'replace')}".encode()
    expected = base64.b64encode(hmac.new(key, signed, hashlib.sha256).digest()).decode()
    # Header is space-separated "v1,<sig>" entries; any match is valid.
    for part in svix_sig.split():
        _, _, sig = part.partition(",")
        if sig and hmac.compare_digest(sig, expected):
            try:
                parsed = json.loads(body)
                return parsed if isinstance(parsed, dict) else None
            except json.JSONDecodeError:
                return None
    return None


@router.post("/webhooks/clerk", status_code=204)
async def clerk_webhook(request: Request) -> Response:
    deps = deps_of(request)
    secret = deps.settings.clerk_webhook_secret
    body = await request.body()
    if not secret:
        log.error("clerk webhook received but WSWW_CLERK_WEBHOOK_SECRET is not configured")
        return Response(status_code=503)
    evt = _verify_svix(secret, request.headers, body)
    if evt is None:
        log.warning("clerk webhook signature verification failed")
        return Response(status_code=400)

    if evt.get("type") == "user.deleted":
        sub = (evt.get("data") or {}).get("id")
        if not sub:
            # A user.deleted we can't act on is a real problem (data would linger) — make it
            # visible and let Clerk retry rather than silently acknowledging.
            log.warning("user.deleted webhook with no user id — cannot purge")
            return Response(status_code=400)
        uid = "clerk:" + str(sub)
        # Cosmos calls are synchronous; run off the event loop so a large purge doesn't
        # block other requests or trip the webhook's delivery timeout.
        n = await run_in_threadpool(deps.decisions.purge_for_user, uid)
        await run_in_threadpool(deps.taste.purge_for_user, uid)
        log.info("purged data for deleted clerk user (decisions=%d)", n)
    return Response(status_code=204)
