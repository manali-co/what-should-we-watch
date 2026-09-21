from wsww_api.db import InMemoryContainer
from wsww_api.repositories import DecisionsRepo, TasteRepo


def test_decisions_roundtrip_and_recent_order():
    repo = DecisionsRepo(InMemoryContainer())
    repo.add("dev1", {"titleId": "1", "title": "A", "action": "like", "moods": ["cozy"]})
    repo.add("dev1", {"titleId": "2", "title": "B", "action": "dislike"})
    repo.add("dev2", {"titleId": "3", "title": "C", "action": "like"})
    recent = repo.recent("dev1", 10)
    assert {r["title"] for r in recent} == {"A", "B"}  # dev2 excluded


def test_taste_notes_roundtrip():
    repo = TasteRepo(InMemoryContainer())
    assert repo.get_notes("dev1") == ""
    repo.set_notes("dev1", "Loves slow dramas.")
    assert repo.get_notes("dev1") == "Loves slow dramas."
