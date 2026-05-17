"""Shared mutable singletons — HTTP clients."""

import httpx

http_client: httpx.AsyncClient | None = None
github_client: httpx.AsyncClient | None = None
