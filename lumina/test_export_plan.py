"""Tests for export_plan.py — the Lumina → MENTOR plan artifact compiler.

Run:  cd lumina && python -m pytest test_export_plan.py -q

Why these cases: MENTOR's central claim is a statement about *order*
("you designed tax last, you built it second"). If the compiler emits an order
that is wrong, unstable, or confidently derived from a graph that has no valid
order at all, MENTOR reports drift that isn't there — and a tool that confidently
points at the wrong line is worse than useless in education
(MENTOR-CONCEPT.md §10). So the order and its failure modes are what get tested.
"""

from export_plan import SCHEMA, compile_to_plan


def _node(nid, x=0.0, y=0.0, label=None, ntype="script"):
    data = {"label": label} if label else {}
    return {"id": nid, "type": ntype, "position": {"x": x, "y": y}, "data": data}


def _edge(src, tgt, eid=None):
    return {"id": eid or f"{src}->{tgt}", "source": src, "target": tgt}


def test_linear_chain_yields_intended_order():
    """The fixture case: a straight line comes out in drawn order."""
    plan = compile_to_plan(
        {
            "nodes": [_node("a", 0), _node("b", 100), _node("c", 200)],
            "edges": [_edge("a", "b"), _edge("b", "c")],
        }
    )
    assert plan["order"] == ["a", "b", "c"]
    assert plan["entry"] == ["a"]
    assert plan["terminal"] == ["c"]
    assert plan["cyclic"] is False
    assert plan["warnings"] == []
    assert plan["schema"] == SCHEMA


def test_edges_not_canvas_position_determine_order():
    """A node dragged to the left of its predecessor is still ordered after it.

    Position is only the tie-break. If layout could override the edges, a student
    tidying up their canvas would change their recorded intent.
    """
    plan = compile_to_plan(
        {
            "nodes": [_node("first", x=900), _node("second", x=10)],
            "edges": [_edge("first", "second")],
        }
    )
    assert plan["order"] == ["first", "second"]


def test_parallel_branches_break_ties_by_canvas_reading_order():
    """Two independent branches sort left→right, then top→bottom — deterministically."""
    graph = {
        "nodes": [
            _node("root", x=0, y=100),
            _node("right", x=300, y=100),
            _node("left", x=100, y=100),
            _node("below", x=100, y=400),
        ],
        "edges": [_edge("root", "right"), _edge("root", "left"), _edge("root", "below")],
    }
    assert compile_to_plan(graph)["order"] == ["root", "left", "below", "right"]


def test_order_is_stable_across_input_shuffles():
    """Same graph, nodes/edges listed in a different order → same plan.

    Without this, two exports of an unchanged canvas could disagree and MENTOR
    would report phantom drift.
    """
    nodes = [_node("a", 0), _node("b", 100), _node("c", 100, y=300), _node("d", 200)]
    edges = [_edge("a", "b"), _edge("a", "c"), _edge("b", "d"), _edge("c", "d")]
    first = compile_to_plan({"nodes": nodes, "edges": edges})
    second = compile_to_plan({"nodes": list(reversed(nodes)), "edges": list(reversed(edges))})
    assert first["order"] == second["order"]
    assert first["nodes"] == second["nodes"]


def test_cycle_is_flagged_and_every_node_still_listed():
    """A cycle has no intended sequence — say so instead of inventing one."""
    plan = compile_to_plan(
        {
            "nodes": [_node("a", 0), _node("b", 100), _node("c", 200)],
            "edges": [_edge("a", "b"), _edge("b", "c"), _edge("c", "a")],
        }
    )
    assert plan["cyclic"] is True
    assert sorted(plan["order"]) == ["a", "b", "c"], "no node may be dropped"
    assert any("cycle" in w for w in plan["warnings"])


def test_partial_cycle_keeps_the_acyclic_prefix_ordered():
    """A clean chain feeding a cycle: the chain is still trustworthy."""
    plan = compile_to_plan(
        {
            "nodes": [_node("start", 0), _node("x", 100), _node("y", 200)],
            "edges": [_edge("start", "x"), _edge("x", "y"), _edge("y", "x")],
        }
    )
    assert plan["cyclic"] is True
    assert plan["order"][0] == "start"
    assert sorted(plan["order"]) == ["start", "x", "y"]


def test_dangling_edge_is_dropped_with_a_warning():
    """An edge to a deleted node must not silently reorder the plan."""
    plan = compile_to_plan(
        {
            "nodes": [_node("a", 0), _node("b", 100)],
            "edges": [_edge("a", "b"), _edge("b", "ghost", eid="e-ghost")],
        }
    )
    assert plan["order"] == ["a", "b"]
    assert [e["id"] for e in plan["edges"]] == ["a->b"]
    assert any("e-ghost" in w for w in plan["warnings"])


def test_node_without_id_is_dropped_with_a_warning():
    plan = compile_to_plan({"nodes": [_node("a"), {"type": "script"}], "edges": []})
    assert [n["id"] for n in plan["nodes"]] == ["a"]
    assert any("no id" in w for w in plan["warnings"])


def test_duplicate_node_id_keeps_the_first():
    plan = compile_to_plan(
        {"nodes": [_node("a", label="kept"), _node("a", label="dropped")], "edges": []}
    )
    assert [n["label"] for n in plan["nodes"]] == ["kept"]
    assert any("duplicate" in w for w in plan["warnings"])


def test_label_prefers_what_the_student_typed():
    """MENTOR quotes the label back at the student, so their word wins."""
    nodes = [
        {"id": "n1", "type": "script", "position": {"x": 0, "y": 0}, "data": {"label": "tax"}},
        {"id": "n2", "type": "script", "position": {"x": 1, "y": 0}, "data": {"name": "discount"}},
        {"id": "n3", "type": "llm", "position": {"x": 2, "y": 0}, "data": {}},
        {"id": "n4", "type": "script", "position": {"x": 3, "y": 0}, "data": {"label": "   "}},
    ]
    labels = [n["label"] for n in compile_to_plan({"nodes": nodes, "edges": []})["nodes"]]
    assert labels == ["tax", "discount", "llm", "script"]


def test_empty_canvas_does_not_raise():
    plan = compile_to_plan({"nodes": [], "edges": []})
    assert plan["order"] == []
    assert plan["cyclic"] is False
    assert plan["name"] == "Untitled plan"


def test_missing_position_is_tolerated():
    """Lumina sanitizes positions on load, but an authored graph may omit them."""
    plan = compile_to_plan(
        {
            "nodes": [{"id": "a", "type": "script"}, {"id": "b", "type": "script"}],
            "edges": [_edge("a", "b")],
        }
    )
    assert plan["order"] == ["a", "b"]
    assert plan["nodes"][0]["position"] == {"x": 0, "y": 0}


def test_isolated_nodes_are_both_entry_and_terminal():
    """A component the student drew but never wired up is still part of the plan."""
    plan = compile_to_plan({"nodes": [_node("lonely", 50)], "edges": []})
    assert plan["entry"] == ["lonely"]
    assert plan["terminal"] == ["lonely"]
    assert plan["order"] == ["lonely"]


def test_data_passes_through_untouched():
    """MENTOR reads `data.intent`; the compiler must not reshape node config."""
    data = {"label": "tax", "intent": "after discount", "code": "t = x * r", "nested": {"k": [1, 2]}}
    plan = compile_to_plan(
        {"nodes": [{"id": "n1", "type": "script", "position": {"x": 0, "y": 0}, "data": data}], "edges": []}
    )
    assert plan["nodes"][0]["data"] == data


def test_the_pricing_fixture_plan_puts_tax_third():
    """The demo's load-bearing assertion, guarded here as well as in scripts/."""
    plan = compile_to_plan(
        {
            "name": "Pricing service",
            "nodes": [
                _node("n-validate", 0, 160, "validate"),
                _node("n-discount", 260, 160, "discount"),
                _node("n-tax", 520, 160, "tax"),
                _node("n-total", 780, 160, "total"),
            ],
            "edges": [
                _edge("n-validate", "n-discount"),
                _edge("n-discount", "n-tax"),
                _edge("n-tax", "n-total"),
            ],
        }
    )
    labels = [next(n["label"] for n in plan["nodes"] if n["id"] == nid) for nid in plan["order"]]
    assert labels == ["validate", "discount", "tax", "total"]
    assert labels.index("tax") == 2, "tax must be planned AFTER discount — the whole demo rests on this"
