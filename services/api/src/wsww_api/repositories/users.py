"""User persistence over a ContainerLike, partitioned by user id.

A denormalized `providerKey` ("<provider>:<subject>") is written alongside the
nested providers list so sign-in lookup is a single equality query that both the
in-memory double and Cosmos honor. v0 users have exactly one provider."""
from __future__ import annotations

import secrets
from datetime import UTC, datetime

from ..db import ContainerLike
from ..models import Provider, User


def _now() -> str:
    return datetime.now(UTC).isoformat()


def _provider_key(provider: str, subject: str) -> str:
    return f"{provider}:{subject}"


class UsersRepo:
    def __init__(self, container: ContainerLike) -> None:
        self._c = container

    def get(self, user_id: str) -> User | None:
        row = self._c.read(user_id, user_id)
        return User.model_validate(row) if row else None

    def upsert(self, user: User) -> User:
        row = user.model_dump()
        row["_pk"] = user.id
        row["providerKey"] = [_provider_key(p.provider, p.subject) for p in user.providers]
        row["providerKeyPrimary"] = row["providerKey"][0] if row["providerKey"] else ""
        self._c.upsert(row)
        return user

    def find_by_provider(self, provider: str, subject: str) -> User | None:
        rows = self._c.query(
            "SELECT * FROM c WHERE c.providerKeyPrimary = @key",
            [{"name": "@key", "value": _provider_key(provider, subject)}],
            pk=None,
        )
        return User.model_validate(rows[0]) if rows else None

    def soft_delete(self, user_id: str) -> None:
        user = self.get(user_id)
        if user is None:
            return
        # Real deletion: scrub personal data (name + the linked Apple/Google identity),
        # leaving only a tombstone (id + deleted_at) so sessions stay invalid and the id
        # can't be re-linked. upsert() recomputes the now-empty provider keys.
        user.deleted_at = _now()
        user.display_name = None
        user.providers = []
        self.upsert(user)

    @staticmethod
    def new(provider: str, subject: str, name: str | None) -> User:
        return User(
            id="u_" + secrets.token_hex(12),
            providers=[Provider(provider=provider, subject=subject)],
            display_name=name,
            created_at=_now(),
        )
