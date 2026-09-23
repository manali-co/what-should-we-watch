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
    # Stronger model for group ranking + taste consolidation; empty => reuse ranking_deployment.
    group_ranking_deployment: str = ""
    # OpenAI-direct fallback for the strong ranker (Azure often lacks quota for frontier
    # models like GPT-6 "Astra"). When both are set, the group ranker uses OpenAI directly.
    openai_api_key: str = ""
    group_ranking_model: str = ""       # OpenAI model id, e.g. "gpt-6"
    group_ranking_effort: str = "low"   # reasoning effort: low | medium | high
    clerk_issuer: str = ""


@lru_cache
def get_settings() -> Settings:
    return Settings()
