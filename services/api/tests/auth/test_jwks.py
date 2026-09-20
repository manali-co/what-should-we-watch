import pytest

from wsww_api.auth.jwks import APPLE_ISS, verify_apple, verify_google
from wsww_api.errors import AppError


def test_verify_apple_ok(mint, jwks_for) -> None:
    token = mint(iss=APPLE_ISS, aud="app.manali.wsww", sub="apple-sub-1", name="Ayush")
    ident = verify_apple(token, ["app.manali.wsww"], jwks_for())
    assert ident.provider == "apple"
    assert ident.subject == "apple-sub-1"
    assert ident.name == "Ayush"


def test_verify_google_ok(mint, jwks_for) -> None:
    token = mint(iss="https://accounts.google.com", aud="client-1.apps", sub="g-1", given_name="A")
    ident = verify_google(token, ["client-1.apps"], jwks_for())
    assert ident.provider == "google"
    assert ident.subject == "g-1"
    assert ident.name == "A"


def test_wrong_audience_rejected(mint, jwks_for) -> None:
    token = mint(iss=APPLE_ISS, aud="someone.else", sub="s")
    with pytest.raises(AppError) as e:
        verify_apple(token, ["app.manali.wsww"], jwks_for())
    assert e.value.code == "bad_token"
    assert e.value.status == 401


def test_expired_rejected(mint, jwks_for) -> None:
    token = mint(iss=APPLE_ISS, aud="app.manali.wsww", sub="s", exp_delta=-10)
    with pytest.raises(AppError) as e:
        verify_apple(token, ["app.manali.wsww"], jwks_for())
    assert e.value.code == "session_expired"
