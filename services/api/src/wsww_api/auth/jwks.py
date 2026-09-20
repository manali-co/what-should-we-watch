"""Verify Apple and Google identity tokens against their published JWKS."""
from __future__ import annotations

import time
from dataclasses import dataclass
from typing import Any, Protocol

import httpx
import jwt
from jwt import PyJWKSet

from ..errors import AppError

APPLE_KEYS_URL = "https://appleid.apple.com/auth/keys"
APPLE_ISS = "https://appleid.apple.com"
GOOGLE_KEYS_URL = "https://www.googleapis.com/oauth2/v3/certs"
GOOGLE_ISS = {"https://accounts.google.com", "accounts.google.com"}


@dataclass
class ProviderIdentity:
    provider: str
    subject: str
    name: str | None = None


class JwksSource(Protocol):
    def get_keys(self) -> dict[str, Any]: ...


class HttpJwks:
    """Fetches a JWKS document with a simple TTL cache."""

    def __init__(self, url: str, ttl_seconds: int = 3600) -> None:
        self._url = url
        self._ttl = ttl_seconds
        self._at = 0.0
        self._keys: dict[str, Any] = {}

    def get_keys(self) -> dict[str, Any]:
        now = time.time()
        if not self._keys or now - self._at > self._ttl:
            self._keys = httpx.get(self._url, timeout=10).json()
            self._at = now
        return self._keys


def _signing_key(token: str, source: JwksSource) -> Any:
    header = jwt.get_unverified_header(token)
    kid = header.get("kid")
    jwks = PyJWKSet.from_dict(source.get_keys())
    for key in jwks.keys:
        if key.key_id == kid:
            return key.key
    raise AppError("bad_token", "Signing key not found.", 401)


def _decode(token: str, key: Any, *, issuer: str | set[str], audience: list[str]) -> dict[str, Any]:
    try:
        return jwt.decode(
            token,
            key=key,
            algorithms=["RS256"],
            audience=audience,
            issuer=list(issuer) if isinstance(issuer, set) else issuer,
            options={"require": ["exp", "iss", "aud", "sub"]},
        )
    except jwt.ExpiredSignatureError as exc:
        raise AppError("session_expired", "Sign in again.", 401) from exc
    except jwt.InvalidTokenError as exc:
        raise AppError("bad_token", "Invalid identity token.", 401) from exc


def verify_apple(
    identity_token: str, audience: list[str], source: JwksSource
) -> ProviderIdentity:
    key = _signing_key(identity_token, source)
    claims = _decode(identity_token, key, issuer=APPLE_ISS, audience=audience)
    return ProviderIdentity("apple", claims["sub"], claims.get("name"))


def verify_google(
    id_token: str, audience: list[str], source: JwksSource
) -> ProviderIdentity:
    key = _signing_key(id_token, source)
    claims = _decode(id_token, key, issuer=GOOGLE_ISS, audience=audience)
    name = claims.get("name") or claims.get("given_name")
    return ProviderIdentity("google", claims["sub"], name)
