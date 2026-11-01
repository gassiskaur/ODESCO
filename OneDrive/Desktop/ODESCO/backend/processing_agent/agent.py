"""
The bounded LLM <-> tool loop (master prompt §10.1). This is the only place
that talks to Gemini. Route handlers call `run_agent()` and get back a
ready-to-persist message dict (message_type / content / data).
"""
from __future__ import annotations

import asyncio
import time
import uuid

from google import genai
from google.genai import types

from config import settings
from db import collections_collection
from models.paper import Paper
from processing_agent.context_builder import (
    get_active_collection_summary,
    load_recent_messages,
    to_gemini_history,
)
from processing_agent.prompts import build_system_prompt
from processing_agent.tool_registry import TOOL_DECLARATIONS, execute_tool

_client: genai.Client | None = None


def _get_client() -> genai.Client:
    global _client
    if _client is None:
        _client = genai.Client(api_key=settings.GEMINI_API_KEY)
    return _client


class AgentTimeout(Exception):
    pass


async def _persist_collection(session_id: str, name: str, papers: list[dict]) -> str:
    collection_id = f"col_{uuid.uuid4().hex[:10]}"
    doc = {
        "collection_id": collection_id,
        "session_id": session_id,
        "type": "paper_collection",
        "name": name,
        "paper_ids": [p["openalex_id"] for p in papers],
        "papers": papers,
    }
    await collections_collection().insert_one(doc)
    return collection_id


def _derive_message_type(last_tool_name: str | None, last_tool_result: dict | None) -> str:
    if last_tool_result and last_tool_result.get("status") == "needs_clarification":
        return "clarification"
    if last_tool_name == "search_works":
        return "search_results"
    if last_tool_name == "get_work_details":
        return "paper_details"
    if last_tool_name == "compare_papers":
        return "comparison"
    if last_tool_name == "analyze_papers":
        return "analysis"
    return "text"


async def run_agent(session_id: str, user_message: str, forced_operation: str = "auto") -> dict:
    start = time.monotonic()

    collection_id, collection_summary = await get_active_collection_summary(session_id)
    system_prompt = build_system_prompt(forced_operation, collection_summary)
    history_docs = await load_recent_messages(session_id)
    history = to_gemini_history(history_docs)

    client = _get_client()
    tools = [types.Tool(function_declarations=[
        types.FunctionDeclaration(**decl) for decl in TOOL_DECLARATIONS
    ])]
    chat = client.chats.create(
        model=settings.GEMINI_MODEL,
        history=history,
        config=types.GenerateContentConfig(
            system_instruction=system_prompt,
            tools=tools,
        ),
    )

    last_tool_name: str | None = None
    last_tool_result: dict | None = None
    new_collection_id: str | None = None
    preview_papers: list[dict] = []

    message_to_send: str | types.Part = user_message
    for _ in range(settings.AGENT_MAX_ITERATIONS):
        if time.monotonic() - start > settings.AGENT_TIMEOUT_SECONDS:
            return {
                "message_type": "text",
                "content": "This is taking longer than expected — here's what I have so far. "
                           "Try narrowing your request and I can continue from there.",
                "data": {"collection_id": collection_id, "papers": preview_papers},
            }

        try:
            response = await asyncio.wait_for(
                asyncio.to_thread(chat.send_message, message_to_send),
                timeout=settings.AGENT_TIMEOUT_SECONDS,
            )
        except asyncio.TimeoutError:
            raise AgentTimeout("LLM call exceeded timeout")

        candidate = response.candidates[0]
        function_calls = [
            part.function_call for part in candidate.content.parts if part.function_call
        ]

        if not function_calls:
            final_text = response.text or ""
            message_type = _derive_message_type(last_tool_name, last_tool_result)
            extra = None
            if message_type == "clarification" and last_tool_result:
                extra = {"candidates": last_tool_result.get("candidates", [])}
            return {
                "message_type": message_type,
                "content": final_text,
                "data": {
                    "collection_id": new_collection_id or collection_id,
                    "papers": preview_papers,
                    "extra": extra,
                },
            }

        # Execute the (first) requested tool call and feed the result back.
        call = function_calls[0]
        tool_name = call.name
        tool_args = dict(call.args) if call.args else {}
        result = await execute_tool(tool_name, tool_args)

        last_tool_name, last_tool_result = tool_name, result

        if tool_name == "search_works" and result.get("status") == "ok" and result.get("papers"):
            papers = result["papers"]
            new_collection_id = await _persist_collection(
                session_id, name=f"Search: {tool_args.get('query') or tool_args.get('entity_name') or 'results'}",
                papers=papers,
            )
            preview_papers = [{"openalex_id": p["openalex_id"], "title": p["title"]} for p in papers]
        elif tool_name in ("analyze_papers", "compare_papers") and result.get("status") == "ok":
            preview_papers = [
                {"openalex_id": p["openalex_id"], "title": p["title"]} for p in result.get("papers", [])
            ]

        message_to_send = types.Part.from_function_response(name=tool_name, response=result)

    return {
        "message_type": "text",
        "content": "I wasn't able to fully complete this within the step limit — "
                   "could you narrow the request a bit?",
        "data": {"collection_id": new_collection_id or collection_id, "papers": preview_papers},
    }
