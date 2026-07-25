"""Trace events and the in-process event bus.

Every observable step SENTINEL takes — a thought, a tool call, a test run, a
confidence verdict, an external action — is emitted as a TraceEvent. The bus
fans events out to any number of subscribers (the WebSocket layer, the audit
log) without the orchestrator knowing who is listening.
"""

from __future__ import annotations

import asyncio
import itertools
import time
from dataclasses import dataclass, field
from typing import Any, AsyncIterator

_seq = itertools.count(1)


@dataclass
class TraceEvent:
    incident_id: str
    type: str            # e.g. "incident.opened", "agent.thinking", "tool.call", "tests.result"
    title: str
    detail: dict[str, Any] = field(default_factory=dict)
    ts: float = field(default_factory=time.time)
    seq: int = field(default_factory=lambda: next(_seq))

    def to_dict(self) -> dict[str, Any]:
        return {
            "seq": self.seq,
            "ts": self.ts,
            "incident_id": self.incident_id,
            "type": self.type,
            "title": self.title,
            "detail": self.detail,
        }


class EventBus:
    """Fan-out async pub/sub. Slow subscribers never block the publisher."""

    def __init__(self) -> None:
        self._subscribers: set[asyncio.Queue[TraceEvent]] = set()
        self._lock = asyncio.Lock()

    async def publish(self, event: TraceEvent) -> None:
        async with self._lock:
            for queue in self._subscribers:
                # Unbounded queues: publishing never blocks; the WS layer drains.
                queue.put_nowait(event)

    async def subscribe(self) -> AsyncIterator[TraceEvent]:
        queue: asyncio.Queue[TraceEvent] = asyncio.Queue()
        async with self._lock:
            self._subscribers.add(queue)
        try:
            while True:
                yield await queue.get()
        finally:
            async with self._lock:
                self._subscribers.discard(queue)


bus = EventBus()
