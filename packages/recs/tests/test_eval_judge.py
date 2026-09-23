from wsww_recs.eval.judge import build_judge_prompt, parse_judgments
from wsww_recs.eval.queries import benchmark


def test_prompt_includes_vibe_and_every_film() -> None:
    films = [
        {"id": "a", "title": "A", "year": 2020, "genres": ["comedy"], "overview": "funny"},
        {"id": "b", "title": "B", "year": 2019, "genres": [], "overview": ""},
    ]
    p = build_judge_prompt(["cozy", "big laughs"], films)
    assert "cozy, big laughs" in p
    assert "id=a" in p and "id=b" in p
    assert "no description" in p  # empty overview handled


def test_parse_plain_json() -> None:
    raw = '{"grades": [{"id": "a", "grade": 3, "reason": "spot on"}, {"id": "b", "grade": 0, "reason": "no"}]}'
    js = parse_judgments(raw)
    assert [(j.id, j.grade) for j in js] == [("a", 3), ("b", 0)]


def test_parse_wrapped_in_prose_and_clamps() -> None:
    raw = 'Sure!\n{"grades": [{"id": "a", "grade": 7}, {"id": "b", "grade": -2}]}\nHope that helps'
    js = parse_judgments(raw)
    assert {j.id: j.grade for j in js} == {"a": 3, "b": 0}  # clamped into 0..3


def test_parse_garbage_is_empty() -> None:
    assert parse_judgments("not json at all") == []
    assert parse_judgments("") == []


def test_parse_skips_malformed_rows() -> None:
    raw = '{"grades": [{"id": "a", "grade": 2}, {"no_id": true}, {"id": "c", "grade": "x"}]}'
    js = parse_judgments(raw)
    assert {j.id: j.grade for j in js} == {"a": 2, "c": 0}  # c's bad grade -> 0, kept


def test_benchmark_has_all_three_shapes_and_stable_ids() -> None:
    qs = benchmark()
    shapes = {q.shape for q in qs}
    assert shapes == {"single", "combo", "custom"}
    ids = [q.id for q in qs]
    assert len(ids) == len(set(ids))  # unique
    # multi-mood and custom sentences are represented
    assert any(len(q.moods) >= 2 for q in qs if q.shape == "combo")
    assert any(q.shape == "custom" for q in qs)
