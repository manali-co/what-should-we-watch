from fastapi.testclient import TestClient

from tests.routers._factory import build_app


def auth(c) -> str:
    return c.post("/v1/auth/apple", json={"identity_token": "sub-A"}).json()["access_token"]


def test_guest_can_submit_feedback() -> None:
    app, deps = build_app()
    c = TestClient(app)
    r = c.post("/v1/feedback", json={"type": "bug", "message": "Deck got stuck loading"})
    assert r.status_code == 201
    body = r.json()
    assert body["ok"] is True and body["id"].startswith("fb_")
    rows = deps.feedback.recent()
    assert len(rows) == 1
    assert rows[0]["type"] == "bug"
    assert rows[0]["message"] == "Deck got stuck loading"
    assert rows[0]["userId"] is None  # filed as a guest


def test_member_feedback_is_attributed() -> None:
    app, deps = build_app()
    c = TestClient(app)
    tok = auth(c)
    uid = c.get("/v1/me", headers={"Authorization": f"Bearer {tok}"}).json()["id"]
    r = c.post(
        "/v1/feedback",
        headers={"Authorization": f"Bearer {tok}"},
        json={
            "type": "idea", "message": "Add a watchlist",
            "app_version": "0.1.11", "platform": "ios",
        },
    )
    assert r.status_code == 201
    row = deps.feedback.recent()[0]
    assert row["userId"] == uid
    assert row["type"] == "idea"
    assert row["appVersion"] == "0.1.11" and row["platform"] == "ios"


def test_bad_token_still_files_as_guest() -> None:
    app, deps = build_app()
    c = TestClient(app)
    r = c.post(
        "/v1/feedback",
        headers={"Authorization": "Bearer not-a-real-token"},
        json={"type": "other", "message": "hello"},
    )
    assert r.status_code == 201
    assert deps.feedback.recent()[0]["userId"] is None


def test_unknown_type_is_coerced_to_other() -> None:
    app, deps = build_app()
    c = TestClient(app)
    c.post("/v1/feedback", json={"type": "rant", "message": "x"})
    assert deps.feedback.recent()[0]["type"] == "other"


def test_empty_message_is_rejected() -> None:
    app, _ = build_app()
    c = TestClient(app)
    # whitespace-only trims to empty
    assert c.post("/v1/feedback", json={"type": "bug", "message": "   "}).status_code == 400
    # missing message fails validation
    assert c.post("/v1/feedback", json={"type": "bug"}).status_code == 422
