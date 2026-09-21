"""Key Vault-backed ES256 signing key. The key is fetched lazily on first use so
constructing the app (and serving routes that never sign, like health) does not
require Key Vault connectivity at cold start."""
from __future__ import annotations

import hashlib
from typing import Any


class KeyVaultSigningKey:
    def __init__(self, keyvault_uri: str, key_name: str) -> None:
        self._uri = keyvault_uri
        self._name = key_name
        self._crypto: Any = None
        self._key: Any = None

    def _ensure(self) -> None:
        if self._key is not None:
            return
        from azure.identity import DefaultAzureCredential
        from azure.keyvault.keys import KeyClient
        from azure.keyvault.keys.crypto import CryptographyClient

        cred = DefaultAzureCredential()
        self._key = KeyClient(vault_url=self._uri, credential=cred).get_key(self._name)
        self._crypto = CryptographyClient(self._key, credential=cred)

    def private_pem(self) -> bytes | None:
        return None  # private material never leaves the vault

    def public_pem(self) -> bytes:
        self._ensure()
        from cryptography.hazmat.primitives import serialization
        from cryptography.hazmat.primitives.asymmetric import ec

        k: Any = self._key.key
        pub = ec.EllipticCurvePublicNumbers(
            int.from_bytes(k.x, "big"), int.from_bytes(k.y, "big"), ec.SECP256R1()
        ).public_key()
        return pub.public_bytes(
            serialization.Encoding.PEM, serialization.PublicFormat.SubjectPublicKeyInfo
        )

    def sign(self, data: bytes) -> bytes:
        self._ensure()
        from azure.keyvault.keys.crypto import SignatureAlgorithm

        digest = hashlib.sha256(data).digest()
        result: Any = self._crypto.sign(SignatureAlgorithm.es256, digest)
        return bytes(result.signature)
