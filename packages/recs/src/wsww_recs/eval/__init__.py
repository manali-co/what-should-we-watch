"""Offline evaluation of the vibe -> movie search index.

The deck pipeline is embed(mood) -> vector search TOP k -> LLM rank+explain. When
the deck feels "off" we need to know *where*: is the right film never surfaced by
retrieval (an index problem), or surfaced then mis-ranked / mis-explained (a ranking
problem)? This package measures both.

- `metrics`: pure ranking metrics (P@k, R@k, nDCG@k, MRR). No I/O, unit-tested.
- `queries`: the curated vibe set we evaluate against.
- `judge`: LLM-as-judge relevance grading (0-3) — we have no human labels, so a strong
  model is the "smart critic" standard we want retrieval to hit.

The runner that wires real Azure/OpenAI clients lives in the API package (which owns
those adapters); this package stays dependency-free.
"""
from .metrics import dcg, mrr, ndcg_at_k, precision_at_k, recall_at_k

__all__ = ["dcg", "mrr", "ndcg_at_k", "precision_at_k", "recall_at_k"]
