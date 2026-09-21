from wsww_recs.engine import DeckRequest, Moment, RecsEngine, build_prompt


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
        self.last_prompt = None
    def rank(self, prompt):
        self.last_prompt = prompt
        return self._out


ROWS = [
    {"id": "a", "title": "A", "year": 2020, "runtimeMin": 100, "genres": ["Drama"],
     "overview": "x", "rating": 80, "poster": {"url": "http://p/a.jpg"},
     "availability": [{"service": "netflix", "type": "subscription", "link": "la"}]},
    {"id": "b", "title": "B", "year": 2021, "runtimeMin": 110, "genres": ["Comedy"],
     "overview": "y", "rating": 70, "poster": {"url": "http://p/b.jpg"},
     "availability": [{"service": "hulu", "type": "subscription", "link": "lb"}]},
]


def test_prompt_includes_moment_taste_and_history():
    req = DeckRequest(country="us", services=[], moods=["cozy"],
                      moment=Moment(daypart="evening", weekday="Friday", is_weekend=True, season="autumn", holiday="Halloween run-up"),
                      taste_notes="Loves slow dramas.",
                      recent_decisions=[{"action": "like", "title": "Past Film", "reaction": "loved", "moods": ["cozy"]}])
    p = build_prompt(req, [{"title": "A", "year": 2020, "genres": ["Drama"], "_service": "netflix", "overview": "x"}])
    assert "evening on Friday (weekend), autumn, Halloween run-up" in p
    assert "Loves slow dramas." in p
    assert "like: Past Film (they said loved)" in p


def test_deck_maps_picks_and_returns_taste_notes():
    ranker = FakeRanker('{"picks":[{"index":1,"why":"You wanted funny","wildcard":true}],"taste_notes":"Likes comedy."}')
    eng = RecsEngine(FakeContainer(ROWS), FakeEmbedder(), ranker)
    res = eng.deck(DeckRequest(country="us", services=[], moods=["big laughs"], limit=10))
    assert len(res.films) == 1
    assert res.films[0]["title"] == "B"
    assert res.films[0]["wildcard"] is True
    assert res.taste_notes == "Likes comedy."


def test_deck_filters_by_service():
    ranker = FakeRanker('{"picks":[{"index":0,"why":"w"}],"taste_notes":"n"}')
    eng = RecsEngine(FakeContainer(ROWS), FakeEmbedder(), ranker)
    res = eng.deck(DeckRequest(country="us", services=["netflix"], moods=["cozy"], limit=10))
    assert [c["title"] for c in res.films] == ["A"]


def test_garbled_llm_falls_back_and_keeps_old_notes():
    eng = RecsEngine(FakeContainer(ROWS), FakeEmbedder(), FakeRanker("not json"))
    res = eng.deck(DeckRequest(country="us", services=[], moods=["cozy"], taste_notes="old notes"))
    assert len(res.films) == 2
    assert res.taste_notes == "old notes"
