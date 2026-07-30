# ODESCO V1.1

An AI research agent that discovers, analyzes, and compares scholarly papers using OpenAlex,
with local speech-to-text input and a flash-free light/dark theme.

## Stack

| Layer      | Technology |
|------------|------------|
| Backend    | FastAPI (async), MongoDB (Motor), Gemini (`google-genai`), faster-whisper (local STT) |
| Frontend   | Next.js 15 (App Router, React 19), Tailwind CSS, Newsprint design system |
| Auth       | JWT, per-user session scoping |
| Data source| [OpenAlex](https://openalex.org) REST API |



## Status

Backend and frontend both build/import cleanly.

## Architecture

```
backend/
  auth/                 # JWT issuance, get_current_user dependency
  models/                # MongoDB document schemas (sessions, messages, collections, users)
  processing_agent/     # Gemini function-calling loop + tool implementations
    services/
      openalex_service.py   # OpenAlex HTTP client, filter builder, normalization
      voice_service.py       # faster-whisper transcription (local, no external API)
  routes/
    research_routes.py  # POST /api/sessions/{id}/messages — main chat/agent endpoint
    voice_routes.py      # POST /api/transcribe — audio → text
  config.py             # Settings (env-driven)
  db.py                  # Motor client / Mongo connection
  main.py                 # FastAPI app entrypoint, router registration

frontend/
  app/                   # Next.js App Router pages (/, /login, /register, /sessions/[id])
  components/            # Chat shell, masthead, message-type renderers, theme toggle, mic input
  lib/
    auth-context.tsx     # Auth state/provider
    theme-context.tsx     # Light/dark theme state/provider
```

### Agent loop (`processing_agent`)

A bounded Gemini function-calling loop backs every `POST /api/sessions/{id}/messages` call.
Four tools are exposed to the model in v1:

| Tool | Purpose |
|------|---------|
| `search_works` | Query OpenAlex works by topic/author/institution/journal, with clarification fallback for ambiguous queries |
| `get_work_details` | Fetch full metadata for a single paper |
| `analyze_papers` | Structured analysis of one or more papers |
| `compare_papers` | Side-by-side comparison across selected papers |

Each response is tagged with a `message_type` (`search_results`, `comparison`, `analysis`,
`paper_details`, `clarification`, `text`), which the frontend uses to pick the correct renderer
— no client-side inference of response shape.

### Voice input

Speech-to-text runs **entirely locally** on the backend via `faster-whisper` — no external API,
no per-request cost, consistent with the app's free-tier approach. The model is loaded once and
cached as a module-level singleton (loading fresh per request costs ~1–2s just for weights).

Flow: browser `MediaRecorder` captures audio (webm/opus) → `POST /api/transcribe` → bytes written
to a temp file → `faster-whisper` decodes and transcribes (bundled FFmpeg bindings, so no separate
ffmpeg install needed) → transcript returned and dropped into the chat input.

Configured via `config.py` / `.env`:
- `WHISPER_MODEL_SIZE`
- `WHISPER_DEVICE`
- `WHISPER_COMPUTE_TYPE`

**Windows note:** the temp-file handle is closed (`delete=False` + explicit `close()` + manual
`unlink` in a `finally` block) before being handed to `faster-whisper`. Windows holds an exclusive
lock on open file handles, so leaving the handle open while a second reader (faster-whisper's
internal FFmpeg call) tries to access the same path raises `PermissionError: [Errno 13]`. This
doesn't surface on Linux/Mac, where concurrent opens on the same path are allowed — it's worth
keeping in mind if you touch this code path again.

### Theme (light/dark)

An inline no-flash script in `app/layout.tsx` reads `localStorage` (falling back to
`prefers-color-scheme`) and sets the `dark` class on `<html>` **before** React hydrates, so
there's no flash of the wrong theme on load.

Because that mutation happens pre-hydration, the server-rendered markup and the live DOM
legitimately disagree on `<html>`'s class attribute at hydration time. `<html>` carries
`suppressHydrationWarning` to tell React this specific, expected mismatch is intentional — it does
not suppress mismatches anywhere else in the tree.

`ThemeProvider` (`lib/theme-context.tsx`) then takes over as the source of truth after mount. It
gates its DOM-writing effect behind a `mounted` flag so it can't fire with its default state
(`"light"`) before it's had a chance to read the real stored preference — otherwise it would
briefly clobber the class the inline script just set, and re-write the wrong value to
`localStorage`, causing a dark → light → dark flash on every load.

---

## Backend setup

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# then edit .env:
#   MONGODB_URI         -> your MongoDB connection string (local or Atlas)
#   JWT_SECRET           -> a long random string
#   OPENALEX_MAILTO      -> your email (required for OpenAlex's polite pool)
#   GEMINI_API_KEY       -> your Gemini API key from https://aistudio.google.com/apikey
#   WHISPER_MODEL_SIZE   -> e.g. "base", "small", "medium" (larger = more accurate, slower)
#   WHISPER_DEVICE       -> "cpu" or "cuda"
#   WHISPER_COMPUTE_TYPE -> e.g. "int8" (cpu), "float16" (cuda)

uvicorn main:app --reload --port 8000
```

API docs at `http://localhost:8000/docs` (FastAPI's built-in Swagger UI) once running.

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

## What's implemented

**Core (v1, per master prompt §13 build order)**
- [x] `openalex_service.py` — HTTP client, entity search, filter builder, normalization
- [x] MongoDB models + CRUD for sessions/messages/collections
- [x] Bounded agent loop (Gemini function calling, `google-genai` SDK) with the 4 v1 tools
- [x] Full `POST /api/sessions/{id}/messages` end-to-end flow
- [x] Frontend chat shell with `message_type`-driven rendering
- [x] Operation selector wired to `forced_operation`
- [x] Click-to-select papers → "Compare Selected" (§9.4 click-driven flow)
- [x] JWT auth (register/login), per-user session scoping
- [x] Newsprint design system applied throughout

**Added in v1.1**
- [x] Local speech-to-text via `faster-whisper` (`POST /api/transcribe`), mic input in chat bar
- [x] Light/dark theme with no-flash inline script + `ThemeProvider`, persisted to `localStorage`
- [x] Backend `routes/` restructured into a package (`__init__.py`, `research_routes.py`,
      `voice_routes.py`) and agent logic moved under `processing_agent/`

---

## Known gaps / next steps

- No real integration test yet against live MongoDB + Gemini — do this first.
- `research_gaps` message type has a ready frontend component but no backend tool yet (v2, per
  master prompt §4's deferred list — `identify_potential_gaps` was intentionally not built).
- `selected_papers` from click-driven compare is currently folded into the message text sent to
  the LLM rather than passed as a strict tool constraint — works in practice since the LLM sees
  the exact paper titles, but isn't guaranteed to compare *exactly* those N papers if titles are
  ambiguous. Consider passing `selected_papers` through to `compare_papers` directly as a v1.2 fix.
- No rate limiting on inbound requests yet (§11 non-functional requirement, not yet built).
- Voice input currently records full clips client-side and transcribes on submit; no streaming/
  partial-transcript feedback while recording.
- No automated test coverage yet for `voice_service.py` or `theme-context.tsx`.
