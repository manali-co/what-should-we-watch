from wsww_recs.engine import (
    DeckRequest,
    Moment,
    Participant,
    RecsEngine,
    ShortlistRequest,
    build_prompt,
    build_shortlist_prompt,
)


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


KEPT = [
    {"id": "a", "title": "A", "year": 2020, "runtimeMin": 100, "service": "netflix", "action": "like"},
    {"id": "b", "title": "B", "year": 2021, "runtimeMin": 110, "service": "hulu", "action": "maybe"},
]


def test_rank_shortlist_reorders_fills_why_and_verdict():
    ranker = FakeRanker(
        '{"order":["b","a"],"picks":[{"id":"b","why":"Your Friday comedy"},'
        '{"id":"a","why":"Slower, for after"}],"verdict":"Tonight, B."}'
    )
    eng = RecsEngine(FakeContainer([]), FakeEmbedder(), ranker)
    res = eng.rank_shortlist(ShortlistRequest(kept=KEPT, moods=["big laughs"]))
    assert [f["id"] for f in res.films] == ["b", "a"]
    assert res.films[0]["why"] == "Your Friday comedy"
    assert res.verdict == "Tonight, B."


def test_rank_shortlist_appends_films_the_model_dropped():
    ranker = FakeRanker('{"order":["b"],"picks":[{"id":"b","why":"w"}],"verdict":"v"}')
    eng = RecsEngine(FakeContainer([]), FakeEmbedder(), ranker)
    res = eng.rank_shortlist(ShortlistRequest(kept=KEPT))
    assert [f["id"] for f in res.films] == ["b", "a"]  # 'a' kept, appended at the end


def test_rank_shortlist_garbled_keeps_original_order():
    eng = RecsEngine(FakeContainer([]), FakeEmbedder(), FakeRanker("not json"))
    res = eng.rank_shortlist(ShortlistRequest(kept=KEPT))
    assert [f["id"] for f in res.films] == ["a", "b"]
    assert res.verdict == ""


def test_group_shortlist_uses_the_group_ranker_solo_uses_the_deck_ranker():
    solo = FakeRanker('{"order":["a"],"picks":[{"id":"a","why":"x"}],"verdict":"solo"}')
    group = FakeRanker('{"order":["a"],"picks":[{"id":"a","why":"y"}],"verdict":"group"}')
    eng = RecsEngine(FakeContainer([]), FakeEmbedder(), solo, group)
    assert eng.rank_shortlist(ShortlistRequest(kept=KEPT)).verdict == "solo"
    grouped = eng.rank_shortlist(ShortlistRequest(kept=KEPT, participants=[Participant(name="Jo")]))
    assert grouped.verdict == "group"


def test_group_ranker_defaults_to_deck_ranker_when_unset():
    solo = FakeRanker('{"order":["a"],"picks":[{"id":"a","why":"x"}],"verdict":"only"}')
    eng = RecsEngine(FakeContainer([]), FakeEmbedder(), solo)  # no group_ranker
    assert eng.rank_shortlist(ShortlistRequest(kept=KEPT, participants=[Participant(name="Jo")])).verdict == "only"


def test_rank_shortlist_empty():
    eng = RecsEngine(FakeContainer([]), FakeEmbedder(), FakeRanker("{}"))
    res = eng.rank_shortlist(ShortlistRequest(kept=[]))
    assert res.films == [] and res.verdict == ""


def test_group_shortlist_prompt_includes_people_votes_and_floor_rule():
    req = ShortlistRequest(
        kept=KEPT,
        participants=[
            Participant(name="Jo", taste_notes="Loves cosy.", votes={"a": "like", "b": "pass"}),
            Participant(name="Sam", taste_notes="Likes strange.", votes={"a": "maybe", "b": "like"}),
        ],
    )
    p = build_shortlist_prompt(req)
    assert "GROUP" in p and "maximise the floor" in p
    assert "Jo:" in p and "a=like" in p and "b=pass" in p
    assert "A group of 2" in p


def test_solo_shortlist_prompt_uses_taste_and_moment():
    req = ShortlistRequest(
        kept=KEPT, moods=["cozy"], taste_notes="Loves slow dramas.",
        moment=Moment(daypart="evening", weekday="Friday", is_weekend=True, season="autumn"),
    )
    p = build_shortlist_prompt(req)
    assert "ONE viewer" in p and "Loves slow dramas." in p
    assert "evening on Friday (weekend), autumn" in p
