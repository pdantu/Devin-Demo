# Devin Orchestrator

Event-driven automation that watches GitHub Issues and autonomously dispatches Devin sessions to remediate them — no human in the loop. Includes a live Kanban dashboard with session status, PR links, and AI-generated insights.

```
Simulate button  (or GitHub webhook on real issue opened)
  → POST /simulate  (or POST /webhook/github)
  → FastAPI backend
  → Devin API v3  (POST /sessions with prompt + knowledge + playbook)
  → Devin clones repo, writes fix, opens PR
  → Dashboard polls /sessions every 15s  (status · PR link · ACUs)
```

---

## Prerequisites

- [Docker + Docker Compose](https://docs.docker.com/get-docker/) **or** Python 3.11+ and Node 20+
- A [Devin](https://devin.ai) account with a Service User API key
- A GitHub Personal Access Token with `repo` scope

---

## 1 · Configure environment

```bash
cp backend/.env.example backend/.env
```

Open `backend/.env` and fill in:

| Variable | Where to find it |
|---|---|
| `DEVIN_API_KEY` | Devin → Settings → Service Users → API Key (`cog_...`) |
| `DEVIN_ORG_ID` | Same page — Organization ID (`org_...`) |
| `GITHUB_REPO` | Your target repo in `owner/repo` format |
| `GITHUB_TOKEN` | GitHub → Settings → Developer Settings → Personal Access Tokens |
| `KNOWLEDGE_ID_SUPERSET` | Devin → Knowledge → copy note ID (`note-...`) |
| `WEBHOOK_SECRET` | Any random string — used to verify GitHub webhook signatures |
| `PLAYBOOK_ID_SECURITY` | Optional — Devin Playbook ID for security issues |
| `PLAYBOOK_ID_TECH_DEBT` | Optional — Devin Playbook ID for tech-debt issues |

---

## 2a · Run with Docker (recommended)

```bash
docker compose up --build
```

Open **http://localhost:8000** — the backend serves the built frontend on the same port.

> **Note**: The first build takes ~2 minutes (installs npm + pip deps). Subsequent builds are cached.

---

## 2b · Run locally without Docker

**Backend**

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload   # → http://localhost:8000
```

**Frontend** (separate terminal)

```bash
cd frontend
npm install
npm run dev                 # → http://localhost:5173
```

The Vite dev server proxies all API calls to `localhost:8000` automatically. Open **http://localhost:5173**.

---

## 3 · Simulate Issues (no webhook needed)

Click the **Simulate** button in the dashboard header to instantly create a Devin session with a pre-filled issue. Choose from Security, Deprecated API, or Tech Debt categories — the title and body are editable before launch.

This is the fastest way to demo the full flow without any webhook setup.

---

## 4 · (Optional) Enable GitHub Webhook

To have real GitHub issues automatically trigger Devin sessions, expose the backend publicly. Any tunneling tool works — for example with [ngrok](https://ngrok.com):

```bash
ngrok http 8000
# → https://xxxx.ngrok-free.app
```

Then in your GitHub repo → **Settings → Webhooks → Add webhook**:
- **Payload URL**: `https://xxxx.ngrok-free.app/webhook/github`
- **Content type**: `application/json`
- **Secret**: value of `WEBHOOK_SECRET` from your `.env`
- **Events**: Issues only

---

## API Reference

| Method | Path | Description |
|---|---|---|
| `GET` | `/issues` | Fetch open GitHub issues with category detection |
| `POST` | `/simulate` | Manually trigger one Devin session |
| `POST` | `/simulate/batch` | Trigger N sessions in parallel |
| `GET` | `/sessions` | List all orchestrator-tagged sessions |
| `DELETE` | `/sessions/{id}` | Terminate a session |
| `POST` | `/sessions/{id}/archive` | Archive a completed session |
| `GET` | `/metrics` | 30-day aggregated session metrics |
| `POST` | `/sessions/{id}/insights/generate` | Trigger AI insight generation |
| `GET` | `/sessions/{id}/insights` | Retrieve session insights |
| `POST` | `/webhook/github` | GitHub webhook receiver (issue opened) |
| `GET` | `/health` | Health check |

---

## Project Structure

```
.
├── Dockerfile               # Multi-stage: builds frontend → runs backend
├── docker-compose.yml       # Single-service setup
├── backend/
│   ├── main.py              # App entry point — registers routers, serves static files
│   ├── config.py            # All env vars and constants
│   ├── models.py            # Pydantic request models
│   ├── state.py             # Shared HTTP client singletons
│   ├── requirements.txt
│   ├── .env.example
│   └── api/
│       ├── github_client.py # GET /issues · POST /webhook/github
│       ├── devin_client.py  # Sessions, metrics, insights, archive + create_session()
│       └── simulate.py      # POST /simulate · /simulate/batch
│
└── frontend/
    ├── src/
    │   ├── App.jsx           # Kanban layout, insights panel, theme toggle
    │   ├── api.js            # Base URL helper (VITE_API_URL support)
    │   ├── components/
    │   │   ├── IssueList.jsx  # GitHub issues + Remediate button
    │   │   ├── SessionCard.jsx # Session status card with PR link + insights
    │   │   ├── InsightCard.jsx # AI insights panel (timeline · issues · actions)
    │   │   └── MetricsBar.jsx  # 30-day summary metrics
    │   └── hooks/
    │       ├── useSessions.js  # Polls /sessions every 15s
    │       ├── useMetrics.js   # Polls /metrics every 60s
    │       └── useTheme.js     # Light/dark mode toggle
    ├── vite.config.js          # Dev proxy → localhost:8000
    └── Dockerfile              # Standalone nginx build (unused in Docker Compose)
```
