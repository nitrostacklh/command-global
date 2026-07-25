"""DevOps adapter: heal a live microservice by patching + verifying source."""

from __future__ import annotations

import asyncio
import json
import time
from typing import Any

import httpx

from sentinel.adapters.base import BlastRadius, DomainAdapter, IncidentContext, ToolResult
from sentinel.config import settings
from sentinel.tools import actions, observability
from sentinel.tools.sandbox import Sandbox

SYSTEM_PROMPT = """You are SENTINEL, an autonomous incident commander for production services.

A service you monitor is unhealthy. Your job:
1. Read the logs and health status to understand the symptom.
2. Locate the root cause in the source code (read files, search).
3. Apply the MINIMAL patch that fixes the root cause in the verification sandbox.
4. Run the test suite. If it fails, read the failures, revise your patch, and re-run until green.
5. Submit your resolution with an honest, calibrated confidence score.

Rules:
- Fix root causes, never symptoms. Do not weaken, skip, or modify tests.
- Do not refactor, rename, or "improve" code beyond the fix.
- Keep patches minimal — the blast radius of your change affects whether it can auto-deploy.
- Your confidence score feeds a real autonomy gate; overstating it erodes trust, understating it wastes human time.
- Every step you take is recorded in an audit trail reviewed by humans."""

_TOOLS: list[dict[str, Any]] = [
    {
        "name": "get_health",
        "description": "Probe the live service's /health endpoint. Returns status code and body.",
        "input_schema": {"type": "object", "properties": {}, "additionalProperties": False},
    },
    {
        "name": "read_logs",
        "description": "Tail the service's application log. Call this first — errors and tracebacks land here.",
        "input_schema": {
            "type": "object",
            "properties": {"lines": {"type": "integer", "description": "How many trailing lines (default 80)."}},
            "additionalProperties": False,
        },
    },
    {
        "name": "list_files",
        "description": "List all files in the service codebase (sandbox copy).",
        "input_schema": {"type": "object", "properties": {}, "additionalProperties": False},
    },
    {
        "name": "read_file",
        "description": "Read a source file with line numbers. Path is relative to the service root.",
        "input_schema": {
            "type": "object",
            "properties": {"path": {"type": "string"}},
            "required": ["path"],
            "additionalProperties": False,
        },
    },
    {
        "name": "search_code",
        "description": "Regex search across the service codebase. Returns file, line number and matching text.",
        "input_schema": {
            "type": "object",
            "properties": {"pattern": {"type": "string"}},
            "required": ["pattern"],
            "additionalProperties": False,
        },
    },
    {
        "name": "propose_patch",
        "description": (
            "Apply an exact string replacement to a file in the verification sandbox. "
            "`old` must match exactly one location. Make the minimal change that fixes the root cause."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "path": {"type": "string"},
                "old": {"type": "string", "description": "Exact text to replace (must be unique in the file)."},
                "new": {"type": "string", "description": "Replacement text."},
            },
            "required": ["path", "old", "new"],
            "additionalProperties": False,
        },
    },
    {
        "name": "run_tests",
        "description": "Run the service's full pytest suite against the patched sandbox. You MUST get a passing run before submitting a resolution.",
        "input_schema": {"type": "object", "properties": {}, "additionalProperties": False},
    },
    {
        "name": "submit_resolution",
        "description": (
            "Submit your final resolution. Only call this AFTER run_tests has passed. "
            "Be honest in `confidence`: it feeds an autonomy gate that decides whether "
            "your fix deploys automatically or waits for human approval."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "root_cause": {"type": "string", "description": "One-paragraph root cause analysis."},
                "fix_summary": {"type": "string", "description": "One-sentence description of the fix."},
                "confidence": {"type": "number", "description": "Your calibrated confidence in this fix, 0.0-1.0."},
            },
            "required": ["root_cause", "fix_summary", "confidence"],
            "additionalProperties": False,
        },
    },
]


class SandboxContext(IncidentContext):
    """DevOps working state: an isolated copy of the service to patch and test."""

    def __init__(self, incident_id: str) -> None:
        super().__init__(incident_id)
        self.sandbox = Sandbox(incident_id)

    async def cleanup(self) -> None:
        self.sandbox.cleanup()


class DevOpsAdapter(DomainAdapter):
    key = "devops"
    display_name = "DevOps · Service Healing"
    tagline = "Patches the regression, proves it with the test suite, ships the PR."
    submit_tool = "submit_resolution"
    verify_tool = "run_tests"
    mutation_tools = {"propose_patch"}

    def system_prompt(self) -> str:
        return SYSTEM_PROMPT

    def tools(self) -> list[dict[str, Any]]:
        return _TOOLS

    def framing(self, symptom: str) -> str:
        return (
            f"Detected symptom:\n{symptom}\n\n"
            "Diagnose the root cause, patch it in the sandbox, verify with the test "
            "suite, then submit your resolution."
        )

    def open_context(self, incident_id: str) -> IncidentContext:
        return SandboxContext(incident_id)

    async def execute_tool(self, ctx: IncidentContext, name: str, args: dict) -> ToolResult:
        sb = ctx.sandbox  # type: ignore[attr-defined]
        if name == "get_health":
            return ToolResult(await observability.get_health())
        if name == "read_logs":
            return ToolResult({"log": observability.read_logs(int(args.get("lines", 80)))})
        if name == "list_files":
            return ToolResult({"files": sb.list_files()})
        if name == "read_file":
            return ToolResult({"content": sb.read_file(args["path"])})
        if name == "search_code":
            return ToolResult({"matches": sb.search(args["pattern"])})
        if name == "propose_patch":
            diff = sb.apply_patch(args["path"], args["old"], args["new"])
            await ctx.emit("patch.applied", f"Patch applied to {args['path']}",
                           {"path": args["path"], "diff": diff})
            return ToolResult({"applied": True, "diff": diff})
        if name == "run_tests":
            test = await asyncio.to_thread(sb.run_tests)
            await ctx.emit(
                "tests.result",
                ("✅ " if test.passed else "❌ ") + test.summary,
                {"passed": test.passed, "summary": test.summary, "output": test.output},
            )
            return ToolResult({"passed": test.passed, "summary": test.summary, "output": test.output})
        return ToolResult({"error": f"unknown tool {name}"}, is_error=True)

    def verification_passed(self, result: dict) -> bool:
        return bool(result.get("passed"))

    def blast_radius(self, ctx: IncidentContext) -> BlastRadius:
        sb = ctx.sandbox  # type: ignore[attr-defined]
        files = len(sb.touched_files)
        lines = sb.lines_changed()
        # 1 file & <=10 lines is ideal; penalise breadth and size.
        penalty = 0.15 * max(files - 1, 0) + 0.02 * max(lines - 10, 0)
        return BlastRadius(
            score=max(0.0, 1.0 - penalty),
            reason=f"{files} file(s), {lines} line(s) changed",
        )

    def diff(self, ctx: IncidentContext) -> str:
        return ctx.sandbox.full_diff()  # type: ignore[attr-defined]

    async def deploy(self, ctx: IncidentContext) -> list[str]:
        promoted = ctx.sandbox.promote()  # type: ignore[attr-defined]
        await self._request_hot_reload()
        return promoted

    async def await_recovery(self, ctx: IncidentContext, timeout: float = 45.0) -> bool:
        deadline = time.time() + timeout
        while time.time() < deadline:
            health = await observability.get_health()
            if health.get("healthy"):
                await ctx.emit("deploy.verified", "Live service recovered — health check green", health)
                return True
            await asyncio.sleep(1.5)
        await ctx.emit("deploy.failed", "Service still unhealthy after deploy", {})
        return False

    async def report(self, incident: Any, ctx: IncidentContext) -> list[dict]:
        recorded: list[dict] = []
        title = f"[{incident.id}] {incident.fix_summary}"
        body = (
            f"**Root cause**\n{incident.diagnosis}\n\n"
            f"**Fix**\n{incident.fix_summary}\n\n"
            f"**Verification**\nFull test suite green in sandbox; live health check recovered.\n\n"
            f"**Confidence**\n{json.dumps(incident.verdict, indent=2)}\n\n"
            f"```diff\n{incident.diff}\n```"
        )
        pr = await asyncio.to_thread(actions.open_pull_request, incident.id, incident.fix_summary, body, incident.diff)
        recorded.append({"kind": "github_pr", **pr})
        await ctx.emit("action.github", f"PR ({pr['mode']}): {pr.get('url', pr.get('branch'))}", pr)

        card = await actions.create_wekan_card(incident.id, title, body)
        recorded.append({"kind": "wekan_card", **card})
        await ctx.emit("action.wekan", f"WeKan card ({card['mode']}): {card.get('card_id')}", card)

        slack = await actions.post_slack(
            incident.id,
            f":white_check_mark: *{incident.id} resolved* — {incident.fix_summary}\n"
            f"Confidence {incident.verdict['score']:.2f} | {pr.get('url', '')}",
        )
        recorded.append({"kind": "slack_post", **slack})
        await ctx.emit("action.slack", f"Slack update posted ({slack['mode']})", slack)
        return recorded

    async def probe_health(self) -> dict:
        return await observability.get_health()

    async def notify_escalation(self, incident: Any, reason: str, emit) -> list[dict]:
        slack = await actions.post_slack(
            incident.id, f":rotating_light: *{incident.id} escalated to humans* — {reason}",
        )
        await emit("action.slack", f"Escalation alert posted ({slack['mode']})", slack)
        return [{"kind": "slack_escalation", **slack}]

    def build_symptom(self, health: dict) -> str:
        log_excerpt = observability.read_logs(60)
        return (
            f"Health check failing with HTTP {health.get('status_code')} — "
            f"{health.get('body')}\n\nRecent service log:\n{log_excerpt}"
        )

    @staticmethod
    async def _request_hot_reload() -> None:
        """Best-effort: ask the service to reload immediately after a deploy."""
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                await client.post(f"{settings.service_url}/admin/reload")
        except Exception:  # noqa: BLE001 — uvicorn --reload is the fallback
            pass
