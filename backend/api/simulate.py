import asyncio
from typing import Any

from fastapi import APIRouter

from models import BatchRequest, IssueRequest
from api.devin_client import create_session

router = APIRouter()


@router.post("/simulate")
async def simulate_single(issue: IssueRequest) -> dict[str, Any]:
    """Create a single Devin session for one issue."""
    return await create_session(issue)


@router.post("/simulate/batch")
async def simulate_batch(batch: BatchRequest) -> dict[str, Any]:
    """Create Devin sessions for all issues in parallel using asyncio.gather."""
    raw_results = await asyncio.gather(
        *[create_session(issue) for issue in batch.issues],
        return_exceptions=True,
    )
    sessions, errors = [], []
    for i, result in enumerate(raw_results):
        if isinstance(result, Exception):
            errors.append({"issue": batch.issues[i].title, "error": str(result)})
        else:
            sessions.append(result)
    return {
        "sessions": sessions,
        "errors": errors,
        "total": len(batch.issues),
        "succeeded": len(sessions),
        "failed": len(errors),
    }
