"""How many moods before retrieval degrades — and does coherence matter?

Runs the REAL retrieval (Azure embedder + Cosmos vector search, exactly as the deck does:
the moods are joined into ONE embedding vector) over controlled ladders, grades each
result set with the LLM judge, and reports P@k / nDCG@k / MRR broken down by
**mood count (1..N)** and **coherence family** (complementary vs conflicting).

Why ladders: each is an ordered mood list; query N is the first N moods, so N and N-1
differ by exactly one added mood. That isolates the marginal cost of stacking a mood, and
comparing the two families at each N shows whether *coherence* — not just count — is what
breaks results. Answers the product question behind the app's "a mood or two" copy with a
measured curve instead of a heuristic.

Measures the INDEX (embed -> vector search), isolated from the LLM deck ranker (same as
eval_search.py). Costs judge tokens: one call per ladder query (~30 for the default set).

Run from services/api:
  WSWW_COSMOS_ENDPOINT=... WSWW_OPENAI_ENDPOINT=... \
    uv run --python 3.12 python scripts/eval_mood_count.py --k 20 --out /tmp/eval
"""
from __future__ import annotations

import argparse
import json
import statistics
import time
from pathlib import Path
from typing import Any

from _eval_common import build_judge, clients  # noqa: E402
from wsww_recs.eval import metrics as M  # noqa: E402
from wsww_recs.eval.judge import build_judge_prompt, parse_judgments  # noqa: E402
from wsww_recs.eval.queries import mood_count_ladders  # noqa: E402

FAMILIES = ("complementary", "conflicting")


def run(k: int, country: str, max_n: int,
        judge_model: str, judge_effort: str, judge_deployment: str) -> dict[str, Any]:
    c = clients()
    eng, embedder = c["engine"], c["embedder"]
    judge, judge_label = build_judge(
        c["client"], c["settings"], judge_model, judge_effort, judge_deployment)
    queries = mood_count_ladders(max_n)

    per_query: list[dict[str, Any]] = []
    for q in queries:
        text = ", ".join(q.moods)
        vector = embedder.embed(text)
        cands = eng._candidates(country, [], vector, k)  # noqa: SLF001 - eval reaches in deliberately
        if not cands:
            per_query.append({
                "id": q.id, "family": q.family, "count": q.count, "empty": True,
                "p_at_5": 0.0, "ndcg_at_10": 0.0, "mrr": 0.0,
                "grade_hist": {3: 0, 2: 0, 1: 0, 0: 0}})
            continue
        judgments = parse_judgments(judge.rank(build_judge_prompt(q.moods, cands)))
        by_id = {j.id: j.grade for j in judgments}
        grades = [by_id.get(str(x["id"]), 0) for x in cands]
        per_query.append({
            "id": q.id, "family": q.family, "count": q.count, "empty": False,
            "p_at_5": M.precision_at_k(grades, 5),
            "ndcg_at_10": M.ndcg_at_k(grades, 10),
            "mrr": M.mrr(grades),
            "grade_hist": {g: grades.count(g) for g in (3, 2, 1, 0)},
        })

    return {
        "k": k, "judge": judge_label, "country": country, "max_n": max_n,
        "n_queries": len(queries), "n_empty": sum(1 for r in per_query if r.get("empty")),
        "by_count": {n: _agg([r for r in per_query if r["count"] == n])
                     for n in range(1, max_n + 1)},
        "by_family": {f: _agg([r for r in per_query if r["family"] == f]) for f in FAMILIES},
        "by_family_count": {
            f: {n: _agg([r for r in per_query if r["family"] == f and r["count"] == n])
                for n in range(1, max_n + 1)}
            for f in FAMILIES},
        "queries": per_query,
    }


def _agg(rows: list[dict[str, Any]]) -> dict[str, Any]:
    if not rows:
        return {"n": 0}
    mean = lambda key: round(statistics.fmean(r[key] for r in rows), 3)  # noqa: E731
    return {"n": len(rows), "p_at_5": mean("p_at_5"),
            "ndcg_at_10": mean("ndcg_at_10"), "mrr": mean("mrr")}


def _print_summary(rep: dict[str, Any]) -> None:
    print(f"\n=== mood-count x coherence eval (k={rep['k']}, judge={rep['judge']}, "
          f"{rep['n_queries']} queries, {rep['n_empty']} empty) ===")
    # Headline: nDCG@10 as moods stack, per family — the degradation curve.
    hdr = "  ".join(f"n={n}" for n in range(1, rep["max_n"] + 1))
    print(f"\nnDCG@10 by mood count:\n{'family':<14} {hdr}")
    for f in FAMILIES:
        cells = []
        for n in range(1, rep["max_n"] + 1):
            a = rep["by_family_count"][f][n]
            cells.append(f"{a['ndcg_at_10']:>4}" if a["n"] else "   -")
        print(f"{f:<14} {'   '.join(cells)}")
    print(f"\n{'count':<6} {'n':>3} {'P@5':>5} {'nDCG@10':>8} {'MRR':>5}")
    for n in range(1, rep["max_n"] + 1):
        a = rep["by_count"][n]
        if a["n"]:
            print(f"{n:<6} {a['n']:>3} {a['p_at_5']:>5} {a['ndcg_at_10']:>8} {a['mrr']:>5}")
    for f in FAMILIES:
        a = rep["by_family"][f]
        if a["n"]:
            print(f"{f:<6.6} {a['n']:>3} {a['p_at_5']:>5} {a['ndcg_at_10']:>8} "
                  f"{a['mrr']:>5}  (family)")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--k", type=int, default=20, help="candidates retrieved & judged per query")
    ap.add_argument("--country", default="us")
    ap.add_argument("--max-n", type=int, default=5, help="longest ladder (moods) to test")
    ap.add_argument("--judge", default="", help="Azure judge deployment (else ranking one)")
    ap.add_argument("--judge-model", default="", help="OpenAI judge, e.g. gpt-6-astra (needs key)")
    ap.add_argument("--judge-effort", default="low", help="reasoning effort (OpenAI judge)")
    ap.add_argument("--out", default="", help="dir to write the full JSON report")
    args = ap.parse_args()

    t0 = time.time()
    rep = run(args.k, args.country, args.max_n,
              args.judge_model, args.judge_effort, args.judge)
    rep["seconds"] = round(time.time() - t0, 1)
    _print_summary(rep)
    if args.out:
        out = Path(args.out)
        out.mkdir(parents=True, exist_ok=True)
        path = out / f"eval-moodcount-{time.strftime('%Y%m%d-%H%M%S')}.json"
        path.write_text(json.dumps(rep, indent=2))
        print(f"\nfull report: {path}")


if __name__ == "__main__":
    main()
