"""In-app feedback and bug reports. Partitioned by a constant so the whole,
low-volume stream is cheap to read back for triage; the userId (or None for a
guest) is kept as a field, never as the partition key."""
from __future__ import annotations

import time
import uuid
from typing import Any

from ..db import ContainerLike

_PARTITION = "feedback"


class FeedbackRepo:
    def __init__(self, container: ContainerLike) -> None:
        self._c = container

    def add(
        self,
        *,
        kind: str,
        message: str,
        user_id: str | None,
        app_version: str | None,
        platform: str | None,
        device: str | None,
    ) -> str:
        fid = "fb_" + uuid.uuid4().hex
        self._c.upsert(
            {
                "id": fid,
                "_pk": _PARTITION,
                "type": kind,          # bug | idea | other
                "message": message,
                "userId": user_id,     # None for a guest
                "appVersion": app_version,
                "platform": platform,
                "device": device,
                "at": int(time.time()),
            }
        )
        return fid

    def recent(self, limit: int = 100) -> list[dict[str, Any]]:
        rows = self._c.query(
            "SELECT * FROM c WHERE c._pk = @p",
            [{"name": "@p", "value": _PARTITION}],
            pk=_PARTITION,
        )
        rows.sort(key=lambda r: r.get("at", 0), reverse=True)
        return rows[:limit]
