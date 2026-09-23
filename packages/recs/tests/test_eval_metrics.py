import math

import pytest

from wsww_recs.eval.metrics import dcg, mrr, ndcg_at_k, precision_at_k, recall_at_k


def test_precision_at_k_counts_relevant_in_topk() -> None:
    # grades: [3,1,2,0,2] -> relevant (>=2) at positions 0,2,4
    assert precision_at_k([3, 1, 2, 0, 2], 3) == pytest.approx(2 / 3)
    assert precision_at_k([3, 1, 2, 0, 2], 5) == pytest.approx(3 / 5)


def test_precision_short_list_not_penalised_for_missing_positions() -> None:
    # only 2 results but k=5 -> denominator is 2, not 5
    assert precision_at_k([3, 2], 5) == pytest.approx(1.0)


def test_precision_empty_is_zero() -> None:
    assert precision_at_k([], 5) == 0.0


def test_recall_at_k_over_known_relevant_set() -> None:
    # 3 relevant retrieved in top-5, 6 relevant known in the pool
    assert recall_at_k([3, 1, 2, 0, 2], total_relevant=6, k=5) == pytest.approx(3 / 6)


def test_recall_no_known_relevant_is_one() -> None:
    assert recall_at_k([0, 0], total_relevant=0, k=2) == 1.0


def test_dcg_matches_hand_computation() -> None:
    # gains [3,2,1]: 3/log2(2) + 2/log2(3) + 1/log2(4)
    expected = 3 / math.log2(2) + 2 / math.log2(3) + 1 / math.log2(4)
    assert dcg([3, 2, 1]) == pytest.approx(expected)


def test_ndcg_perfect_ranking_is_one() -> None:
    # already in ideal (descending) order
    assert ndcg_at_k([3, 2, 1, 0], 4) == pytest.approx(1.0)


def test_ndcg_reversed_ranking_below_one() -> None:
    good = ndcg_at_k([3, 2, 1], 3)
    bad = ndcg_at_k([1, 2, 3], 3)
    assert bad < good == pytest.approx(1.0)
    assert 0.0 < bad < 1.0


def test_ndcg_all_zero_is_zero() -> None:
    assert ndcg_at_k([0, 0, 0], 3) == 0.0


def test_ndcg_with_pooled_ideal() -> None:
    # retrieved two grade-2s, but the pool had two grade-3s that were missed
    val = ndcg_at_k([2, 2], k=2, ideal_grades=[3, 3, 2, 2])
    ideal = 3 / math.log2(2) + 3 / math.log2(3)
    actual = 2 / math.log2(2) + 2 / math.log2(3)
    assert val == pytest.approx(actual / ideal)


def test_mrr_first_relevant_position() -> None:
    assert mrr([0, 1, 2, 3]) == pytest.approx(1 / 3)  # first >=2 at index 2
    assert mrr([3]) == pytest.approx(1.0)
    assert mrr([0, 1, 1]) == 0.0
