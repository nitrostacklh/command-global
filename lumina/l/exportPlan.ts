import type { Node, Edge } from "reactflow";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";

/**
 * Export the current Lumina canvas as a MENTOR **plan artifact**
 * (`lumina.plan/v1`) and download it as `plan.lumina.json`.
 *
 * This is the Layer 3 → Layer 4 handoff of the MENTOR product: unlike the n8n
 * and Node-RED exports it is not runnable, it is the record of what the student
 * *intended* to build. MENTOR reads it and diffs it against the code they
 * actually wrote. Schema and the reasoning behind it: `export_plan.py`.
 *
 * Drop the downloaded file into a project's `fixtures/<project>/plan.lumina.json`
 * to make it MENTOR's plan input.
 */
export async function exportPlan(
  nodes: Node[],
  edges: Edge[],
  meta?: { name?: string; planId?: string }
): Promise<void> {
  const graph = {
    name: meta?.name,
    planId: meta?.planId,
    nodes: nodes.map((n) => ({
      id: n.id,
      type: n.type,
      position: n.position,
      data: n.data,
    })),
    edges: edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle,
      targetHandle: e.targetHandle,
    })),
  };

  const response = await fetch(`${BACKEND}/api/export/plan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(graph),
  });

  if (!response.ok) {
    throw new Error(`Plan export failed: ${response.status} ${response.statusText}`);
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "plan.lumina.json";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
