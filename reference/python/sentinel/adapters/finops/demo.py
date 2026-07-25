"""Standalone FinOps runner — the pluggable-core proof.

Runs the SAME engine on the FinOps adapter and streams the mission trace to the
terminal. No web server, no watchdog — just:

    python -m sentinel.adapters.finops.demo

It opens a cost-anomaly incident, and SENTINEL investigates the bill, stages a
rightsizing plan, simulates the savings, gates on confidence, "applies" the
plan to the mock account, and reports — writing the same JSONL audit trail to
logs/audit/ that the DevOps commander does.

Requires model access (ANTHROPIC_API_KEY or `ant auth login`), since the agent
loop is real. The engine itself is identical to the one healing microservices.
"""

from __future__ import annotations

import asyncio

from sentinel.adapters.finops.adapter import FinOpsAdapter
from sentinel.adapters.finops.cloud import BASELINE_MONTHLY, CostModel
from sentinel.events import bus
from sentinel.orchestrator import Engine

_ICONS = {
    "incident.opened": "🚨", "incident.status": "→", "agent.thinking": "🧠",
    "agent.message": "💬", "tool.call": "🔧", "patch.applied": "📝",
    "tests.result": "🧪", "confidence.verdict": "⚖️ ", "approval.requested": "🙋",
    "deploy.promoted": "🚀", "deploy.verified": "✅", "deploy.failed": "❌",
    "action.wekan": "📋", "action.slack": "💬", "incident.resolved": "🎉",
    "incident.escalated": "🆘", "agent.resolution": "📤",
}


async def main() -> None:
    snapshot = CostModel().report()
    symptom = (
        f"Cloud spend anomaly: ${snapshot['current_monthly_usd']:,.0f}/mo vs "
        f"${BASELINE_MONTHLY:,.0f}/mo baseline "
        f"(+{snapshot['anomaly_pct']:.0f}%, +${snapshot['anomaly_monthly_usd']:,.0f}/mo). "
        "Investigate the drivers and rightsize safely."
    )

    engine = Engine(FinOpsAdapter())
    print("╔" + "═" * 70 + "╗")
    print("║  SENTINEL · FinOps — same engine, different domain".ljust(71) + "║")
    print("╚" + "═" * 70 + "╝\n")

    stream = bus.subscribe()
    incident = await engine.open_incident(symptom)

    async for event in stream:
        if event.incident_id != incident.id:
            continue
        icon = _ICONS.get(event.type, "•")
        print(f"{icon}  {event.title}")
        if event.type == "tests.result":
            print("    " + event.detail.get("output", "").replace("\n", "\n    "))
        if event.type == "confidence.verdict":
            v = event.detail
            for name, c in v.get("components", {}).items():
                print(f"    {name:14} {c['score']*100:5.0f}% × {c['weight']}  — {c['reason']}")
        if event.type in ("incident.resolved", "incident.escalated"):
            break

    print(f"\nAudit trail: logs/audit/{incident.id}.jsonl")


if __name__ == "__main__":
    asyncio.run(main())
