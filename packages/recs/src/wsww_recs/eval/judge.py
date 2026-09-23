"""LLM-as-judge relevance grading for the vibe benchmark.

We have no human labels, so a strong model grades how well each retrieved film fits a
vibe — the "smart critic" standard we want retrieval to hit. The judge sees only what a
person deciding would: title, year, genres, overview. It never sees the vibe's rank or
score, so its grade is independent of the retriever being tested.

Pure: builds a prompt and parses the reply. The runner supplies the model call (any
`wsww_recs.engine.Ranker`) — ideally a different/stronger model than the one under test,
to avoid a model grading its own homework.
"""
from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any

GRADE_MIN, GRADE_MAX = 0, 3

RUBRIC = (
    "3 = ideal: squarely this vibe, you'd lead the recommendation with it.\n"
    "2 = good: a genuine, defensible fit for the vibe.\n"
    "1 = weak: only loosely related; a stretch.\n"
    "0 = irrelevant: does not fit this vibe."
)


@dataclass(frozen=True)
class Judgment:
    id: str
    grade: int
    reason: str


def build_judge_prompt(moods: list[str], films: list[dict[str, Any]]) -> str:
    """`films` are candidate dicts with id/title/year/genres/overview (retrieval output)."""
    vibe = ", ".join(moods) if moods else "a good film tonight"
    lines = []
    for f in films:
        genres = ", ".join(f.get("genres") or []) or "—"
        overview = (f.get("overview") or "").strip().replace("\n", " ")
        if len(overview) > 400:
            overview = overview[:400] + "…"
        lines.append(
            f'- id={f["id"]} | {f.get("title", "?")} ({f.get("year", "?")}) '
            f"| genres: {genres}\n  {overview or 'no description'}"
        )
    catalog = "\n".join(lines)
    return f"""You are a sharp film critic grading how well each film matches a viewer's vibe.

The viewer's vibe: "{vibe}"

Grade EVERY film below from 0 to 3 for how well it fits THAT vibe — judge the feel and
mood, not just genre labels. Be honest and discriminating: most films are not a 3.

{RUBRIC}

Films:
{catalog}

Reply with ONLY JSON, no prose:
{{"grades": [{{"id": "<id>", "grade": <0-3>, "reason": "<one short clause>"}}]}}
Include every film's id exactly once."""


def parse_judgments(raw: str) -> list[Judgment]:
    """Tolerant parse: accepts a bare JSON object or one wrapped in text/fences.
    Clamps grades into range and drops malformed rows rather than raising."""
    text = raw.strip()
    start, end = text.find("{"), text.rfind("}")
    if start == -1 or end == -1 or end <= start:
        return []
    try:
        data = json.loads(text[start : end + 1])
    except json.JSONDecodeError:
        return []
    rows = data.get("grades") if isinstance(data, dict) else None
    if not isinstance(rows, list):
        return []
    out: list[Judgment] = []
    for r in rows:
        if not isinstance(r, dict) or "id" not in r:
            continue
        try:
            grade = int(r.get("grade", 0))
        except (TypeError, ValueError):
            grade = 0
        grade = max(GRADE_MIN, min(GRADE_MAX, grade))
        out.append(Judgment(id=str(r["id"]), grade=grade, reason=str(r.get("reason", ""))))
    return out
