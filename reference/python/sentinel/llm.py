"""Anthropic client wrapper for the incident-commander agent loop.

Uses adaptive thinking with summarized display so the dashboard can show the
agent's reasoning summaries live — the "glass box". The SDK handles retries
for 429/5xx automatically.
"""

from __future__ import annotations

from typing import Any

import anthropic

from sentinel.config import settings

_client: anthropic.Anthropic | None = None


def client() -> anthropic.Anthropic:
    global _client
    if _client is None:
        _client = anthropic.Anthropic()  # resolves ANTHROPIC_API_KEY / ant profile
    return _client


def complete(
    system: str,
    messages: list[dict[str, Any]],
    tools: list[dict[str, Any]],
) -> anthropic.types.Message:
    """One turn of the agent loop."""
    return client().messages.create(
        model=settings.model,
        max_tokens=16000,
        system=system,
        thinking={"type": "adaptive", "display": "summarized"},
        output_config={"effort": "high"},
        tools=tools,
        messages=messages,
    )
