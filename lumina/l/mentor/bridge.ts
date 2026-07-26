"use client";

/**
 * The Layer 3 → Layer 4 bridge: getting the design out of Lumina, and turning
 * what the student does next into events MCP-2 can witness.
 *
 * Three ways in, in descending order of how much has to be running:
 *
 * 1. **A saved canvas.** The dashboard ships inside Lumina, so it can read the
 *    same `lumina-workflows` key the canvas autosaves into and compile it through
 *    the existing `/api/export/plan` endpoint — the identical path the Plan
 *    button takes, so the artifact is byte-identical to what a student would
 *    have downloaded. Needs the Python backend up.
 * 2. **A dropped `plan.lumina.json`.** Works with the backend down, and is the
 *    path a student on a different machine takes.
 * 3. **The bundled worked example.** `check_scope` and `checkpoint_spec` take an
 *    optional plan and fall back to the design bundled for that project, so the
 *    whole loop runs with Lumina closed. Omitting the argument is the mechanism —
 *    we never ship a copy of the fixture here, because a second copy would drift
 *    from the real one.
 *
 * Which one happened is recorded and shown. "Reviewed the bundled example" and
 * "reviewed your design" are different claims and a demo that blurs them is
 * claiming something it did not do.
 */

import type { Doc } from './store';

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:8000';
const WORKFLOW_KEY = 'lumina-workflows';

export interface SavedCanvas {
  readonly id: string;
  readonly name: string;
  readonly nodes: number;
  readonly edges: number;
  readonly updatedAt: number;
}

interface StoredWorkflow {
  id: string;
  name: string;
  nodes: { id: string; type?: string; position?: unknown; data?: unknown }[];
  edges: { id: string; source: string; target: string; sourceHandle?: string; targetHandle?: string }[];
  updatedAt: number;
}

function storedWorkflows(): StoredWorkflow[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(WORKFLOW_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as StoredWorkflow[]) : [];
  } catch {
    return [];
  }
}

/** The canvases this student has drawn, newest first. */
export function savedCanvases(): SavedCanvas[] {
  return storedWorkflows()
    .map((wf) => ({
      id: wf.id,
      name: wf.name,
      nodes: wf.nodes?.length ?? 0,
      edges: wf.edges?.length ?? 0,
      updatedAt: wf.updatedAt ?? 0,
    }))
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

/**
 * Compile a saved canvas into `lumina.plan/v1` through Lumina's own exporter.
 *
 * Same endpoint, same compiler, same tie-breaking on canvas position — so two
 * exports of an unchanged canvas are byte-identical and MENTOR cannot report
 * drift that isn't there.
 */
export async function planFromCanvas(id: string): Promise<{ plan: Doc; name: string }> {
  const wf = storedWorkflows().find((w) => w.id === id);
  if (!wf) throw new Error('that canvas is no longer in this browser');

  const graph = {
    name: wf.name,
    planId: wf.id,
    nodes: (wf.nodes ?? []).map((n) => ({
      id: n.id,
      type: n.type,
      position: n.position,
      data: n.data,
    })),
    edges: (wf.edges ?? []).map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle,
      targetHandle: e.targetHandle,
    })),
  };

  let response: Response;
  try {
    response = await fetch(`${BACKEND}/api/export/plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(graph),
    });
  } catch {
    throw new Error(
      `Lumina's backend is not answering on ${BACKEND}. Start it with \`npm run lumina:backend\`, ` +
        'or export the plan with the Plan button and drop the file here instead.',
    );
  }
  if (!response.ok) {
    throw new Error(`the plan exporter answered ${response.status} ${response.statusText}`);
  }

  const plan = (await response.json()) as Doc;
  return { plan, name: (plan.name as string) || wf.name };
}

/** Read a dropped or pasted plan, refusing anything that is not the artifact. */
export function parsePlan(text: string): { plan: Doc; name: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    throw new Error(`that is not JSON: ${err instanceof Error ? err.message : String(err)}`);
  }
  if (!parsed || typeof parsed !== 'object') throw new Error('a plan has to be a JSON object');

  const plan = parsed as Doc;
  if (plan.schema !== 'lumina.plan/v1') {
    throw new Error(
      `that file says schema ${JSON.stringify(plan.schema ?? '(none)')} — MENTOR needs ` +
        'lumina.plan/v1, which is what the Plan button exports. The n8n and Node-RED exports ' +
        'are runnable formats and do not carry the order you intended to build in.',
    );
  }
  if (!Array.isArray(plan.order) || plan.order.length === 0) {
    throw new Error('that plan has no `order` — without it there is no intended sequence to compare against');
  }
  return { plan, name: (plan.name as string) || 'your design' };
}

// ── build events ─────────────────────────────────────────────────────────────

export type EventKind = 'stage_entered' | 'component_built' | 'test_run' | 'checkpoint_claimed';

export interface NewEvent {
  kind: EventKind;
  component?: string | null;
  checkpoint?: string | null;
  file?: string;
  line?: number | null;
  summary: string;
  outcome?: 'pass' | 'fail' | null;
  test_output?: string | null;
}

/**
 * One `lumina.build_event/v1`.
 *
 * `at` is measured from when this page was opened, not a synthetic `T+7m` step —
 * being stuck is a property of time actually spent, so a made-up clock would turn
 * MCP-2's "stuck" signal into a decoration. Page-open is a proxy for the start of
 * the sitting rather than for the session's own clock: it stays on one clock
 * (this browser's) instead of mixing in the server's, which is the trade that
 * keeps the offsets internally consistent.
 *
 * `source` is `lumina` because that is literally what observed it — this page is
 * part of the Lumina app.
 */
export function buildEvent(input: NewEvent, seq: number, openedAt: number): Doc {
  const minutes = Math.max(0, Math.round((Date.now() - openedAt) / 60000));
  return {
    schema: 'lumina.build_event/v1',
    seq,
    at: `T+${minutes}m`,
    kind: input.kind,
    component: input.component ?? null,
    checkpoint: input.checkpoint ?? null,
    file: input.file ?? '',
    line: input.line ?? null,
    summary: input.summary,
    outcome: input.outcome ?? null,
    test_output: input.test_output ?? null,
    source: 'lumina',
  };
}

/**
 * Does this output read as passing?
 *
 * Counts failures rather than looking for the word "fail", because the summary
 * line that proves a run was green *contains* it: node:test prints `# fail 0`.
 * A keyword match calls that a failure, sends `outcome: 'fail'` to MCP-2, and the
 * student then watches the profile service — which parses the same text correctly
 * — disagree with the verifier and hold the card shut. The bug looks exactly like
 * the cross-service gate misfiring, when in fact the gate is working and the
 * client is the one that is wrong.
 *
 * So this mirrors the shapes MCP-3 recognises. Anything unrecognised is *not*
 * passing: an unparsed run must never be able to open a card, and the student is
 * told which reading was taken.
 */
export function looksPassing(output: string): boolean {
  const text = output.trim();
  if (!text) return false;

  const counted: { re: RegExp }[] = [
    { re: /^#\s*fail\s+(\d+)\s*$/im }, // node:test
    { re: /(\d+)\s+failed/i }, // pytest
    { re: /tests?:\s*(?:.*?)(\d+)\s+failed/i }, // jest / vitest
  ];
  for (const shape of counted) {
    const match = shape.re.exec(text);
    if (match) return Number(match[1]) === 0;
  }

  // Green shapes that report no failure count at all.
  if (/(\d+)\s+passed(?:[^,]*)\s+in\s+[\d.]+s/i.test(text) && !/fail|error/i.test(text)) return true;
  if (/^ok\s+\S+/im.test(text) && !/^(FAIL|---\s*FAIL)/im.test(text)) return true;

  return false;
}
