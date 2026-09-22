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
        moment = decision.get("moment") or {}
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
                # The moment the decision was made in — powers behavioural patterns
                # (what they say yes to late at night, on weekends, in winter…).
                "moment": {
                    "daypart": moment.get("daypart") or "",
                    "weekday": moment.get("weekday") or "",
                    "isWeekend": bool(moment.get("isWeekend")
                                      or moment.get("is_weekend")),
                    "season": moment.get("season") or "",
                },
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

    def stats(self, user_id: str) -> dict[str, Any]:
        """Real, honest tallies for the Taste screen — no fabricated data.
        Cold start (no decisions) returns zeroes so the UI can say 'still learning'."""
        rows = self._c.query(
            "SELECT c.action, c.reaction, c.moods FROM c WHERE c.userId = @u",
            [{"name": "@u", "value": user_id}],
            pk=user_id,
        )
        actions = {"like": 0, "maybe": 0, "dislike": 0, "watched": 0}
        reactions = {"loved": 0, "okay": 0, "disliked": 0}
        mood_counts: dict[str, int] = {}
        for r in rows:
            a = r.get("action")
            if a in actions:
                actions[a] += 1
            rx = r.get("reaction")
            if rx in reactions:
                reactions[rx] += 1
            for m in r.get("moods") or []:
                mood_counts[m] = mood_counts.get(m, 0) + 1
        top_moods = sorted(mood_counts, key=lambda k: mood_counts[k], reverse=True)[:6]
        return {"total": len(rows), "actions": actions, "reactions": reactions,
                "topMoods": top_moods}
