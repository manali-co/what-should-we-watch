"""Compute and store embeddings for catalog documents (Azure OpenAI, keyless).

The embedded text is VIBE-forward, not plot-forward: an LLM writes a short mood/tone
line ("how it feels, the occasion it suits") which leads the embedded text, so the
vector matches how people actually pick ("cozy", "edge of the seat", "fall asleep to")
rather than plot vocabulary. Measured lift over plot-only text: nDCG@10 0.72 -> 0.87 on
the vibe benchmark (see services/api/scripts/eval_embed_ab.py, issue #41). The line is
stored on the doc (`vibeLine`) so it's inspectable and can feed the card's "why".

Run: python -m wsww_catalog.embeddings [--force]
Env: WSWW_COSMOS_ENDPOINT, WSWW_OPENAI_ENDPOINT, WSWW_EMBEDDING_DEPLOYMENT,
     WSWW_VIBE_DEPLOYMENT (chat model for the vibe line; default gpt-5.4-mini).
"""
from __future__ import annotations

import argparse
import os
from typing import Any

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


def vibe_line(client: AzureOpenAI, deployment: str, doc: dict[str, Any]) -> str:
    """A short mood/tone description in the register viewers pick in — feeling, not plot."""
    genres = ", ".join(doc.get("genres") or []) or "—"
    prompt = (
        "Describe the MOOD and VIBE of this film for someone choosing what to watch "
        "tonight — how it FEELS, the occasion/mood it suits, its tone and energy. Use "
        "feeling words, not plot summary. 30 words max, one line.\n\n"
        f"Title: {doc.get('title')} ({doc.get('year')})\nGenres: {genres}\n"
        f"Overview: {(doc.get('overview') or '')[:600]}"
    )
    r = client.chat.completions.create(
        model=deployment, messages=[{"role": "user", "content": prompt}],
        max_completion_tokens=200,
    )
    # Normalise whitespace; cap generously (target is ~30 words) as a runaway guard only —
    # the line can render on the card, so keep whole phrases rather than hard-cut at 30.
    return " ".join((r.choices[0].message.content or "").split()[:60])


def doc_text(doc: dict[str, Any]) -> str:
    """Vibe-forward: the mood line leads, then title/genres/director/overview for grounding."""
    parts = [
        doc.get("vibeLine") or "",
        doc.get("title") or "",
        f"({doc.get('year')})" if doc.get("year") else "",
        ", ".join(doc.get("genres") or []),
        "directed by " + ", ".join(doc.get("directors") or []) if doc.get("directors") else "",
        doc.get("overview") or "",
    ]
    return " ".join(p for p in parts if p)


def run(force: bool = False) -> dict[str, int]:
    from azure.cosmos import CosmosClient

    endpoint = os.environ["WSWW_COSMOS_ENDPOINT"]
    db = os.environ.get("WSWW_COSMOS_DATABASE", "wsww")
    deployment = os.environ.get("WSWW_EMBEDDING_DEPLOYMENT", "text-embedding-3-large")
    vibe_deployment = os.environ.get("WSWW_VIBE_DEPLOYMENT", "gpt-5.4-mini")
    container = (
        CosmosClient(endpoint, DefaultAzureCredential())
        .get_database_client(db)
        .get_container_client("catalog")
    )
    client = _client()

    stats = {"embedded": 0, "skipped": 0}
    rows = list(container.query_items("SELECT * FROM c WHERE c.country = 'us'", partition_key="us"))
    for doc in rows:
        # Skip only if fully done; --force re-does everything (needed to migrate the
        # existing plot-only embeddings to vibe-forward ones).
        if doc.get("embedding") and doc.get("vibeLine") and not force:
            stats["skipped"] += 1
            continue
        if force or not doc.get("vibeLine"):
            doc["vibeLine"] = vibe_line(client, vibe_deployment, doc)
        doc["embedding"] = embed_text(client, deployment, doc_text(doc))
        container.upsert_item(doc)
        stats["embedded"] += 1
    return stats


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--force", action="store_true",
                    help="regenerate vibe line + embedding for every doc (migrate plot->vibe)")
    args = ap.parse_args()
    print("embeddings:", run(force=args.force))


if __name__ == "__main__":
    main()
