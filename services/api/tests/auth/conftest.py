"""Shared crypto helpers: generate an RSA key and mint identity tokens + a JWKS."""
from __future__ import annotations

import time
from typing import Any

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import rsa


class StubJwks:
    def __init__(self, jwks: dict[str, Any]) -> None:
        self._jwks = jwks

    def get_keys(self) -> dict[str, Any]:
        return self._jwks


@pytest.fixture
def rsa_key() -> rsa.RSAPrivateKey:
    return rsa.generate_private_key(public_exponent=65537, key_size=2048)


@pytest.fixture
def jwks_for(rsa_key: rsa.RSAPrivateKey):
    def _make(kid: str = "test-kid") -> StubJwks:
        pub = jwt.algorithms.RSAAlgorithm.to_jwk(rsa_key.public_key(), as_dict=True)
        pub.update({"kid": kid, "use": "sig", "alg": "RS256"})
        return StubJwks({"keys": [pub]})

    return _make


@pytest.fixture
def mint(rsa_key: rsa.RSAPrivateKey):
    def _mint(
        *, iss: str, aud: str, sub: str, kid: str = "test-kid", exp_delta: int = 3600, **extra
    ):
        payload = {"iss": iss, "aud": aud, "sub": sub, "iat": int(time.time()),
                   "exp": int(time.time()) + exp_delta, **extra}
        return jwt.encode(payload, rsa_key, algorithm="RS256", headers={"kid": kid})

    return _mint
