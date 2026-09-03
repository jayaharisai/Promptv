"""Promptv's lightweight Python SDK.

Only published active prompt versions are available through this client.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen

__all__ = ["Promptv", "PromptvError", "Folder", "ActivePrompt"]


class PromptvError(Exception):
    """Raised when Promptv cannot fulfil an SDK request."""


@dataclass(frozen=True)
class Folder:
    id: str
    name: str
    description: str


@dataclass(frozen=True)
class ActivePrompt:
    id: str
    name: str
    description: str
    folder: str
    version: int
    content: str
    updated_at: str


class Promptv:
    """Client for reading folders and their published active prompts.

    Args:
        api_key: A ``pk_live_...`` access key created in Promptv.
        base_url: URL of the Promptv API, without a trailing slash.
        timeout: Per-request timeout in seconds.
    """

    def __init__(self, api_key: str, base_url: str = "http://localhost:8000", timeout: float = 10) -> None:
        if not api_key:
            raise ValueError("api_key is required")
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout

    def list_folders(self) -> list[Folder]:
        """List folders accessible with this access key."""
        return [Folder(**folder) for folder in self._get("/api/v1/sdk/folders")]

    def get_prompt(self, folder: str, prompt: str) -> ActivePrompt:
        """Fetch a prompt's published active version by its folder and prompt names."""
        path = f"/api/v1/sdk/prompts/{quote(folder, safe='')}/{quote(prompt, safe='')}"
        return ActivePrompt(**self._get(path))

    def _get(self, path: str) -> Any:
        request = Request(
            f"{self.base_url}{path}",
            headers={"Authorization": f"Bearer {self.api_key}", "Accept": "application/json"},
            method="GET",
        )
        try:
            with urlopen(request, timeout=self.timeout) as response:
                return json.loads(response.read().decode("utf-8"))
        except HTTPError as error:
            try:
                message = json.loads(error.read().decode("utf-8")).get("detail", error.reason)
            except (json.JSONDecodeError, UnicodeDecodeError):
                message = error.reason
            raise PromptvError(f"Promptv API returned {error.code}: {message}") from error
        except URLError as error:
            raise PromptvError(f"Could not reach Promptv API: {error.reason}") from error
