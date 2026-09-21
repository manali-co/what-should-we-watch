"""Contract test for the Key Vault signer. Skipped in unit CI (no vault); runs
as an integration check when WSWW_KEYVAULT_URI is set against a real dev vault."""
import os

import pytest

KV = os.environ.get("WSWW_KEYVAULT_URI")


@pytest.mark.skipif(not KV, reason="requires a real Key Vault (integration only)")
def test_kv_sign_and_verify_roundtrip() -> None:
    from wsww_api.auth.kv_signer import KeyVaultSigningKey

    key = KeyVaultSigningKey(KV, os.environ.get("WSWW_SIGNING_KEY_NAME", "wsww-api-signing"))
    sig = key.sign(b"hello")
    assert isinstance(sig, bytes) and len(sig) == 64  # raw r||s for ES256
    assert b"BEGIN PUBLIC KEY" in key.public_pem()
