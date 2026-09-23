"""Shared wiring for the eval scripts: real Azure clients + a judge builder.

The judge is either the Azure ranking deployment (default, no extra key) or an
OpenAI-direct frontier model like Astra (stronger, more discriminating) when
WSWW_OPENAI_API_KEY is set in the environment. The raw key never passes through
here or the model — pydantic-settings reads it straight from the env var.
"""
from __future__ import annotations

import sys
from pathlib import Path
from typing import Any

# eval core lives in packages/recs (pure, not vendored into the deploy zip)
sys.path.insert(0, str(Path(__file__).resolve().parents[3] / "packages" / "recs" / "src"))
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))


def clients() -> dict[str, Any]:
    """Returns settings, the shared Azure OpenAI client, an embedder, and the recs engine
    (for its real vector-search retrieval)."""
    from wsww_api.db import get_raw_container
    from wsww_api.recs_adapter import AzureEmbedder, AzureRanker, build_openai_client
    from wsww_api.recs_engine import RecsEngine
    from wsww_api.settings import get_settings

    s = get_settings()
    if not s.openai_endpoint:
        raise SystemExit("WSWW_OPENAI_ENDPOINT is not set — cannot embed or judge.")
    client = build_openai_client(s.openai_endpoint)
    embedder = AzureEmbedder(client, s.embedding_deployment)
    ranker = AzureRanker(client, s.ranking_deployment)
    eng = RecsEngine(get_raw_container("catalog"), embedder, ranker)
    return {"settings": s, "client": client, "embedder": embedder, "engine": eng}


def build_judge(client: Any, settings: Any, openai_model: str = "",
                effort: str = "low", azure_deployment: str = "") -> tuple[Any, str]:
    """(judge, label). OpenAI-direct (e.g. gpt-6-astra) when a model is named AND
    WSWW_OPENAI_API_KEY is present; otherwise the Azure ranking deployment."""
    from wsww_api.recs_adapter import AzureRanker

    if openai_model and settings.openai_api_key:
        from wsww_api.recs_adapter import OpenAIRanker, build_openai_direct_client

        judge = OpenAIRanker(
            build_openai_direct_client(settings.openai_api_key), openai_model, effort)
        return judge, f"openai:{openai_model}/{effort}"
    if openai_model and not settings.openai_api_key:
        print(f"[judge] --judge-model {openai_model} requested but WSWW_OPENAI_API_KEY unset "
              f"— falling back to Azure judge.", file=sys.stderr)
    dep = azure_deployment or settings.ranking_deployment
    return AzureRanker(client, dep), f"azure:{dep}"
