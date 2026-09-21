import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "src"))

import azure.functions as func  # noqa: E402
from wsww_api.app import create_app  # noqa: E402
from wsww_api.bootstrap import build_deps  # noqa: E402

app = func.AsgiFunctionApp(
    app=create_app(build_deps()), http_auth_level=func.AuthLevel.ANONYMOUS
)
