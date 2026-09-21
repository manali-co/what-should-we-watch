from wsww_api.settings import Settings


def test_settings_read_env(monkeypatch) -> None:
    monkeypatch.setenv("WSWW_ENV", "prod")
    monkeypatch.setenv("WSWW_ACCESS_TTL_SECONDS", "60")
    s = Settings()
    assert s.env == "prod"
    assert s.access_ttl_seconds == 60
    assert s.cosmos_database == "wsww"
