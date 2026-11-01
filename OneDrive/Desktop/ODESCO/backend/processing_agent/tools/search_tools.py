"""
The `search_works` tool exposed to the LLM, plus the entity-resolution
sub-workflow (master prompt §4.1) that turns a named author/institution/
journal/topic into an OpenAlex filter ID without ever letting the LLM
invent an ID itself.
"""
from __future__ import annotations

from config import settings
from models.paper import Paper
from processing_agent.services import openalex_service as oa
from processing_agent.tools.filtering_tools import filter_papers, rank_papers

_ENTITY_FILTER_FIELD = {
    "author": "authorships.author.id",
    "institution": "authorships.institutions.id",
    "source": "primary_location.source.id",
    "topic": "topics.id",
}


async def resolve_entity(entity_type: str, name: str) -> dict:
    """
    Resolves a named entity to an OpenAlex ID.
    Default disambiguation (master prompt §12.4): if one candidate is clearly
    dominant, auto-select it and report the choice; otherwise flag ambiguous
    so the agent can ask the user via a `clarification` message.
    """
    candidates = await oa.search_entity(entity_type, name)
    if not candidates:
        return {"resolved": False, "reason": "no_matches", "candidates": []}

    if len(candidates) == 1:
        return {"resolved": True, "entity": candidates[0], "candidates": candidates}

    # dominance heuristic: top candidate's works_count/cited_by_count is
    # meaningfully larger (>3x) than the runner-up, or exact name match
    metric = "works_count" if entity_type != "topic" else "works_count"
    top, runner_up = candidates[0], candidates[1]
    top_val = top.get(metric) or 0
    runner_val = runner_up.get(metric) or 1
    exact_match = (top.get("display_name") or "").lower() == name.lower()

    if exact_match or (runner_val > 0 and top_val >= runner_val * 3):
        return {"resolved": True, "entity": top, "candidates": candidates}

    return {"resolved": False, "reason": "ambiguous", "candidates": candidates}


async def search_works_tool(
    query: str | None = None,
    entity_name: str | None = None,
    entity_type: str | None = None,
    from_date: str | None = None,
    to_date: str | None = None,
    work_type: str | None = None,
    open_access: bool | None = None,
    ranking_strategy: str = "balanced",
    max_results: int = 20,
) -> dict:
    """
    Agent-facing tool. Handles the full search_works pipeline described in
    master prompt §4.2: resolve entity (if named) -> build filters -> call
    OpenAlex -> deterministic filter -> deterministic rank -> return top N.
    """
    filters: dict = {}
    clarification = None

    if not query and not (entity_name and entity_type):
        return {
            "status": "error",
            "message": (
                "search_works requires either `query` (topic keywords) or `entity_name`+"
                "`entity_type` (a specific author/institution/journal/topic). A blank search "
                "isn't allowed — it returns an unfiltered, essentially random slice of all of "
                "OpenAlex. Reformulate using the actual topic already established in this "
                "conversation."
            ),
        }

    if entity_name and entity_type:
        resolution = await resolve_entity(entity_type, entity_name)
        if not resolution["resolved"]:
            return {
                "status": "needs_clarification",
                "reason": resolution["reason"],
                "candidates": resolution["candidates"],
            }
        field = _ENTITY_FILTER_FIELD[entity_type]
        filters[field] = resolution["entity"]["id"]

    if from_date:
        filters["from_publication_date"] = from_date
    if to_date:
        filters["to_publication_date"] = to_date
    if work_type:
        filters["type"] = work_type
    if open_access is not None:
        filters["is_oa"] = str(open_access).lower()

    # Cost policy: only use full-text search when there's a free-text query
    # AND no already-resolved entity filter driving the result set (§5.4).
    use_fulltext_search = bool(query) and not filters

    fetch_count = min(max(max_results * 2, max_results), settings.MAX_RESULTS_PER_SEARCH)
    papers: list[Paper] = await oa.search_works(
        query=query,
        filters=filters or None,
        per_page=fetch_count,
        use_fulltext_search=use_fulltext_search,
    )

    papers = filter_papers(papers)
    papers = rank_papers(papers, strategy=ranking_strategy)
    papers = papers[:max_results]

    return {
        "status": "ok",
        "count": len(papers),
        "papers": [p.model_dump() for p in papers],
    }