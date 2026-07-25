"""FinOps cost-model + adapter tests — pure logic, no LLM, no network.

Proves the second domain's core (savings math, SLA-floor safety, blast radius,
diff, deploy) is correct, independent of the agent loop.
"""

from __future__ import annotations

import asyncio

from sentinel.adapters.finops.adapter import FinOpsAdapter
from sentinel.adapters.finops.cloud import BASELINE_MONTHLY, CostModel


def test_report_flags_the_anomaly():
    m = CostModel()
    r = m.report()
    assert r["current_monthly_usd"] > BASELINE_MONTHLY
    assert r["anomaly_monthly_usd"] > 0
    assert r["top_cost_drivers"][0]["id"] == "nodepool-web-prod"  # biggest driver


def test_delete_idle_volume_is_safe():
    m = CostModel()
    change = m.stage("vol-orphaned-01", "delete")
    assert change["savings_monthly_usd"] == 240.0
    assert change["sla_risk"] is False


def test_deleting_a_busy_resource_flags_sla_risk():
    m = CostModel()
    change = m.stage("db-analytics-replica", "delete")  # 71% utilised
    assert change["sla_risk"] is True


def test_rightsize_below_safe_floor_flags_risk():
    m = CostModel()
    safe = m.stage("nodepool-web-prod", "rightsize", 2000.0)   # floor 1900
    assert safe["sla_risk"] is False
    risky = m.stage("nodepool-web-prod", "rightsize", 1500.0)  # below floor
    assert risky["sla_risk"] is True


def test_rightsize_upward_is_rejected():
    m = CostModel()
    try:
        m.stage("vol-orphaned-01", "rightsize", 999.0)  # 999 > 240 current
    except ValueError:
        return
    raise AssertionError("increasing spend should be rejected")


def test_simulation_passes_only_when_safe_and_saving():
    m = CostModel()
    m.stage("vol-orphaned-01", "delete")
    m.stage("vol-orphaned-02", "delete")
    m.stage("nodepool-web-prod", "rightsize", 1900.0)  # to its safe floor
    sim = m.simulate()
    assert sim["passed"] is True
    assert sim["sla_risk"] is False
    assert sim["savings_monthly_usd"] == 240.0 + 180.0 + (4200.0 - 1900.0)
    assert sim["projected_monthly_usd"] <= BASELINE_MONTHLY  # canonical plan clears it


def test_simulation_fails_on_sla_risk():
    m = CostModel()
    m.stage("nodepool-web-prod", "rightsize", 1000.0)  # below floor -> risk
    sim = m.simulate()
    assert sim["passed"] is False
    assert sim["sla_risk"] is True


def test_apply_reduces_spend_and_deletes():
    m = CostModel()
    before = m.current_monthly
    m.stage("vol-orphaned-01", "delete")
    m.stage("nodepool-web-prod", "rightsize", 2100.0)
    changed = m.apply()
    assert set(changed) == {"vol-orphaned-01", "nodepool-web-prod"}
    assert "vol-orphaned-01" not in m.resources
    assert m.current_monthly < before


def test_adapter_blast_radius_and_diff():
    adapter = FinOpsAdapter()
    ctx = adapter.open_context("INC-TEST-finops")

    async def run():
        await adapter.execute_tool(ctx, "stage_change",
                                   {"resource_id": "vol-orphaned-01", "action": "delete"})
        return adapter.blast_radius(ctx), adapter.diff(ctx)

    blast, diff = asyncio.run(run())
    assert 0.0 <= blast.score <= 1.0
    assert "resource" in blast.reason
    assert "vol-orphaned-01" in diff


def test_adapter_verification_passed_contract():
    adapter = FinOpsAdapter()
    assert adapter.verification_passed({"passed": True}) is True
    assert adapter.verification_passed({"passed": False}) is False
