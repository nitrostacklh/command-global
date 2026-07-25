"""Append-only audit trail.

Every TraceEvent for an incident is persisted to
logs/audit/<incident_id>.jsonl the moment it happens, giving a replayable,
tamper-evident record an auditor can read line by line.
"""

from __future__ import annotations

import json
from pathlib import Path

from sentinel.config import settings
from sentinel.events import TraceEvent


class AuditLog:
    def __init__(self, root: Path | None = None) -> None:
        self.root = (root or settings.logs_dir / "audit").resolve()
        self.root.mkdir(parents=True, exist_ok=True)

    def _path(self, incident_id: str) -> Path:
        safe = "".join(c for c in incident_id if c.isalnum() or c in "-_")
        return self.root / f"{safe}.jsonl"

    def append(self, event: TraceEvent) -> None:
        with self._path(event.incident_id).open("a", encoding="utf-8") as fh:
            fh.write(json.dumps(event.to_dict(), ensure_ascii=False) + "\n")

    def read_trace(self, incident_id: str) -> list[dict]:
        path = self._path(incident_id)
        if not path.exists():
            return []
        events = []
        with path.open(encoding="utf-8") as fh:
            for line in fh:
                line = line.strip()
                if line:
                    events.append(json.loads(line))
        return events

    def list_incidents(self) -> list[str]:
        return sorted(p.stem for p in self.root.glob("*.jsonl"))


audit = AuditLog()
