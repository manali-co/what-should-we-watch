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


def build_openai_client(endpoint: str) -> Any:
    from azure.identity import DefaultAzureCredential, get_bearer_token_provider
    from openai import AzureOpenAI

    provider = get_bearer_token_provider(
        DefaultAzureCredential(), "https://cognitiveservices.azure.com/.default"
    )
    return AzureOpenAI(azure_endpoint=endpoint, azure_ad_token_provider=provider, api_version="2024-10-21")
