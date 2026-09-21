"""Compute and store embeddings for catalog documents (Azure OpenAI, keyless).

Run: python -m wsww_catalog.embeddings
Env: WSWW_COSMOS_ENDPOINT, WSWW_OPENAI_ENDPOINT, WSWW_EMBEDDING_DEPLOYMENT.
"""
from __future__ import annotations

import os

from azure.identity import DefaultAzureCredential, get_bearer_token_provider
from openai import AzureOpenAI


def _client() -> AzureOpenAI:
    provider = get_bearer_token_provider(
        DefaultAzureCredential(), "https://cognitiveservices.azure.com/.default"
    )
    return AzureOpenAI(
        azure_endpoint=os.environ["WSWW_OPENAI_ENDPOINT"],
        azure_ad_token_provider=provider,
        api_version="2024-10-21",
    )


def embed_text(client: AzureOpenAI, deployment: str, text: str) -> list[float]:
    r = client.embeddings.create(model=deployment, input=text[:8000])
    return r.data[0].embedding


def doc_text(doc: dict) -> str:
    parts = [
        doc.get("title") or "",
        f"({doc.get('year')})" if doc.get("year") else "",
        ", ".join(doc.get("genres") or []),
        "directed by " + ", ".join(doc.get("directors") or []) if doc.get("directors") else "",
        doc.get("overview") or "",
    ]
    return " ".join(p for p in parts if p)


def run() -> dict[str, int]:
    from azure.cosmos import CosmosClient

    endpoint = os.environ["WSWW_COSMOS_ENDPOINT"]
    db = os.environ.get("WSWW_COSMOS_DATABASE", "wsww")
    deployment = os.environ.get("WSWW_EMBEDDING_DEPLOYMENT", "text-embedding-3-large")
    container = (
        CosmosClient(endpoint, DefaultAzureCredential())
        .get_database_client(db)
        .get_container_client("catalog")
    )
    client = _client()

    stats = {"embedded": 0, "skipped": 0}
    rows = list(container.query_items("SELECT * FROM c WHERE c.country = 'us'", partition_key="us"))
    for doc in rows:
        if doc.get("embedding"):
            stats["skipped"] += 1
            continue
        doc["embedding"] = embed_text(client, deployment, doc_text(doc))
        container.upsert_item(doc)
        stats["embedded"] += 1
    return stats


if __name__ == "__main__":
    print("embeddings:", run())
