"""Construct production dependencies from Settings. Kept import-light so unit
tests never import Azure SDKs."""
from __future__ import annotations

from .auth.jwks import HttpJwks, verify_apple, verify_google
from .auth.tokens import TokenSigner
from .deps import Deps
from .settings import Settings, get_settings


def build_deps() -> Deps:
    from .auth.jwks import APPLE_KEYS_URL, GOOGLE_KEYS_URL
    from .db import get_container
    from .repositories import TokensRepo, UsersRepo

    settings = get_settings()
    signer = _build_signer(settings)
    return Deps(
        users=UsersRepo(get_container("users")),
        tokens_repo=TokensRepo(get_container("refreshTokens")),
        signer=signer,
        settings=settings,
        verify_apple=verify_apple,
        verify_google=verify_google,
        apple_jwks=HttpJwks(APPLE_KEYS_URL),
        google_jwks=HttpJwks(GOOGLE_KEYS_URL),
    )


def _build_signer(settings: Settings) -> TokenSigner:
    from .auth.tokens import SigningKey

    key: SigningKey
    if settings.keyvault_uri:
        from .auth.kv_signer import KeyVaultSigningKey

        key = KeyVaultSigningKey(settings.keyvault_uri, settings.signing_key_name)
    else:  # dev/local fallback
        from .auth.tokens import LocalEcKey

        key = LocalEcKey()
    return TokenSigner(key, access_ttl_seconds=settings.access_ttl_seconds)
