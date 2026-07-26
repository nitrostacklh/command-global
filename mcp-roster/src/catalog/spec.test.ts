/**
 * Bridge ③ — deriving `mentor.checkpoints/v1`, the spec MCP-2 verifies against.
 *
 * Ported from the checkpoint half of `sentinel/src/modules/learn/learn.test.ts`
 * (deleted at `aab534d`; `git show e15810a:`). The original tested
 * `deriveCheckpoints`, which both derived the gate list *and* tracked progress
 * against it in one process. The split cut that in half along the deployment
 * boundary: MCP-1 now only derives, MCP-2 records and judges. So the derivation
 * cases port; the tracking cases could not, and did not move here. See the note at
 * the foot of this file.
 *
 * What is worth testing is not that a list comes back. It is that the list is
 * ordered by the student's *own* design and travels self-sufficiently, because
 * MCP-2 is a separate deployment and cannot ask a follow-up question:
 *
 * - sequence the gates by the brief instead of the plan and MCP-2's later drift
 *   claim becomes the tool's opinion rather than the student's own broken promise;
 * - drop a component the student owns but never drew and an incomplete design
 *   quietly shrinks the definition of done;
 * - invent a dependency the student never drew and MCP-2 reports drift against an
 *   order nobody committed to;
 * - let the concept *answer* travel and MCP-2 holds the reward it is not allowed to.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { deriveCheckpointSpec, ISSUER } from './spec.js';
import { bundledBrief, bundledCatalog } from './fixtures.roster.js';
import { bundledPlan } from './fixtures.plans.js';
import {
  CHECKPOINT_SPEC_SCHEMA,
  parseCheckpointSpec,
  planDigest,
} from '../shared/contracts.js';
import { parsePlan, type Plan } from '../shared/plan.js';
import type { Brief } from './brief.js';

const pricingBrief = () => bundledBrief('pricing', 'backend') as Brief;
const pricingPlan = () => bundledPlan('pricing') as Plan;

/** The seats that run end to end with nothing uploaded — a bundled plan exists. */
const demoSeats = () =>
  bundledCatalog().projects.flatMap((p) =>
    p.roles.filter((r) => r.demo).map((r) => ({ project: p.key, role: r.key })),
  );

function chain(labels: string[]): Plan {
  return parsePlan({
    schema: 'lumina.plan/v1',
    name: 'test',
    nodes: labels.map((label, i) => ({
      id: `n${i}`,
      type: 'component',
      label,
      position: { x: i * 200, y: 0 },
      data: {},
    })),
    edges: labels.slice(1).map((_, i) => ({ id: `e${i}`, source: `n${i}`, target: `n${i + 1}` })),
    order: labels.map((_, i) => `n${i}`),
    entry: ['n0'],
    terminal: [`n${labels.length - 1}`],
    cyclic: false,
    warnings: [],
  });
}

const spec = (brief: Brief, plan: Plan) => deriveCheckpointSpec(brief, plan, 'student-1');

// ── the order is the student's, not the brief's ───────────────────────────────

test('spec: sequenced by the order the student drew, not by the brief', () => {
  const brief = pricingBrief();
  // The brief lists validate, discount, tax, total. Draw them in a different order.
  const cps = spec(brief, chain(['validate', 'tax', 'discount', 'total']));
  const implement = cps.checkpoints.filter((c) => c.kind === 'implement');
  assert.deepEqual(
    implement.map((c) => c.subject),
    ['validate', 'tax', 'discount', 'total'],
    'the checkpoint order must follow the plan, which is what makes it fair to hold them to it',
  );
  assert.deepEqual(
    implement.map((c) => c.seq),
    [1, 2, 3, 4],
    'seq must be dense and ascending — MCP-2 reads out-of-order against it',
  );
});

test('spec: dependencies come from real edges, so unconnected boxes are unblocked', () => {
  const disconnected = parsePlan({
    schema: 'lumina.plan/v1',
    name: 'four islands',
    nodes: ['validate', 'discount', 'tax', 'total'].map((label, i) => ({
      id: `n${i}`,
      type: 'component',
      label,
      position: { x: i * 200, y: 0 },
      data: {},
    })),
    edges: [],
    order: ['n0', 'n1', 'n2', 'n3'],
    entry: [],
    terminal: [],
    cyclic: false,
    warnings: [],
  });
  const cps = spec(pricingBrief(), disconnected);
  for (const cp of cps.checkpoints.filter((c) => c.kind === 'implement')) {
    assert.deepEqual(
      [...cp.blockedBy],
      [],
      `${cp.subject} was reported as blocked, but the student never drew that dependency`,
    );
  }
});

test('spec: a chain gives tax a dependency on validate and discount', () => {
  const cps = spec(pricingBrief(), pricingPlan());
  const idOf = (subject: string) => cps.checkpoints.find((c) => c.subject === subject)?.id;
  const tax = cps.checkpoints.find((c) => c.subject === 'tax');
  assert.deepEqual([...(tax?.blockedBy ?? [])].sort(), [idOf('validate'), idOf('discount')].sort());
});

test('spec: an owned component missing from the canvas still counts toward done', () => {
  const cps = spec(pricingBrief(), chain(['validate', 'discount', 'total']));
  const subjects = cps.checkpoints.filter((c) => c.kind === 'implement').map((c) => c.subject);
  assert.ok(subjects.includes('tax'), 'an incomplete design must not shrink the definition of done');
  assert.equal(subjects[subjects.length - 1], 'tax', 'and it lands at the end, not in the sequence');
  assert.match(cps.warnings.join(' '), /tax is in your brief but not on your canvas/);
});

test('spec: acceptance criteria come last and depend on the whole slice', () => {
  const cps = spec(pricingBrief(), pricingPlan());
  const verify = cps.checkpoints.filter((c) => c.kind === 'verify');
  const implement = cps.checkpoints.filter((c) => c.kind === 'implement');
  assert.equal(verify.length, 3, 'three signed-off criteria');
  assert.ok(verify.every((v) => v.seq > implement.length));
  assert.equal(verify[0].blockedBy.length, implement.length);
});

test('spec: a cyclic plan states no sequence, and says so instead of inventing one', () => {
  // A cycle means the student's canvas expresses no order at all. Deriving gates from
  // it anyway and letting MCP-2 report drift against them would hold them to a
  // sequence they never claimed.
  const cyclic = parsePlan({
    schema: 'lumina.plan/v1',
    name: 'a loop',
    nodes: ['validate', 'discount', 'tax', 'total'].map((label, i) => ({
      id: `n${i}`,
      type: 'component',
      label,
      position: { x: i * 200, y: 0 },
      data: {},
    })),
    edges: [
      { id: 'e0', source: 'n0', target: 'n1' },
      { id: 'e1', source: 'n1', target: 'n2' },
      { id: 'e2', source: 'n2', target: 'n0' },
    ],
    order: ['n0', 'n1', 'n2', 'n3'],
    entry: [],
    terminal: [],
    cyclic: true,
    warnings: [],
  });
  const cps = spec(pricingBrief(), cyclic);
  assert.match(cps.warnings.join(' '), /your plan has a cycle, so it states no sequence/);
  assert.match(cps.warnings.join(' '), /MCP-2 will discount/);
});

// ── the spec has to survive the trip to another deployment ───────────────────

test('spec: everything MCP-2 needs travels inside the artifact', () => {
  const brief = pricingBrief();
  const cps = spec(brief, pricingPlan());

  assert.equal(cps.schema, CHECKPOINT_SPEC_SCHEMA);
  assert.equal(cps.issued_by, ISSUER, 'an unattributed spec cannot be blamed when it is stale');
  assert.equal(cps.student, 'student-1');
  assert.deepEqual([...cps.owns], ['validate', 'discount', 'tax', 'total']);
  assert.deepEqual([...cps.given], ['cart API', 'payment gateway'], 'so a boundary box is never reported as missing work');
  assert.equal(cps.files.entry, 'build/pricing.js');
  assert.equal(cps.files.tests, 'build/pricing.test.js');
  assert.ok(cps.definition_of_done.length > 0);
  for (const cp of cps.checkpoints) {
    assert.ok(cp.proves.length > 0, `${cp.id} does not say what reaching it would prove`);
    assert.ok(cp.evidence.hint.length > 0, `${cp.id} does not say what would count as evidence`);
  }
  // And it round-trips, because MCP-2 parses it rather than trusting the shape.
  assert.deepEqual(parseCheckpointSpec(JSON.parse(JSON.stringify(cps))).checkpoints.length, cps.checkpoints.length);
});

test('spec: the concept key and question travel — the answer does not', () => {
  // The load-bearing one. MCP-2 needs the key to name the lesson in its verdict and
  // the question to show the student what they are working toward. It must never
  // receive the answer, because a service that does not hold a string cannot leak it.
  const cps = spec(pricingBrief(), pricingPlan());
  assert.deepEqual(Object.keys(cps.concept).sort(), ['key', 'question']);
  assert.equal(cps.concept.key, 'order-of-operations-in-money-math');
  const wire = JSON.stringify(cps);
  assert.ok(!/"answer"/.test(wire), 'the spec serialises an answer field');
  assert.ok(!/after the discount is taken off/.test(wire), 'the pricing answer text is in the spec');
});

test('spec: plan_digest tracks the ordering claim, and ignores the canvas layout', () => {
  // MCP-2 uses this to tell whether the spec it was handed was derived from the plan
  // it was also handed. If moving a box invalidated it, every student who tidied
  // their canvas would get a false "your spec is stale"; if reordering did not, a
  // student who redrew their design would be judged against the abandoned one.
  const plan = pricingPlan();
  const base = spec(pricingBrief(), plan);
  assert.equal(base.plan_digest, planDigest(plan));

  const moved = parsePlan({
    ...JSON.parse(JSON.stringify(plan)),
    nodes: plan.nodes.map((n) => ({ ...n, position: { x: n.position.x + 37, y: n.position.y - 12 } })),
  });
  assert.equal(spec(pricingBrief(), moved).plan_digest, base.plan_digest, 'moving a box invalidated the spec');

  const reordered = spec(pricingBrief(), chain(['validate', 'tax', 'discount', 'total']));
  assert.notEqual(reordered.plan_digest, base.plan_digest, 'a different order produced the same digest');
});

test('spec: every demoable seat derives a clean spec, on three different project shapes', () => {
  // The generalisation claim, asserted rather than described: the same derivation has
  // to work on a vision project and a data pipeline, not only on pricing.
  //
  // Scoped to `demo: true` seats. Plans are bundled per *project*, so a non-demo seat
  // sharing its project's canvas legitimately derives a spec full of "in your brief
  // but not on your canvas" warnings — a real behaviour, tested above, but the wrong
  // fixture for asserting that derivation is clean.
  let checked = 0;
  for (const seat of demoSeats()) {
    const plan = bundledPlan(seat.project) as Plan;
    const brief = bundledBrief(seat.project, seat.role) as Brief;
    const cps = spec(brief, plan);

    assert.deepEqual(
      [...cps.warnings],
      [],
      `${seat.project}/${seat.role}: a demoable seat's own plan produced warnings`,
    );
    const implement = cps.checkpoints.filter((c) => c.kind === 'implement');
    const verify = cps.checkpoints.filter((c) => c.kind === 'verify');

    assert.equal(
      implement.length,
      brief.owns.length,
      `${seat.project}/${seat.role}: one implement gate per owned component`,
    );
    assert.equal(verify.length, brief.acceptance.length, `${seat.project}/${seat.role}: one gate per criterion`);
    assert.ok(
      verify.every((v) => v.seq > implement.length),
      `${seat.project}/${seat.role}: a criterion is sequenced before the slice is built`,
    );
    assert.equal(new Set(cps.checkpoints.map((c) => c.id)).size, cps.checkpoints.length, 'duplicate ids');
    checked++;
  }
  assert.ok(checked >= 3, `only ${checked} seats exercised — the claim needs more than pricing`);
});

/**
 * **Not ported, and deliberately not recreated here.**
 *
 * Eleven of the original file's cases tested `recordProgress`, `buildFromProgress`,
 * `judgeDone` and `passedCheckpoints` — recording work against the gates, and
 * judging done-ness. Those functions no longer exist anywhere in the repo. The
 * split moved that job to MCP-2 (`sentinel/src/modules/verify/`: `verifyCheckpoints`,
 * `findStuck`, `buildFromEvents`), which is a different deployment and is outside
 * this stream's boundary. Two more cases depended on `findDrift`, also MCP-2's.
 *
 * They are a real coverage hole and they are recorded as one in `GAPS.md` Gap 16
 * rather than papered over with a test of something adjacent.
 */
