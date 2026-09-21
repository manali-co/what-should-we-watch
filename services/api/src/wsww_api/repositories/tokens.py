"""Refresh-token persistence: hashes only, grouped into families for rotation."""
from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from ..db import ContainerLike


def _now() -> str:
    return datetime.now(UTC).isoformat()


class TokensRepo:
    def __init__(self, container: ContainerLike) -> None:
        self._c = container

    def store(self, token_hash: str, user_id: str, family: str, expires_at: str) -> None:
        self._c.upsert(
            {
                "id": token_hash,
                "_pk": user_id,
                "userId": user_id,
                "family": family,
                "expiresAt": expires_at,
                "usedAt": None,
            }
        )

    def get(self, token_hash: str, user_id: str) -> dict[str, Any] | None:
        return self._c.read(token_hash, user_id)

    def mark_used(self, token_hash: str, user_id: str) -> None:
        row = self._c.read(token_hash, user_id)
        if row is None:
            return
        row["usedAt"] = _now()
        self._c.upsert(row)

    def revoke_family(self, family: str, user_id: str) -> None:
        rows = self._c.query(
            "SELECT * FROM c WHERE c.family = @family",
            [{"name": "@family", "value": family}],
            pk=user_id,
        )
        for row in rows:
            row["usedAt"] = _now()
            self._c.upsert(row)

    def find_by_hash(self, token_hash: str) -> dict[str, Any] | None:
        rows = self._c.query(
            "SELECT * FROM c WHERE c.id = @id",
            [{"name": "@id", "value": token_hash}],
            pk=None,
        )
        return rows[0] if rows else None

    def list_for_user(self, user_id: str) -> list[dict[str, Any]]:
        return self._c.query("SELECT * FROM c WHERE c.userId = @u",
                             [{"name": "@u", "value": user_id}], pk=user_id)
