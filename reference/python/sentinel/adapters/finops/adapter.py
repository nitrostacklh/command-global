"""FinOps adapter: heal a cloud bill by staging + simulating a rightsizing plan.

Mirrors the DevOps lifecycle exactly, so the engine drives it unchanged:
  read_cost_report / list_resources / inspect_resource  →  observe
  stage_change (mutation)                                →  patch
  simulate_savings (verify)                              →  run_tests
  submit_resolution                                      →  submit
Deploy applies the plan to the (mock) account and confirms spend dropped.
"""

from __future__ import annotations

from typing import Any

from sentinel.adapters.base import BlastRadius, DomainAdapter, IncidentContext, ToolResult
from sentinel.adapters.finops.cloud import CostModel
from sentinel.tools import actions

SYSTEM_PROMPT = """You are SENTINEL, an autonomous FinOps commander for cloud infrastructure.

A cloud account you monitor has a spend anomaly. Your job:
1. Read the cost report to understand the spike and its top cost drivers.
2. Inspect the resource inventory; find over-provisioned, idle, or mis-tiered resources.
3. Stage the rightsizing plan (resize, delete idle resources, or change storage tier).
4. Simulate the plan. It must show real monthly savings AND raise no SLA risk.
   If it fails, revise the plan (never cut a resource below its safe floor) and re-simulate.
5. Submit your resolution with an honest, calibrated confidence score.

Rules:
- Never cut a resource below its safe floor — availability and SLAs come before savings.
- Deleting a truly idle resource (0% utilisation) is safe; downsizing a busy one is not.
- Keep the plan focused — a larger blast radius lowers the confidence score and may need human approval.
- Your confidence score feeds a real autonomy gate; be calibrated.
- Every step is recorded in an audit trail reviewed by humans."""

_TOOLS: list[dict[str, Any]] = [
    {
        "name": "read_cost_report",
        "description": "Get the current monthly spend, the baseline, the anomaly size, and the top cost drivers. Call this first.",
        "input_schema": {"type": "object", "properties": {}, "additionalProperties": False},
    },
    {
        "name": "list_resources",
        "description": "List every resource with its monthly cost, observed utilisation, and safe-floor cost.",
        "input_schema": {"type": "object", "properties": {}, "additionalProperties": False},
    },
    {
        "name": "inspect_resource",
        "description": "Inspect one resource in detail, including safe headroom (cost above its floor).",
        "input_schema": {
            "type": "object",
            "properties": {"resource_id": {"type": "string"}},
            "required": ["resource_id"],
            "additionalProperties": False,
        },
    },
    {
        "name": "stage_change",
        "description": (
            "Stage one rightsizing change. action is 'rightsize', 'delete', or 'tier_change'. "
            "For rightsize/tier_change you must give target_monthly_usd (the new $/month). "
            "Deleting requires 0% utilisation; downsizing must stay at or above the safe floor."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "resource_id": {"type": "string"},
                "action": {"type": "string", "enum": ["rightsize", "delete", "tier_change"]},
                "target_monthly_usd": {"type": "number", "description": "New $/month (omit for delete)."},
            },
            "required": ["resource_id", "action"],
            "additionalProperties": False,
        },
    },
    {
        "name": "simulate_savings",
        "description": "Simulate the staged plan. Returns projected spend, savings, and whether any change breaches an SLA floor. You MUST get a passing simulation (savings > 0, no SLA risk) before submitting.",
        "input_schema": {"type": "object", "properties": {}, "additionalProperties": False},
    },
    {
        "name": "submit_resolution",
        "description": (
            "Submit your final resolution. Only call this AFTER simulate_savings has passed. "
            "Be honest in `confidence`: it feeds an autonomy gate that decides whether the plan "
            "applies automatically or waits for human approval."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "root_cause": {"type": "string", "description": "One-paragraph analysis of the spend anomaly."},
                "fix_summary": {"type": "string", "description": "One-sentence description of the rightsizing plan."},
                "confidence": {"type": "number", "description": "Your calibrated confidence, 0.0-1.0."},
            },
            "required": ["root_cause", "fix_summary", "confidence"],
            "additionalProperties": False,
        },
    },
]


class CloudContext(IncidentContext):
    """FinOps working state: a mutable model of the cloud account."""

    def __init__(self, incident_id: str) -> None:
        super().__init__(incident_id)
        self.model = CostModel()


class FinOpsAdapter(DomainAdapter):
    key = "finops"
    display_name = "FinOps · Cloud Cost Healing"
    tagline = "Finds the waste, simulates the savings, rightsizes without breaking SLAs."
    submit_tool = "submit_resolution"
    verify_tool = "simulate_savings"
    mutation_tools = {"stage_change"}

    def system_prompt(self) -> str:
        return SYSTEM_PROMPT

    def tools(self) -> list[dict[str, Any]]:
        return _TOOLS

    def framing(self, symptom: str) -> str:
        return (
            f"Detected spend anomaly:\n{symptom}\n\n"
            "Investigate the cost drivers, stage a rightsizing plan, simulate its savings "
            "and SLA impact, then submit your resolution."
        )

    def open_context(self, incident_id: str) -> IncidentContext:
        return CloudContext(incident_id)

    async def execute_tool(self, ctx: IncidentContext, name: str, args: dict) -> ToolResult:
        model: CostModel = ctx.model  # type: ignore[attr-defined]
        if name == "read_cost_report":
            return ToolResult(model.report())
        if name == "list_resources":
            return ToolResult({"resources": model.list_resources()})
        if name == "inspect_resource":
            return ToolResult(model.inspect(args["resource_id"]))
        if name == "stage_change":
            change = model.stage(args["resource_id"], args["action"], args.get("target_monthly_usd"))
            # Reuse the dashboard's diff renderer by emitting patch.applied.
            await ctx.emit("patch.applied", f"Staged {change['action']} on {change['resource_id']}",
                           {"path": change["resource_id"], "diff": _change_diff(change)})
            return ToolResult({"staged": True, **change})
        if name == "simulate_savings":
            sim = model.simulate()
            # Reuse the dashboard's test-result styling by emitting tests.result.
            await ctx.emit(
                "tests.result",
                ("✅ " if sim["passed"] else "❌ ") + sim["summary"],
                {"passed": sim["passed"], "summary": sim["summary"], "output": sim["output"]},
            )
            return ToolResult(sim)
        return ToolResult({"error": f"unknown tool {name}"}, is_error=True)

    def verification_passed(self, result: dict) -> bool:
        return bool(result.get("passed"))

    def blast_radius(self, ctx: IncidentContext) -> BlastRadius:
        model: CostModel = ctx.model  # type: ignore[attr-defined]
        resources, dollars = model.blast()
        # 1 resource is ideal; a larger $/mo swing is a bigger operational change.
        penalty = 0.15 * max(resources - 1, 0) + 0.05 * max((dollars / 1000.0) - 1.0, 0.0)
        return BlastRadius(
            score=max(0.0, 1.0 - penalty),
            reason=f"{resources} resource(s), ${dollars:,.0f}/mo change",
        )

    def diff(self, ctx: IncidentContext) -> str:
        return ctx.model.diff()  # type: ignore[attr-defined]

    async def deploy(self, ctx: IncidentContext) -> list[str]:
        return ctx.model.apply()  # type: ignore[attr-defined]

    async def await_recovery(self, ctx: IncidentContext) -> bool:
        model: CostModel = ctx.model  # type: ignore[attr-defined]
        report = model.report()
        # "Recovered" = anomaly substantially cleared (within 5% of baseline).
        # A small band tolerates a cautious plan that leaves a little headroom,
        # while still requiring the spike to be genuinely resolved.
        target = report["baseline_monthly_usd"] * 1.05
        recovered = report["current_monthly_usd"] <= target
        if recovered:
            await ctx.emit(
                "deploy.verified",
                f"Spend back within baseline — ${report['current_monthly_usd']:,.0f}/mo "
                f"(baseline ${report['baseline_monthly_usd']:,.0f})",
                report,
            )
        else:
            await ctx.emit("deploy.failed",
                           f"Spend still above baseline: ${report['current_monthly_usd']:,.0f}/mo", report)
        return recovered

    async def report(self, incident: Any, ctx: IncidentContext) -> list[dict]:
        recorded: list[dict] = []
        title = f"[{incident.id}] {incident.fix_summary}"
        body = (
            f"**Anomaly**\n{incident.diagnosis}\n\n"
            f"**Rightsizing plan**\n{incident.fix_summary}\n\n"
            f"**Verification**\nSimulation shows savings with no SLA risk; live spend back within baseline.\n\n"
            f"```diff\n{incident.diff}\n```"
        )
        card = await actions.create_wekan_card(incident.id, title, body)
        recorded.append({"kind": "wekan_card", **card})
        await ctx.emit("action.wekan", f"WeKan card ({card['mode']}): {card.get('card_id')}", card)

        slack = await actions.post_slack(
            incident.id,
            f":moneybag: *{incident.id} resolved* — {incident.fix_summary}\n"
            f"Confidence {incident.verdict['score']:.2f}",
        )
        recorded.append({"kind": "slack_post", **slack})
        await ctx.emit("action.slack", f"Slack update posted ({slack['mode']})", slack)
        return recorded


def _change_diff(change: dict) -> str:
    return (
        f"--- {change['resource_id']} (before)\n"
        f"+++ {change['resource_id']} (after {change['action']})\n"
        f"- ${change['before_monthly_usd']:,.2f}/mo\n"
        f"+ ${change['projected_monthly_usd']:,.2f}/mo   # {change['rationale']}"
    )
