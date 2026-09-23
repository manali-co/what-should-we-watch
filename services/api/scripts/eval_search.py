"""Vibe -> movie search-index evaluation.

Runs the REAL retrieval (Azure embedder + Cosmos vector search, exactly as the deck
does) over the fixed vibe benchmark, grades each result with an LLM judge, and reports
P@k / nDCG@k / MRR broken down by query shape (single / combo / custom) — so we can see
whether combos and free-text vibes are where retrieval falls apart.

This measures the INDEX (embed -> vector search), isolated from the LLM deck ranker:
low judge grades across the retrieved set = the right films never surface (index);
that's distinct from surfacing them and mis-ranking (a separate ranker eval).

Requires: WSWW_COSMOS_ENDPOINT + WSWW_OPENAI_ENDPOINT, an az login with Cosmos
data-plane read + Azure OpenAI access. Costs judge tokens: one call per query.

Run from services/api:
  WSWW_COSMOS_ENDPOINT=... WSWW_OPENAI_ENDPOINT=... \
    uv run --python 3.12 python scripts/eval_search.py --k 20 --out /tmp/eval
"""
from __future__ import annotations

import argparse
import json
import statistics
import sys
import time
from pathlib import Path
from typing import Any

# The eval core lives in packages/recs (pure, not vendored into the deploy zip).
sys.path.insert(0, str(Path(__file__).resolve().parents[3] / "packages" / "recs" / "src"))
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from wsww_recs.eval import metrics as M  # noqa: E402
from wsww_recs.eval.judge import build_judge_prompt, parse_judgments  # noqa: E402
from wsww_recs.eval.queries import benchmark  # noqa: E402


def _clients(judge_deployment: str) -> tuple[Any, Any, Any]:
    """Returns (candidates_fn, embed_fn, judge_fn) wired to real Azure services."""
    from wsww_api.db import get_raw_container
    from wsww_api.recs_adapter import AzureEmbedder, AzureRanker, build_openai_client
    from wsww_api.recs_engine import RecsEngine
    from wsww_api.settings import get_settings

    s = get_settings()
    if not s.openai_endpoint:
        raise SystemExit("WSWW_OPENAI_ENDPOINT is not set — cannot embed or judge.")
    client = build_openai_client(s.openai_endpoint)
    embedder = AzureEmbedder(client, s.embedding_deployment)
    ranker = AzureRanker(client, s.ranking_deployment)
    eng = RecsEngine(get_raw_container("catalog"), embedder, ranker)
    judge = AzureRanker(client, judge_deployment or s.ranking_deployment)
    return eng, embedder, judge


def _grades_in_rank_order(candidates: list[dict[str, Any]], by_id: dict[str, int]) -> list[int]:
    return [by_id.get(str(c["id"]), 0) for c in candidates]


def run(k: int, country: str, limit: int | None, judge_deployment: str) -> dict[str, Any]:
    eng, embedder, judge = _clients(judge_deployment)
    queries = benchmark()
    if limit:
        queries = queries[:limit]

    per_query: list[dict[str, Any]] = []
    for q in queries:
        text = ", ".join(q.moods) or "a good film tonight"
        vector = embedder.embed(text)
        cands = eng._candidates(country, [], vector, k)  # noqa: SLF001 - eval reaches in deliberately
        if not cands:
            per_query.append({"id": q.id, "shape": q.shape, "n": 0, "empty": True})
            continue
        judgments = parse_judgments(judge.rank(build_judge_prompt(q.moods, cands)))
        by_id = {j.id: j.grade for j in judgments}
        reasons = {j.id: j.reason for j in judgments}
        grades = _grades_in_rank_order(cands, by_id)
        per_query.append({
            "id": q.id, "shape": q.shape, "n": len(cands),
            "missing_judgments": sum(1 for c in cands if str(c["id"]) not in by_id),
            "p_at_5": M.precision_at_k(grades, 5),
            "p_at_10": M.precision_at_k(grades, 10),
            "ndcg_at_10": M.ndcg_at_k(grades, 10),
            "mrr": M.mrr(grades),
            "grade_hist": {g: grades.count(g) for g in (3, 2, 1, 0)},
            "top": [
                {"rank": i, "title": c.get("title"), "grade": by_id.get(str(c["id"]), None),
                 "why": reasons.get(str(c["id"]), "")}
                for i, c in enumerate(cands[:5])
            ],
        })

    scored = [r for r in per_query if not r.get("empty")]
    return {
        "k": k, "judge": judge_deployment, "n_queries": len(queries),
        "overall": _aggregate(scored),
        "by_shape": {sh: _aggregate([r for r in scored if r["shape"] == sh])
                     for sh in ("single", "combo", "custom")},
        "queries": per_query,
    }


def _aggregate(rows: list[dict[str, Any]]) -> dict[str, Any]:
    if not rows:
        return {"n": 0}
    mean = lambda key: round(statistics.fmean(r[key] for r in rows), 3)  # noqa: E731
    return {"n": len(rows), "p_at_5": mean("p_at_5"), "p_at_10": mean("p_at_10"),
            "ndcg_at_10": mean("ndcg_at_10"), "mrr": mean("mrr")}


def _print_summary(report: dict[str, Any]) -> None:
    o = report["overall"]
    print(f"\n=== vibe->movie index eval (k={report['k']}, judge={report['judge']}, "
          f"{report['n_queries']} queries) ===")
    print(f"{'shape':<8} {'n':>3}  {'P@5':>5} {'P@10':>5} {'nDCG@10':>7} {'MRR':>5}")
    for sh in ("single", "combo", "custom"):
        a = report["by_shape"][sh]
        if a["n"]:
            print(f"{sh:<8} {a['n']:>3}  {a['p_at_5']:>5} {a['p_at_10']:>5} "
                  f"{a['ndcg_at_10']:>7} {a['mrr']:>5}")
    print(f"{'ALL':<8} {o['n']:>3}  {o['p_at_5']:>5} {o['p_at_10']:>5} "
          f"{o['ndcg_at_10']:>7} {o['mrr']:>5}")
    # Worst queries — where the index is failing hardest.
    worst = sorted((r for r in report["queries"] if not r.get("empty")),
                   key=lambda r: r["ndcg_at_10"])[:5]
    print("\nweakest vibes (lowest nDCG@10):")
    for r in worst:
        print(f"  {r['ndcg_at_10']:.2f}  {r['id']}  (grades {r['grade_hist']})")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--k", type=int, default=20, help="candidates retrieved & judged per vibe")
    ap.add_argument("--country", default="us")
    ap.add_argument("--limit", type=int, default=0, help="cap #queries (0 = full benchmark)")
    ap.add_argument("--judge", default="", help="Azure judge deployment (else ranking one)")
    ap.add_argument("--out", default="", help="dir to write the full JSON report")
    args = ap.parse_args()

    t0 = time.time()
    report = run(args.k, args.country, args.limit or None, args.judge)
    report["seconds"] = round(time.time() - t0, 1)
    _print_summary(report)
    if args.out:
        out = Path(args.out)
        out.mkdir(parents=True, exist_ok=True)
        stamp = time.strftime("%Y%m%d-%H%M%S")
        path = out / f"eval-{stamp}.json"
        path.write_text(json.dumps(report, indent=2))
        print(f"\nfull report: {path}")


if __name__ == "__main__":
    main()
