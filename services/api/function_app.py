import azure.functions as func
from wsww_api.app import create_app
from wsww_api.bootstrap import build_deps

app = func.AsgiFunctionApp(
    app=create_app(build_deps()), http_auth_level=func.AuthLevel.ANONYMOUS
)
