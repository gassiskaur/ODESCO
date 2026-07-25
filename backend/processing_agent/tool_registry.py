"""
The four v1 tools (master prompt §4), registered once with:
  - a JSON-schema description for Gemini's function-calling API
  - a Python callable to actually execute it

Everything beyond these four (citation network, topic/gap analysis, saved
projects, full-text PDF analysis) is explicitly deferred to v2 — do not add
tools here without updating the master prompt first (§12.12).
"""
from processing_agent.tools.analysis_tools import analyze_papers_tool, compare_papers_tool
from processing_agent.tools.paper_tools import get_work_details_tool
from processing_agent.tools.search_tools import search_works_tool

TOOL_DECLARATIONS = [
    {
        "name": "search_works",
        "description": (
            "Search OpenAlex for scholarly works. Use `entity_name`+`entity_type` "
            "when the user names a specific author/institution/journal/topic "
            "(resolved to an exact OpenAlex ID before filtering — never guess an ID "
            "yourself). Use `query` for free-text/topical searches. Prefer filters "
            "over free-text query when an entity is already known, to reduce cost."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "Free-text topical search terms."},
                "entity_name": {"type": "string", "description": "Name of an author, institution, journal, or topic mentioned by the user."},
                "entity_type": {"type": "string", "enum": ["author", "institution", "source", "topic"]},
                "from_date": {"type": "string", "description": "YYYY-MM-DD lower bound on publication date."},
                "to_date": {"type": "string", "description": "YYYY-MM-DD upper bound on publication date."},
                "work_type": {"type": "string", "description": "e.g. article, book, dataset."},
                "open_access": {"type": "boolean"},
                "ranking_strategy": {
                    "type": "string",
                    "enum": ["balanced", "recency_priority", "citation_priority"],
                    "description": "How to rank results. Pick based on user intent.",
                },
                "max_results": {"type": "integer", "description": "Default 20, max 50."},
            },
        },
    },
    {
        "name": "get_work_details",
        "description": "Fetch full normalized details for a single paper by its OpenAlex ID or DOI.",
        "parameters": {
            "type": "object",
            "properties": {"work_id": {"type": "string"}},
            "required": ["work_id"],
        },
    },
    {
        "name": "analyze_papers",
        "description": (
            "Retrieve abstract-level data (title, abstract, authors, topics) for a set "
            "of papers so you can write an analysis. v1 is abstract-level only — do not "
            "claim methodology/results detail beyond what the abstract supports."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "paper_ids": {"type": "array", "items": {"type": "string"}},
                "collection_id": {"type": "string", "description": "Use the active collection from context if the user says 'these' or 'the results'."},
            },
        },
    },
    {
        "name": "compare_papers",
        "description": "Retrieve abstract-level data for 2+ papers so you can write a cross-paper comparison.",
        "parameters": {
            "type": "object",
            "properties": {
                "paper_ids": {"type": "array", "items": {"type": "string"}},
                "collection_id": {"type": "string"},
            },
        },
    },
]

TOOL_DISPATCH = {
    "search_works": search_works_tool,
    "get_work_details": get_work_details_tool,
    "analyze_papers": analyze_papers_tool,
    "compare_papers": compare_papers_tool,
}


async def execute_tool(name: str, args: dict) -> dict:
    fn = TOOL_DISPATCH.get(name)
    if fn is None:
        return {"status": "error", "message": f"Unknown tool: {name}"}
    try:
        return await fn(**args)
    except TypeError as exc:
        return {"status": "error", "message": f"Bad arguments for {name}: {exc}"}
