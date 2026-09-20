from fastapi.testclient import TestClient

from tests.routers._factory import build_app


def test_apple_sign_in_creates_user_and_returns_tokens() -> None:
    app, deps = build_app()
    c = TestClient(app)
    r = c.post("/v1/auth/apple", json={"identity_token": "sub-A", "name": "Ayush"})
    assert r.status_code == 200
    body = r.json()
    assert body["access_token"] and body["refresh_token"]
    assert deps.users.find_by_provider("apple", "sub-A") is not None


def test_same_subject_returns_same_user() -> None:
    app, deps = build_app()
    c = TestClient(app)
    c.post("/v1/auth/apple", json={"identity_token": "sub-A"})
    u1 = deps.users.find_by_provider("apple", "sub-A")
    c.post("/v1/auth/apple", json={"identity_token": "sub-A"})
    users = deps.users.find_by_provider("apple", "sub-A")
    assert users.id == u1.id


def test_refresh_rotates_and_invalidates_old() -> None:
    app, _ = build_app()
    c = TestClient(app)
    pair = c.post("/v1/auth/apple", json={"identity_token": "sub-A"}).json()
    r2 = c.post("/v1/auth/refresh", json={"refresh_token": pair["refresh_token"]})
    assert r2.status_code == 200
    new = r2.json()
    assert new["refresh_token"] != pair["refresh_token"]
    # reusing the original (now used) refresh revokes the family
    reuse = c.post("/v1/auth/refresh", json={"refresh_token": pair["refresh_token"]})
    assert reuse.status_code == 401
    assert reuse.json()["code"] == "session_expired"
    # the rotated token is now revoked too
    after = c.post("/v1/auth/refresh", json={"refresh_token": new["refresh_token"]})
    assert after.status_code == 401


def test_garbage_access_token_rejected() -> None:
    app, _ = build_app()
    c = TestClient(app)
    r = c.get("/v1/me", headers={"Authorization": "Bearer not-a-token"})
    assert r.status_code == 401
