"""Domain adapters — the pluggable edge of SENTINEL.

The engine (`sentinel.orchestrator.Engine`) is domain-agnostic: it runs the
detect → diagnose → verify → gate → deploy → report lifecycle without knowing
whether it is healing a microservice, a cloud bill, or a support queue. All
domain-specific knowledge lives behind the `DomainAdapter` interface:

  • what to watch (sensors)          → probe_health / build_symptom
  • what the agent can do (actuators) → tools / execute_tool
  • how a fix is proven              → a verification step + verification_passed
  • how risky a fix is               → blast_radius
  • how to ship it                   → deploy / await_recovery
  • how to tell the world            → report

`devops` is the flagship, deep implementation. `finops` is a second, fully
working adapter that proves the same engine generalizes to another domain with
no engine changes.
"""

from sentinel.adapters.base import (
    BlastRadius,
    DomainAdapter,
    IncidentContext,
    ToolResult,
)

__all__ = ["BlastRadius", "DomainAdapter", "IncidentContext", "ToolResult"]


def get_adapter(key: str) -> DomainAdapter:
    """Resolve a domain adapter by key. Imported lazily to avoid pulling every
    domain's dependencies into every process."""
    key = (key or "devops").strip().lower()
    if key == "devops":
        from sentinel.adapters.devops.adapter import DevOpsAdapter

        return DevOpsAdapter()
    if key == "finops":
        from sentinel.adapters.finops.adapter import FinOpsAdapter

        return FinOpsAdapter()
    raise ValueError(f"unknown domain adapter: {key!r} (known: devops, finops)")
