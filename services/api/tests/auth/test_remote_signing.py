"""Verify the remote-signing path (private_pem() is None) produces tokens the
verifier accepts, mimicking how the Key Vault signer works."""
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import ec, utils
from wsww_api.auth.tokens import LocalEcKey, TokenSigner


class RemoteLikeKey:
    """Signs the same way Key Vault does: raw r||s ES256 over sha256(data)."""

    def __init__(self) -> None:
        self._local = LocalEcKey()
        from cryptography.hazmat.primitives.serialization import load_pem_private_key

        self._priv = load_pem_private_key(self._local.private_pem(), password=None)

    def private_pem(self) -> bytes | None:
        return None

    def public_pem(self) -> bytes:
        return self._local.public_pem()

    def sign(self, data: bytes) -> bytes:
        import hashlib

        digest = hashlib.sha256(data).digest()
        der = self._priv.sign(digest, ec.ECDSA(utils.Prehashed(hashes.SHA256())))
        r, s = utils.decode_dss_signature(der)
        return r.to_bytes(32, "big") + s.to_bytes(32, "big")


def test_remote_signed_token_verifies() -> None:
    signer = TokenSigner(RemoteLikeKey(), access_ttl_seconds=900)
    tok = signer.issue_access("u_remote")
    assert signer.verify_access(tok) == "u_remote"
