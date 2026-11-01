"""
analyze_papers / compare_papers tools.

Per master prompt §4: these tools do NOT make a second LLM round trip.
They gather the already-normalized paper data (title/abstract/metadata —
abstract-level only in v1, §12.5) from `research_collections` and hand it
back to the agent loop; the actual analysis/comparison text is produced by
the LLM's own next turn, reasoning directly over this data.
"""
from bson import ObjectId

from db import collections_collection


async def _load_papers(paper_ids: list[str] | None, collection_id: str | None) -> list[dict]:
    if collection_id:
        doc = await collections_collection().find_one({"collection_id": collection_id})
        if not doc:
            return []
        papers = doc.get("papers", [])
        if paper_ids:
            wanted = set(paper_ids)
            papers = [p for p in papers if p.get("openalex_id") in wanted]
        return papers

    if paper_ids:
        # search across any collection in case ids span multiple prior searches
        cursor = collections_collection().find({"paper_ids": {"$in": paper_ids}})
        found: dict[str, dict] = {}
        async for doc in cursor:
            for p in doc.get("papers", []):
                if p.get("openalex_id") in paper_ids:
                    found[p["openalex_id"]] = p
        return list(found.values())

    return []


async def analyze_papers_tool(paper_ids: list[str] | None = None, collection_id: str | None = None) -> dict:
    papers = await _load_papers(paper_ids, collection_id)
    if not papers:
        return {"status": "error", "message": "No matching papers found for analysis."}

    return {
        "status": "ok",
        "scope": "abstract_level",  # v1 constraint, be explicit for the LLM's phrasing
        "papers": [
            {
                "openalex_id": p.get("openalex_id"),
                "title": p.get("title"),
                "abstract": p.get("abstract"),
                "publication_year": p.get("publication_year"),
                "authors": [a.get("name") for a in p.get("authors", [])],
                "topics": [t.get("display_name") for t in p.get("topics", [])],
                "citation_count": p.get("citation_count"),
            }
            for p in papers
        ],
    }


async def compare_papers_tool(paper_ids: list[str] | None = None, collection_id: str | None = None) -> dict:
    # Comparison needs the same underlying data as analysis; the LLM performs
    # the cross-paper synthesis itself once it has this in context.
    result = await analyze_papers_tool(paper_ids, collection_id)
    if result["status"] != "ok":
        return result
    if len(result["papers"]) < 2:
        return {"status": "error", "message": "Need at least 2 papers to compare."}
    return result
