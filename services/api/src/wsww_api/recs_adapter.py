"""Azure OpenAI adapters that satisfy the recs engine's Embedder/Ranker protocols."""
from __future__ import annotations

from typing import Any


class AzureEmbedder:
    def __init__(self, client: Any, deployment: str) -> None:
        self._c = client
        self._d = deployment

    def embed(self, text: str) -> list[float]:
        r = self._c.embeddings.create(model=self._d, input=text[:8000])
        return list(r.data[0].embedding)


class AzureRanker:
    def __init__(self, client: Any, deployment: str) -> None:
        self._c = client
        self._d = deployment

    def rank(self, prompt: str) -> str:
        r = self._c.chat.completions.create(
            model=self._d,
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
        )
        return r.choices[0].message.content or ""


class OpenAIRanker:
    """OpenAI-direct ranker for a frontier reasoning model (e.g. GPT-6 'Astra') that Azure
    can't deploy for us. Reasoning effort is configurable — Astra does best at low/medium."""

    def __init__(self, client: Any, model: str, reasoning_effort: str = "low") -> None:
        self._c = client
        self._m = model
        self._effort = reasoning_effort

    def rank(self, prompt: str) -> str:
        r = self._c.chat.completions.create(
            model=self._m,
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
            reasoning_effort=self._effort,
        )
        return r.choices[0].message.content or ""


def build_openai_client(endpoint: str) -> Any:
    from azure.identity import DefaultAzureCredential, get_bearer_token_provider
    from openai import AzureOpenAI

    provider = get_bearer_token_provider(
        DefaultAzureCredential(), "https://cognitiveservices.azure.com/.default"
    )
    return AzureOpenAI(
        azure_endpoint=endpoint, azure_ad_token_provider=provider, api_version="2024-10-21"
    )


def build_openai_direct_client(api_key: str) -> Any:
    """Plain OpenAI client (not Azure) — used where Azure lacks quota for the model we want."""
    from openai import OpenAI

    return OpenAI(api_key=api_key)
