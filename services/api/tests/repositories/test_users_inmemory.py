from wsww_api.db import InMemoryContainer
from wsww_api.repositories import UsersRepo


def repo() -> UsersRepo:
    return UsersRepo(InMemoryContainer())


def test_upsert_then_get_roundtrip() -> None:
    r = repo()
    u = UsersRepo.new("apple", "sub-1", "Ayush")
    r.upsert(u)
    got = r.get(u.id)
    assert got is not None
    assert got.id == u.id
    assert got.display_name == "Ayush"
    assert got.providers[0].subject == "sub-1"


def test_find_by_provider() -> None:
    r = repo()
    u = UsersRepo.new("google", "g-42", None)
    r.upsert(u)
    found = r.find_by_provider("google", "g-42")
    assert found is not None and found.id == u.id
    assert r.find_by_provider("google", "nope") is None
    assert r.find_by_provider("apple", "g-42") is None


def test_soft_delete_sets_timestamp_but_keeps_row() -> None:
    r = repo()
    u = UsersRepo.new("apple", "sub-2", None)
    r.upsert(u)
    r.soft_delete(u.id)
    got = r.get(u.id)
    assert got is not None
    assert got.deleted_at is not None
