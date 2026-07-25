"""A self-contained, deterministic cloud-cost model for the FinOps adapter.

Stands in for a real cloud billing + inventory API (AWS Cost Explorer, GCP
Billing, Kubecost…). It exposes the same shape a real integration would: a cost
report, a resource inventory with utilisation, a staging area for rightsizing
changes, and a savings/SLA simulator used as the verification step.

Deterministic by construction (no clocks, no randomness) so the demo and the
tests reproduce the same numbers every run.
"""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class Resource:
    id: str
    kind: str                 # node_pool | volume | object_store | database
    monthly_cost: float       # current $/month
    utilization: float        # 0..1 observed utilisation
    min_safe_cost: float      # floor below which SLA/headroom is at risk
    note: str = ""


# A plausibly over-provisioned account with one obvious spike driver.
def _seed_inventory() -> list[Resource]:
    return [
        Resource("nodepool-web-prod", "node_pool", 4200.0, 0.22, 1900.0,
                 "24×m5.2xlarge, avg CPU 22% — heavily over-provisioned"),
        Resource("nodepool-batch", "node_pool", 1600.0, 0.61, 1200.0,
                 "right-sized for nightly batch; little headroom"),
        Resource("vol-orphaned-01", "volume", 240.0, 0.0, 0.0,
                 "unattached gp3 volume, 0 IOPS for 40 days"),
        Resource("vol-orphaned-02", "volume", 180.0, 0.0, 0.0,
                 "unattached gp3 volume, 0 IOPS for 31 days"),
        Resource("bucket-logs-archive", "object_store", 900.0, 0.03, 120.0,
                 "18 TB in STANDARD; access pattern is cold/archive"),
        Resource("db-analytics-replica", "database", 1500.0, 0.71, 1300.0,
                 "read replica serving live dashboards; near capacity"),
    ]


# What the account normally spends. Chosen so the canonical safe plan — delete
# the two idle volumes (420) + rightsize the 22%-utilised web node pool to its
# floor (4200 → 1900 = 2300) — clears the anomaly exactly: 8620 − 2720 = 5900.
BASELINE_MONTHLY = 5900.0


@dataclass
class StagedChange:
    resource_id: str
    action: str               # rightsize | delete | tier_change
    projected_cost: float     # $/month after the change
    rationale: str
    before_cost: float
    utilization: float
    min_safe_cost: float

    @property
    def savings(self) -> float:
        return round(self.before_cost - self.projected_cost, 2)

    @property
    def sla_risk(self) -> bool:
        # Deleting a zero-utilisation resource is always safe; otherwise cutting
        # below the resource's safe floor risks the SLA.
        if self.action == "delete":
            return self.utilization > 0.01
        return self.projected_cost < self.min_safe_cost


class CostModel:
    """In-memory cloud account. Mutated only by deploy()."""

    def __init__(self) -> None:
        self.resources: dict[str, Resource] = {r.id: r for r in _seed_inventory()}
        self.staged: dict[str, StagedChange] = {}
        self.applied = False

    # ── read ────────────────────────────────────────────────────────────────
    @property
    def current_monthly(self) -> float:
        return round(sum(r.monthly_cost for r in self.resources.values()), 2)

    def report(self) -> dict:
        cur = self.current_monthly
        drivers = sorted(self.resources.values(), key=lambda r: r.monthly_cost, reverse=True)
        return {
            "current_monthly_usd": cur,
            "baseline_monthly_usd": BASELINE_MONTHLY,
            "anomaly_monthly_usd": round(cur - BASELINE_MONTHLY, 2),
            "anomaly_pct": round((cur - BASELINE_MONTHLY) / BASELINE_MONTHLY * 100, 1),
            "top_cost_drivers": [
                {"id": r.id, "kind": r.kind, "monthly_usd": r.monthly_cost,
                 "utilization": r.utilization} for r in drivers[:4]
            ],
        }

    def list_resources(self) -> list[dict]:
        return [
            {
                "id": r.id, "kind": r.kind, "monthly_usd": r.monthly_cost,
                "utilization": r.utilization, "min_safe_monthly_usd": r.min_safe_cost,
                "note": r.note,
            }
            for r in self.resources.values()
        ]

    def inspect(self, resource_id: str) -> dict:
        r = self._resource(resource_id)
        headroom = round(r.monthly_cost - r.min_safe_cost, 2)
        return {
            "id": r.id, "kind": r.kind, "monthly_usd": r.monthly_cost,
            "utilization": r.utilization, "min_safe_monthly_usd": r.min_safe_cost,
            "safe_headroom_usd": headroom, "note": r.note,
        }

    # ── stage (mutation) ──────────────────────────────────────────────────────
    def stage(self, resource_id: str, action: str, target_monthly_usd: float | None = None) -> dict:
        r = self._resource(resource_id)
        action = action.strip().lower()
        if action == "delete":
            projected = 0.0
        elif action in ("rightsize", "tier_change"):
            if target_monthly_usd is None:
                raise ValueError(f"{action} requires target_monthly_usd")
            projected = round(float(target_monthly_usd), 2)
        else:
            raise ValueError(f"unknown action {action!r} (use rightsize | delete | tier_change)")
        if projected > r.monthly_cost:
            raise ValueError("target cost exceeds current cost — that would increase spend")

        change = StagedChange(
            resource_id=r.id, action=action, projected_cost=projected,
            rationale=_rationale(r, action, projected),
            before_cost=r.monthly_cost, utilization=r.utilization, min_safe_cost=r.min_safe_cost,
        )
        self.staged[r.id] = change
        return self._change_view(change)

    # ── verify ────────────────────────────────────────────────────────────────
    def simulate(self) -> dict:
        if not self.staged:
            return {"passed": False, "summary": "no changes staged", "output": "Stage at least one change before simulating.",
                    "savings_monthly_usd": 0.0, "projected_monthly_usd": self.current_monthly, "sla_risk": False}
        savings = round(sum(c.savings for c in self.staged.values()), 2)
        projected = round(self.current_monthly - savings, 2)
        at_risk = [c for c in self.staged.values() if c.sla_risk]
        passed = savings > 0 and not at_risk
        lines = [f"Projected monthly spend: ${projected:,.2f}  (−${savings:,.2f}/mo, "
                 f"−{savings / self.current_monthly * 100:.1f}%)"]
        for c in self.staged.values():
            flag = "  ⚠ SLA RISK" if c.sla_risk else ""
            lines.append(f"  {c.resource_id}: {c.action} ${c.before_cost:,.0f} → ${c.projected_cost:,.0f}/mo{flag}")
        if at_risk:
            lines.append("FAIL: one or more changes cut below the resource's safe floor.")
        else:
            lines.append("OK: all changes keep resources above their safe floor.")
        return {
            "passed": passed,
            "summary": (f"${savings:,.0f}/mo savings, no SLA risk" if passed
                        else "simulation failed — SLA risk or no savings"),
            "output": "\n".join(lines),
            "savings_monthly_usd": savings,
            "projected_monthly_usd": projected,
            "sla_risk": bool(at_risk),
        }

    # ── deploy ────────────────────────────────────────────────────────────────
    def apply(self) -> list[str]:
        changed = []
        for c in self.staged.values():
            r = self.resources[c.resource_id]
            if c.action == "delete":
                del self.resources[c.resource_id]
            else:
                r.monthly_cost = c.projected_cost
            changed.append(c.resource_id)
        self.applied = True
        return changed

    # ── diff & risk ────────────────────────────────────────────────────────────
    def diff(self) -> str:
        if not self.staged:
            return ""
        out = ["--- cloud spend (before)", "+++ cloud spend (after staged plan)"]
        for c in self.staged.values():
            out.append(f"@@ {c.resource_id} ({c.action}) @@")
            out.append(f"-  ${c.before_cost:,.2f}/mo")
            out.append(f"+  ${c.projected_cost:,.2f}/mo   # {c.rationale}")
        total = round(sum(c.savings for c in self.staged.values()), 2)
        out.append(f"@@ total @@")
        out.append(f"-  ${self.current_monthly:,.2f}/mo")
        out.append(f"+  ${self.current_monthly - total:,.2f}/mo   # −${total:,.2f}/mo")
        return "\n".join(out)

    def blast(self) -> tuple[int, float]:
        """(#resources changed, total monthly $ delta)."""
        return len(self.staged), round(sum(c.savings for c in self.staged.values()), 2)

    # ── internals ──────────────────────────────────────────────────────────────
    def _resource(self, resource_id: str) -> Resource:
        if resource_id not in self.resources:
            raise ValueError(f"unknown resource {resource_id!r}")
        return self.resources[resource_id]

    def _change_view(self, c: StagedChange) -> dict:
        return {
            "resource_id": c.resource_id, "action": c.action,
            "before_monthly_usd": c.before_cost, "projected_monthly_usd": c.projected_cost,
            "savings_monthly_usd": c.savings, "sla_risk": c.sla_risk, "rationale": c.rationale,
        }


def _rationale(r: Resource, action: str, projected: float) -> str:
    if action == "delete":
        return f"{r.kind} at {r.utilization:.0%} utilisation — safe to delete"
    if action == "tier_change":
        return f"move {r.kind} to a colder/cheaper tier (util {r.utilization:.0%})"
    return f"rightsize {r.kind} from ${r.monthly_cost:,.0f} to ${projected:,.0f}/mo (util {r.utilization:.0%})"
