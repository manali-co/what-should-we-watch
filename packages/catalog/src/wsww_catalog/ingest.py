"""Load US movies from the Streaming Availability API into the Cosmos catalog.

Run: python -m wsww_catalog.ingest --pages 2
Env: WSWW_STREAMING_KEY, WSWW_COSMOS_ENDPOINT, WSWW_COSMOS_DATABASE (default wsww).
Auth to Cosmos is via DefaultAzureCredential (managed identity in cloud, az login locally).
"""
from __future__ import annotations

import argparse
import os
from datetime import datetime, timezone

from .client import StreamingClient
from .transform import to_catalog_doc

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


def run(pages: int = 2, country: str = "us") -> dict[str, int]:
    key = os.environ["WSWW_STREAMING_KEY"]
    client = StreamingClient(key)
    container = _cosmos_container()

    seen: set[str] = set()
    stats = {"fetched": 0, "written": 0, "skipped_no_poster": 0}
    now = datetime.now(timezone.utc).isoformat()

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
            if not doc["poster"]["url"] or not doc["availability"]:
                stats["skipped_no_poster"] += 1
                continue
            doc["updatedAt"] = now
            container.upsert_item(doc)
            stats["written"] += 1
    return stats


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--pages", type=int, default=2, help="pages per catalog (20 shows/page)")
    ap.add_argument("--country", default="us")
    args = ap.parse_args()
    stats = run(pages=args.pages, country=args.country)
    print(f"catalog ingest done: {stats}")


if __name__ == "__main__":
    main()
