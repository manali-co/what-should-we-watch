from fastapi.testclient import TestClient

from tests.routers._factory import build_app


def test_health() -> None:
    app, _ = build_app()
    client = TestClient(app)
    r = client.get("/v1/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}
