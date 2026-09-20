import azure.functions as func


def test_function_app_exposes_asgi(monkeypatch) -> None:
    # Force the local-key path so no Azure clients are constructed at import.
    monkeypatch.delenv("WSWW_KEYVAULT_URI", raising=False)
    monkeypatch.setenv("WSWW_COSMOS_ENDPOINT", "")
    import importlib

    import function_app

    importlib.reload(function_app)
    assert isinstance(function_app.app, func.AsgiFunctionApp)
