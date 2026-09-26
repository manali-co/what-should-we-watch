"""In-app feedback and bug reports. Open to guests and members alike — a
friend testing a TestFlight build must be able to report a bug without an
account. When a valid session is present we attach the user id; we never
require one, and we never fail the submission on a bad token."""
from __future__ import annotations

import logging

from fastapi import APIRouter, Request

from ..deps import Deps
from ..errors import AppError
from ..models import FeedbackIn, FeedbackOut
from ._common import deps_of

router = APIRouter(tags=["feedback"])
log = logging.getLogger("wsww")

_TYPES = {"bug", "idea", "other"}


def _optional_user_id(request: Request, deps: Deps) -> str | None:
    """Best-effort: the signed-in user's id, or None. Never raises — an expired
    or malformed token just means the report is filed as a guest."""
    header = request.headers.get("authorization", "")
    if not header.lower().startswith("bearer "):
        return None
    try:
        user_id = deps.signer.verify_access(header.split(" ", 1)[1])
    except Exception:
        return None
    user = deps.users.get(user_id)
    if user is None or user.deleted_at is not None:
        return None
    return user_id


@router.post("/feedback", response_model=FeedbackOut, status_code=201)
async def submit_feedback(body: FeedbackIn, request: Request) -> FeedbackOut:
    deps = deps_of(request)
    kind = body.type if body.type in _TYPES else "other"
    message = body.message.strip()
    if not message:
        raise AppError("invalid_feedback", "Say a little about what happened.", 400)
    user_id = _optional_user_id(request, deps)
    fid = deps.feedback.add(
        kind=kind,
        message=message,
        user_id=user_id,
        app_version=body.app_version,
        platform=body.platform,
        device=body.device,
    )
    # A searchable, structured line so reports surface in App Insights / the
    # telemetry workbook without opening Cosmos. The message body is NOT logged
    # (it may hold personal detail); it lives in Cosmos for triage.
    log.info(
        "feedback_submitted id=%s type=%s user=%s platform=%s appVersion=%s chars=%d",
        fid, kind, user_id or "guest", body.platform or "?",
        body.app_version or "?", len(message),
    )
    return FeedbackOut(id=fid, ok=True)
