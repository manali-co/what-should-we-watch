"""FastAPI application factory."""
from __future__ import annotations

import logging
import time

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .deps import Deps
from .errors import AppError, error_body
from .routers import auth as auth_router
from .routers import catalog as catalog_router
from .routers import me as me_router

# Azure Functions forwards the `logging` output to App Insights (the connection
# string is set on the Function App), so structured request/error logs land there
# for manual inspection. Alerting/dashboards come later.
log = logging.getLogger("wsww")
log.setLevel(logging.INFO)


def create_app(deps: Deps) -> FastAPI:
    app = FastAPI(title="What Should We Watch API", version="0.1.0")
    app.state.deps = deps
    app.add_middleware(
        CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"],
    )

    @app.middleware("http")
    async def _log_requests(request: Request, call_next):  # type: ignore[no-untyped-def]
        start = time.perf_counter()
        try:
            response = await call_next(request)
        except Exception:
            dur = (time.perf_counter() - start) * 1000
            log.exception("request_failed method=%s path=%s dur_ms=%.0f",
                          request.method, request.url.path, dur)
            raise
        dur = (time.perf_counter() - start) * 1000
        # Warn on server errors + slow calls so they stand out in a manual scan.
        level = logging.WARNING if (response.status_code >= 500 or dur > 8000) else logging.INFO
        log.log(level, "request method=%s path=%s status=%d dur_ms=%.0f",
                request.method, request.url.path, response.status_code, dur)
        return response

    @app.exception_handler(AppError)
    async def _app_error(_: Request, exc: AppError) -> JSONResponse:
        return JSONResponse(status_code=exc.status, content=error_body(exc.code, exc.message))

    @app.get("/v1/health")
    async def health() -> dict[str, str]:
        return {"status": "ok"}

    app.include_router(auth_router.router, prefix="/v1")
    app.include_router(me_router.router, prefix="/v1")
    app.include_router(catalog_router.router, prefix="/v1")
    return app
