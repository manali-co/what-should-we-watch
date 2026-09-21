"""Per-viewer swipe decisions, partitioned by userId (or device id for now)."""
from __future__ import annotations

import time
import uuid
from typing import Any

from ..db import ContainerLike


class DecisionsRepo:
    def __init__(self, container: ContainerLike) -> None:
        self._c = container

    def add(self, user_id: str, decision: dict[str, Any]) -> None:
        self._c.upsert(
            {
                "id": "d_" + uuid.uuid4().hex,
                "_pk": user_id,
                "userId": user_id,
                "titleId": decision.get("titleId"),
                "title": decision.get("title"),
                "action": decision.get("action"),      # like | dislike | maybe | watched
                "reaction": decision.get("reaction"),  # loved | okay | disliked | None
                "moods": decision.get("moods") or [],
                "at": int(time.time()),
            }
        )

    def recent(self, user_id: str, limit: int = 80) -> list[dict[str, Any]]:
        rows = self._c.query(
            "SELECT * FROM c WHERE c.userId = @u",
            [{"name": "@u", "value": user_id}],
            pk=user_id,
        )
        rows.sort(key=lambda r: r.get("at", 0), reverse=True)
        return rows[:limit]
