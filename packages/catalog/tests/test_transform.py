from wsww_catalog.transform import to_catalog_doc

SAMPLE = {
    "id": 20926897,
    "imdbId": "tt1312221",
    "tmdbId": "movie/1062722",
    "title": "Frankenstein",
    "overview": "A scientist brings a creature to life.",
    "releaseYear": 2025,
    "runtime": 152,
    "rating": 74,
    "genres": [{"name": "Drama"}, {"name": "Horror"}],
    "directors": ["Guillermo del Toro"],
    "cast": ["A", "B", "C", "D", "E", "F", "G", "H", "I"],
    "imageSet": {"verticalPoster": {"w360": "https://cdn/x_w360.jpg", "w480": "https://cdn/x_w480.jpg"}},
    "streamingOptions": {
        "us": [{"service": {"id": "netflix"}, "type": "subscription", "link": "https://netflix.com/title/1", "expiresSoon": False}]
    },
}


def test_maps_core_fields() -> None:
    d = to_catalog_doc(SAMPLE, "us")
    assert d["id"] == "20926897"
    assert d["country"] == "us"
    assert d["title"] == "Frankenstein"
    assert d["year"] == 2025
    assert d["runtimeMin"] == 152
    assert d["genres"] == ["Drama", "Horror"]
    assert d["cast"] == ["A", "B", "C", "D", "E", "F", "G", "H"]  # capped at 8


def test_poster_prefers_w480() -> None:
    d = to_catalog_doc(SAMPLE, "us")
    assert d["poster"]["url"] == "https://cdn/x_w480.jpg"
    assert d["poster"]["blob"] is None


def test_availability_flattened() -> None:
    d = to_catalog_doc(SAMPLE, "us")
    assert d["availability"] == [
        {"service": "netflix", "type": "subscription", "link": "https://netflix.com/title/1",
         "expiresSoon": False, "expiresOn": None, "availableSince": None}
    ]


def test_missing_poster_is_empty() -> None:
    s = dict(SAMPLE, imageSet={})
    d = to_catalog_doc(s, "us")
    assert d["poster"]["url"] == ""
