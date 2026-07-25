# Research Agent — v1

An AI research agent that discovers, analyzes, and compares scholarly papers using OpenAlex.
Built per `research-agent-master-prompt.md` — read that first for architecture/decisions.

## Stack
- Backend: FastAPI (async), MongoDB (Motor), Gemini (`google-genai`)
- Frontend: Next.js 15 (App Router, React 19), Tailwind, Newsprint design system

## Status
Backend and frontend both build/import cleanly and have been smoke-tested with mocked
Mongo/OpenAlex/Gemini (see `backend/tests/test_smoke.py`). **Not yet tested against a real
MongoDB instance or a real Gemini API key** — do that first before relying on it.

---

## Backend setup

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# then edit .env:
#   MONGODB_URI      -> your MongoDB connection string (local or Atlas)
#   JWT_SECRET        -> a long random string
#   OPENALEX_MAILTO   -> your email (required for OpenAlex's polite pool)
#   GEMINI_API_KEY    -> your Gemini API key from https://aistudio.google.com/apikey

uvicorn main:app --reload --port 8000
```

API docs will be at `http://localhost:8000/docs` (FastAPI's built-in Swagger UI) once running.

### Run the smoke test (no real Mongo/Gemini needed)
```bash
cd backend
source .venv/bin/activate
pip install mongomock-motor pytest pytest-asyncio   # test-only deps, not in requirements.txt
GEMINI_API_KEY=fake OPENALEX_MAILTO=test@example.com python -m pytest tests/test_smoke.py -v
```

---

## Frontend setup

```bash
cd frontend
npm install

cp .env.local.example .env.local
# edit NEXT_PUBLIC_API_URL if your backend isn't on http://localhost:8000

npm run dev
```

Visit `http://localhost:3000`. You'll land on `/register` → create an account → you're dropped
into a new research session.

### Production build check
```bash
npm run build
```

---

## What's implemented (v1 scope, per master prompt §13 build order)

- [x] `openalex_service.py` — HTTP client, entity search, filter builder, normalization
- [x] MongoDB models + CRUD for sessions/messages/collections
- [x] Bounded agent loop (Gemini function calling, `google-genai` SDK) with the 4 v1 tools:
      `search_works`, `get_work_details`, `analyze_papers`, `compare_papers`
- [x] Full `POST /api/sessions/{id}/messages` end-to-end flow
- [x] Frontend chat shell with `message_type`-driven rendering (search_results / comparison /
      analysis / paper_details / clarification / text)
- [x] Operation selector wired to `forced_operation`
- [x] Click-to-select papers → "Compare Selected" (§9.4 click-driven flow)
- [x] JWT auth (register/login), per-user session scoping
- [x] Newsprint design system applied throughout

## Known gaps / next steps (see master prompt §12 for full detail)
- No real integration test yet against live MongoDB + Gemini — do this first.
- `research_gaps` message type has a ready frontend component but no backend tool yet (v2,
  per master prompt §4's deferred list — `identify_potential_gaps` was intentionally not built).
- `selected_papers` from click-driven compare is currently folded into the message text sent to
  the LLM rather than passed as a strict tool constraint — works in practice since the LLM sees
  the exact paper titles, but isn't guaranteed to compare *exactly* those N papers if titles are
  ambiguous. Consider passing `selected_papers` through to `compare_papers` directly as a v1.1 fix.
- No rate limiting on inbound requests yet (§11 non-functional requirement, not yet built).

## Fixed during review (not in the original spec, added for correctness)
- `analyze_papers`/`compare_papers` tool results now populate `data.papers` previews, not just
  `search_works` — otherwise those message types had nothing for the frontend to reference.
- `search_works` returning `needs_clarification` now correctly maps to `message_type: "clarification"`
  end-to-end (backend `_derive_message_type` + `data.extra.candidates` + a frontend renderer that
  lists the actual candidate entities), instead of being mislabeled as a normal search result.
