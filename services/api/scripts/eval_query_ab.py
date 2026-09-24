"""#43 experiment: does EXPANDING the mood query improve retrieval?

The deck embeds the raw joined moods (`embed(", ".join(moods))`) — which blends multiple
moods into one muddy vector and can't represent negations ("not depressing"). This A/Bs
that against an **LLM-expanded** query: the moods rewritten into a rich vibe description in
the same register the films are now embedded in (see #41), turning "not X" into its
positive, and blending combos coherently.

Same live vibe-forward index, same judge — ONLY the query vector changes. Reports
nDCG@10 / P@10 / MRR old (raw) vs new (expanded), by query shape. Cheap: each vibe's
top-k under both queries is judged once (the union) and reused.

Run from services/api (see eval_search.py for env). Astra judge:
  ... uv run --python 3.12 python scripts/eval_query_ab.py --judge-model gpt-6-astra
"""
from __future__ import annotations

import argparse
import json
import statistics
import time
from pathlib import Path
from typing import Any

from _eval_common import build_judge, clients
from wsww_recs.eval import metrics as M
from wsww_recs.eval.judge import build_judge_prompt, parse_judgments
from wsww_recs.eval.queries import benchmark

# Weak/representative vibes (the ones the raw query handles worst — negations, combos,
# abstract). Keeping the set small keeps judge cost down.
_FOCUS_IDS = {
    "single:cozy", "single:brain off", "single:edge of the seat",
    "combo:edge of the seat+outer space", "combo:dark and twisty+whodunit",
    "combo:mind-bender+slow burn",
    "custom:0", "custom:1", "custom:2", "custom:6", "custom:8", "custom:9",
}


def expand_query(client: Any, deployment: str, moods: list[str]) -> str:
    """Rewrite the picked moods into a rich vibe description in the films' own register.
    Handles negation (state the positive) and blends multiple moods into one coherent feel."""
    vibe = ", ".join(moods) or "a good film tonight"
    prompt = (
        "A viewer picked these vibes for tonight's film: "
        f'"{vibe}".\n\n'
        "Write a vivid 1-2 sentence description of the KIND of film they want — the feel, "
        "tone, energy, and occasion — in mood language, not plot. Rules:\n"
        "- If a vibe is a negation (\"not X\", \"without X\", \"but not X\"), express the "
        "POSITIVE they DO want instead (e.g. \"not depressing\" -> \"uplifting or emotionally "
        "satisfying\"). Never mention what to avoid.\n"
        "- Blend multiple vibes into ONE coherent feel, don't list them.\n"
        "- Describe how the film FEELS to watch. Output only the description."
    )
    r = client.chat.completions.create(
        model=deployment, messages=[{"role": "user", "content": prompt}],
        max_completion_tokens=200,
    )
    return " ".join((r.choices[0].message.content or "").split()[:60])


def _metrics(ranked: list[dict[str, Any]], grades: dict[str, int]) -> dict[str, float]:
    g = [grades.get(str(f["id"]), 0) for f in ranked]
    return {"p_at_10": M.precision_at_k(g, 10), "ndcg_at_10": M.ndcg_at_k(g, 10), "mrr": M.mrr(g)}


def run(k: int, country: str, judge_model: str, judge_effort: str,
        judge_deployment: str) -> dict[str, Any]:
    c = clients()
    eng, embedder, client, s = c["engine"], c["embedder"], c["client"], c["settings"]
    judge, judge_label = build_judge(client, s, judge_model, judge_effort, judge_deployment)

    queries = [q for q in benchmark() if q.id in _FOCUS_IDS]
    per_query: list[dict[str, Any]] = []
    samples: list[dict[str, str]] = []
    for q in queries:
        raw_vec = embedder.embed(", ".join(q.moods) or "a good film tonight")
        exp_text = expand_query(client, s.ranking_deployment, q.moods)
        exp_vec = embedder.embed(exp_text)
        raw_cands = eng._candidates(country, [], raw_vec, k)  # noqa: SLF001 - eval reaches in
        exp_cands = eng._candidates(country, [], exp_vec, k)  # noqa: SLF001
        if not raw_cands and not exp_cands:
            continue
        union = {str(f["id"]): f for f in raw_cands[:15] + exp_cands[:15]}
        judgments = parse_judgments(judge.rank(build_judge_prompt(q.moods, list(union.values()))))
        grades = {j.id: j.grade for j in judgments}
        per_query.append({"id": q.id, "shape": q.shape,
                          "old": _metrics(raw_cands, grades), "new": _metrics(exp_cands, grades)})
        samples.append({"id": q.id, "raw": ", ".join(q.moods), "expanded": exp_text})

    return {"judge": judge_label, "k": k, "queries": per_query,
            "summary": _summarise(per_query), "samples": samples}


def _summarise(rows: list[dict[str, Any]]) -> dict[str, Any]:
    if not rows:
        return {}
    out = {}
    for metric in ("ndcg_at_10", "p_at_10", "mrr"):
        old = round(statistics.fmean(r["old"][metric] for r in rows), 3)
        new = round(statistics.fmean(r["new"][metric] for r in rows), 3)
        out[metric] = {"old": old, "new": new, "delta": round(new - old, 3)}
    return out


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--k", type=int, default=20)
    ap.add_argument("--country", default="us")
    ap.add_argument("--judge", default="")
    ap.add_argument("--judge-model", default="", help="OpenAI judge, e.g. gpt-6-astra (needs key)")
    ap.add_argument("--judge-effort", default="low")
    ap.add_argument("--out", default="")
    args = ap.parse_args()

    t0 = time.time()
    report = run(args.k, args.country, args.judge_model, args.judge_effort, args.judge)
    report["seconds"] = round(time.time() - t0, 1)
    s = report["summary"]
    print(f"\n=== #43 query-expansion A/B (judge={report['judge']}, "
          f"{len(report['queries'])} vibes) ===")
    print(f"{'metric':<10} {'raw':>6} {'exp':>6} {'delta':>7}")
    for m in ("ndcg_at_10", "p_at_10", "mrr"):
        print(f"{m:<10} {s[m]['old']:>6} {s[m]['new']:>6} {s[m]['delta']:>+7}")
    print("\nper-vibe nDCG@10 (raw -> expanded):")
    def _lift(r: dict[str, Any]) -> float:
        return r["new"]["ndcg_at_10"] - r["old"]["ndcg_at_10"]
    for r in sorted(report["queries"], key=_lift):
        o, nw = r["old"]["ndcg_at_10"], r["new"]["ndcg_at_10"]
        print(f"  {o:.2f} -> {nw:.2f}  ({nw - o:+.2f})  {r['id']}")
    print("\nexpansion samples:")
    for v in report["samples"][:6]:
        print(f"  [{v['raw']}] -> {v['expanded']}")
    if args.out:
        out = Path(args.out)
        out.mkdir(parents=True, exist_ok=True)
        path = out / f"query-ab-{time.strftime('%Y%m%d-%H%M%S')}.json"
        path.write_text(json.dumps(report, indent=2))
        print(f"\nfull report: {path}")


if __name__ == "__main__":
    main()
