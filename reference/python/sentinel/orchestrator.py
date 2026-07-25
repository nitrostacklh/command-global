"""The Incident Commander — SENTINEL's domain-agnostic agentic loop.

The `Engine` runs one lifecycle for every kind of incident:

  DETECTED -> DIAGNOSING -> VERIFYING (self-heal loop until the fix proves out)
           -> AWAITING_APPROVAL (only if confidence below threshold)
           -> DEPLOYING -> REPORTING -> RESOLVED
                                     -> ESCALATED (rejected / failed / timed out)

Everything domain-specific — the tools, how a fix is proven, how risky it is,
how it deploys and reports — lives behind a `DomainAdapter`. The engine holds no
knowledge of microservices or cloud bills; swap the adapter and the same loop
heals a different domain. `commander` is the DevOps instance the server and
watchdog drive; other domains construct their own `Engine(adapter)`.

The diagnose/verify phase is a manual Claude tool-use loop: the agent observes,
mutates state via the adapter's tools, and runs the adapter's verification. It
can only submit a resolution after a passing verification. Every thought, tool
call and result is published to the event bus and the audit log.
"""

from __future__ import annotations

import asyncio
import json
import time
import uuid
from dataclasses import dataclass, field
from typing import Any, Callable, Optional

from sentinel import confidence, llm
from sentinel.adapters import get_adapter
from sentinel.adapters.base import DomainAdapter, IncidentContext
from sentinel.audit import audit
from sentinel.config import settings
from sentinel.events import TraceEvent, bus

# ── incident model ────────────────────────────────────────────────────────

STATUSES = (
    "DETECTED", "DIAGNOSING", "VERIFYING", "AWAITING_APPROVAL",
    "DEPLOYING", "REPORTING", "RESOLVED", "ESCALATED",
)


@dataclass
class Incident:
    id: str
    symptom: str
    domain: str = "devops"
    opened_at: float = field(default_factory=time.time)
    status: str = "DETECTED"
    diagnosis: str = ""
    fix_summary: str = ""
    diff: str = ""
    test_summary: str = ""
    iterations: int = 0
    verdict: Optional[dict] = None
    actions: list[dict] = field(default_factory=list)
    approval_note: str = ""
    closed_at: Optional[float] = None
    _approval: asyncio.Event = field(default_factory=asyncio.Event, repr=False)
    _approved: bool = field(default=False, repr=False)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "symptom": self.symptom,
            "domain": self.domain,
            "opened_at": self.opened_at,
            "status": self.status,
            "diagnosis": self.diagnosis,
            "fix_summary": self.fix_summary,
            "diff": self.diff,
            "test_summary": self.test_summary,
            "iterations": self.iterations,
            "verdict": self.verdict,
            "actions": self.actions,
            "approval_note": self.approval_note,
            "closed_at": self.closed_at,
        }


# Injectable LLM turn — real one by default; tests/replay swap in a stub.
LLMComplete = Callable[[str, list[dict[str, Any]], list[dict[str, Any]]], Any]


class Engine:
    """Domain-agnostic incident commander. One instance per domain adapter."""

    def __init__(self, adapter: DomainAdapter, llm_complete: LLMComplete | None = None) -> None:
        self.adapter = adapter
        self._llm = llm_complete or llm.complete
        self.incidents: dict[str, Incident] = {}

    # — event helpers —
    async def _emit(self, incident: Incident, type_: str, title: str, detail: dict | None = None) -> None:
        event = TraceEvent(incident_id=incident.id, type=type_, title=title, detail=detail or {})
        audit.append(event)
        await bus.publish(event)

    def _emitter_for(self, incident: Incident):
        async def emit(type_: str, title: str, detail: dict) -> None:
            await self._emit(incident, type_, title, detail)
        return emit

    async def _set_status(self, incident: Incident, status: str) -> None:
        incident.status = status
        await self._emit(incident, "incident.status", f"Status → {status}", {"status": status})

    # — public API —
    def active_incident(self) -> Optional[Incident]:
        for inc in self.incidents.values():
            if inc.status not in ("RESOLVED", "ESCALATED"):
                return inc
        return None

    def resolve_approval(self, incident_id: str, approved: bool, note: str = "") -> bool:
        inc = self.incidents.get(incident_id)
        if not inc or inc.status != "AWAITING_APPROVAL":
            return False
        inc._approved = approved
        inc.approval_note = note
        inc._approval.set()
        return True

    async def open_incident(self, symptom: str) -> Incident:
        incident = Incident(
            id=f"INC-{time.strftime('%Y%m%d')}-{uuid.uuid4().hex[:6]}",
            symptom=symptom,
            domain=self.adapter.key,
        )
        self.incidents[incident.id] = incident
        await self._emit(
            incident, "incident.opened",
            f"Incident opened: {symptom.splitlines()[0][:120]}",
            {"symptom": symptom, "domain": self.adapter.key, "domain_name": self.adapter.display_name},
        )
        asyncio.create_task(self._run(incident))
        return incident

    # — the pipeline —
    async def _run(self, incident: Incident) -> None:
        ctx: IncidentContext | None = None
        try:
            await self._set_status(incident, "DIAGNOSING")
            ctx = self.adapter.open_context(incident.id)
            ctx.bind_emitter(self._emitter_for(incident))

            resolution = await self._agent_loop(incident, ctx)
            if resolution is None:
                await self._escalate(incident, "agent could not produce a verified fix")
                return

            incident.diagnosis = resolution["root_cause"]
            incident.fix_summary = resolution["fix_summary"]
            incident.diff = self.adapter.diff(ctx)

            # Autonomy gate
            blast = self.adapter.blast_radius(ctx)
            verdict = confidence.assess(
                verification_passed=True,
                agent_confidence=float(resolution["confidence"]),
                iterations_used=max(incident.iterations, 1),
                blast_score=blast.score,
                blast_reason=blast.reason,
            )
            incident.verdict = verdict.to_dict()
            await self._emit(
                incident, "confidence.verdict",
                f"Confidence {verdict.score:.2f} vs threshold {verdict.threshold:.2f} — "
                + ("autonomous deploy" if verdict.autonomous else "human approval required"),
                incident.verdict,
            )

            if not verdict.autonomous:
                await self._set_status(incident, "AWAITING_APPROVAL")
                await self._emit(
                    incident, "approval.requested",
                    "Awaiting human approval in the dashboard",
                    {"diff": incident.diff, "verdict": incident.verdict},
                )
                try:
                    await asyncio.wait_for(incident._approval.wait(), timeout=settings.approval_timeout)
                except asyncio.TimeoutError:
                    await self._escalate(incident, "approval timed out")
                    return
                if not incident._approved:
                    await self._emit(incident, "approval.rejected", "Human rejected the fix",
                                     {"note": incident.approval_note})
                    await self._escalate(incident, f"fix rejected by human: {incident.approval_note}")
                    return
                await self._emit(incident, "approval.granted", "Human approved the fix",
                                 {"note": incident.approval_note})

            # Deploy
            await self._set_status(incident, "DEPLOYING")
            promoted = await self.adapter.deploy(ctx)
            await self._emit(incident, "deploy.promoted", f"Change deployed: {', '.join(promoted)}",
                             {"units": promoted})

            recovered = await self.adapter.await_recovery(ctx)
            if not recovered:
                await self._escalate(incident, "system did not recover after deploy")
                return

            # Report
            await self._set_status(incident, "REPORTING")
            incident.actions = await self.adapter.report(incident, ctx)

            incident.closed_at = time.time()
            await self._set_status(incident, "RESOLVED")
            await self._emit(
                incident, "incident.resolved",
                f"Resolved in {incident.closed_at - incident.opened_at:.0f}s: {incident.fix_summary}",
                {"duration_s": round(incident.closed_at - incident.opened_at, 1)},
            )
        except Exception as exc:  # noqa: BLE001 — pipeline errors become escalations
            await self._emit(incident, "incident.error", f"Pipeline error: {exc}", {"error": str(exc)})
            await self._escalate(incident, f"pipeline error: {exc}")
        finally:
            if ctx is not None:
                try:
                    await ctx.cleanup()
                except Exception:  # noqa: BLE001
                    pass

    # — agent loop —
    async def _agent_loop(self, incident: Incident, ctx: IncidentContext) -> Optional[dict]:
        messages: list[dict[str, Any]] = [{
            "role": "user",
            "content": f"Incident {incident.id}.\n\n{self.adapter.framing(incident.symptom)}",
        }]
        tools = self.adapter.tools()
        system = self.adapter.system_prompt()
        last_verified = False

        for _turn in range(settings.max_agent_turns):
            response = await asyncio.to_thread(self._llm, system, messages, tools)

            # Surface reasoning + narration to the glass box.
            for block in response.content:
                if block.type == "thinking" and getattr(block, "thinking", ""):
                    await self._emit(incident, "agent.thinking", "Reasoning", {"text": block.thinking})
                elif block.type == "text" and block.text.strip():
                    await self._emit(incident, "agent.message", block.text.strip()[:200], {"text": block.text})

            if response.stop_reason != "tool_use":
                return None  # agent stopped without submitting — treat as failure

            messages.append({"role": "assistant", "content": response.content})
            tool_results: list[dict[str, Any]] = []

            for block in response.content:
                if block.type != "tool_use":
                    continue
                name, args = block.name, dict(block.input)

                if name == self.adapter.submit_tool:
                    if not last_verified:
                        result = {"error": f"Refused: {self.adapter.verify_tool} has not passed "
                                           "since your last change. Verify first."}
                        await self._emit(incident, "tool.blocked",
                                         f"{self.adapter.submit_tool} blocked — not verified", result)
                        tool_results.append(_tool_result(block.id, result, is_error=True))
                        continue
                    await self._emit(incident, "agent.resolution",
                                     args.get("fix_summary", "Resolution submitted"), args)
                    return args

                result, is_error = await self._execute_tool(incident, ctx, name, args)
                if name == self.adapter.verify_tool:
                    incident.iterations += 1  # every verification attempt counts
                    last_verified = self.adapter.verification_passed(result)
                elif name in self.adapter.mutation_tools and not is_error:
                    last_verified = False  # any new mutation must be re-verified
                tool_results.append(_tool_result(block.id, result, is_error=is_error))

            messages.append({"role": "user", "content": tool_results})

        await self._emit(incident, "agent.exhausted", "Agent turn limit reached without a resolution", {})
        return None

    async def _execute_tool(self, incident: Incident, ctx: IncidentContext,
                            name: str, args: dict) -> tuple[dict, bool]:
        await self._emit(incident, "tool.call", f"{name}({_short_args(args)})",
                         {"tool": name, "args": args})
        if name == self.adapter.verify_tool and incident.status != "VERIFYING":
            await self._set_status(incident, "VERIFYING")
        try:
            outcome = await self.adapter.execute_tool(ctx, name, args)
            return outcome.data, outcome.is_error
        except Exception as exc:  # noqa: BLE001 — tool failures go back to the agent
            await self._emit(incident, "tool.error", f"{name} failed: {exc}", {"error": str(exc)})
            return {"error": str(exc)}, True

    # — escalation —
    async def _escalate(self, incident: Incident, reason: str) -> None:
        incident.closed_at = time.time()
        await self._set_status(incident, "ESCALATED")
        try:
            incident.actions += await self.adapter.notify_escalation(
                incident, reason, self._emitter_for(incident))
        except Exception:  # noqa: BLE001 — alerting must never mask the escalation
            pass
        await self._emit(incident, "incident.escalated", f"Escalated: {reason}", {"reason": reason})


# ── helpers ───────────────────────────────────────────────────────────────

def _tool_result(tool_use_id: str, result: dict, is_error: bool = False) -> dict:
    return {
        "type": "tool_result",
        "tool_use_id": tool_use_id,
        "content": json.dumps(result, ensure_ascii=False),
        "is_error": is_error,
    }


def _short_args(args: dict) -> str:
    parts = []
    for k, v in args.items():
        s = str(v).replace("\n", " ")
        parts.append(f"{k}={s[:40]}{'…' if len(s) > 40 else ''}")
    return ", ".join(parts)


# The commander the server + watchdog drive — DevOps by default, switchable via
# SENTINEL_DOMAIN. Other domains can also be run standalone with their own
# Engine(adapter) — see sentinel/adapters/finops/demo.py.
commander = Engine(get_adapter(settings.domain))
