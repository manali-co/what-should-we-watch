"""Map a Streaming Availability API 'show' into our Cosmos catalog document.

The catalog is partitioned by country. Availability carries the service, the
monetization type, a deep link, and an expiry timestamp when the API knows one.
Poster is the vertical poster URL from the provider CDN (Blob copy is a later
step; the URL is stored so the deck can render real art immediately)."""
from __future__ import annotations

from typing import Any

POSTER_SIZE = "w480"


def _poster(image_set: dict[str, Any]) -> dict[str, Any]:
    vp = (image_set or {}).get("verticalPoster") or {}
    url = vp.get(POSTER_SIZE) or vp.get("w360") or vp.get("w240") or ""
    return {"url": url, "blob": None}


def _availability(options: list[dict[str, Any]]) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for o in options or []:
        svc = (o.get("service") or {}).get("id")
        if not svc:
            continue
        out.append(
            {
                "service": svc,
                "type": o.get("type"),  # subscription | free | rent | buy | addon
                "link": o.get("link") or "",
                "expiresSoon": bool(o.get("expiresSoon")),
                "expiresOn": o.get("expiresOn"),
                "availableSince": o.get("availableSince"),
            }
        )
    return out


def to_catalog_doc(show: dict[str, Any], country: str) -> dict[str, Any]:
    """Return a catalog document, or raise KeyError if essential fields are missing."""
    options = (show.get("streamingOptions") or {}).get(country, [])
    return {
        "id": str(show["id"]),
        "country": country,
        "imdbId": show.get("imdbId"),
        "tmdbId": show.get("tmdbId"),
        "title": show["title"],
        "overview": show.get("overview") or "",
        "year": show.get("releaseYear"),
        "runtimeMin": show.get("runtime"),
        "genres": [g.get("name") for g in (show.get("genres") or []) if g.get("name")],
        "directors": show.get("directors") or [],
        "cast": (show.get("cast") or [])[:8],
        "rating": show.get("rating"),
        "poster": _poster(show.get("imageSet") or {}),
        "availability": _availability(options),
        "updatedAt": None,  # set by the ingest writer
    }
