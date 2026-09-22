"""Endpoint tests for the intelligence layer: the ranked shortlist (/catalog/results)
and the honest taste profile (/catalog/taste)."""
from fastapi.testclient import TestClient
from wsww_api.recs_engine import ShortlistResult

from ._factory import build_app


class FakeRecs:
    """Stands in for the LLM engine: reverses the kept order and names a verdict,
    and records the request it was handed so we can assert what the router passes."""
    def __init__(self) -> None:
        self.seen = None

    def rank_shortlist(self, req):
        self.seen = req
        films = list(reversed(req.kept))
        return ShortlistResult(films=films, verdict="Tonight, " + films[0]["title"] + ".")


def test_results_ranks_the_shortlist_with_the_engine():
    app, deps = build_app()
    deps.recs = FakeRecs()
    client = TestClient(app)
    r = client.post(
        "/v1/catalog/results",
        json={"kept": [{"id": "a", "title": "A"}, {"id": "b", "title": "B"}], "moods": ["cozy"]},
        headers={"x-device-id": "d1"},
    )
    assert r.status_code == 200
    body = r.json()
    assert [f["id"] for f in body["films"]] == ["b", "a"]
    assert body["verdict"] == "Tonight, B."


def test_results_passes_group_participants_through():
    app, deps = build_app()
    fake = FakeRecs()
    deps.recs = fake
    client = TestClient(app)
    client.post(
        "/v1/catalog/results",
        json={
            "kept": [{"id": "a", "title": "A"}],
            "participants": [{"name": "Jo", "tasteNotes": "cosy", "votes": {"a": "like"}}],
        },
        headers={"x-device-id": "d1"},
    )
    assert len(fake.seen.participants) == 1
    assert fake.seen.participants[0].name == "Jo"
    assert fake.seen.participants[0].votes == {"a": "like"}


def test_results_without_engine_returns_the_original_order():
    app, _ = build_app()  # recs is None
    client = TestClient(app)
    r = client.post("/v1/catalog/results", json={"kept": [{"id": "a"}, {"id": "b"}]})
    assert r.json() == {"films": [{"id": "a"}, {"id": "b"}], "verdict": ""}


def test_results_empty_shortlist():
    app, deps = build_app()
    deps.recs = FakeRecs()
    client = TestClient(app)
    r = client.post("/v1/catalog/results", json={"kept": []}, headers={"x-device-id": "d1"})
    assert r.json() == {"films": [], "verdict": ""}


def test_taste_cold_start_is_empty_not_fabricated():
    app, _ = build_app()
    client = TestClient(app)
    r = client.get("/v1/catalog/taste", headers={"x-device-id": "d1"})
    b = r.json()
    assert b["notes"] == "" and b["total"] == 0
    assert b["actions"]["like"] == 0 and b["topMoods"] == []


def test_taste_reflects_real_notes_and_decisions():
    app, deps = build_app()
    deps.taste.set_notes("dev:d1", "Loves slow dramas.")
    deps.decisions.add("dev:d1", {"titleId": "1", "title": "A", "action": "like",
                                   "moods": ["cozy"]})
    deps.decisions.add("dev:d1", {"titleId": "2", "title": "B", "action": "dislike"})
    client = TestClient(app)
    b = client.get("/v1/catalog/taste", headers={"x-device-id": "d1"}).json()
    assert b["notes"] == "Loves slow dramas."
    assert b["total"] == 2
    assert b["actions"]["like"] == 1 and b["actions"]["dislike"] == 1
    assert b["topMoods"] == ["cozy"]
