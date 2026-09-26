"""The vibe benchmark: a fixed, versioned set of queries the search index is scored on.

Three shapes, because that's how people actually pick (apps/mobile design/data.ts):
  - `single`  one mood tag from the 30-mood taxonomy.
  - `combo`   several tags at once — the common case, and the hardest for retrieval
              because the deck blends them into ONE embedding vector (a known leak:
              "cozy" + "edge of the seat" average into mush).
  - `custom`  a free natural-language sentence the user typed — no tag at all, so the
              plot-trained embeddings have never seen anything like it.

Keep this list STABLE: it's the before/after ruler. Add queries, don't rewrite them,
or historical runs stop comparing. `moods` is exactly what the app sends to /catalog/deck.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

Shape = Literal["single", "combo", "custom"]


@dataclass(frozen=True)
class VibeQuery:
    id: str
    moods: list[str]
    shape: Shape


# The 30 taxonomy tags, one representative per hue group kept plus the high-weight ones.
_SINGLE = [
    "cozy", "date night", "quiet and tender",
    "mind-bender", "dark and twisty", "sharp satire",
    "slow burn", "rainy Sunday", "comfort rewatch",
    "big laughs", "brain off", "feel-good",
    "a proper epic", "outer space", "nostalgic",
    "edge of the seat", "properly scary", "heist energy", "whodunit",
]

# Realistic multi-mood picks. Some are coherent (cozy + big laughs = the design's
# "cozy and funny" Paddington card); some are deliberately in tension (properly scary +
# feel-good) because users DO combine across the grain and retrieval must cope.
_COMBO = [
    ["cozy", "big laughs"],
    ["date night", "feel-good"],
    ["dark and twisty", "whodunit"],
    ["edge of the seat", "outer space"],
    ["mind-bender", "slow burn"],
    ["heist energy", "big laughs"],
    ["rainy Sunday", "comfort rewatch", "nostalgic"],
    ["properly scary", "spooky not scary"],
    ["a proper epic", "true story"],
    ["sharp satire", "brain off"],
    ["coming of age", "cry it out"],
    ["road trip", "feel-good", "big laughs"],
]

# Free sentences, the way someone types when the tags don't fit. These stress the index
# hardest: no vocabulary overlap with genre/plot text.
_CUSTOM = [
    ["something to fall asleep to that isn't boring"],
    ["a warm hug after a terrible day"],
    ["mind-bending but not depressing"],
    ["makes me want to book a flight somewhere"],
    ["clever heist with people I'd want to get drinks with"],
    ["quietly devastating, the kind that stays with you"],
    ["dumb fun I don't have to think about"],
    ["visually stunning, story optional"],
    ["scary but I still want to sleep tonight"],
    ["feels like autumn and a cup of tea"],
]


def benchmark() -> list[VibeQuery]:
    out: list[VibeQuery] = []
    for m in _SINGLE:
        out.append(VibeQuery(id=f"single:{m}", moods=[m], shape="single"))
    for combo in _COMBO:
        out.append(VibeQuery(id="combo:" + "+".join(combo), moods=list(combo), shape="combo"))
    for i, c in enumerate(_CUSTOM):
        out.append(VibeQuery(id=f"custom:{i}", moods=list(c), shape="custom"))
    return out


# --- Mood-count × coherence ladders -------------------------------------------------
# A controlled set to answer "how many moods before results degrade, and does coherence
# matter?". Each ladder is an ORDERED list; query N takes the first N moods, so N and N-1
# differ by exactly ONE added mood — isolating the marginal effect of stacking a mood.
#   complementary = moods that cohere (the blended query vector stays meaningful as it grows)
#   conflicting   = moods pulled across the grain (the averaged vector should muddy)
# At N=1 the two families are just single coherent moods and should track together; the
# hypothesis is that conflicting ladders diverge (fall) as N grows while complementary hold.
# All moods are drawn from the taxonomy the app actually sends (see _SINGLE / _COMBO).
@dataclass(frozen=True)
class LadderQuery:
    id: str
    moods: list[str]
    family: Literal["complementary", "conflicting", "random"]
    count: int


_LADDERS: list[tuple[str, str, list[str]]] = [  # (family, seed, ordered moods)
    ("complementary", "cozy", ["cozy", "quiet and tender", "rainy Sunday", "comfort rewatch", "feel-good"]),
    ("complementary", "twisty", ["edge of the seat", "heist energy", "whodunit", "dark and twisty", "mind-bender"]),
    ("complementary", "laughs", ["big laughs", "feel-good", "date night", "brain off", "nostalgic"]),
    ("conflicting", "cozy-wild", ["cozy", "edge of the seat", "properly scary", "big laughs", "mind-bender"]),
    ("conflicting", "light-dark", ["feel-good", "dark and twisty", "cry it out", "brain off", "a proper epic"]),
    ("conflicting", "calm-chaos", ["quiet and tender", "heist energy", "big laughs", "properly scary", "outer space"]),
]


def mood_count_ladders(max_n: int = 5) -> list[LadderQuery]:
    """Nested ladders: for each seed, queries of length 1..max_n (prefixes of the ladder).
    Fixes the COHERENCE axis (complementary vs conflicting) while count varies."""
    out: list[LadderQuery] = []
    for family, seed, moods in _LADDERS:
        for n in range(1, min(max_n, len(moods)) + 1):
            out.append(LadderQuery(
                id=f"{family}:{seed}:n{n}", moods=moods[:n],
                family=family, count=n,  # type: ignore[arg-type]
            ))
    return out


# A neutral pool for the pure COUNT axis: random N-subsets disentangle "how many moods"
# from "which specific moods / who authored the family label" (the ladders' confound).
_RANDOM_POOL = [
    "cozy", "big laughs", "mind-bender", "slow burn", "properly scary", "feel-good",
    "date night", "heist energy", "dark and twisty", "nostalgic", "edge of the seat",
    "a proper epic", "whodunit", "rainy Sunday", "outer space", "sharp satire",
]


def mood_count_random(per_count: int = 5, max_n: int = 5, rng_seed: int = 7) -> list[LadderQuery]:
    """Deterministically sample `per_count` distinct random N-subsets from a fixed pool for
    each N=1..max_n (family="random"). Averaging over many random subsets per N isolates the
    count effect from mood identity, complementing the coherence ladders."""
    import random as _random

    rng = _random.Random(rng_seed)
    out: list[LadderQuery] = []
    for n in range(1, min(max_n, len(_RANDOM_POOL)) + 1):
        seen: set[tuple[str, ...]] = set()
        attempts = 0
        while len(seen) < per_count and attempts < per_count * 40:
            attempts += 1
            subset = tuple(sorted(rng.sample(_RANDOM_POOL, n)))
            if subset in seen:
                continue
            seen.add(subset)
            out.append(LadderQuery(
                id=f"random:n{n}:{len(seen)}", moods=list(subset), family="random", count=n))
    return out
