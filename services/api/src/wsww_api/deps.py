"""Dependency container assembled at app construction and stored on app.state."""
from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass
from typing import Any

from .auth.jwks import JwksSource, ProviderIdentity
from .auth.tokens import TokenSigner
from .repositories import CatalogRepo, TokensRepo, UsersRepo
from .settings import Settings


@dataclass
class Deps:
    users: UsersRepo
    catalog: CatalogRepo
    recs: Any | None
    tokens_repo: TokensRepo
    signer: TokenSigner
    settings: Settings
    verify_apple: Callable[[str, list[str], JwksSource], ProviderIdentity]
    verify_google: Callable[[str, list[str], JwksSource], ProviderIdentity]
    apple_jwks: JwksSource
    google_jwks: JwksSource
