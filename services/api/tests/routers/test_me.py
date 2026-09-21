from fastapi.testclient import TestClient

from tests.routers._factory import build_app


def auth(c) -> str:
    return c.post("/v1/auth/apple", json={"identity_token": "sub-A"}).json()["access_token"]


def test_get_me_requires_auth() -> None:
    app, _ = build_app()
    c = TestClient(app)
    assert c.get("/v1/me").status_code == 401


def test_get_and_patch_me() -> None:
    app, _ = build_app()
    c = TestClient(app)
    tok = auth(c)
    h = {"Authorization": f"Bearer {tok}"}
    me = c.get("/v1/me", headers=h).json()
    assert me["country"] == ""
    patched = c.patch("/v1/me", headers=h, json={"country": "US", "services": ["Netflix"]}).json()
    assert patched["country"] == "US"
    assert patched["services"] == ["Netflix"]
    assert c.get("/v1/me", headers=h).json()["country"] == "US"


def test_export_contains_user() -> None:
    app, _ = build_app()
    c = TestClient(app)
    tok = auth(c)
    exp = c.get("/v1/me/export", headers={"Authorization": f"Bearer {tok}"}).json()
    assert exp["user"]["id"].startswith("u_")
    assert "taste" in exp["containers"]


def test_delete_me_soft_deletes_and_revokes() -> None:
    app, deps = build_app()
    c = TestClient(app)
    pair = c.post("/v1/auth/apple", json={"identity_token": "sub-A"}).json()
    tok = pair["access_token"]
    r = c.delete("/v1/me", headers={"Authorization": f"Bearer {tok}"})
    assert r.status_code == 204
    user = deps.users.find_by_provider("apple", "sub-A")
    assert user.deleted_at is not None
    # refresh no longer works
    reuse = c.post("/v1/auth/refresh", json={"refresh_token": pair["refresh_token"]})
    assert reuse.status_code == 401
