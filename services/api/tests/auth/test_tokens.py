import time

import pytest
from wsww_api.auth.tokens import LocalEcKey, TokenSigner
from wsww_api.errors import AppError


def signer(ttl: int = 900) -> TokenSigner:
    return TokenSigner(LocalEcKey(), access_ttl_seconds=ttl)


def test_access_roundtrip() -> None:
    s = signer()
    tok = s.issue_access("u_1")
    assert s.verify_access(tok) == "u_1"


def test_tampered_rejected() -> None:
    s = signer()
    tok = s.issue_access("u_1")
    with pytest.raises(AppError):
        s.verify_access(tok + "x")


def test_expired_rejected() -> None:
    s = signer(ttl=1)
    tok = s.issue_access("u_1")
    time.sleep(1.2)
    with pytest.raises(AppError) as e:
        s.verify_access(tok)
    assert e.value.code == "session_expired"


def test_refresh_hash_matches() -> None:
    raw, digest = TokenSigner.new_refresh()
    assert TokenSigner.hash_refresh(raw) == digest
    assert raw != digest
