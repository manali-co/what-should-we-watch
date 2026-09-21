from wsww_recs.engine import RecsEngine, build_prompt


class FakeContainer:
    def __init__(self, rows):
        self._rows = rows
    def query_items(self, query, **kwargs):
        return list(self._rows)


class FakeEmbedder:
    def embed(self, text):
        return [0.1, 0.2, 0.3]


class FakeRanker:
    def __init__(self, out):
        self._out = out
    def rank(self, prompt):
        return self._out


ROWS = [
    {"id": "a", "title": "A", "year": 2020, "runtimeMin": 100, "genres": ["Drama"],
     "overview": "x", "rating": 80, "poster": {"url": "http://p/a.jpg"},
     "availability": [{"service": "netflix", "type": "subscription", "link": "la"}]},
    {"id": "b", "title": "B", "year": 2021, "runtimeMin": 110, "genres": ["Comedy"],
     "overview": "y", "rating": 70, "poster": {"url": "http://p/b.jpg"},
     "availability": [{"service": "hulu", "type": "subscription", "link": "lb"}]},
]


def test_prompt_lists_candidates_by_index():
    p = build_prompt(["cozy"], [{"title": "A", "year": 2020, "genres": ["Drama"], "_service": "netflix", "overview": "x"}], 10)
    assert "0. A (2020)" in p
    assert "cozy" in p


def test_deck_maps_llm_picks_to_cards():
    eng = RecsEngine(FakeContainer(ROWS), FakeEmbedder(),
                     FakeRanker('{"picks":[{"index":1,"why":"You wanted funny","wildcard":true}]}'))
    cards = eng.deck("us", [], ["big laughs"], limit=10)
    assert len(cards) == 1
    assert cards[0]["title"] == "B"
    assert cards[0]["why"] == "You wanted funny"
    assert cards[0]["wildcard"] is True
    assert cards[0]["posterUrl"] == "http://p/b.jpg"


def test_deck_filters_by_service():
    eng = RecsEngine(FakeContainer(ROWS), FakeEmbedder(),
                     FakeRanker('{"picks":[{"index":0,"why":"w"},{"index":1,"why":"w"}]}'))
    cards = eng.deck("us", ["netflix"], ["cozy"], limit=10)
    # only A is on netflix; index mapping is over the filtered candidate list
    assert [c["title"] for c in cards] == ["A"]


def test_garbled_llm_falls_back_to_candidates():
    eng = RecsEngine(FakeContainer(ROWS), FakeEmbedder(), FakeRanker("not json at all"))
    cards = eng.deck("us", [], ["cozy"], limit=10)
    assert len(cards) == 2  # falls back to the vector candidates
