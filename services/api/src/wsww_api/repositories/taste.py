"""The viewer's running taste notes, rewritten by the model each session."""
from __future__ import annotations

import time

from ..db import ContainerLike


class TasteRepo:
    def __init__(self, container: ContainerLike) -> None:
        self._c = container

    def get_notes(self, user_id: str) -> str:
        row = self._c.read(user_id, user_id)
        return (row or {}).get("notes", "") if row else ""

    def set_notes(self, user_id: str, notes: str) -> None:
        self._c.upsert(
            {
                "id": user_id, "_pk": user_id, "userId": user_id,
                "notes": notes, "updatedAt": int(time.time()),
            }
        )
