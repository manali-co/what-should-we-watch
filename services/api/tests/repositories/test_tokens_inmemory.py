from wsww_api.db import InMemoryContainer
from wsww_api.repositories import TokensRepo


def test_store_get_mark_used() -> None:
    r = TokensRepo(InMemoryContainer())
    r.store("hash-a", "u_1", "fam-1", "2030-01-01T00:00:00Z")
    row = r.get("hash-a", "u_1")
    assert row is not None and row["usedAt"] is None
    r.mark_used("hash-a", "u_1")
    assert r.get("hash-a", "u_1")["usedAt"] is not None


def test_revoke_family_marks_all() -> None:
    r = TokensRepo(InMemoryContainer())
    r.store("h1", "u_1", "fam-1", "2030-01-01T00:00:00Z")
    r.store("h2", "u_1", "fam-1", "2030-01-01T00:00:00Z")
    r.store("h3", "u_1", "fam-2", "2030-01-01T00:00:00Z")
    r.revoke_family("fam-1", "u_1")
    assert r.get("h1", "u_1")["usedAt"] is not None
    assert r.get("h2", "u_1")["usedAt"] is not None
    assert r.get("h3", "u_1")["usedAt"] is None
