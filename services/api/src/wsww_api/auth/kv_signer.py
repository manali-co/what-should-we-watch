"""Key Vault-backed ES256 signing key. Satisfies the SigningKey protocol so the
TokenSigner can issue and verify access tokens without the private key ever
leaving the vault. PyJWT needs a private PEM to sign, which a Key Vault key does
not expose, so signing is delegated to the vault's CryptographyClient and this
class plugs into a small signing hook on TokenSigner."""
from __future__ import annotations

from typing import Any


class KeyVaultSigningKey:
    def __init__(self, keyvault_uri: str, key_name: str) -> None:
        from azure.identity import DefaultAzureCredential
        from azure.keyvault.keys import KeyClient
        from azure.keyvault.keys.crypto import CryptographyClient

        cred = DefaultAzureCredential()
        key = KeyClient(vault_url=keyvault_uri, credential=cred).get_key(key_name)
        self._crypto = CryptographyClient(key, credential=cred)
        self._key = key

    def private_pem(self) -> bytes | None:
        # No private material leaves the vault; TokenSigner uses sign() instead.
        return None

    def public_pem(self) -> bytes:
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
        import hashlib

        from azure.keyvault.keys.crypto import SignatureAlgorithm

        digest = hashlib.sha256(data).digest()
        result: Any = self._crypto.sign(SignatureAlgorithm.es256, digest)
        return bytes(result.signature)
