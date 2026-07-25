"""Regenerate fixtures/pricing/plan.lumina.json from the canonical plan graph.

Run from the monorepo root:  npm run fixture:plan

The plan artifact is checked in so MENTOR always has an input, but it is
*generated*, never hand-edited — it must stay byte-identical to what a student's
real Lumina export produces, or MENTOR will be tested against a shape it will
never see in production. This script is also the determinism check: run it twice,
`git diff` must be empty.

Edit the graph below to change the fixture's plan, then re-run.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "lumina"))

from export_plan import compile_to_plan  # noqa: E402  (needs the path above)

# The architecture the student drew before writing code:
#     validate ──▶ discount ──▶ tax ──▶ total
# `script` is the stand-in for a generic software component — see GAPS.md Gap 2.
GRAPH = {
    "name": "Pricing service",
    "planId": "wf-pricing-fixture",
    "nodes": [
        {
            "id": "n-validate",
            "type": "script",
            "position": {"x": 0, "y": 160},
            "data": {
                "label": "validate",
                "component": "validate",
                "intent": "Reject malformed carts before any money is computed.",
                "code": "assertItems(items); assertRate(discountRate); assertRate(taxRate);",
            },
        },
        {
            "id": "n-discount",
            "type": "script",
            "position": {"x": 260, "y": 160},
            "data": {
                "label": "discount",
                "component": "discount",
                "intent": "Apply the discount code to the subtotal.",
                "code": "discount = subtotal * discountRate",
            },
        },
        {
            "id": "n-tax",
            "type": "script",
            "position": {"x": 520, "y": 160},
            "data": {
                "label": "tax",
                "component": "tax",
                "intent": "Tax the DISCOUNTED amount. Must run after discount.",
                "code": "tax = taxable * taxRate",
            },
        },
        {
            "id": "n-total",
            "type": "script",
            "position": {"x": 780, "y": 160},
            "data": {
                "label": "total",
                "component": "total",
                "intent": "Sum and round to 2dp.",
                "code": "return round(taxable + tax, 2)",
            },
        },
    ],
    "edges": [
        {"id": "e1", "source": "n-validate", "target": "n-discount"},
        {"id": "e2", "source": "n-discount", "target": "n-tax"},
        {"id": "e3", "source": "n-tax", "target": "n-total"},
    ],
}

EXPECTED_ORDER = ["n-validate", "n-discount", "n-tax", "n-total"]


def main() -> int:
    plan = compile_to_plan(GRAPH)

    # The fixture's whole value is that `tax` is planned third. If the compiler
    # ever stops producing that, MENTOR's demo claim silently becomes false —
    # so fail loudly here rather than write a plan that proves nothing.
    if plan["order"] != EXPECTED_ORDER:
        print(f"FAIL: order is {plan['order']}, expected {EXPECTED_ORDER}", file=sys.stderr)
        return 1
    if plan["cyclic"] or plan["warnings"]:
        print(f"FAIL: cyclic={plan['cyclic']} warnings={plan['warnings']}", file=sys.stderr)
        return 1

    out = ROOT / "fixtures" / "pricing" / "plan.lumina.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(plan, indent=2) + "\n", encoding="utf-8")

    print(f"ok  wrote {out.relative_to(ROOT)}")
    print(f"ok  order = {' -> '.join(n['label'] for n in plan['nodes'])}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
