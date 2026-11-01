"""
Deterministic filtering/ranking math. The LLM selects a *strategy name*;
Python owns the actual weights and arithmetic (master prompt §4.2 / §12.11).
"""
from datetime import datetime, timezone

from models.paper import Paper

# Named ranking presets — the actual v1 spec (master prompt §12.11), not examples.
RANKING_PRESETS = {
    "balanced": {"relevance": 0.50, "recency": 0.25, "citations": 0.15, "open_access": 0.10},
    "recency_priority": {"relevance": 0.30, "recency": 0.50, "citations": 0.15, "open_access": 0.05},
    "citation_priority": {"relevance": 0.30, "recency": 0.10, "citations": 0.55, "open_access": 0.05},
}


def _recency_score(paper: Paper, current_year: int) -> float:
    if not paper.publication_year:
        return 0.0
    age = max(current_year - paper.publication_year, 0)
    # linear decay over 10 years, floors at 0
    return max(0.0, 1.0 - age / 10)


def _citation_score(paper: Paper, max_citations: int) -> float:
    if max_citations <= 0:
        return 0.0
    return min(paper.citation_count / max_citations, 1.0)


def rank_papers(
    papers: list[Paper],
    strategy: str = "balanced",
    relevance_scores: dict[str, float] | None = None,
) -> list[Paper]:
    """
    Sorts papers by a weighted composite score. `relevance_scores` maps
    openalex_id -> a 0..1 relevance value (e.g. derived from OpenAlex's own
    relevance_score when a full-text search was used); defaults to 0.5 for
    filter-only queries where relevance isn't meaningful.
    """
    weights = RANKING_PRESETS.get(strategy, RANKING_PRESETS["balanced"])
    relevance_scores = relevance_scores or {}
    current_year = datetime.now(timezone.utc).year
    max_citations = max((p.citation_count for p in papers), default=0)

    def score(paper: Paper) -> float:
        relevance = relevance_scores.get(paper.openalex_id, 0.5)
        recency = _recency_score(paper, current_year)
        citations = _citation_score(paper, max_citations)
        oa = 1.0 if paper.open_access else 0.0
        return (
            weights["relevance"] * relevance
            + weights["recency"] * recency
            + weights["citations"] * citations
            + weights["open_access"] * oa
        )

    return sorted(papers, key=score, reverse=True)


def filter_papers(
    papers: list[Paper],
    min_year: int | None = None,
    max_year: int | None = None,
    open_access_only: bool = False,
    work_type: str | None = None,
) -> list[Paper]:
    """Deterministic post-filter, applied in Python after OpenAlex results return."""
    result = papers
    if min_year is not None:
        result = [p for p in result if p.publication_year and p.publication_year >= min_year]
    if max_year is not None:
        result = [p for p in result if p.publication_year and p.publication_year <= max_year]
    if open_access_only:
        result = [p for p in result if p.open_access]
    if work_type:
        result = [p for p in result if p.work_type == work_type]
    return result
