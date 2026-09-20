"""Pydantic models: the persisted User plus API request/response shapes."""
from __future__ import annotations

from pydantic import BaseModel, Field


class Provider(BaseModel):
    provider: str  # "apple" | "google"
    subject: str


class UserSettings(BaseModel):
    theme: str = "system"  # "system" | "light" | "dark"
    followup_notifications: bool = True


class User(BaseModel):
    id: str
    providers: list[Provider] = Field(default_factory=list)
    display_name: str | None = None
    country: str = ""
    services: list[str] = Field(default_factory=list)
    settings: UserSettings = Field(default_factory=UserSettings)
    created_at: str
    deleted_at: str | None = None


# ---- request/response models ----
class AppleAuthIn(BaseModel):
    identity_token: str
    name: str | None = None


class GoogleAuthIn(BaseModel):
    id_token: str


class RefreshIn(BaseModel):
    refresh_token: str


class LogoutIn(BaseModel):
    refresh_token: str


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "Bearer"
    expires_in: int


class MeOut(BaseModel):
    id: str
    display_name: str | None
    country: str
    services: list[str]
    settings: UserSettings


class MePatch(BaseModel):
    country: str | None = None
    services: list[str] | None = None
    settings: UserSettings | None = None
