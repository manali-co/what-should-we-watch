"""Application error type and the JSON error envelope."""
from dataclasses import dataclass


@dataclass
class AppError(Exception):
    """A domain error that maps to an HTTP status and the error envelope."""

    code: str
    message: str
    status: int = 400


def error_body(code: str, message: str) -> dict[str, str]:
    """Return the canonical error envelope."""
    return {"code": code, "message": message}
