import base64
import hashlib
import hmac
import json
import time

from fastapi.testclient import TestClient

from tests.routers._factory import build_app

SECRET = "whsec_" + base64.b64encode(b"test-signing-key-0123456789ab").decode()
WRONG = "whsec_" + base64.b64encode(b"wrong-signing-key-0123456789").decode()


def _sign(secret: str, msg_id: str, ts: str, body: str) -> str:
    key = base64.b64decode(secret.split("_", 1)[1])
    mac = hmac.new(key, f"{msg_id}.{ts}.{body}".encode(), hashlib.sha256).digest()
    return "v1," + base64.b64encode(mac).decode()


def _post(client: TestClient, sign_secret: str, evt: dict, ts: str | None = None):
    body = json.dumps(evt)
    ts = ts or str(int(time.time()))
    mid = "msg_test"
    return client.post(
        "/v1/webhooks/clerk", content=body,
        headers={"svix-id": mid, "svix-timestamp": ts,
                 "svix-signature": _sign(sign_secret, mid, ts, body),
                 "content-type": "application/json"},
    )


def test_user_deleted_purges_the_users_data() -> None:
    app, deps = build_app()
    deps.settings.clerk_webhook_secret = SECRET
    uid = "clerk:user_abc"
    deps.decisions.add(uid, {"titleId": "t1", "action": "like"})
    deps.taste.set_notes(uid, "likes slow burns")

    r = _post(TestClient(app), SECRET, {"type": "user.deleted", "data": {"id": "user_abc"}})
    assert r.status_code == 204
    assert deps.decisions.export_for_user(uid) == []
    assert deps.taste.export_for_user(uid) is None


def test_bad_signature_is_rejected() -> None:
    app, deps = build_app()
    deps.settings.clerk_webhook_secret = SECRET
    r = _post(TestClient(app), WRONG, {"type": "user.deleted", "data": {"id": "u"}})
    assert r.status_code == 400


def test_stale_timestamp_is_rejected() -> None:
    app, deps = build_app()
    deps.settings.clerk_webhook_secret = SECRET
    old = str(int(time.time()) - 4000)
    r = _post(TestClient(app), SECRET, {"type": "user.deleted", "data": {"id": "u"}}, ts=old)
    assert r.status_code == 400


def test_missing_secret_returns_503() -> None:
    app, _ = build_app()  # clerk_webhook_secret defaults to ""
    r = _post(TestClient(app), SECRET, {"type": "user.deleted", "data": {"id": "u"}})
    assert r.status_code == 503


def test_user_deleted_without_id_is_rejected() -> None:
    app, deps = build_app()
    deps.settings.clerk_webhook_secret = SECRET
    r = _post(TestClient(app), SECRET, {"type": "user.deleted", "data": {}})
    assert r.status_code == 400


def test_other_events_are_ignored_not_purged() -> None:
    app, deps = build_app()
    deps.settings.clerk_webhook_secret = SECRET
    uid = "clerk:user_x"
    deps.decisions.add(uid, {"titleId": "t", "action": "like"})
    r = _post(TestClient(app), SECRET, {"type": "user.created", "data": {"id": "user_x"}})
    assert r.status_code == 204
    assert len(deps.decisions.export_for_user(uid)) == 1  # untouched
