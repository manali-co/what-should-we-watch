import pytest
from wsww_catalog.ingest import _carry_embedding


class FakeContainer:
    def __init__(self, items: dict) -> None:
        self._items = items

    def read_item(self, item: str, partition_key: str):
        if item in self._items:
            return self._items[item]
        raise KeyError("NotFound")


def _doc(**over):
    d = {"id": "1", "country": "us", "title": "A", "year": 2020,
         "genres": ["Drama"], "overview": "x", "directors": ["D"]}
    d.update(over)
    return d


def test_carry_embedding_new_title_returns_false() -> None:
    doc = _doc()
    assert _carry_embedding(FakeContainer({}), doc) is False
    assert "embedding" not in doc  # left to be embedded


def test_carry_embedding_unchanged_content_copies_over() -> None:
    stored = _doc(embedding=[0.1, 0.2], vibeLine="cozy and warm")
    doc = _doc()  # fresh from ingest, no embedding/vibeLine
    assert _carry_embedding(FakeContainer({"1": stored}), doc) is True
    assert doc["embedding"] == [0.1, 0.2]
    assert doc["vibeLine"] == "cozy and warm"


def test_carry_embedding_changed_content_re_embeds() -> None:
    stored = _doc(overview="OLD synopsis", embedding=[0.1], vibeLine="v")
    doc = _doc(overview="NEW synopsis")
    assert _carry_embedding(FakeContainer({"1": stored}), doc) is False
    assert "embedding" not in doc  # content changed -> must re-embed


def test_carry_embedding_existing_without_embedding_returns_false() -> None:
    stored = _doc()  # no embedding yet
    doc = _doc()
    assert _carry_embedding(FakeContainer({"1": stored}), doc) is False


@pytest.mark.parametrize("field,newval", [
    ("title", "B"), ("year", 2021), ("genres", ["Comedy"]), ("directors", ["E"]),
])
def test_carry_embedding_any_embeddable_field_change_re_embeds(field, newval) -> None:
    stored = _doc(embedding=[0.1], vibeLine="v")
    doc = _doc(**{field: newval})
    assert _carry_embedding(FakeContainer({"1": stored}), doc) is False
