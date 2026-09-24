"""#41 experiment: does embedding VIBE (not plot) improve vibe->movie retrieval?

Samples N films and A/Bs two embedding texts on a focused query set — same films, same
judge, ONLY the embedded text changes:
  - old: the current plot-forward text (title / genres / director / overview), i.e. the
    film's stored production embedding.
  - new: a vibe-forward text — an LLM mood/tone line ("how it feels, the occasion it
    suits") + genres + title, spoken in the same register as the mood queries.

Reports nDCG@10 / P@10 old vs new so we can see the lift before committing to a full
catalog re-embed. Cheap by design: retrieval is a local cosine rank over the sample, and
each query's top-k under BOTH embeddings is judged once (the union) and reused.

Run from services/api (see eval_search.py for env). Optional Astra judge:
  ... uv run --python 3.12 python scripts/eval_embed_ab.py --n 60 --judge-model gpt-6-astra
"""
from __future__ import annotations

import argparse
import json
import math
import statistics
import time
from pathlib import Path
from typing import Any

from _eval_common import build_judge, clients
from wsww_recs.eval import metrics as M
from wsww_recs.eval.judge import build_judge_prompt, parse_judgments
from wsww_recs.eval.queries import benchmark

# Focused query set for the A/B: enough signal, few judge calls. Weak customs included
# deliberately — that's where vibe embeddings should help most.
_FOCUS_IDS = {
    "single:cozy", "single:edge of the seat", "single:properly scary", "single:nostalgic",
    "combo:cozy+big laughs", "combo:edge of the seat+outer space", "combo:dark and twisty+whodunit",
    "custom:0", "custom:1", "custom:2", "custom:6", "custom:8",
}


def _cosine(a: list[float], b: list[float]) -> float:
    # Dimension mismatch (e.g. a record from an older embedding deployment) would make a
    # truncated dot product with full-length norms — an invalid score. Reject it.
    if len(a) != len(b):
        return 0.0
    dot = sum(x * y for x, y in zip(a, b, strict=True))
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(y * y for y in b))
    return dot / (na * nb) if na and nb else 0.0


def _vibe_line(client: Any, deployment: str, film: dict[str, Any]) -> str:
    genres = ", ".join(film.get("genres") or []) or "—"
    overview = (film.get("overview") or "")[:600]
    prompt = (
        "Describe the MOOD and VIBE of this film for someone choosing what to watch "
        "tonight — how it FEELS, the occasion/mood it suits, its tone and energy. Use "
        "feeling words, not plot summary. 30 words max, one line.\n\n"
        f"Title: {film.get('title')} ({film.get('year')})\nGenres: {genres}\n"
        f"Overview: {overview}"
    )
    r = client.chat.completions.create(
        model=deployment, messages=[{"role": "user", "content": prompt}],
        max_completion_tokens=200)
    return (r.choices[0].message.content or "").strip().replace("\n", " ")


def _sample(container: Any, n: int, country: str) -> list[dict[str, Any]]:
    # ORDER BY id makes the sample deterministic so A/B runs are comparable.
    rows = list(container.query_items(
        query=("SELECT TOP @n c.id, c.title, c.year, c.genres, c.overview, c.embedding "
               "FROM c WHERE c.country = @country AND IS_ARRAY(c.embedding) ORDER BY c.id"),
        parameters=[{"name": "@n", "value": n}, {"name": "@country", "value": country}],
        partition_key=country,
    ))
    return rows


def _metrics_for_ranking(ranked: list[dict[str, Any]], grades: dict[str, int]) -> dict[str, float]:
    g = [grades.get(str(f["id"]), 0) for f in ranked]
    return {"p_at_10": M.precision_at_k(g, 10), "ndcg_at_10": M.ndcg_at_k(g, 10), "mrr": M.mrr(g)}


def run(n: int, country: str, judge_model: str, judge_effort: str,
        judge_deployment: str) -> dict[str, Any]:
    c = clients()
    client, embedder, s = c["client"], c["embedder"], c["settings"]
    judge, judge_label = build_judge(client, s, judge_model, judge_effort, judge_deployment)

    films = _sample(c["engine"]._c, n, country)  # noqa: SLF001 - eval reaches in deliberately
    if not films:
        raise SystemExit("no embedded films sampled")
    # Build the vibe-forward embedding for each sampled film.
    for f in films:
        line = _vibe_line(client, s.ranking_deployment, f)
        genres = ", ".join(f.get("genres") or [])
        f["_vibe_line"] = line
        f["_emb_new"] = embedder.embed(f"{line} | {genres} | {f.get('title')}")
        f["_emb_old"] = f["embedding"]

    queries = [q for q in benchmark() if q.id in _FOCUS_IDS]
    per_query: list[dict[str, Any]] = []
    for q in queries:
        qv = embedder.embed(", ".join(q.moods) or "a good film tonight")
        old_rank = sorted(films, key=lambda f: _cosine(qv, f["_emb_old"]), reverse=True)
        new_rank = sorted(films, key=lambda f: _cosine(qv, f["_emb_new"]), reverse=True)
        union = {str(f["id"]): f for f in old_rank[:15] + new_rank[:15]}
        judgments = parse_judgments(build_and_judge(judge, q.moods, list(union.values())))
        grades = {j.id: j.grade for j in judgments}
        per_query.append({
            "id": q.id, "shape": q.shape,
            "old": _metrics_for_ranking(old_rank, grades),
            "new": _metrics_for_ranking(new_rank, grades),
        })
    return {"n_films": len(films), "judge": judge_label, "country": country,
            "film_ids": [str(f["id"]) for f in films],  # record the sample for reproducibility
            "queries": per_query, "summary": _summarise(per_query),
            "vibe_samples": [{"title": f["title"], "vibe": f["_vibe_line"]} for f in films[:8]]}


def build_and_judge(judge: Any, moods: list[str], films: list[dict[str, Any]]) -> str:
    return judge.rank(build_judge_prompt(moods, films))


def _summarise(rows: list[dict[str, Any]]) -> dict[str, Any]:
    def mean(side: str, metric: str) -> float:
        return round(statistics.fmean(r[side][metric] for r in rows), 3)
    out = {}
    for metric in ("ndcg_at_10", "p_at_10", "mrr"):
        old, new = mean("old", metric), mean("new", metric)
        out[metric] = {"old": old, "new": new, "delta": round(new - old, 3)}
    return out


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--n", type=int, default=60, help="films sampled for the A/B (1-500)")
    ap.add_argument("--country", default="us")
    ap.add_argument("--judge", default="", help="Azure judge deployment (else ranking one)")
    ap.add_argument("--judge-model", default="", help="OpenAI judge, e.g. gpt-6-astra (needs key)")
    ap.add_argument("--judge-effort", default="low")
    ap.add_argument("--out", default="")
    args = ap.parse_args()

    n = max(1, min(args.n, 500))  # bound the sample before making per-film Azure calls
    t0 = time.time()
    report = run(n, args.country, args.judge_model, args.judge_effort, args.judge)
    report["seconds"] = round(time.time() - t0, 1)
    s = report["summary"]
    print(f"\n=== #41 embed A/B (n={report['n_films']} films, judge={report['judge']}, "
          f"{len(report['queries'])} vibes) ===")
    print(f"{'metric':<10} {'old':>6} {'new':>6} {'delta':>7}")
    for m in ("ndcg_at_10", "p_at_10", "mrr"):
        print(f"{m:<10} {s[m]['old']:>6} {s[m]['new']:>6} {s[m]['delta']:>+7}")
    print("\nper-vibe nDCG@10 (old -> new):")
    def _lift(r: dict[str, Any]) -> float:
        return r["new"]["ndcg_at_10"] - r["old"]["ndcg_at_10"]
    for r in sorted(report["queries"], key=_lift):
        o, nw = r["old"]["ndcg_at_10"], r["new"]["ndcg_at_10"]
        print(f"  {o:.2f} -> {nw:.2f}  ({nw - o:+.2f})  {r['id']}")
    print("\nsample vibe lines:")
    for v in report["vibe_samples"][:5]:
        print(f"  {v['title']}: {v['vibe']}")
    if args.out:
        out = Path(args.out)
        out.mkdir(parents=True, exist_ok=True)
        path = out / f"embed-ab-{time.strftime('%Y%m%d-%H%M%S')}.json"
        path.write_text(json.dumps(report, indent=2))
        print(f"\nfull report: {path}")


if __name__ == "__main__":
    main()
