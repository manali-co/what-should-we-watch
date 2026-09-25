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


def test_export_contains_user_decisions_and_taste() -> None:
    app, deps = build_app()
    c = TestClient(app)
    tok = auth(c)
    h = {"Authorization": f"Bearer {tok}"}
    uid = c.get("/v1/me", headers=h).json()["id"]
    deps.decisions.add(uid, {"titleId": "t1", "action": "like"})
    deps.taste.set_notes(uid, "likes slow burns")
    exp = c.get("/v1/me/export", headers=h).json()
    assert exp["user"]["id"] == uid
    assert len(exp["decisions"]) == 1 and exp["decisions"][0]["titleId"] == "t1"
    assert exp["taste"]["notes"] == "likes slow burns"


def test_delete_me_purges_data_scrubs_pii_and_revokes() -> None:
    app, deps = build_app()
    c = TestClient(app)
    pair = c.post("/v1/auth/apple", json={"identity_token": "sub-A"}).json()
    tok = pair["access_token"]
    h = {"Authorization": f"Bearer {tok}"}
    uid = c.get("/v1/me", headers=h).json()["id"]
    deps.decisions.add(uid, {"titleId": "t1", "action": "like"})
    deps.taste.set_notes(uid, "secret taste")

    assert c.delete("/v1/me", headers=h).status_code == 204

    # The user's data is actually gone.
    assert deps.decisions.export_for_user(uid) == []
    assert deps.taste.export_for_user(uid) is None
    # PII is scrubbed — the identity can no longer be found, only a tombstone remains.
    assert deps.users.find_by_provider("apple", "sub-A") is None
    tomb = deps.users.get(uid)
    assert tomb is not None and tomb.deleted_at is not None
    assert tomb.display_name is None and tomb.providers == []
    # refresh no longer works
    reuse = c.post("/v1/auth/refresh", json={"refresh_token": pair["refresh_token"]})
    assert reuse.status_code == 401
