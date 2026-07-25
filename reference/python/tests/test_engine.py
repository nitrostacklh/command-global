"""Engine lifecycle tests — domain-agnostic, fully offline.

Drives the real `Engine` with a stub adapter and a scripted (fake) LLM, so the
whole detect → verify → gate → deploy → report loop is exercised with no network
and no API key. Proves the engine is decoupled from any specific domain and
guards the refactor from regressions.
"""

from __future__ import annotations

import asyncio
from types import SimpleNamespace

from sentinel.adapters.base import BlastRadius, DomainAdapter, IncidentContext, ToolResult
from sentinel.adapters.finops.adapter import FinOpsAdapter
from sentinel.orchestrator import Engine


# ── fake LLM plumbing ──────────────────────────────────────────────────────
def _text(t: str):
    return SimpleNamespace(type="text", text=t)


def _tool(name: str, inp: dict, id: str = "tu"):
    return SimpleNamespace(type="tool_use", name=name, input=inp, id=id)


def _resp(blocks, stop="tool_use"):
    return SimpleNamespace(content=blocks, stop_reason=stop)


class ScriptedLLM:
    """Returns pre-baked responses in order, ignoring the actual prompt."""

    def __init__(self, script):
        self.script = list(script)
        self.calls = 0

    def __call__(self, system, messages, tools):
        resp = self.script[min(self.calls, len(self.script) - 1)]
        self.calls += 1
        return resp


# ── stub adapter ────────────────────────────────────────────────────────────
class StubContext(IncidentContext):
    def __init__(self, incident_id):
        super().__init__(incident_id)
        self.mutated = False
        self.deployed = False


class StubAdapter(DomainAdapter):
    key = "stub"
    display_name = "Stub"
    submit_tool = "submit"
    verify_tool = "verify"
    mutation_tools = {"mutate"}

    def __init__(self, blast_score=1.0):
        self._blast = blast_score

    def system_prompt(self): return "stub"
    def tools(self): return [{"name": n, "description": n,
                              "input_schema": {"type": "object", "properties": {}, "additionalProperties": False}}
                             for n in ("observe", "mutate", "verify", "submit")]
    def framing(self, symptom): return symptom
    def open_context(self, incident_id): return StubContext(incident_id)

    async def execute_tool(self, ctx, name, args):
        if name == "observe":
            return ToolResult({"info": "state observed"})
        if name == "mutate":
            ctx.mutated = True
            await ctx.emit("patch.applied", "mutated", {"diff": "- old\n+ new"})
            return ToolResult({"mutated": True})
        if name == "verify":
            passed = ctx.mutated
            await ctx.emit("tests.result", "verify", {"passed": passed, "output": "ok"})
            return ToolResult({"passed": passed})
        return ToolResult({"error": f"unknown {name}"}, is_error=True)

    def verification_passed(self, result): return bool(result.get("passed"))
    def blast_radius(self, ctx): return BlastRadius(self._blast, "stub blast")
    def diff(self, ctx): return "stub diff"

    async def deploy(self, ctx):
        ctx.deployed = True
        return ["stub-unit"]

    async def await_recovery(self, ctx):
        await ctx.emit("deploy.verified", "recovered", {})
        return True

    async def report(self, incident, ctx):
        return [{"kind": "noop"}]


# ── helpers ──────────────────────────────────────────────────────────────────
async def _drive(engine, incident, until, timeout=5.0):
    """Pump the loop until the incident reaches a wanted status (or terminal)."""
    deadline = asyncio.get_event_loop().time() + timeout
    while asyncio.get_event_loop().time() < deadline:
        if incident.status in until:
            return
        await asyncio.sleep(0.01)
    raise AssertionError(f"incident stuck at {incident.status}, wanted {until}")


# ── tests ─────────────────────────────────────────────────────────────────────
def test_autonomous_resolution():
    async def scenario():
        engine = Engine(StubAdapter(blast_score=1.0), llm_complete=ScriptedLLM([
            _resp([_tool("mutate", {})]),
            _resp([_tool("verify", {})]),
            _resp([_tool("submit", {"root_cause": "rc", "fix_summary": "fixed it", "confidence": 0.95})]),
        ]))
        inc = await engine.open_incident("something broke")
        await _drive(engine, inc, {"RESOLVED", "ESCALATED"})
        return inc

    inc = asyncio.run(scenario())
    assert inc.status == "RESOLVED", inc.status
    assert inc.verdict["autonomous"] is True
    assert inc.iterations == 1
    assert inc.fix_summary == "fixed it"


def test_low_confidence_pauses_then_human_approves():
    async def scenario():
        engine = Engine(StubAdapter(blast_score=0.0), llm_complete=ScriptedLLM([
            _resp([_tool("mutate", {})]),
            _resp([_tool("verify", {})]),
            _resp([_tool("submit", {"root_cause": "rc", "fix_summary": "risky fix", "confidence": 0.30})]),
        ]))
        inc = await engine.open_incident("broke")
        await _drive(engine, inc, {"AWAITING_APPROVAL", "RESOLVED", "ESCALATED"})
        assert inc.status == "AWAITING_APPROVAL", inc.status
        assert inc.verdict["autonomous"] is False
        assert engine.resolve_approval(inc.id, approved=True, note="lgtm") is True
        await _drive(engine, inc, {"RESOLVED", "ESCALATED"})
        return inc

    inc = asyncio.run(scenario())
    assert inc.status == "RESOLVED", inc.status
    assert inc.approval_note == "lgtm"


def test_human_rejection_escalates():
    async def scenario():
        engine = Engine(StubAdapter(blast_score=0.0), llm_complete=ScriptedLLM([
            _resp([_tool("mutate", {})]),
            _resp([_tool("verify", {})]),
            _resp([_tool("submit", {"root_cause": "rc", "fix_summary": "risky", "confidence": 0.10})]),
        ]))
        inc = await engine.open_incident("broke")
        await _drive(engine, inc, {"AWAITING_APPROVAL"})
        engine.resolve_approval(inc.id, approved=False, note="no way")
        await _drive(engine, inc, {"RESOLVED", "ESCALATED"})
        return inc

    inc = asyncio.run(scenario())
    assert inc.status == "ESCALATED"


def test_submit_blocked_until_verified():
    """Submitting before a passing verify must be refused; the agent then
    mutates + verifies and succeeds — exercising the hard verification gate."""
    async def scenario():
        engine = Engine(StubAdapter(), llm_complete=ScriptedLLM([
            _resp([_tool("submit", {"root_cause": "x", "fix_summary": "premature", "confidence": 0.9})]),
            _resp([_tool("mutate", {})]),
            _resp([_tool("verify", {})]),
            _resp([_tool("submit", {"root_cause": "x", "fix_summary": "verified", "confidence": 0.9})]),
        ]))
        inc = await engine.open_incident("broke")
        await _drive(engine, inc, {"RESOLVED", "ESCALATED"})
        return inc

    inc = asyncio.run(scenario())
    assert inc.status == "RESOLVED"
    assert inc.fix_summary == "verified"


def test_real_finops_adapter_end_to_end():
    """The engine drives the REAL FinOps adapter (mock cloud, scripted LLM) from
    a spend anomaly to an autonomous resolution — deploy, recovery and report
    included. Proves the pluggable core with a second live adapter, offline."""
    async def scenario():
        engine = Engine(FinOpsAdapter(), llm_complete=ScriptedLLM([
            _resp([_tool("read_cost_report", {})]),
            _resp([_tool("list_resources", {})]),
            _resp([_tool("stage_change", {"resource_id": "vol-orphaned-01", "action": "delete"})]),
            _resp([_tool("stage_change", {"resource_id": "vol-orphaned-02", "action": "delete"})]),
            _resp([_tool("stage_change", {"resource_id": "nodepool-web-prod",
                                          "action": "rightsize", "target_monthly_usd": 1900})]),
            _resp([_tool("simulate_savings", {})]),
            _resp([_tool("submit_resolution", {"root_cause": "over-provisioned web pool + 2 idle volumes",
                                               "fix_summary": "rightsize web pool, delete idle volumes",
                                               "confidence": 0.9})]),
        ]))
        inc = await engine.open_incident("cloud spend +46% over baseline")
        await _drive(engine, inc, {"RESOLVED", "ESCALATED"})
        return inc

    inc = asyncio.run(scenario())
    assert inc.status == "RESOLVED", inc.status
    assert inc.domain == "finops"
    assert inc.verdict["autonomous"] is True
    assert "$" in inc.diff  # a cost diff, not a code diff


def test_agent_giving_up_escalates():
    async def scenario():
        engine = Engine(StubAdapter(), llm_complete=ScriptedLLM([
            _resp([_text("I cannot fix this.")], stop="end_turn"),
        ]))
        inc = await engine.open_incident("broke")
        await _drive(engine, inc, {"RESOLVED", "ESCALATED"})
        return inc

    inc = asyncio.run(scenario())
    assert inc.status == "ESCALATED"
