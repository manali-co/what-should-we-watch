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
    from .repositories import CatalogRepo, TokensRepo, UsersRepo

    settings = get_settings()
    signer = _build_signer(settings)
    recs = _build_recs(settings)
    return Deps(
        users=UsersRepo(get_container("users")),
        catalog=CatalogRepo(get_container("catalog")),
        recs=recs,
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


def _build_recs(settings: Settings) -> object | None:
    if not settings.openai_endpoint:
        return None
    from .db import get_raw_container
    from .recs_adapter import AzureEmbedder, AzureRanker, build_openai_client
    from .recs_engine import RecsEngine

    client = build_openai_client(settings.openai_endpoint)
    return RecsEngine(
        get_raw_container("catalog"),
        AzureEmbedder(client, settings.embedding_deployment),
        AzureRanker(client, settings.ranking_deployment),
    )
