"""SENTINEL control plane: REST API + WebSocket event stream + dashboard.

  GET  /                             glass-box dashboard
  WS   /ws                           live TraceEvent stream
  GET  /api/state                    incidents + service health + config
  GET  /api/incidents/{id}/trace     full replayable audit trail
  POST /api/incidents/{id}/approve   human-in-the-loop: approve fix
  POST /api/incidents/{id}/reject    human-in-the-loop: reject fix
  POST /api/demo/inject/{bug}        break the demo service live
  POST /api/demo/restore             restore pristine service code
"""

from __future__ import annotations

import asyncio
import json
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from sentinel import __version__
from sentinel.audit import audit
from sentinel.config import settings
from sentinel.events import bus
from sentinel.orchestrator import commander
from sentinel.watchdog import watchdog

DASHBOARD_DIR = Path(__file__).resolve().parents[1] / "dashboard"


@asynccontextmanager
async def lifespan(_app: FastAPI):
    import os
    if not (os.environ.get("ANTHROPIC_API_KEY") or os.environ.get("ANTHROPIC_AUTH_TOKEN")):
        print(
            "[SENTINEL] WARNING: no ANTHROPIC_API_KEY found — incidents will be "
            "detected but the fix loop will escalate immediately. Add your key to .env."
        )
    watchdog.start()
    yield
    await watchdog.stop()


app = FastAPI(title="SENTINEL", version=__version__, lifespan=lifespan)


class ApprovalBody(BaseModel):
    note: str = ""


# ── state & traces ────────────────────────────────────────────────────────
@app.get("/api/state")
async def get_state() -> dict:
    return {
        "version": __version__,
        "config": {
            "model": settings.model,
            "service_url": settings.service_url,
            "confidence_threshold": settings.confidence_threshold,
            "domain": commander.adapter.key,
            "domain_name": commander.adapter.display_name,
            "connectors": {
                "slack": "live" if settings.slack_webhook_url else "mock",
                "wekan": "live" if settings.wekan_url else "mock",
                "github_pr": "live" if settings.github_pr_enabled else "mock",
            },
        },
        "service_health": await commander.adapter.probe_health(),
        "incidents": [i.to_dict() for i in commander.incidents.values()],
    }


@app.get("/api/incidents/{incident_id}/trace")
def get_trace(incident_id: str) -> JSONResponse:
    return JSONResponse(content={"incident_id": incident_id, "events": audit.read_trace(incident_id)})


# ── human-in-the-loop ─────────────────────────────────────────────────────
@app.post("/api/incidents/{incident_id}/approve")
def approve(incident_id: str, body: ApprovalBody) -> JSONResponse:
    if commander.resolve_approval(incident_id, approved=True, note=body.note):
        return JSONResponse(content={"ok": True})
    return JSONResponse(status_code=409, content={"ok": False, "error": "incident is not awaiting approval"})


@app.post("/api/incidents/{incident_id}/reject")
def reject(incident_id: str, body: ApprovalBody) -> JSONResponse:
    if commander.resolve_approval(incident_id, approved=False, note=body.note):
        return JSONResponse(content={"ok": True})
    return JSONResponse(status_code=409, content={"ok": False, "error": "incident is not awaiting approval"})


# ── demo controls ─────────────────────────────────────────────────────────
@app.post("/api/demo/inject/{bug}")
def inject(bug: str) -> JSONResponse:
    from scripts import inject_bug  # local import keeps demo tooling out of prod path

    try:
        description = inject_bug.inject(bug)
    except KeyError:
        return JSONResponse(status_code=404, content={"ok": False, "bugs": list(inject_bug.BUGS)})
    return JSONResponse(content={"ok": True, "bug": bug, "description": description})


@app.post("/api/demo/restore")
def restore() -> JSONResponse:
    from scripts import inject_bug

    inject_bug.restore()
    return JSONResponse(content={"ok": True})


# ── live event stream ─────────────────────────────────────────────────────
@app.websocket("/ws")
async def ws_events(ws: WebSocket) -> None:
    await ws.accept()
    try:
        async for event in bus.subscribe():
            await ws.send_text(json.dumps(event.to_dict(), ensure_ascii=False))
    except (WebSocketDisconnect, RuntimeError):
        pass


# ── dashboard ─────────────────────────────────────────────────────────────
@app.get("/")
def index() -> FileResponse:
    return FileResponse(DASHBOARD_DIR / "index.html")


app.mount("/static", StaticFiles(directory=DASHBOARD_DIR), name="static")


def main() -> None:
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=settings.port, log_level="warning")


if __name__ == "__main__":
    main()
