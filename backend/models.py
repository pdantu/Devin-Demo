from pydantic import BaseModel


class IssueRequest(BaseModel):
    title: str
    body: str
    category: str  # security | deprecated-api | tech-debt
    number: str = "demo"


class BatchRequest(BaseModel):
    issues: list[IssueRequest]
