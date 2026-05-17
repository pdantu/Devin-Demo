"""GitHub routes: open issues list + webhook trigger for new issue events."""

import hashlib
import hmac
import json
from typing import Any

from fastapi import APIRouter, HTTPException, Request

import state
from config import GITHUB_API, GITHUB_REPO, WEBHOOK_SECRET
from models import IssueRequest

router = APIRouter()

_LABEL_CATEGORY: dict[str, str] = {
    "security": "security",
    "vulnerability": "security",
    "tech-debt": "tech-debt",
    "technical-debt": "tech-debt",
    "chore": "tech-debt",
    "dependencies": "tech-debt",
}


def detect_category(labels: list[dict]) -> str:
    for label in labels:
        name = label.get("name", "").lower()
        if name in _LABEL_CATEGORY:
            return _LABEL_CATEGORY[name]
    return "tech-debt"


@router.get("/issues")
async def list_github_issues() -> list[dict[str, Any]]:
    """Fetch open issues from the configured GitHub repo."""
    owner, repo = GITHUB_REPO.split("/", 1)
    response = await state.github_client.get(
        f"{GITHUB_API}/repos/{owner}/{repo}/issues",
        params={"state": "open", "per_page": 50, "sort": "created", "direction": "desc"},
    )
    if response.status_code >= 400:
        raise HTTPException(status_code=response.status_code, detail=f"GitHub API error: {response.text}")
    return [
        {
            "number": i["number"],
            "title": i["title"],
            "body": i.get("body") or "",
            "html_url": i["html_url"],
            "labels": [lb["name"] for lb in i.get("labels", [])],
            "category": detect_category(i.get("labels", [])),
            "created_at": i["created_at"],
        }
        for i in response.json()
        if not i.get("pull_request")
    ]


@router.post("/webhook/github")
async def github_webhook(request: Request) -> dict[str, Any]:
    """
    GitHub webhook receiver. Fires when a new issue is opened and immediately
    creates a Devin session — no human action required.
    """
    from api.devin_client import create_session  # local import avoids circular dep

    body = await request.body()
    if WEBHOOK_SECRET:
        sig_header = request.headers.get("X-Hub-Signature-256", "")
        expected = "sha256=" + hmac.new(WEBHOOK_SECRET.encode(), body, hashlib.sha256).hexdigest()
        if not hmac.compare_digest(sig_header, expected):
            raise HTTPException(status_code=401, detail="Invalid webhook signature")

    event = request.headers.get("X-GitHub-Event", "")
    print(f"Event: {event}")
    if event != "issues":
        return {"status": "ignored", "event": event}

    if not body.strip():
        return {"status": "ignored", "event": event, "reason": "empty body"}

    try:
        payload = json.loads(body)
    except json.JSONDecodeError:
        print(f"Invalid JSON: {body}")
        return {"status": "ignored", "event": event, "reason": "invalid json"}
    
    if payload.get("action") != "opened":
        return {"status": "ignored", "event": event, "action": payload.get("action")}

    issue = payload["issue"]
    print(f"Issue: {issue}")
    session = await create_session(IssueRequest(
        number=str(issue["number"]),
        title=issue["title"],
        body=issue.get("body") or "",
        category=detect_category(issue.get("labels", [])),
    ))
    return {"status": "session_created", "session_id": session.get("session_id"), "issue": issue["number"]}
