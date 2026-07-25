"""Observability tools: service health and log access."""

from __future__ import annotations

import httpx

from sentinel.config import settings


async def get_health() -> dict:
    """Probe the watched service's /health endpoint."""
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.get(f"{settings.service_url}/health")
        return {
            "reachable": True,
            "status_code": resp.status_code,
            "healthy": resp.status_code == 200,
            "body": resp.json() if "json" in resp.headers.get("content-type", "") else resp.text[:500],
        }
    except Exception as exc:  # noqa: BLE001 — network probing must not raise
        return {"reachable": False, "healthy": False, "error": str(exc)}


def read_logs(lines: int = 80) -> str:
    """Tail the watched service's application log."""
    log_path = settings.service_dir / "logs" / "service.log"
    if not log_path.exists():
        return "(no service log found)"
    content = log_path.read_text(encoding="utf-8", errors="replace").splitlines()
    return "\n".join(content[-lines:]) or "(log is empty)"
