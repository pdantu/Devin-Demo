"""
Devin Orchestrator — FastAPI backend entry point.

Package layout:
  config.py              env vars & constants
  models.py              Pydantic request/response models
  state.py               shared HTTP client singletons
  api/
    github_client.py     GET /issues · POST /webhook/github
    devin_client.py      sessions, metrics, insights, archive + create_session()
    simulate.py          POST /simulate · /simulate/batch
"""

import os
from contextlib import asynccontextmanager
from pathlib import Path

import httpx
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

import state
from config import DEVIN_API_KEY, GITHUB_TOKEN
from api import github_client, devin_client, simulate


@asynccontextmanager
async def lifespan(app: FastAPI):
    state.http_client = httpx.AsyncClient(
        timeout=30.0,
        headers={"Authorization": f"Bearer {DEVIN_API_KEY}", "Content-Type": "application/json"},
    )
    state.github_client = httpx.AsyncClient(
        timeout=30.0,
        headers={
            "Authorization": f"Bearer {GITHUB_TOKEN}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
        },
    )
    yield
    await state.http_client.aclose()
    await state.github_client.aclose()


app = FastAPI(title="Devin Orchestrator", lifespan=lifespan)

app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

app.include_router(github_client.router)
app.include_router(devin_client.router)
app.include_router(simulate.router)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


# ---------------------------------------------------------------------------
# Serve frontend (production — skipped if dist/ not built yet)
# ---------------------------------------------------------------------------

_DIST = Path(__file__).parent.parent / "frontend" / "dist"

if _DIST.exists():
    app.mount("/assets", StaticFiles(directory=_DIST / "assets"), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def spa_fallback(full_path: str):
        index = _DIST / "index.html"
        return FileResponse(index)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
