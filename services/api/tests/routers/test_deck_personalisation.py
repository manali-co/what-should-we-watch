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


def test_decision_stores_the_moment():
    repo = DecisionsRepo(InMemoryContainer())
    repo.add("u", {"action": "like",
                   "moment": {"daypart": "late night", "isWeekend": True, "season": "winter"}})
    r = repo.recent("u", 1)[0]
    assert r["moment"] == {"daypart": "late night", "weekday": "",
                           "isWeekend": True, "season": "winter"}


def test_stats_are_real_counts_not_mocked():
    repo = DecisionsRepo(InMemoryContainer())
    assert repo.stats("nobody") == {
        "total": 0, "actions": {"like": 0, "maybe": 0, "dislike": 0, "watched": 0},
        "reactions": {"loved": 0, "okay": 0, "disliked": 0}, "topMoods": [],
    }
    repo.add("u", {"action": "like", "moods": ["cozy", "big laughs"]})
    repo.add("u", {"action": "like", "reaction": "loved",
                   "moods": ["cozy"]})
    repo.add("u", {"action": "dislike"})
    s = repo.stats("u")
    assert s["total"] == 3
    assert s["actions"]["like"] == 2 and s["actions"]["dislike"] == 1
    assert s["reactions"]["loved"] == 1
    assert s["topMoods"][0] == "cozy"
