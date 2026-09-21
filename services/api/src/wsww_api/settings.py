"""Runtime configuration loaded from WSWW_* environment variables."""
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="WSWW_", extra="ignore")

    cosmos_endpoint: str = ""
    cosmos_database: str = "wsww"
    keyvault_uri: str = ""
    signing_key_name: str = "wsww-api-signing"
    apple_bundle_ids: list[str] = []
    google_client_ids: list[str] = []
    access_ttl_seconds: int = 900
    refresh_ttl_days: int = 30
    env: str = "dev"
    openai_endpoint: str = ""
    embedding_deployment: str = "text-embedding-3-large"
    ranking_deployment: str = "gpt-5.4-mini"
    clerk_issuer: str = ""


@lru_cache
def get_settings() -> Settings:
    return Settings()
