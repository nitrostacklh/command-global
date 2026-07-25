"""The `DomainAdapter` interface and its supporting types.

An adapter teaches the engine everything domain-specific about one kind of
incident. The engine calls these methods in a fixed lifecycle; the adapter
supplies the tools, the verification, the risk model, and the deploy/report
mechanics. Adapters emit their own domain-flavoured trace events through the
`IncidentContext.emit` handle the engine injects, so the glass-box dashboard
stays rich without the engine hard-coding any domain's vocabulary.
"""

from __future__ import annotations

import abc
from dataclasses import dataclass, field
from typing import Any, Awaitable, Callable

# An async emitter the engine injects into each IncidentContext:
#   await emit(event_type, title, detail_dict)
EmitFn = Callable[[str, str, dict], Awaitable[None]]


async def _noop_emit(_type: str, _title: str, _detail: dict) -> None:  # pragma: no cover
    return None


@dataclass
class ToolResult:
    """Outcome of one agent tool call. `data` is JSON-serialised back to the model."""

    data: dict
    is_error: bool = False


@dataclass
class BlastRadius:
    """Adapter-computed risk signal for the autonomy gate, already normalised to
    a [0, 1] score (1 = smallest / safest change) plus a human-readable reason.

    Keeping normalisation inside the adapter is what lets one gate serve every
    domain: DevOps scores by files/lines changed, FinOps by resources touched
    and monthly-spend impact — different units, same [0, 1] contract.
    """

    score: float
    reason: str


class IncidentContext:
    """Per-incident working state owned by an adapter (a sandbox, a cloud-cost
    model, …). The engine treats it opaquely and only injects `emit`.
    Adapters subclass this to carry whatever they need.
    """

    def __init__(self, incident_id: str) -> None:
        self.incident_id = incident_id
        self._emit: EmitFn = _noop_emit

    def bind_emitter(self, emit: EmitFn) -> None:
        self._emit = emit

    async def emit(self, event_type: str, title: str, detail: dict | None = None) -> None:
        await self._emit(event_type, title, detail or {})

    async def cleanup(self) -> None:
        """Release resources (temp dirs, clones). Default: nothing to do."""


class DomainAdapter(abc.ABC):
    """Everything the engine needs to run an incident in one domain.

    Subclasses set the class attributes below and implement the abstract
    methods. The three tool-loop attributes tell the engine how to police the
    agent's tool use generically:

      submit_tool     the tool that ends the loop with a resolution
      verify_tool     the tool that proves the fix (each call = one iteration)
      mutation_tools  tools that change state and thus invalidate a prior verify
    """

    key: str = "base"
    display_name: str = "Base"
    tagline: str = ""
    submit_tool: str = "submit_resolution"
    verify_tool: str = ""
    mutation_tools: set[str] = field(default_factory=set)  # type: ignore[assignment]

    # ── agent surface ──────────────────────────────────────────────────────
    @abc.abstractmethod
    def system_prompt(self) -> str:
        """System prompt framing the agent's role and rules for this domain."""

    @abc.abstractmethod
    def tools(self) -> list[dict[str, Any]]:
        """Anthropic tool schemas the agent may call, including submit_tool."""

    @abc.abstractmethod
    def framing(self, symptom: str) -> str:
        """First user message: how to present the detected symptom to the agent."""

    @abc.abstractmethod
    def open_context(self, incident_id: str) -> IncidentContext:
        """Create the per-incident working state (e.g. spin up a sandbox)."""

    @abc.abstractmethod
    async def execute_tool(self, ctx: IncidentContext, name: str, args: dict) -> ToolResult:
        """Run one agent tool call against the context and return its result.
        Adapters should emit domain events (e.g. patch.applied) via ctx.emit."""

    @abc.abstractmethod
    def verification_passed(self, result: dict) -> bool:
        """Given a verify_tool result dict, did verification pass?"""

    # ── gate & deploy ────────────────────────────────────────────────────────
    @abc.abstractmethod
    def blast_radius(self, ctx: IncidentContext) -> BlastRadius:
        """Normalised risk of the proposed change, for the autonomy gate."""

    @abc.abstractmethod
    def diff(self, ctx: IncidentContext) -> str:
        """A unified-diff-style view of the proposed change, for humans/PRs."""

    @abc.abstractmethod
    async def deploy(self, ctx: IncidentContext) -> list[str]:
        """Promote the verified change to production. Return the units changed."""

    @abc.abstractmethod
    async def await_recovery(self, ctx: IncidentContext) -> bool:
        """Confirm the system actually recovered after deploy. Emits its own
        deploy.verified / deploy.failed events."""

    @abc.abstractmethod
    async def report(self, incident: Any, ctx: IncidentContext) -> list[dict]:
        """Fan out post-resolution reports (PR, ticket, chat). Return the action
        records for the audit trail; emit action.* events via ctx.emit."""

    # ── sensors (watchdog / dashboard) ───────────────────────────────────────
    async def probe_health(self) -> dict:
        """Current health snapshot for the watchdog and dashboard. Default:
        healthy (domains that aren't poll-driven override or ignore this)."""
        return {"reachable": True, "healthy": True}

    def build_symptom(self, health: dict) -> str:
        """Turn an unhealthy probe into the symptom string that opens an incident."""
        return f"health probe unhealthy: {health}"

    async def notify_escalation(self, incident: Any, reason: str, emit: EmitFn) -> list[dict]:
        """Called when an incident escalates to humans. Fan out an alert if the
        domain has a channel for it. Default: nothing. Return action records."""
        return []
