"""Compile a Lumina ReactFlow graph → a MENTOR **plan artifact** (`lumina.plan/v1`).

Why this exists
===============
This is the Layer 3 → Layer 4 seam of the MENTOR product (see
``../MENTOR-CONCEPT.md`` §3). Lumina already compiles the canvas to *executable*
formats (``export_n8n.py``, ``export_nodered.py``). MENTOR needs something
different: not a runnable pipeline, but a **machine-readable record of what the
student intended to build**, which MENTOR later diffs against the code they
actually wrote.

The other exporters answer *"how do I run this?"*. This one answers
*"what was the plan?"* — and the single most important thing it adds over a raw
node/edge dump is **``order``**: the topological sequence the student designed.
MENTOR's whole claim ("you designed tax as the last step, you implemented it
before discount") is a comparison of *this* order against the build's order, so
the order has to be part of the artifact rather than re-derived downstream.

The artifact is deliberately plain
----------------------------------
No Lumina types leak out. A consumer needs only ``json``. That keeps MENTOR
(TypeScript, in ``sentinel/``) decoupled from Lumina (Python + React) — the two
halves only ever agree on this one file shape.

Schema (``lumina.plan/v1``)
---------------------------
::

    {
      "schema":     "lumina.plan/v1",
      "name":       "Pricing service",       # workflow name, free text
      "planId":     "wf-1753...-a1b2",       # Lumina workflow id, if known
      "nodes": [
        {
          "id":       "n1",                  # stable id, referenced by edges/order
          "type":     "script",              # Lumina node type
          "label":    "validate",            # human name — what MENTOR shows the student
          "position": {"x": 0, "y": 0},      # canvas layout, for redrawing the plan row
          "data":     {...}                  # untouched node config
        }
      ],
      "edges": [
        {"id": "e1", "source": "n1", "target": "n2",
         "sourceHandle": null, "targetHandle": null}
      ],
      "order":     ["n1", "n2", "n3", "n4"], # ⭐ intended sequence (topological)
      "entry":     ["n1"],                   # nodes with no inbound edge
      "terminal":  ["n4"],                   # nodes with no outbound edge
      "cyclic":    false,                    # true → `order` is best-effort only
      "warnings":  []                        # anything MENTOR should not trust
    }

Determinism
-----------
``order`` is a Kahn topological sort with ties broken by **canvas position**
(left-to-right, then top-to-bottom), then by id. Ties are common — a plan is
usually a chain with a couple of parallel branches — and an unstable order would
make MENTOR report phantom drift between two exports of an unchanged canvas. So
the tie-break is part of the contract, not an implementation detail.
"""

from __future__ import annotations

SCHEMA = "lumina.plan/v1"


def _label_for(node: dict) -> str:
    """Best human-readable name for a node.

    Prefers whatever the student typed over the node's generic type name, since
    that label is what MENTOR quotes back to them ("you designed *tax* last").
    """
    data = node.get("data") or {}
    for key in ("label", "name", "title", "component"):
        val = data.get(key)
        if isinstance(val, str) and val.strip():
            return val.strip()
    return str(node.get("type") or node.get("id") or "node")


def _sort_key(node: dict) -> tuple:
    """Canvas reading order: left→right, then top→bottom, then id."""
    pos = node.get("position") or {}
    x = pos.get("x")
    y = pos.get("y")
    return (
        float(x) if isinstance(x, (int, float)) else 0.0,
        float(y) if isinstance(y, (int, float)) else 0.0,
        str(node.get("id") or ""),
    )


def compile_to_plan(graph: dict) -> dict:
    """Compile a ``{nodes, edges}`` ReactFlow graph into a plan artifact.

    Mirrors the calling convention of ``compile_to_n8n`` / ``compile_to_nodered``
    so the three exporters stay interchangeable from ``srv.py``'s point of view.
    """
    raw_nodes = list(graph.get("nodes") or [])
    raw_edges = list(graph.get("edges") or [])
    warnings: list[str] = []

    # Index by id, dropping anything unusable rather than raising — a student's
    # half-drawn canvas should still export, with the damage described.
    nodes: dict[str, dict] = {}
    for n in raw_nodes:
        nid = n.get("id")
        if not nid:
            warnings.append("dropped a node with no id")
            continue
        if nid in nodes:
            warnings.append(f"duplicate node id {nid!r} — kept the first")
            continue
        nodes[nid] = n

    # Keep only edges whose endpoints both exist; a dangling edge would corrupt
    # the topological sort and silently reorder the plan.
    edges: list[dict] = []
    for e in raw_edges:
        src, tgt = e.get("source"), e.get("target")
        if src not in nodes or tgt not in nodes:
            warnings.append(
                f"dropped edge {e.get('id') or f'{src}->{tgt}'!r} — endpoint not on the canvas"
            )
            continue
        edges.append(e)

    indegree = {nid: 0 for nid in nodes}
    adjacency: dict[str, list[str]] = {nid: [] for nid in nodes}
    for e in edges:
        adjacency[e["source"]].append(e["target"])
        indegree[e["target"]] += 1

    # Kahn's algorithm. `ready` is re-sorted each round instead of using a heap:
    # plans are tens of nodes, and an explicit sort keeps the tie-break obvious.
    order: list[str] = []
    ready = [nid for nid, deg in indegree.items() if deg == 0]
    remaining = dict(indegree)
    while ready:
        ready.sort(key=lambda nid: _sort_key(nodes[nid]))
        nid = ready.pop(0)
        order.append(nid)
        for nxt in adjacency[nid]:
            remaining[nxt] -= 1
            if remaining[nxt] == 0:
                ready.append(nxt)

    cyclic = len(order) < len(nodes)
    if cyclic:
        # A cycle means there is no single intended sequence. Append the stranded
        # nodes in canvas order so the artifact still lists everything, and mark
        # `cyclic` so MENTOR downgrades its confidence instead of asserting drift.
        stranded = sorted(
            (nid for nid in nodes if nid not in set(order)),
            key=lambda nid: _sort_key(nodes[nid]),
        )
        order.extend(stranded)
        warnings.append(
            "the plan contains a cycle — `order` is canvas-order for the cyclic "
            "nodes and must not be treated as an intended sequence"
        )

    outbound = {e["source"] for e in edges}
    return {
        "schema": SCHEMA,
        "name": graph.get("name") or "Untitled plan",
        "planId": graph.get("planId") or graph.get("id"),
        "nodes": [
            {
                "id": nid,
                "type": n.get("type"),
                "label": _label_for(n),
                "position": n.get("position") or {"x": 0, "y": 0},
                "data": n.get("data") or {},
            }
            for nid, n in sorted(nodes.items(), key=lambda kv: _sort_key(kv[1]))
        ],
        "edges": [
            {
                "id": e.get("id") or f"{e['source']}->{e['target']}",
                "source": e["source"],
                "target": e["target"],
                "sourceHandle": e.get("sourceHandle"),
                "targetHandle": e.get("targetHandle"),
            }
            for e in edges
        ],
        "order": order,
        "entry": sorted(
            (nid for nid, deg in indegree.items() if deg == 0),
            key=lambda nid: _sort_key(nodes[nid]),
        ),
        "terminal": sorted(
            (nid for nid in nodes if nid not in outbound),
            key=lambda nid: _sort_key(nodes[nid]),
        ),
        "cyclic": cyclic,
        "warnings": warnings,
    }
