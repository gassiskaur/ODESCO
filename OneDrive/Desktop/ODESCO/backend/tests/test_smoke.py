"""
End-to-end smoke test against mocked Mongo/OpenAlex/Gemini, to validate the
actual route -> agent -> tool -> db wiring works, without needing live
credentials. Run: python -m pytest tests/test_smoke.py -v
"""
import sys
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest
from httpx import ASGITransport, AsyncClient
from mongomock_motor import AsyncMongoMockClient

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import db as db_module

FAKE_WORK = {
    "id": "https://openalex.org/W123456789",
    "title": "PLA-PHB Blends for Sustainable Food Packaging",
    "abstract_inverted_index": {"This": [0], "study": [1], "examines": [2], "PLA-PHB": [3], "blends.": [4]},
    "authorships": [
        {"author": {"id": "https://openalex.org/A1", "display_name": "Jane Doe"},
         "institutions": [{"display_name": "MIT"}]}
    ],
    "publication_year": 2024,
    "publication_date": "2024-03-01",
    "doi": "10.1000/example",
    "cited_by_count": 12,
    "topics": [{"id": "https://openalex.org/T1", "display_name": "Biodegradable Polymers", "level": 4}],
    "primary_topic": {
        "domain": {"display_name": "Physical Sciences"},
        "field": {"display_name": "Materials Science"},
        "subfield": {"display_name": "Polymers"},
        "display_name": "Biodegradable Polymers",
    },
    "open_access": {"is_oa": True, "oa_url": "https://example.com/paper.pdf"},
    "primary_location": {"source": {"id": "https://openalex.org/S1", "display_name": "Journal of Materials"}},
    "type": "article",
}


@pytest.fixture(autouse=True)
def patch_mongo():
    fake_client = AsyncMongoMockClient()
    with patch.object(db_module, "_client", fake_client):
        with patch.object(db_module, "get_client", return_value=fake_client):
            yield


@pytest.fixture(autouse=True)
def patch_openalex():
    async def fake_get(path, params):
        if path == "/works" and "search" not in params and "filter" not in params:
            return {"results": [FAKE_WORK]}
        if path == "/works":
            return {"results": [FAKE_WORK]}
        return {"results": []}

    with patch("processing_agent.services.openalex_service._get", side_effect=fake_get):
        yield


class FakeFunctionCall:
    def __init__(self, name, args):
        self.name = name
        self.args = args


class FakePart:
    def __init__(self, function_call=None, text=None):
        self.function_call = function_call
        self.text = text


class FakeContent:
    def __init__(self, parts):
        self.parts = parts


class FakeCandidate:
    def __init__(self, parts):
        self.content = FakeContent(parts)


class FakeResponse:
    def __init__(self, parts, text=None):
        self.candidates = [FakeCandidate(parts)]
        self.text = text


class FakeChat:
    """Simulates: turn 1 -> agent calls search_works; turn 2 -> agent replies with text."""
    def __init__(self):
        self.calls = 0

    def send_message(self, message):
        self.calls += 1
        if self.calls == 1:
            call = FakeFunctionCall("search_works", {"query": "PLA-PHB food packaging", "max_results": 5})
            return FakeResponse([FakePart(function_call=call)])
        return FakeResponse(
            [FakePart(text="I found 1 relevant paper on PLA-PHB blends for food packaging.")],
            text="I found 1 relevant paper on PLA-PHB blends for food packaging.",
        )


@pytest.fixture(autouse=True)
def patch_gemini():
    fake_chat = FakeChat()
    fake_client = MagicMock()
    fake_client.chats.create.return_value = fake_chat
    with patch("processing_agent.agent._get_client", return_value=fake_client):
        yield


@pytest.mark.asyncio
async def test_full_flow():
    import main

    transport = ASGITransport(app=main.app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Register
        r = await client.post("/api/auth/register", json={
            "email": "researcher@example.com", "password": "testpass123", "name": "Researcher",
        })
        assert r.status_code == 200, r.text
        token = r.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 2. Create session
        r = await client.post("/api/sessions", json={"title": "PLA-PHB Packaging"}, headers=headers)
        assert r.status_code == 200, r.text
        session_id = r.json()["id"]

        # 3. Send a message -> triggers agent loop -> triggers search_works tool -> OpenAlex mock
        r = await client.post(
            f"/api/sessions/{session_id}/messages",
            json={"message": "Find papers about PLA-PHB food packaging", "operation": "auto"},
            headers=headers,
        )
        assert r.status_code == 200, r.text
        agent_msg = r.json()
        assert agent_msg["message_type"] == "search_results"
        assert agent_msg["data"]["collection_id"] is not None
        assert len(agent_msg["data"]["papers"]) == 1
        assert agent_msg["data"]["papers"][0]["title"].startswith("PLA-PHB")

        # 4. Fetch message history
        r = await client.get(f"/api/sessions/{session_id}/messages", headers=headers)
        assert r.status_code == 200
        assert len(r.json()) == 2  # user + agent

        # 5. Fetch the collection created by the search
        collection_id = agent_msg["data"]["collection_id"]
        r = await client.get(f"/api/sessions/{session_id}/collections/{collection_id}", headers=headers)
        assert r.status_code == 200, r.text
        assert r.json()["papers"][0]["openalex_id"] == "W123456789"

        print("SMOKE TEST PASSED — full route -> agent -> tool -> db chain verified")
