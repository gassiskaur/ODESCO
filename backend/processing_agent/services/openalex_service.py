"""
Single owner of all OpenAlex HTTP traffic. Responsibilities (master prompt §5):
  - connection reuse, retry/backoff on 429/5xx
  - always send mailto/api_key (polite pool)
  - normalize raw Work JSON -> internal Paper schema (never leak raw OpenAlex JSON upward)
  - own the "search entity -> get ID -> filter works" two-step pattern
  - own XPAC policy, pagination cap, and abstract-inverted-index reconstruction
"""
from __future__ import annotations

import asyncio
import re
from typing import Any, Optional

import httpx

from config import settings
from models.paper import Paper, PaperAuthor, PaperSource, PaperTopic, PrimaryTopicPath

_MAX_RETRIES = 3


class OpenAlexError(Exception):
    pass


def _base_params() -> dict:
    params: dict[str, str] = {}
    if settings.OPENALEX_MAILTO:
        params["mailto"] = settings.OPENALEX_MAILTO
    if settings.OPENALEX_API_KEY:
        params["api_key"] = settings.OPENALEX_API_KEY
    if not settings.OPENALEX_INCLUDE_XPAC:
        pass  # excluded by default already; explicit include_xpac=true only opted in elsewhere
    return params


async def _get(path: str, params: dict) -> dict:
    url = f"{settings.OPENALEX_BASE_URL}{path}"
    merged = {**_base_params(), **params}
    last_error: Exception | None = None

    async with httpx.AsyncClient(timeout=20.0) as client:
        for attempt in range(_MAX_RETRIES):
            try:
                resp = await client.get(url, params=merged)
                if resp.status_code == 429 or resp.status_code >= 500:
                    await asyncio.sleep(2 ** attempt)
                    continue
                resp.raise_for_status()
                return resp.json()
            except httpx.HTTPError as exc:
                last_error = exc
                await asyncio.sleep(2 ** attempt)

    raise OpenAlexError(f"OpenAlex request failed after retries: {last_error}")


# ---------------------------------------------------------------------------
# Identifier resolution (master prompt §5.3)
# ---------------------------------------------------------------------------

_DOI_RE = re.compile(r"^10\.\d{4,9}/\S+$")
_ORCID_RE = re.compile(r"^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$")
_OPENALEX_ID_RE = re.compile(r"^[WASITKPFCG]\d+$", re.IGNORECASE)


def detect_identifier_type(value: str) -> str:
    value = value.strip()
    if "orcid.org" in value or _ORCID_RE.match(value):
        return "orcid"
    if "ror.org" in value:
        return "ror"
    if value.lower().startswith("10.") or "doi.org" in value:
        return "doi"
    if _OPENALEX_ID_RE.match(value):
        return "openalex_id"
    return "name"


# ---------------------------------------------------------------------------
# Entity search (step 1 of the two-step pattern)
# ---------------------------------------------------------------------------

_ENTITY_ENDPOINTS = {
    "author": "/authors",
    "institution": "/institutions",
    "source": "/sources",
    "topic": "/topics",
}


async def search_entity(entity_type: str, name: str, extra_filter: Optional[str] = None, limit: int = 5) -> list[dict]:
    """
    Step 1 of the two-step pattern: search for an entity by name and return
    lightweight candidates for the agent to disambiguate against
    (master prompt §4.1 / §12.4).
    """
    endpoint = _ENTITY_ENDPOINTS.get(entity_type)
    if endpoint is None:
        raise ValueError(f"Unknown entity_type: {entity_type}")

    params = {"search": name, "per_page": limit}
    if extra_filter:
        params["filter"] = extra_filter

    data = await _get(endpoint, params)
    candidates = []
    for item in data.get("results", []):
        candidates.append({
            "id": _short_id(item.get("id", "")),
            "display_name": item.get("display_name"),
            "works_count": item.get("works_count"),
            "cited_by_count": item.get("cited_by_count"),
        })
    return candidates


def _short_id(full_id: str) -> str:
    """https://openalex.org/W123 -> W123"""
    return full_id.rsplit("/", 1)[-1] if full_id else full_id


# ---------------------------------------------------------------------------
# Filter string building
# ---------------------------------------------------------------------------

def build_filter_string(filters: dict[str, Any]) -> str:
    """
    Turns a dict of {field: value} into OpenAlex's comma/pipe/bang filter syntax.
    Values that are lists become OR (`|`) groups. Prefix a value with '!' for NOT.
    """
    parts = []
    for field, value in filters.items():
        if value is None:
            continue
        if isinstance(value, (list, tuple)):
            joined = "|".join(str(v) for v in value)
            parts.append(f"{field}:{joined}")
        else:
            parts.append(f"{field}:{value}")
    return ",".join(parts)


# ---------------------------------------------------------------------------
# Works search (step 2 of the two-step pattern) + get single work
# ---------------------------------------------------------------------------

async def search_works(
    query: Optional[str] = None,
    filters: Optional[dict[str, Any]] = None,
    sort: Optional[str] = None,
    per_page: int = 25,
    use_fulltext_search: bool = True,
) -> list[Paper]:
    """
    Cost policy (master prompt §5.4 / §12.10): only pass `search=` when
    use_fulltext_search is True AND a query string is actually provided.
    Prefer filter-only calls whenever a named entity ID is already resolved.
    """
    per_page = min(per_page, settings.MAX_RESULTS_PER_SEARCH)
    params: dict[str, Any] = {"per_page": per_page}

    if query and use_fulltext_search:
        params["search"] = query
    if filters:
        params["filter"] = build_filter_string(filters)
    if sort:
        params["sort"] = sort
    elif query and use_fulltext_search:
        params["sort"] = "relevance_score:desc"

    data = await _get("/works", params)
    return [normalize_work(raw) for raw in data.get("results", [])]


async def get_work(work_id: str) -> Paper:
    """Fetch a single work by OpenAlex ID (short key) or DOI."""
    id_type = detect_identifier_type(work_id)
    path = f"/works/https://doi.org/{work_id.replace('doi:', '')}" if id_type == "doi" else f"/works/{work_id}"
    data = await _get(path, {})
    return normalize_work(data)


# ---------------------------------------------------------------------------
# Normalization (raw OpenAlex Work JSON -> internal Paper schema, §7)
# ---------------------------------------------------------------------------

def reconstruct_abstract(inverted_index: Optional[dict]) -> Optional[str]:
    """OpenAlex stores abstracts as {word: [positions]}; rebuild plain text."""
    if not inverted_index:
        return None
    positions: dict[int, str] = {}
    for word, idxs in inverted_index.items():
        for i in idxs:
            positions[i] = word
    if not positions:
        return None
    return " ".join(positions[i] for i in sorted(positions))


def normalize_work(raw: dict) -> Paper:
    authors = []
    for authorship in raw.get("authorships", []):
        author = authorship.get("author", {})
        institutions = authorship.get("institutions", [])
        authors.append(PaperAuthor(
            name=author.get("display_name", "Unknown"),
            author_id=_short_id(author.get("id", "")) or None,
            institution=institutions[0].get("display_name") if institutions else None,
        ))

    topics = [
        PaperTopic(
            id=_short_id(t.get("id", "")),
            display_name=t.get("display_name", ""),
            level=t.get("level"),
        )
        for t in raw.get("topics", [])
    ]

    primary_topic = None
    pt = raw.get("primary_topic")
    if pt:
        primary_topic = PrimaryTopicPath(
            domain=(pt.get("domain") or {}).get("display_name"),
            field=(pt.get("field") or {}).get("display_name"),
            subfield=(pt.get("subfield") or {}).get("display_name"),
            topic=pt.get("display_name"),
        )

    primary_location = raw.get("primary_location") or {}
    source_raw = primary_location.get("source") or {}
    oa = raw.get("open_access") or {}

    return Paper(
        openalex_id=_short_id(raw.get("id", "")),
        title=raw.get("title") or raw.get("display_name") or "Untitled",
        abstract=reconstruct_abstract(raw.get("abstract_inverted_index")),
        authors=authors,
        publication_year=raw.get("publication_year"),
        publication_date=raw.get("publication_date"),
        doi=raw.get("doi"),
        citation_count=raw.get("cited_by_count", 0),
        topics=topics,
        primary_topic=primary_topic,
        open_access=oa.get("is_oa", False),
        oa_url=oa.get("oa_url"),
        source=PaperSource(
            id=_short_id(source_raw.get("id", "")) or None,
            display_name=source_raw.get("display_name"),
        ) if source_raw else None,
        work_type=raw.get("type"),
    )
