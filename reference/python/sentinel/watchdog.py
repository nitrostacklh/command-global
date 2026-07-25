"""The watchdog — continuous health monitoring that opens incidents.

Polls the watched service's /health endpoint. Two consecutive failures
(debounce against transient blips) open an incident carrying the health
snapshot and a log excerpt, then hand it to the IncidentCommander. While an
incident is active, the watchdog stands down to avoid duplicates.
"""

from __future__ import annotations

import asyncio
import time

from sentinel.config import settings
from sentinel.orchestrator import commander


class Watchdog:
    def __init__(self) -> None:
        self._task: asyncio.Task | None = None
        self._consecutive_failures = 0
        self.last_health: dict = {}

    def start(self) -> None:
        if self._task is None or self._task.done():
            self._task = asyncio.create_task(self._loop(), name="sentinel-watchdog")

    async def stop(self) -> None:
        if self._task:
            self._task.cancel()

    async def _loop(self) -> None:
        while True:
            try:
                await self._tick()
            except asyncio.CancelledError:
                raise
            except Exception:  # noqa: BLE001 — the watchdog must survive anything
                pass
            await asyncio.sleep(settings.poll_interval)

    async def _tick(self) -> None:
        self.last_health = await commander.adapter.probe_health()

        if self.last_health.get("healthy"):
            self._consecutive_failures = 0
            return

        # Unreachable ≠ broken code — don't open incidents when the service
        # simply isn't running (e.g. before the demo starts).
        if not self.last_health.get("reachable"):
            self._consecutive_failures = 0
            return

        self._consecutive_failures += 1
        if self._consecutive_failures < 2:
            return  # debounce

        if commander.active_incident() is not None:
            return  # one incident at a time

        # Cooldown: if the last incident for this outage just escalated,
        # don't spam new incidents every poll — give humans time to act.
        last_closed = max(
            (i.closed_at for i in commander.incidents.values() if i.closed_at), default=0.0
        )
        if time.time() - last_closed < 90:
            return

        self._consecutive_failures = 0
        symptom = commander.adapter.build_symptom(self.last_health)
        await commander.open_incident(symptom)


watchdog = Watchdog()
