"""
Single-paper lookup tool.
"""
from processing_agent.services import openalex_service as oa


async def get_work_details_tool(work_id: str) -> dict:
    """Fetch one paper by OpenAlex ID or DOI, normalized to the internal Paper schema."""
    try:
        paper = await oa.get_work(work_id)
    except oa.OpenAlexError as exc:
        return {"status": "error", "message": str(exc)}
    return {"status": "ok", "paper": paper.model_dump()}
