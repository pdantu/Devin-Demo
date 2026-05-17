"""Devin API routes: session management, metrics, insights, archive + session creation helper."""

import time
from typing import Any

from fastapi import APIRouter, HTTPException

import state
from config import BASE_URL, GITHUB_REPO, KNOWLEDGE_ID_SUPERSET, PLAYBOOK_ID_SECURITY, PLAYBOOK_ID_TECH_DEBT
from models import IssueRequest

router = APIRouter()

PLAYBOOK_IDS: dict[str, str] = {
    "security": PLAYBOOK_ID_SECURITY,
    "tech-debt": PLAYBOOK_ID_TECH_DEBT,
}


def _devin_id(session_id: str) -> str:
    return session_id if session_id.startswith("devin-") else f"devin-{session_id}"


async def create_session(issue: IssueRequest) -> dict[str, Any]:
    """Build prompt and spin up a Devin session. Called by /simulate and /webhook/github."""
    issue_url = f"https://github.com/{GITHUB_REPO}/issues/{issue.number}"
    prompt = (
        "Make your best judgment on all decisions and proceed immediately. "
        "Always open a pull request when your changes are ready. "
        "Once the pull request is created, your task is complete — stop immediately.\n\n"
        "---\n\n"
        f"Issue #{issue.number}: {issue.title}\n"
        f"URL: {issue_url}\n\n"
        f"{issue.body}"
    )
    payload: dict[str, Any] = {
        "prompt": prompt,
        "title": f"[{issue.category}] {issue.title}",
        "tags": ["devin-orchestrator", issue.category, f"issue-{issue.number}"],
        "knowledge_ids": [KNOWLEDGE_ID_SUPERSET] if KNOWLEDGE_ID_SUPERSET else [],
    }
    playbook_id = PLAYBOOK_IDS.get(issue.category)
    if playbook_id:
        payload["playbook_id"] = playbook_id

    response = await state.http_client.post(f"{BASE_URL}/sessions", json=payload)
    if response.status_code >= 400:
        raise HTTPException(status_code=response.status_code, detail=f"Devin API error: {response.text}")
    return response.json()


@router.get("/sessions")
async def list_sessions() -> list[dict[str, Any]]:
    """Return all non-archived sessions tagged with 'devin-orchestrator'."""
    response = await state.http_client.get(
        f"{BASE_URL}/sessions",
        params={"tags": "devin-orchestrator", "first": 100},
    )
    if response.status_code >= 400:
        raise HTTPException(status_code=response.status_code, detail=f"Devin API error: {response.text}")
    return [s for s in response.json().get("items", []) if not s.get("is_archived", False)]


@router.get("/metrics")
async def get_metrics() -> dict[str, Any]:
    """Return aggregated session metrics for the last 30 days."""
    now = int(time.time())
    response = await state.http_client.get(
        f"{BASE_URL}/metrics/sessions",
        params={"time_after": now - 30 * 86400, "time_before": now},
    )
    if response.status_code >= 400:
        raise HTTPException(status_code=response.status_code, detail=f"Devin API error: {response.text}")
    return response.json()


@router.delete("/sessions/{session_id}")
async def terminate_session(session_id: str) -> dict[str, Any]:
    """Terminate a running Devin session."""
    response = await state.http_client.delete(f"{BASE_URL}/sessions/{_devin_id(session_id)}")
    if response.status_code >= 400:
        raise HTTPException(status_code=response.status_code, detail=f"Devin API error: {response.text}")
    return response.json()


@router.post("/sessions/{session_id}/archive")
async def archive_session(session_id: str) -> dict[str, Any]:
    """Archive a session so it no longer appears in the dashboard."""
    response = await state.http_client.post(f"{BASE_URL}/sessions/{_devin_id(session_id)}/archive")
    if response.status_code >= 400:
        raise HTTPException(status_code=response.status_code, detail=f"Devin API error: {response.text}")
    return response.json()


@router.post("/sessions/{session_id}/insights/generate")
async def generate_insights(session_id: str) -> dict[str, Any]:
    """Trigger AI insight generation for a completed session."""
    response = await state.http_client.post(f"{BASE_URL}/sessions/{_devin_id(session_id)}/insights/generate")
    if response.status_code >= 400:
        raise HTTPException(status_code=response.status_code, detail=f"Devin API error: {response.text}")
    return response.json()


@router.get("/sessions/{session_id}/insights")
async def get_insights(session_id: str) -> dict[str, Any]:
    """Retrieve AI-generated insights for a session."""
    response = await state.http_client.get(f"{BASE_URL}/sessions/{_devin_id(session_id)}/insights")
    if response.status_code >= 400:
        raise HTTPException(status_code=response.status_code, detail=f"Devin API error: {response.text}")
    return response.json()
