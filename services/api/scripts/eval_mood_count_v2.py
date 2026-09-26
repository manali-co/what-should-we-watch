"""Mood-count × coherence eval, v2 — trustworthy answer to "how many moods before results
degrade, and does coherence matter?" (see the v1 critique for why v1 was not).

What v2 fixes vs v1 (scripts/eval_mood_count.py):
- **Fixed relevance target (and/or semantics).** The judge grades each film against EACH
  mood SEPARATELY (build_permood_judge_prompt), so the yardstick doesn't shift or become
  impossible as N grows. Moods mean and/or, so we report two honest headlines:
    · any@5  = fraction of the top-5 that satisfy AT LEAST ONE picked mood (OR — "is it a
               good film for something I asked for"). Under OR this should hold up as N grows.
    · cov@5  = mean over the top-5 of (picked moods a film genuinely satisfies) / N — the
               AND-ness / blend quality. This is where coherence shows: complementary picks
               have films that satisfy several moods at once; conflicting picks don't.
- **P@k/coverage are the headline, not self-normalized nDCG** (which hides "good films never
  surfaced"). nDCG@10 (OR) + MRR are reported as secondary only.
- **Bootstrap 95% CIs** over queries per cell — so we only believe separations, not noise.
- **Count disentangled from mood identity**: a `random` family samples random N-subsets from
  a fixed pool (mood_count_random), alongside the coherence ladders (mood_count_ladders).
- **Independent judge**: pass --judge-model gpt-6-astra (needs WSWW_OPENAI_API_KEY) to avoid
  the ranker grading its own homework; --repeats N re-judges to estimate judge variance.

Measures the INDEX (embed -> vector search), isolated from the deck's LLM reranker.

Run from services/api:
  WSWW_COSMOS_ENDPOINT=... WSWW_OPENAI_ENDPOINT=... WSWW_OPENAI_API_KEY=... \
    uv run --python 3.12 python scripts/eval_mood_count_v2.py \
      --k 20 --judge-model gpt-6-astra --repeats 3 --out /tmp/eval
"""
from __future__ import annotations

import argparse
import json
import random
import statistics
import time
from pathlib import Path
from typing import Any

from _eval_common import build_judge, clients  # noqa: E402
from wsww_recs.eval import metrics as M  # noqa: E402
from wsww_recs.eval.judge import build_permood_judge_prompt, parse_permood_judgments  # noqa: E402
from wsww_recs.eval.queries import mood_count_ladders, mood_count_random  # noqa: E402

FAMILIES = ("complementary", "conflicting", "random")
REL = 2  # a grade >= 2 is a genuine fit for a mood


def _boot_ci(values: list[float], iters: int = 2000, seed: int = 1) -> tuple[float, float]:
    """Bootstrap 95% CI of the mean (percentile method)."""
    if len(values) < 2:
        return (values[0], values[0]) if values else (0.0, 0.0)
    rng = random.Random(seed)
    means = []
    n = len(values)
    for _ in range(iters):
        means.append(statistics.fmean(rng.choice(values) for _ in range(n)))
    means.sort()
    return (round(means[int(0.025 * iters)], 3), round(means[int(0.975 * iters)], 3))


def run(k: int, country: str, max_n: int, per_count: int, repeats: int,
        judge_model: str, judge_effort: str, judge_deployment: str) -> dict[str, Any]:
    c = clients()
    eng, embedder = c["engine"], c["embedder"]
    judge, judge_label = build_judge(
        c["client"], c["settings"], judge_model, judge_effort, judge_deployment)
    queries = mood_count_ladders(max_n) + mood_count_random(per_count, max_n)

    per_query: list[dict[str, Any]] = []
    for q in queries:
        vector = embedder.embed(", ".join(q.moods))
        cands = eng._candidates(country, [], vector, k)  # noqa: SLF001 - eval reaches in deliberately
        if not cands:
            per_query.append({"id": q.id, "family": q.family, "count": q.count, "empty": True,
                              "any_at_5": 0.0, "cov_at_5": 0.0, "ndcg_at_10": 0.0, "mrr": 0.0})
            continue
        # Average the per-mood grade matrix over `repeats` judge passes (judge-noise estimate).
        n_m = len(q.moods)
        acc: dict[str, list[float]] = {str(x["id"]): [0.0] * n_m for x in cands}
        for _ in range(max(1, repeats)):
            reply = judge.rank(build_permood_judge_prompt(q.moods, cands))
            for cid, row in parse_permood_judgments(reply, n_m).items():
                if cid in acc:
                    acc[cid] = [a + g for a, g in zip(acc[cid], row, strict=False)]
        r = max(1, repeats)
        matrix = {cid: [g / r for g in row] for cid, row in acc.items()}
        # and/or aggregation, in retrieval rank order.
        or_grades = [max(matrix.get(str(x["id"]), [0.0]), default=0.0) for x in cands]
        cov_frac = [sum(1 for g in matrix.get(str(x["id"]), []) if g >= REL) / n_m for x in cands]
        per_query.append({
            "id": q.id, "family": q.family, "count": q.count, "empty": False,
            "any_at_5": M.precision_at_k([round(g) for g in or_grades], 5),
            "cov_at_5": round(statistics.fmean(cov_frac[:5]), 3) if cov_frac else 0.0,
            "ndcg_at_10": M.ndcg_at_k([round(g) for g in or_grades], 10),
            "mrr": M.mrr([round(g) for g in or_grades]),
        })

    def cell(rows: list[dict[str, Any]]) -> dict[str, Any]:
        if not rows:
            return {"n": 0}
        anyv = [r["any_at_5"] for r in rows]
        covv = [r["cov_at_5"] for r in rows]
        return {"n": len(rows),
                "any_at_5": round(statistics.fmean(anyv), 3), "any_ci": _boot_ci(anyv),
                "cov_at_5": round(statistics.fmean(covv), 3), "cov_ci": _boot_ci(covv),
                "ndcg_at_10": round(statistics.fmean(r["ndcg_at_10"] for r in rows), 3),
                "mrr": round(statistics.fmean(r["mrr"] for r in rows), 3)}

    return {
        "k": k, "judge": judge_label, "country": country, "repeats": repeats,
        "n_queries": len(queries), "n_empty": sum(1 for r in per_query if r.get("empty")),
        "by_count": {n: cell([r for r in per_query if r["count"] == n])
                     for n in range(1, max_n + 1)},
        "by_family": {f: cell([r for r in per_query if r["family"] == f])
                      for f in FAMILIES},
        "by_family_count": {
            f: {n: cell([r for r in per_query if r["family"] == f and r["count"] == n])
                for n in range(1, max_n + 1)} for f in FAMILIES},
        "queries": per_query,
    }


def _print(rep: dict[str, Any]) -> None:
    print(f"\n=== mood-count x coherence eval v2 (k={rep['k']}, judge={rep['judge']}, "
          f"repeats={rep['repeats']}, {rep['n_queries']} queries, {rep['n_empty']} empty) ===")
    print("\nany@5 (satisfies ≥1 picked mood — OR) by count [95% CI]:")
    _grid(rep, "any_at_5", "any_ci")
    print("\ncov@5 (fraction of picked moods a top pick satisfies — AND-ness) by count [95% CI]:")
    _grid(rep, "cov_at_5", "cov_ci")
    print(f"\n{'family':<14} {'n':>3} {'any@5':>6} {'cov@5':>6} {'nDCG@10':>8} {'MRR':>5}")
    for f in FAMILIES:
        a = rep["by_family"][f]
        if a.get("n"):
            print(f"{f:<14} {a['n']:>3} {a['any_at_5']:>6} {a['cov_at_5']:>6} "
                  f"{a['ndcg_at_10']:>8} {a['mrr']:>5}")


def _grid(rep: dict[str, Any], key: str, ci: str) -> None:
    ns = sorted(rep["by_count"].keys())
    print(f"{'family':<14} " + "  ".join(f"n={n:<10}" for n in ns))
    for f in FAMILIES:
        cells = []
        for n in ns:
            a = rep["by_family_count"][f][n]
            if a.get("n"):
                lo, hi = a[ci]
                cells.append(f"{a[key]:.2f}[{lo:.2f},{hi:.2f}]")
            else:
                cells.append("     -     ")
        print(f"{f:<14} " + "  ".join(f"{c:<12}" for c in cells))


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--k", type=int, default=20)
    ap.add_argument("--country", default="us")
    ap.add_argument("--max-n", type=int, default=5)
    ap.add_argument("--per-count", type=int, default=5, help="random subsets per count")
    ap.add_argument("--repeats", type=int, default=1, help="judge passes per query (variance)")
    ap.add_argument("--judge", default="", help="Azure judge deployment (else ranking one)")
    ap.add_argument("--judge-model", default="", help="OpenAI judge, e.g. gpt-6-astra")
    ap.add_argument("--judge-effort", default="low")
    ap.add_argument("--out", default="")
    args = ap.parse_args()

    t0 = time.time()
    rep = run(args.k, args.country, args.max_n, args.per_count, args.repeats,
              args.judge_model, args.judge_effort, args.judge)
    rep["seconds"] = round(time.time() - t0, 1)
    _print(rep)
    if args.out:
        out = Path(args.out)
        out.mkdir(parents=True, exist_ok=True)
        path = out / f"eval-moodcount-v2-{time.strftime('%Y%m%d-%H%M%S')}.json"
        path.write_text(json.dumps(rep, indent=2))
        print(f"\nfull report: {path}")


if __name__ == "__main__":
    main()
