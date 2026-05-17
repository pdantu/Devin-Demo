import os

from dotenv import load_dotenv

load_dotenv()

DEVIN_API_KEY: str = os.getenv("DEVIN_API_KEY", "")
DEVIN_ORG_ID: str = os.getenv("DEVIN_ORG_ID", "")
GITHUB_REPO: str = os.getenv("GITHUB_REPO", "")
GITHUB_TOKEN: str = os.getenv("GITHUB_TOKEN", "")
KNOWLEDGE_ID_SUPERSET: str = os.getenv("KNOWLEDGE_ID_SUPERSET", "")
WEBHOOK_SECRET: str = os.getenv("WEBHOOK_SECRET", "")

PLAYBOOK_ID_SECURITY: str = os.getenv("PLAYBOOK_ID_SECURITY", "")
PLAYBOOK_ID_TECH_DEBT: str = os.getenv("PLAYBOOK_ID_TECH_DEBT", "")

BASE_URL: str = f"https://api.devin.ai/v3/organizations/{DEVIN_ORG_ID}"
GITHUB_API: str = "https://api.github.com"
