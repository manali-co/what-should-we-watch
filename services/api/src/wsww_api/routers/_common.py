from __future__ import annotations

from fastapi import Request

from ..deps import Deps


def deps_of(request: Request) -> Deps:
    return request.app.state.deps  # type: ignore[no-any-return]
