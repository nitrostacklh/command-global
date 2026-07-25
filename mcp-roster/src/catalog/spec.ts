/**
 * The bridge MCP‑1 ▶ MCP‑2 — deriving `mentor.checkpoints/v1`.
 *
 * The architecture page calls this box "Role-Based Checkpoints: per-project,
 * per-role gates. Defines the checkpoint set and what 'end / done' means. Handed to
 * MCP‑2 as the spec to verify against." Every clause of that has a consequence
 * here.
 *
 * ## The student's own design orders their checkpoints
 *
 * The list is not authored per project. It is *derived* from the brief (what you
 * own) crossed with the plan (the order **you** said you would do it in). That
 * join is the point: you are held to your own sequence, which is what makes MCP‑2's
 * later drift claim yours rather than the tool's opinion.
 *
 * A consequence worth stating plainly: change your plan and your checkpoints
 * change. That is correct. Re-designing is allowed; silently drifting from a design
 * you still claim to hold is what is not.
 *
 * ## The spec has to be self-sufficient, and that is a design constraint
 *
 * MCP‑2 is a different deployment. It cannot call back for "what did the brief say
 * about this component" — so anything it needs travels inside the artifact:
 *
 * - `owns` so it counts the right things toward done
 * - `given` so it never reports a correctly-unbuilt boundary box as missing work,
 *   which is the one false accusation that would make a student stop trusting it
 * - `files` so it can link a failure to a history
 * - `evidence` per checkpoint so it knows what would prove that gate was reached
 * - `concept.key` and `concept.question` — and **never** the answer, which exists
 *   only in MCP‑3
 *
 * `plan_digest` closes the last hole: MCP‑2 can tell whether the spec it was handed
 * was derived from the plan it was also handed. Without it, a student who redrew
 * their canvas and re-fetched only one of the two would get a confident verdict
 * computed against a design they had abandoned.
 */

import {
  CHECKPOINT_SPEC_SCHEMA,
  planDigest,
  type CheckpointSpec,
  type SpecCheckpoint,
} from '../shared/contracts.js';
import { normalizeComponent } from '../shared/component.js';
import { dependencyPath, labelOf, type Plan } from '../shared/plan.js';
import { checkScope, type Brief } from './brief.js';

/** Who minted a spec. Stamped on the artifact so a stale one is attributable. */
export const ISSUER = 'mentor-roster/1.0.0 (MCP-1)';

/**
 * Derive the checkpoint spec from the brief and the plan.
 *
 * Two waves, in this order:
 *
 * 1. **implement** — one per owned component, sequenced by the plan's `order`.
 *    Components the student owns but never drew still get a checkpoint, at the
 *    end, flagged. Dropping them would let an incomplete design quietly shrink the
 *    definition of done, which is the one thing a progress tracker must never do.
 * 2. **verify** — one per acceptance criterion. These come last because a
 *    criterion is a statement about the finished slice.
 */
export function deriveCheckpointSpec(
  brief: Brief,
  plan: Plan,
  student: string,
): CheckpointSpec {
  const warnings: string[] = [];
  const scope = checkScope(brief, plan);

  if (plan.cyclic) {
    warnings.push(
      'your plan has a cycle, so it states no sequence — checkpoints are listed in canvas ' +
        'order and their order carries no weight, which MCP-2 will discount when it looks for drift',
    );
  }

  const ownedKeys = new Set(brief.owns.map((o) => normalizeComponent(o.component)));
  const intentByKey = new Map(brief.owns.map((o) => [normalizeComponent(o.component), o]));

  // Plan order, restricted to what this role owns. `given` components are on the
  // canvas legitimately but are somebody else's checkpoint.
  const orderedOwnedIds = plan.order.filter((id) =>
    ownedKeys.has(normalizeComponent(labelOf(plan, id))),
  );

  const drafts: SpecCheckpoint[] = [];
  const idByComponentKey = new Map<string, string>();
  let seq = 0;

  for (const nodeId of orderedOwnedIds) {
    const label = labelOf(plan, nodeId);
    const key = normalizeComponent(label);
    const id = `cp-${++seq}`;
    idByComponentKey.set(key, id);
    drafts.push({
      id,
      seq,
      kind: 'implement',
      subject: label,
      title: `Implement ${label}`,
      proves: intentByKey.get(key)?.intent || `${label} exists and does its one job`,
      blockedBy: [], // filled in below, once every implement id is known
      evidence: { kind: 'file', hint: brief.entry || '(the file your code lands in)' },
    });
  }

  for (const missing of scope.missing) {
    const id = `cp-${++seq}`;
    idByComponentKey.set(normalizeComponent(missing), id);
    drafts.push({
      id,
      seq,
      kind: 'implement',
      subject: missing,
      title: `Implement ${missing}`,
      proves:
        intentByKey.get(normalizeComponent(missing))?.intent ||
        `${missing} exists and does its one job`,
      blockedBy: [],
      evidence: { kind: 'file', hint: brief.entry || '(the file your code lands in)' },
    });
    warnings.push(
      `${missing} is in your brief but not on your canvas — it still counts toward done`,
    );
  }

  // Dependencies resolved from the plan graph, not from list adjacency. A component
  // with no drawn dependency is genuinely unblocked, and pretending otherwise would
  // invent an order the student never committed to — then hold them to it.
  const checkpoints: SpecCheckpoint[] = drafts.map((cp) => {
    const key = normalizeComponent(cp.subject);
    const selfId = plan.nodes.find((n) => normalizeComponent(n.label) === key)?.id;
    if (!selfId) return cp;
    const blockedBy: string[] = [];
    for (const other of plan.nodes) {
      const otherKey = normalizeComponent(other.label);
      if (otherKey === key) continue;
      const otherCpId = idByComponentKey.get(otherKey);
      if (!otherCpId) continue; // a `given` component — not a checkpoint of ours
      if (dependencyPath(plan, other.id, selfId) !== 'none') blockedBy.push(otherCpId);
    }
    return { ...cp, blockedBy };
  });

  for (const criterion of brief.acceptance) {
    const id = `cp-${++seq}`;
    checkpoints.push({
      id,
      seq,
      kind: 'verify',
      subject: criterion.id,
      title: `Verify: ${criterion.must}`,
      proves: criterion.given ? `${criterion.given} produces ${criterion.must}` : criterion.must,
      // Every acceptance criterion depends on the whole slice being built.
      blockedBy: checkpoints.filter((c) => c.kind === 'implement').map((c) => c.id),
      evidence: {
        kind: 'test',
        hint: criterion.given
          ? `${brief.tests || 'your test file'} — ${criterion.given} → ${criterion.must}`
          : brief.tests || 'your test file',
      },
    });
  }

  return {
    schema: CHECKPOINT_SPEC_SCHEMA,
    issued_by: ISSUER,
    project: brief.project,
    role: brief.role,
    student,
    checkpoints,
    definition_of_done:
      `Done means all ${brief.owns.length} component(s) you own are implemented, all ` +
      `${brief.acceptance.length} acceptance criteria pass, and your design covers your slice ` +
      'and nothing outside it. Two of those three are about your code. The third is about ' +
      'whether you built the right thing.',
    owns: brief.owns.map((o) => o.component),
    given: brief.given.map((g) => g.component),
    files: { entry: brief.entry, tests: brief.tests },
    concept: { key: brief.concept.key, question: brief.concept.question },
    plan_digest: planDigest(plan),
    warnings: [...warnings, ...plan.warnings.map((w) => `from your plan: ${w}`)],
  };
}
