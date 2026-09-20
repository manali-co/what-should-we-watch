from wsww_api.errors import AppError, error_body


def test_error_body_shape() -> None:
    assert error_body("rate_limited", "slow down") == {
        "code": "rate_limited",
        "message": "slow down",
    }


def test_app_error_defaults() -> None:
    e = AppError("bad_token", "nope")
    assert e.status == 400
    assert e.code == "bad_token"
    assert e.message == "nope"
