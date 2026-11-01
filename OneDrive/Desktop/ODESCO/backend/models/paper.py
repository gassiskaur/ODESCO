"""
Canonical internal Paper schema. Every OpenAlex `Work` response is normalized
into this shape before it reaches the LLM, MongoDB, or the frontend.
Raw OpenAlex payloads must never leak past openalex_service.py.
"""
from __future__ import annotations
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class PaperAuthor(BaseModel):
    name: str
    author_id: Optional[str] = None
    institution: Optional[str] = None


class PaperTopic(BaseModel):
    id: str
    display_name: str
    level: Optional[int] = None


class PrimaryTopicPath(BaseModel):
    domain: Optional[str] = None
    field: Optional[str] = None
    subfield: Optional[str] = None
    topic: Optional[str] = None


class PaperSource(BaseModel):
    id: Optional[str] = None
    display_name: Optional[str] = None


class Paper(BaseModel):
    openalex_id: str  # short key form, e.g. "W2741809807"
    title: str = ""
    abstract: Optional[str] = None
    authors: list[PaperAuthor] = Field(default_factory=list)
    publication_year: Optional[int] = None
    publication_date: Optional[str] = None
    doi: Optional[str] = None
    citation_count: int = 0
    topics: list[PaperTopic] = Field(default_factory=list)
    primary_topic: Optional[PrimaryTopicPath] = None
    open_access: bool = False
    oa_url: Optional[str] = None
    source: Optional[PaperSource] = None
    work_type: Optional[str] = None

    # populated only after analyze_papers runs; abstract-level in v1 (master prompt §12.5)
    analysis: Optional[dict] = None

    model_config = ConfigDict(extra="ignore")


class PaperPreview(BaseModel):
    """Lightweight reference stored inline in messages (master prompt §12.8)."""
    openalex_id: str
    title: str
