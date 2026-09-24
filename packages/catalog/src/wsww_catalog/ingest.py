"""Load US movies from the Streaming Availability API into the Cosmos catalog.

Run: python -m wsww_catalog.ingest --pages 2
Env: WSWW_STREAMING_KEY, WSWW_COSMOS_ENDPOINT, WSWW_COSMOS_DATABASE (default wsww).
Auth to Cosmos is via DefaultAzureCredential (managed identity in cloud, az login locally).
"""
from __future__ import annotations

import argparse
import logging
import os
from datetime import UTC, datetime

from azure.cosmos.exceptions import CosmosResourceNotFoundError

from .client import StreamingClient
from .transform import to_catalog_doc

log = logging.getLogger("wsww.catalog.ingest")

# Subscription catalogs for the six primary US services (v0 scope).
US_CATALOGS = [
    "netflix.subscription", "prime.subscription", "disney.subscription",
    "hbo.subscription", "hulu.subscription", "apple.subscription",
    "paramount.subscription", "peacock.subscription",
]


def _cosmos_container():
    from azure.cosmos import CosmosClient
    from azure.identity import DefaultAzureCredential

    endpoint = os.environ["WSWW_COSMOS_ENDPOINT"]
    db_name = os.environ.get("WSWW_COSMOS_DATABASE", "wsww")
    client = CosmosClient(endpoint, DefaultAzureCredential())
    return client.get_database_client(db_name).get_container_client("catalog")


def _carry_embedding(container: object, doc: dict) -> bool:
    """If a stored doc with the same id already has an embedding and the SAME embeddable
    content (what the vibe line + embedding derive from), copy its embedding + vibeLine
    onto `doc` so the re-embed step skips it. Content change -> drop them -> re-embed.
    Returns True when carried over."""
    try:
        existing = container.read_item(item=doc["id"], partition_key=doc["country"])  # type: ignore[attr-defined]
    except CosmosResourceNotFoundError:
        return False  # genuinely new title -> embed it
    except Exception as e:  # noqa: BLE001 - transient read error: re-embed rather than crash the run
        log.warning("catalog read id=%s failed (%s); re-embedding", doc.get("id"), type(e).__name__)
        return False
    if not existing.get("embedding"):
        return False
    fields = ("title", "year", "genres", "overview", "directors")
    if any(existing.get(f) != doc.get(f) for f in fields):
        return False
    doc["embedding"] = existing["embedding"]
    if existing.get("vibeLine"):
        doc["vibeLine"] = existing["vibeLine"]
    return True


def run(pages: int = 10, country: str = "us") -> dict[str, int]:
    key = os.environ["WSWW_STREAMING_KEY"]
    client = StreamingClient(key)
    container = _cosmos_container()

    seen: set[str] = set()
    stats = {"fetched": 0, "written": 0, "skipped_no_avail": 0, "kept_embedding": 0}
    now = datetime.now(UTC).isoformat()

    for catalog in US_CATALOGS:
        for show in client.search_movies(country, catalog, pages=pages):
            stats["fetched"] += 1
            sid = str(show.get("id"))
            if sid in seen:
                continue
            seen.add(sid)
            try:
                doc = to_catalog_doc(show, country)
            except KeyError:
                continue
            # Keep no-poster films: they widen the pool and render a purpose-built card.
            # Only films with nowhere to stream are dropped.
            if not doc["availability"]:
                stats["skipped_no_avail"] += 1
                continue
            # Preserve an existing embedding/vibeLine when the embeddable content is
            # unchanged, so a scheduled refresh only re-embeds NEW or CHANGED titles
            # instead of wiping and re-embedding the whole catalog every run.
            if _carry_embedding(container, doc):
                stats["kept_embedding"] += 1
            doc["updatedAt"] = now
            container.upsert_item(doc)
            stats["written"] += 1
    return stats


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--pages", type=int, default=10, help="pages per catalog (20 shows/page)")
    ap.add_argument("--country", default="us")
    args = ap.parse_args()
    stats = run(pages=args.pages, country=args.country)
    print(f"catalog ingest done: {stats}")


if __name__ == "__main__":
    main()
