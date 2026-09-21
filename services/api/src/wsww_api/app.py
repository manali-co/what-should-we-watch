"""FastAPI application factory."""
from __future__ import annotations

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from .deps import Deps
from .errors import AppError, error_body
from .routers import auth as auth_router
from .routers import catalog as catalog_router
from .routers import me as me_router


def create_app(deps: Deps) -> FastAPI:
    app = FastAPI(title="What Should We Watch API", version="0.1.0")
    app.state.deps = deps

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
