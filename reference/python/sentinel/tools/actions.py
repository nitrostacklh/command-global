"""Outbound action connectors: GitHub PR, WeKan card, Slack post.

Every connector is dual-mode:
  live  — real API call when credentials/config are present
  mock  — records the action to logs/mock_actions.jsonl and returns a
          realistic payload, so demos never depend on external services

The returned dict always carries "mode" so the audit trail is honest about
what actually happened.
"""

from __future__ import annotations

import json
import shutil
import subprocess
import time
from pathlib import Path

import httpx

from sentinel.config import settings

_MOCK_LOG = settings.logs_dir / "mock_actions.jsonl"


def _record_mock(kind: str, payload: dict) -> None:
    with _MOCK_LOG.open("a", encoding="utf-8") as fh:
        fh.write(json.dumps({"ts": time.time(), "kind": kind, **payload}, ensure_ascii=False) + "\n")


# ── GitHub ────────────────────────────────────────────────────────────────
def open_pull_request(incident_id: str, title: str, body: str, diff: str) -> dict:
    """Create a fix branch + commit in the service repo; open a PR when enabled.

    Falls back to a mock PR record if git/gh are unavailable or disabled.
    """
    branch = f"sentinel/fix-{incident_id}"
    repo = settings.service_dir

    try:
        # Only operate on git if the service dir is its OWN repository —
        # never switch branches on a parent repo while a demo is running.
        if not (repo / ".git").exists():
            raise RuntimeError("service dir is not a standalone git repository")
        subprocess.run(["git", "checkout", "-B", branch], cwd=repo, check=True, capture_output=True)
        subprocess.run(["git", "add", "-A"], cwd=repo, check=True, capture_output=True)
        subprocess.run(
            ["git", "commit", "-m", f"fix: {title}\n\n{body}\n\nAutomated fix by SENTINEL ({incident_id})"],
            cwd=repo, check=True, capture_output=True,
        )
        if settings.github_pr_enabled and shutil.which("gh"):
            subprocess.run(["git", "push", "-u", "origin", branch], cwd=repo, check=True, capture_output=True)
            proc = subprocess.run(
                ["gh", "pr", "create", "--title", f"fix: {title}", "--body", body],
                cwd=repo, check=True, capture_output=True, text=True,
            )
            return {"mode": "live", "branch": branch, "url": proc.stdout.strip()}
        # Local commit made, PR mocked.
        payload = {"incident_id": incident_id, "branch": branch, "title": title}
        _record_mock("github_pr", payload)
        return {"mode": "mock", "branch": branch, "url": f"local://{branch}", "note": "commit created locally; enable SENTINEL_GITHUB_PR=1 for a real PR"}
    except Exception as exc:  # noqa: BLE001 — reporting must never take down remediation
        payload = {"incident_id": incident_id, "title": title, "error": str(exc)}
        _record_mock("github_pr", payload)
        return {"mode": "mock", "branch": branch, "url": f"mock://github/pr/{incident_id}", "note": str(exc)}


# ── WeKan ─────────────────────────────────────────────────────────────────
async def create_wekan_card(incident_id: str, title: str, description: str) -> dict:
    """File an incident card on the WeKan board (live) or record it (mock)."""
    if settings.wekan_url and settings.wekan_username:
        try:
            async with httpx.AsyncClient(timeout=10.0, base_url=settings.wekan_url) as client:
                login = await client.post(
                    "/users/login",
                    data={"username": settings.wekan_username, "password": settings.wekan_password},
                )
                login.raise_for_status()
                auth = login.json()
                headers = {"Authorization": f"Bearer {auth['token']}"}
                resp = await client.post(
                    f"/api/boards/{settings.wekan_board_id}/lists/{settings.wekan_list_id}/cards",
                    headers=headers,
                    json={"title": title, "description": description, "authorId": auth["id"]},
                )
                resp.raise_for_status()
                card_id = resp.json().get("_id", "")
                return {"mode": "live", "card_id": card_id, "url": f"{settings.wekan_url}/b/{settings.wekan_board_id}"}
        except Exception as exc:  # noqa: BLE001
            _record_mock("wekan_card", {"incident_id": incident_id, "title": title, "error": str(exc)})
            return {"mode": "mock", "card_id": f"mock-{incident_id}", "note": f"live call failed: {exc}"}
    _record_mock("wekan_card", {"incident_id": incident_id, "title": title, "description": description})
    return {"mode": "mock", "card_id": f"mock-{incident_id}", "url": f"mock://wekan/card/{incident_id}"}


# ── Slack ─────────────────────────────────────────────────────────────────
async def post_slack(incident_id: str, text: str) -> dict:
    """Post an incident update to the Slack channel (live) or record it (mock)."""
    if settings.slack_webhook_url:
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(settings.slack_webhook_url, json={"text": text})
                resp.raise_for_status()
            return {"mode": "live", "ok": True}
        except Exception as exc:  # noqa: BLE001
            _record_mock("slack_post", {"incident_id": incident_id, "text": text, "error": str(exc)})
            return {"mode": "mock", "ok": False, "note": f"live call failed: {exc}"}
    _record_mock("slack_post", {"incident_id": incident_id, "text": text})
    return {"mode": "mock", "ok": True}
