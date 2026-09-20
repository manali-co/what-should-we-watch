"""Issue and verify the app's own ES256 access tokens, and mint/hash rotating
refresh tokens. The signing key is provided through the SigningKey protocol so
tests use a local EC key and production uses a Key Vault-backed one."""
from __future__ import annotations

import hashlib
import secrets
import time
from typing import Any, Protocol

import jwt

from ..errors import AppError

ISSUER = "wsww"


class SigningKey(Protocol):
    """A source of ES256 signatures plus the public key for verification."""

    def private_pem(self) -> bytes | None: ...
    def public_pem(self) -> bytes: ...
    def sign(self, data: bytes) -> bytes: ...


class LocalEcKey:
    """An in-process EC P-256 key for dev and tests."""

    def __init__(self, private_pem: bytes | None = None) -> None:
        from cryptography.hazmat.primitives import serialization
        from cryptography.hazmat.primitives.asymmetric import ec

        if private_pem:
            self._key = serialization.load_pem_private_key(private_pem, password=None)
        else:
            self._key = ec.generate_private_key(ec.SECP256R1())

    def private_pem(self) -> bytes:
        from cryptography.hazmat.primitives import serialization

        return self._key.private_bytes(
            serialization.Encoding.PEM,
            serialization.PrivateFormat.PKCS8,
            serialization.NoEncryption(),
        )

    def public_pem(self) -> bytes:
        from cryptography.hazmat.primitives import serialization

        return self._key.public_key().public_bytes(
            serialization.Encoding.PEM, serialization.PublicFormat.SubjectPublicKeyInfo
        )

    def sign(self, data: bytes) -> bytes:  # pragma: no cover - PyJWT signs via PEM below
        raise NotImplementedError


class TokenSigner:
    def __init__(self, key: SigningKey, access_ttl_seconds: int = 900) -> None:
        self._key = key
        self._ttl = access_ttl_seconds

    def issue_access(self, user_id: str) -> str:
        now = int(time.time())
        payload = {"sub": user_id, "iss": ISSUER, "iat": now, "exp": now + self._ttl}
        signing = self._key.private_pem()
        if signing is None:  # pragma: no cover - Key Vault path handled in kv_signer
            raise RuntimeError("Remote signing not wired for local issue path.")
        return jwt.encode(payload, signing, algorithm="ES256")

    def verify_access(self, token: str) -> str:
        try:
            claims: dict[str, Any] = jwt.decode(
                token, self._key.public_pem(), algorithms=["ES256"], issuer=ISSUER,
                options={"require": ["exp", "sub", "iss"]},
            )
        except jwt.ExpiredSignatureError as exc:
            raise AppError("session_expired", "Sign in again.", 401) from exc
        except jwt.InvalidTokenError as exc:
            raise AppError("bad_token", "Invalid access token.", 401) from exc
        return str(claims["sub"])

    @property
    def access_ttl(self) -> int:
        return self._ttl

    @staticmethod
    def new_refresh() -> tuple[str, str]:
        raw = secrets.token_urlsafe(32)
        return raw, TokenSigner.hash_refresh(raw)

    @staticmethod
    def hash_refresh(raw: str) -> str:
        return hashlib.sha256(raw.encode()).hexdigest()
