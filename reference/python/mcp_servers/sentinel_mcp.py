"""SENTINEL MCP server — the agent's capabilities as Model Context Protocol tools.

Exposes SENTINEL's observability and incident-management surface over MCP
(stdio transport), so any MCP client — Claude Desktop, Claude Code, an MCP
inspector, or another agent — can plug into the running incident commander.

Run standalone:
    python -m mcp_servers.sentinel_mcp

Claude Code registration:
    claude mcp add sentinel -- python -m mcp_servers.sentinel_mcp
"""

from __future__ import annotations

import sys
from pathlib import Path

# Allow running as a script from the repo root.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import httpx
from mcp.server.fastmcp import FastMCP

from sentinel.audit import audit
from sentinel.config import settings
from sentinel.tools import observability

mcp = FastMCP("sentinel")


@mcp.tool()
async def get_service_health() -> dict:
    """Probe the watched service's /health endpoint and return its status."""
    return await observability.get_health()


@mcp.tool()
def read_service_logs(lines: int = 80) -> str:
    """Tail the watched service's application log (errors and tracebacks land here)."""
    return observability.read_logs(lines)


@mcp.tool()
async def list_incidents() -> list[dict]:
    """List all incidents SENTINEL has handled, with status and resolution."""
    async with httpx.AsyncClient(timeout=5.0) as client:
        resp = await client.get(f"http://127.0.0.1:{settings.port}/api/state")
        resp.raise_for_status()
    return resp.json()["incidents"]


@mcp.tool()
def get_incident_trace(incident_id: str) -> list[dict]:
    """Return the full replayable audit trail for one incident."""
    return audit.read_trace(incident_id)


@mcp.tool()
async def approve_incident(incident_id: str, note: str = "") -> dict:
    """Approve a fix that is awaiting human sign-off (human-in-the-loop gate)."""
    async with httpx.AsyncClient(timeout=5.0) as client:
        resp = await client.post(
            f"http://127.0.0.1:{settings.port}/api/incidents/{incident_id}/approve",
            json={"note": note},
        )
    return resp.json()


@mcp.tool()
async def reject_incident(incident_id: str, note: str = "") -> dict:
    """Reject a fix that is awaiting human sign-off; the incident escalates to humans."""
    async with httpx.AsyncClient(timeout=5.0) as client:
        resp = await client.post(
            f"http://127.0.0.1:{settings.port}/api/incidents/{incident_id}/reject",
            json={"note": note},
        )
    return resp.json()


if __name__ == "__main__":
    mcp.run()  # stdio transport
