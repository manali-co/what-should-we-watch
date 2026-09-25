"""The vibe benchmark + mood-count ladders are the ruler for retrieval evals, so guard
their shape: nested ladders (N differs from N-1 by one added mood), both coherence
families present, counts 1..N, and the stable benchmark still emitting all three shapes."""
from __future__ import annotations

from wsww_recs.eval.queries import benchmark, mood_count_ladders


def test_benchmark_has_all_three_shapes() -> None:
    shapes = {q.shape for q in benchmark()}
    assert shapes == {"single", "combo", "custom"}
    assert all(q.moods for q in benchmark())  # never an empty mood list


def test_mood_count_ladders_are_nested_prefixes() -> None:
    ladders = mood_count_ladders(max_n=5)
    assert {q.family for q in ladders} == {"complementary", "conflicting"}
    # Group by seed (the id is "family:seed:nN") and check each is a growing prefix.
    by_seed: dict[str, list] = {}
    for q in ladders:
        family, seed, _ = q.id.split(":")
        by_seed.setdefault(f"{family}:{seed}", []).append(q)
    for seq in by_seed.values():
        seq.sort(key=lambda q: q.count)
        assert [q.count for q in seq] == list(range(1, len(seq) + 1))
        for q in seq:
            assert q.count == len(q.moods)
        # each step adds exactly one mood on top of the previous (nested)
        for prev, cur in zip(seq, seq[1:]):
            assert cur.moods[: prev.count] == prev.moods
            assert len(cur.moods) == prev.count + 1


def test_mood_count_ladders_respects_max_n() -> None:
    assert max(q.count for q in mood_count_ladders(max_n=3)) == 3
    assert all(q.count <= 3 for q in mood_count_ladders(max_n=3))
