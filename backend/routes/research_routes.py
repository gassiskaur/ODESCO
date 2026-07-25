from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status

from auth.dependencies import get_current_user
from db import collections_collection, messages_collection, sessions_collection
from models.schemas import MessageCreate, SessionCreate
from processing_agent.agent import run_agent

router = APIRouter(prefix="/api/sessions", tags=["research"])


def _serialize(doc: dict) -> dict:
    doc = dict(doc)
    doc["id"] = str(doc.pop("_id"))
    return doc


@router.post("")
async def create_session(payload: SessionCreate, user: dict = Depends(get_current_user)):
    now = datetime.now(timezone.utc)
    doc = {
        "user_id": user["id"],
        "title": payload.title or "New research session",
        "created_at": now,
        "updated_at": now,
    }
    result = await sessions_collection().insert_one(doc)
    doc["_id"] = result.inserted_id
    return _serialize(doc)


@router.get("")
async def list_sessions(user: dict = Depends(get_current_user)):
    cursor = sessions_collection().find({"user_id": user["id"]}).sort("updated_at", -1)
    return [_serialize(doc) async for doc in cursor]


@router.delete("/{session_id}")
async def delete_session(session_id: str, user: dict = Depends(get_current_user)):
    session = await sessions_collection().find_one({"_id": ObjectId(session_id), "user_id": user["id"]})
    if not session:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Session not found")
    await sessions_collection().delete_one({"_id": ObjectId(session_id)})
    await messages_collection().delete_many({"session_id": session_id})
    await collections_collection().delete_many({"session_id": session_id})
    return {"status": "deleted"}


async def _require_session(session_id: str, user: dict) -> dict:
    session = await sessions_collection().find_one({"_id": ObjectId(session_id), "user_id": user["id"]})
    if not session:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Session not found")
    return session


@router.get("/{session_id}/messages")
async def get_messages(session_id: str, limit: int = 50, user: dict = Depends(get_current_user)):
    await _require_session(session_id, user)
    cursor = (
        messages_collection()
        .find({"session_id": session_id})
        .sort("created_at", 1)
        .limit(limit)
    )
    return [_serialize(doc) async for doc in cursor]


@router.post("/{session_id}/messages")
async def post_message(session_id: str, payload: MessageCreate, user: dict = Depends(get_current_user)):
    await _require_session(session_id, user)

    user_doc = {
        "session_id": session_id,
        "role": "user",
        "message_type": "text",
        "content": payload.message,
        "operation": payload.operation,
        "data": None,
        "created_at": datetime.now(timezone.utc),
    }
    await messages_collection().insert_one(user_doc)

    agent_result = await run_agent(session_id, payload.message, forced_operation=payload.operation)

    agent_doc = {
        "session_id": session_id,
        "role": "agent",
        "message_type": agent_result["message_type"],
        "content": agent_result["content"],
        "operation": payload.operation,
        "data": agent_result["data"],
        "created_at": datetime.now(timezone.utc),
    }
    result = await messages_collection().insert_one(agent_doc)
    agent_doc["_id"] = result.inserted_id

    await sessions_collection().update_one(
        {"_id": ObjectId(session_id)},
        {"$set": {"updated_at": datetime.now(timezone.utc)}},
    )

    return _serialize(agent_doc)


@router.get("/{session_id}/collections/{collection_id}")
async def get_collection(session_id: str, collection_id: str, user: dict = Depends(get_current_user)):
    await _require_session(session_id, user)
    doc = await collections_collection().find_one({"session_id": session_id, "collection_id": collection_id})
    if not doc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Collection not found")
    return _serialize(doc)
