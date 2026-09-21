"""Verify a Clerk session token (RS256) against the instance JWKS.

Returns the Clerk user id (the token's `sub`). Email/name aren't in the default
session token; those sync via the Clerk Backend API or a webhook later."""
from __future__ import annotations

import time
from typing import Any

import httpx
import jwt
from jwt import PyJWKSet

from ..errors import AppError


class ClerkJwks:
    def __init__(self, issuer: str, ttl_seconds: int = 3600) -> None:
        self._url = issuer.rstrip("/") + "/.well-known/jwks.json"
        self._issuer = issuer.rstrip("/")
        self._ttl = ttl_seconds
        self._at = 0.0
        self._keys: dict[str, Any] = {}

    def get_keys(self) -> dict[str, Any]:
        now = time.time()
        if not self._keys or now - self._at > self._ttl:
            self._keys = httpx.get(self._url, timeout=10).json()
            self._at = now
        return self._keys

    @property
    def issuer(self) -> str:
        return self._issuer


def verify_clerk_token(token: str, jwks: ClerkJwks) -> str:
    try:
        header = jwt.get_unverified_header(token)
    except jwt.InvalidTokenError as exc:
        raise AppError("bad_token", "Malformed session token.", 401) from exc
    keyset = PyJWKSet.from_dict(jwks.get_keys())
    key = next((k.key for k in keyset.keys if k.key_id == header.get("kid")), None)
    if key is None:
        raise AppError("bad_token", "Unknown signing key.", 401)
    try:
        claims = jwt.decode(
            token, key=key, algorithms=["RS256"], issuer=jwks.issuer,
            options={"require": ["exp", "iss", "sub"], "verify_aud": False},
        )
    except jwt.ExpiredSignatureError as exc:
        raise AppError("session_expired", "Sign in again.", 401) from exc
    except jwt.InvalidTokenError as exc:
        raise AppError("bad_token", "Invalid session token.", 401) from exc
    return str(claims["sub"])
