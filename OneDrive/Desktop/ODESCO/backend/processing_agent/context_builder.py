"""
Assembles what actually gets sent to the LLM each turn: a bounded window of
recent messages (not the full history) plus a short summary of the active
collection, so "compare these" resolves without re-sending full paper JSON
every turn (master prompt §6.3, §12.8, §12.9).
"""
from db import collections_collection, messages_collection

RECENT_MESSAGE_LIMIT = 12


async def load_recent_messages(session_id: str) -> list[dict]:
    cursor = (
        messages_collection()
        .find({"session_id": session_id})
        .sort("created_at", -1)
        .limit(RECENT_MESSAGE_LIMIT)
    )
    docs = [doc async for doc in cursor]
    docs.reverse()
    return docs


async def get_active_collection_summary(session_id: str) -> tuple[str | None, str | None]:
    """Returns (collection_id, human_summary) for the most recent collection in this session."""
    doc = await (
        collections_collection()
        .find({"session_id": session_id})
        .sort("created_at", -1)
        .limit(1)
        .to_list(length=1)
    )
    if not doc:
        return None, None
    d = doc[0]
    summary = f"'{d['name']}' — {len(d.get('paper_ids', []))} papers (collection_id={d['collection_id']})"
    return d["collection_id"], summary


def to_gemini_history(messages: list[dict]) -> list[dict]:
    """Converts stored Mongo message docs into Gemini `contents` format."""
    history = []
    for m in messages:
        role = "user" if m["role"] == "user" else "model"
        history.append({"role": role, "parts": [{"text": m.get("content", "")}]})
    return history
