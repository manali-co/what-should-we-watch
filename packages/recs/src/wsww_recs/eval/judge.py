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


def build_permood_judge_prompt(moods: list[str], films: list[dict[str, Any]]) -> str:
    """Grade each film against EACH mood SEPARATELY (a film×mood matrix), in one call.

    This keeps the relevance yardstick fixed as the mood count grows: instead of asking
    "does this fit all N moods at once" (impossible/ill-defined for conflicting picks), we
    ask per mood, then the runner aggregates and/or (max = satisfies any; coverage = how
    many it genuinely satisfies). Moods are referenced by index (m0, m1, …) so free-text
    tags with spaces/punctuation stay stable JSON keys."""
    keyed = [(f"m{i}", m) for i, m in enumerate(moods)]
    mood_lines = "\n".join(f"{k} = {m}" for k, m in keyed)
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
    keys = ", ".join(k for k, _ in keyed)
    return f"""You are a sharp film critic. Grade how well each film fits EACH mood, one mood at a time.

The moods:
{mood_lines}

For EVERY film, grade it 0 to 3 against EACH mood ON ITS OWN — judge feel and mood, not
just genre labels. A film can fit one mood strongly and another not at all; grade each
independently. Be honest and discriminating: most films are not a 3 on any given mood.

{RUBRIC}

Films:
{catalog}

Reply with ONLY JSON, no prose:
{{"films": [{{"id": "<id>", "grades": {{{", ".join(f'"{k}": <0-3>' for k, _ in keyed)}}}}}]}}
Include every film's id once, and every mood key ({keys}) for each film."""


def parse_permood_judgments(raw: str, n_moods: int) -> dict[str, list[int]]:
    """Parse the film×mood matrix into {film_id: [grade per mood index]} (length n_moods,
    missing entries → 0). Tolerant of fences/prose; clamps grades; drops malformed rows."""
    text = raw.strip()
    start, end = text.find("{"), text.rfind("}")
    if start == -1 or end == -1 or end <= start:
        return {}
    try:
        data = json.loads(text[start : end + 1])
    except json.JSONDecodeError:
        return {}
    rows = data.get("films") if isinstance(data, dict) else None
    if not isinstance(rows, list):
        return {}
    out: dict[str, list[int]] = {}
    for r in rows:
        if not isinstance(r, dict) or "id" not in r:
            continue
        g_obj = r.get("grades")
        grades: dict[str, Any] = g_obj if isinstance(g_obj, dict) else {}
        row: list[int] = []
        for i in range(n_moods):
            try:
                g = int(grades.get(f"m{i}", 0))
            except (TypeError, ValueError):
                g = 0
            row.append(max(GRADE_MIN, min(GRADE_MAX, g)))
        out[str(r["id"])] = row
    return out


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
