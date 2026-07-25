"""
Mongo document schemas: users, research_sessions, research_messages,
research_collections. These mirror master-prompt §6 with the §12.8 fix
(messages store previews, not full Paper objects) already applied.
"""
from __future__ import annotations
from datetime import datetime, timezone
from typing import Literal, Optional
from pydantic import BaseModel, EmailStr, Field

from models.paper import Paper, PaperPreview

OperationType = Literal[
    "auto", "search", "analyze", "compare", "citations", "research_gaps"
]

MessageType = Literal[
    "text",
    "search_results",
    "comparison",
    "analysis",
    "paper_details",
    "research_gaps",
    "clarification",
]


def now() -> datetime:
    return datetime.now(timezone.utc)


# ---------- Users / Auth ----------

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: Optional[str] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserPublic(BaseModel):
    id: str
    email: EmailStr
    name: Optional[str] = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserPublic


# ---------- Sessions ----------

class ResearchSession(BaseModel):
    id: Optional[str] = None
    user_id: str
    title: str = "New research session"
    created_at: datetime = Field(default_factory=now)
    updated_at: datetime = Field(default_factory=now)


class SessionCreate(BaseModel):
    title: Optional[str] = "New research session"


# ---------- Messages ----------

class MessageData(BaseModel):
    collection_id: Optional[str] = None
    papers: list[PaperPreview] = Field(default_factory=list)
    extra: Optional[dict] = None  # e.g. comparison table, gap findings, clarification options


class ResearchMessage(BaseModel):
    id: Optional[str] = None
    session_id: str
    role: Literal["user", "agent"]
    message_type: MessageType = "text"
    content: str
    operation: Optional[OperationType] = None
    data: Optional[MessageData] = None
    created_at: datetime = Field(default_factory=now)


class MessageCreate(BaseModel):
    message: str
    operation: OperationType = "auto"
    selected_papers: Optional[list[str]] = None  # openalex_ids, for click-driven flows


# ---------- Collections ----------

class ResearchCollection(BaseModel):
    id: Optional[str] = None
    collection_id: str
    session_id: str
    type: Literal["paper_collection"] = "paper_collection"
    name: str
    paper_ids: list[str] = Field(default_factory=list)
    papers: list[Paper] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=now)
