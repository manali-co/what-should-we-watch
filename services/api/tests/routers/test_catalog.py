from wsww_api.db import InMemoryContainer
from wsww_api.repositories import CatalogRepo


def test_deck_filters_by_service_and_needs_poster() -> None:
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
    assert titles == {"A"}  # B is hulu-only, NoPoster has no image


def test_deck_no_service_filter_returns_all_with_poster() -> None:
    c = InMemoryContainer()
    repo = CatalogRepo(c)
    for i in range(3):
        c.upsert({"id": str(i), "_pk": "us", "country": "us", "title": f"T{i}", "rating": 50 + i,
                  "poster": {"url": f"http://p/{i}.jpg"}, "overview": "o",
                  "availability": [{"service": "netflix", "type": "subscription", "link": "l"}]})
    got = repo.deck("us", [], 10)
    assert len(got) == 3
