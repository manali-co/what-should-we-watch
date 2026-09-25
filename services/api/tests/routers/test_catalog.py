import time

from wsww_api.db import InMemoryContainer
from wsww_api.repositories import CatalogRepo


def test_deck_excludes_expired_availability() -> None:
    c = InMemoryContainer()
    repo = CatalogRepo(c)
    past = int(time.time()) - 86400  # left the service yesterday
    c.upsert({"id": "live", "_pk": "us", "country": "us", "title": "Live", "rating": 80,
              "poster": {"url": "http://p/1.jpg"}, "overview": "x",
              "availability": [{"service": "netflix", "type": "subscription", "link": "l"}]})
    c.upsert({"id": "gone", "_pk": "us", "country": "us", "title": "Gone", "rating": 99,
              "poster": {"url": "http://p/2.jpg"}, "overview": "y",
              "availability": [{"service": "netflix", "type": "subscription",
                                "link": "l", "expiresOn": past}]})
    titles = {f["title"] for f in repo.deck("us", ["netflix"], 10)}
    assert titles == {"Live"}  # the expired film is dropped even though it's higher-rated


def test_deck_filters_by_service_and_keeps_no_poster() -> None:
    c = InMemoryContainer()
    repo = CatalogRepo(c)
    c.upsert({"id": "1", "_pk": "us", "country": "us", "title": "A", "year": 2020, "rating": 80,
              "poster": {"url": "http://p/1.jpg"}, "overview": "x",
              "availability": [{"service": "netflix", "type": "subscription", "link": "l"}]})
    c.upsert({"id": "2", "_pk": "us", "country": "us", "title": "B", "year": 2021, "rating": 90,
              "poster": {"url": "http://p/2.jpg"}, "overview": "y",
              "availability": [{"service": "hulu", "type": "subscription", "link": "l"}]})
    c.upsert({"id": "3", "_pk": "us", "country": "us", "title": "NoPoster", "rating": 99,
              "poster": {"url": ""}, "overview": "z",
              "availability": [{"service": "netflix", "type": "subscription", "link": "l"}]})
    got = repo.deck("us", ["netflix"], 10)
    titles = {f["title"] for f in got}
    # B is hulu-only (filtered out); NoPoster stays in — a missing image is not a reason
    # to hide an available film, it renders a purpose-built card with posterUrl=None.
    assert titles == {"A", "NoPoster"}
    assert next(f["posterUrl"] for f in got if f["title"] == "NoPoster") is None


def test_deck_no_service_filter_returns_all_with_poster() -> None:
    c = InMemoryContainer()
    repo = CatalogRepo(c)
    for i in range(3):
        c.upsert({"id": str(i), "_pk": "us", "country": "us", "title": f"T{i}", "rating": 50 + i,
                  "poster": {"url": f"http://p/{i}.jpg"}, "overview": "o",
                  "availability": [{"service": "netflix", "type": "subscription", "link": "l"}]})
    got = repo.deck("us", [], 10)
    assert len(got) == 3
