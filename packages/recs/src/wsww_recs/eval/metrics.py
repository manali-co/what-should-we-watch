"""Pure ranking-quality metrics. No I/O — take graded relevance, return numbers.

Relevance is graded 0..3 (the judge scale): 0 irrelevant, 1 weak, 2 good, 3 ideal.
For binary metrics (precision/recall/MRR) a grade is "relevant" at or above a
threshold (default 2 — a genuine, defensible fit, not a stretch).
"""
from __future__ import annotations

import math

REL_THRESHOLD = 2


def _rel(grade: int, threshold: int = REL_THRESHOLD) -> bool:
    return grade >= threshold


def precision_at_k(grades: list[int], k: int, threshold: int = REL_THRESHOLD) -> float:
    """Fraction of the top-k retrieved items that are relevant.

    Denominator is min(k, len) so a short result list isn't unfairly penalised for
    positions that never existed."""
    if k <= 0:
        raise ValueError("k must be positive")
    top = grades[:k]
    if not top:
        return 0.0
    hits = sum(1 for g in top if _rel(g, threshold))
    return hits / len(top)


def recall_at_k(grades: list[int], total_relevant: int, k: int,
                threshold: int = REL_THRESHOLD) -> float:
    """Fraction of all known-relevant items that appear in the top-k.

    `total_relevant` is the size of the known relevant set (e.g. from pooled judging);
    with no known relevant items recall is defined as 1.0 (nothing to miss)."""
    if k <= 0:
        raise ValueError("k must be positive")
    if total_relevant <= 0:
        return 1.0
    hits = sum(1 for g in grades[:k] if _rel(g, threshold))
    return hits / total_relevant


def dcg(gains: list[float], k: int | None = None) -> float:
    """Discounted cumulative gain over the ranked gains (log2 position discount).

    Position i (1-based) contributes gain_i / log2(i + 1)."""
    if k is not None:
        gains = gains[:k]
    return sum(g / math.log2(i + 2) for i, g in enumerate(gains))


def ndcg_at_k(grades: list[int], k: int, ideal_grades: list[int] | None = None) -> float:
    """Normalised DCG@k: DCG of the actual ranking over DCG of the best possible
    ranking of the same grades. Uses graded gains directly (0..3).

    Pass `ideal_grades` when the ideal ordering draws from a larger judged pool than
    the retrieved list (pooled eval); otherwise the retrieved grades are their own
    ideal source (a self-normalised nDCG)."""
    if k <= 0:
        raise ValueError("k must be positive")
    actual = dcg([float(g) for g in grades], k)
    ideal_source = ideal_grades if ideal_grades is not None else grades
    ideal = dcg(sorted((float(g) for g in ideal_source), reverse=True), k)
    if ideal == 0.0:
        return 0.0
    return actual / ideal


def mrr(grades: list[int], threshold: int = REL_THRESHOLD) -> float:
    """Reciprocal rank of the first relevant item (0 if none). Rewards getting a
    genuinely good pick near the top — what the deck's first card needs to be."""
    for i, g in enumerate(grades):
        if _rel(g, threshold):
            return 1.0 / (i + 1)
    return 0.0
