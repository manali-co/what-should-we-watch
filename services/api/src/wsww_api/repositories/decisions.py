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

    # Human labels for the moment buckets a signal can come from.
    _SIGNAL_LABELS = {
        ("daypart", "late night"): "Late nights", ("daypart", "evening"): "Evenings",
        ("daypart", "afternoon"): "Afternoons", ("daypart", "morning"): "Mornings",
        ("when", "weekend"): "Weekends", ("when", "weekday"): "Weeknights",
        ("season", "winter"): "Winter", ("season", "spring"): "Spring",
        ("season", "summer"): "Summer", ("season", "autumn"): "Autumn",
    }

    def patterns(self, user_id: str, min_support: int = 3) -> list[dict[str, Any]]:
        """Real behavioural signals derived from stored decision moments — what they
        say yes to late at night, on weekends, in a given season. Only a bucket with
        at least `min_support` likes surfaces; a cold-start viewer gets [] (nothing
        is invented). Sorted by strength, capped at five."""
        rows = self._c.query(
            "SELECT c.action, c.moods, c.moment, c.title FROM c WHERE c.userId = @u",
            [{"name": "@u", "value": user_id}],
            pk=user_id,
        )
        buckets: dict[tuple[str, str], dict[str, Any]] = {}

        def add(kind: str, label: str, moods: list[str], title: str | None) -> None:
            b = buckets.setdefault((kind, label), {"moods": {}, "titles": [], "n": 0})
            b["n"] += 1
            for m in moods:
                b["moods"][m] = b["moods"].get(m, 0) + 1
            if title and title not in b["titles"]:
                b["titles"].append(title)

        for r in rows:
            if r.get("action") != "like":  # a positive signal only
                continue
            mo = r.get("moment") or {}
            moods, title = r.get("moods") or [], r.get("title")
            if mo.get("daypart"):
                add("daypart", mo["daypart"], moods, title)
            if mo.get("season"):
                add("season", mo["season"], moods, title)
            add("when", "weekend" if mo.get("isWeekend") else "weekday", moods, title)

        out = []
        for key, b in buckets.items():
            if b["n"] < min_support or not b["moods"]:
                continue
            top = sorted(b["moods"], key=lambda m: b["moods"][m], reverse=True)[:2]
            out.append({
                "signal": self._SIGNAL_LABELS.get(key, key[1].title()),
                "moods": top, "sampleTitle": b["titles"][0] if b["titles"] else "",
                "count": b["n"],
            })
        out.sort(key=lambda p: p["count"], reverse=True)
        return out[:5]
