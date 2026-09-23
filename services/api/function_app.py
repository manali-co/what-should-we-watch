import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "src"))

# App Insights: instrument the FastAPI app's logging (and outbound calls) so failures are
# actually visible — the connection string alone does NOT capture a mounted ASGI app's logs.
# Guarded so local/test (no connection string, package maybe absent) skips it cleanly.
if os.environ.get("APPLICATIONINSIGHTS_CONNECTION_STRING"):
    try:
        from azure.monitor.opentelemetry import configure_azure_monitor

        configure_azure_monitor(logger_name="wsww")
    except Exception:  # noqa: BLE001 - telemetry must never break startup
        pass

import azure.functions as func  # noqa: E402
from wsww_api.app import create_app  # noqa: E402
from wsww_api.bootstrap import build_deps  # noqa: E402

app = func.AsgiFunctionApp(
    app=create_app(build_deps()), http_auth_level=func.AuthLevel.ANONYMOUS
)
