"""Thin client over the Streaming Availability API (RapidAPI gateway)."""
from __future__ import annotations

from collections.abc import Iterator
from typing import Any

import httpx

HOST = "streaming-availability.p.rapidapi.com"
BASE = f"https://{HOST}"


class StreamingClient:
    def __init__(self, api_key: str, timeout: float = 20.0) -> None:
        self._headers = {"x-rapidapi-host": HOST, "x-rapidapi-key": api_key}
        self._timeout = timeout

    def countries(self) -> dict[str, Any]:
        with httpx.Client(timeout=self._timeout) as c:
            r = c.get(f"{BASE}/countries", headers=self._headers)
            r.raise_for_status()
            return r.json()

    def search_movies(
        self, country: str, catalog: str, order_by: str = "popularity_1year", pages: int = 1
    ) -> Iterator[dict[str, Any]]:
        """Yield movie 'show' objects for one catalog (e.g. 'netflix.subscription'),
        following the cursor up to `pages` pages."""
        cursor: str | None = None
        with httpx.Client(timeout=self._timeout) as c:
            for _ in range(pages):
                params: dict[str, Any] = {
                    "country": country,
                    "series_granularity": "show",
                    "order_by": order_by,
                    "order_direction": "desc",
                    "catalogs": catalog,
                    "show_type": "movie",
                }
                if cursor:
                    params["cursor"] = cursor
                r = c.get(f"{BASE}/shows/search/filters", headers=self._headers, params=params)
                r.raise_for_status()
                data = r.json()
                yield from data.get("shows", [])
                if not data.get("hasMore"):
                    return
                cursor = data.get("nextCursor")
