/**
 * Bridges ① and ② — the catalog, the brief, and the scope check.
 *
 * Ported from `sentinel/src/modules/learn/learn.test.ts` (deleted by the three-MCP
 * split at `aab534d`; recoverable with `git show e15810a:`). The cases are the
 * originals' cases; the imports, and three of the assertions, are not — see the
 * notes at each changed test.
 *
 * The cases worth writing here are the ones where a plausible implementation is
 * quietly wrong in a way a student would pay for:
 *
 * - a catalog that advertises a seat with no brief behind it sends a student to an
 *   empty screen, having already made them choose;
 * - a done-ness check defined against an empty `owns` would call a student finished
 *   before they started;
 * - a brief that carried the concept *answer* would put the reward in the one
 *   service that hands out the assignment — and MCP-1 would then be able to leak
 *   what the student is meant to earn.
 *
 * That last one is what this file guards hardest, because it is the point where the
 * product could betray its own thesis while every other test still passed.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CatalogParseError,
  catalogCoverage,
  parseCatalog,
  projectsForRole,
  roleIndex,
} from './catalog.js';
import { BriefParseError, checkScope, parseBrief, type Brief } from './brief.js';
import { bundledBrief, bundledCatalog, briefedSeats } from './fixtures.roster.js';
import { bundledPlan } from './fixtures.plans.js';
import { parsePlan, type Plan } from '../shared/plan.js';

const pricingBrief = () => bundledBrief('pricing', 'backend') as Brief;
const safetyBrief = () => bundledBrief('safety-gear', 'cv') as Brief;

/** The seats that run end to end with nothing uploaded — a bundled plan exists. */
const demoSeats = () =>
  bundledCatalog().projects.flatMap((p) =>
    p.roles.filter((r) => r.demo).map((r) => ({ project: p.key, role: r.key })),
  );

/** A plan with arbitrary labels, wired as a strict chain. */
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

// ── bridge ① the catalog ──────────────────────────────────────────────────────

test('catalog: the bundled one parses and every briefed seat really has a brief', () => {
  const catalog = bundledCatalog();
  assert.equal(catalog.warnings.length, 0, `catalog has warnings: ${catalog.warnings.join('; ')}`);

  for (const project of catalog.projects) {
    for (const role of project.roles) {
      const brief = bundledBrief(project.key, role.key);
      if (role.briefed) {
        assert.ok(brief, `${project.key}/${role.key} is marked briefed but has no brief`);
      } else {
        assert.equal(brief, null, `${project.key}/${role.key} has a brief but is not marked briefed`);
      }
    }
  }
});

test('catalog: briefedSeats and the catalog flags cannot drift apart', () => {
  // The other direction of the same guarantee. `briefedSeats()` is what the tools
  // offer a student when they land on an unplayable choice, so a seat present there
  // and absent from the catalog would be advertised by a fallback and nowhere else.
  const catalog = bundledCatalog();
  const flagged = catalog.projects
    .flatMap((p) => p.roles.map((r) => ({ seat: `${p.key}/${r.key}`, briefed: r.briefed })))
    .filter((s) => s.briefed)
    .map((s) => s.seat)
    .sort();
  const embedded = briefedSeats().map((s) => `${s.project}/${s.role}`).sort();
  assert.deepEqual(embedded, flagged);
});

test('catalog: coverage reports what is *demoable* honestly, not just what is briefed', () => {
  // CHANGED from the original, and the change is a finding rather than a rewrite.
  // The original asserted `roles > playableRoles` and `playableRoles === 2`, which
  // encoded GAPS.md Gap 14 ("only 2 of 5 roles are playable"). All five seats now
  // have briefs, so that assertion is not merely failing — it is stale. The honest
  // gap moved: 5 seats are playable, 3 of them run end to end with nothing uploaded.
  const coverage = catalogCoverage(bundledCatalog());
  assert.equal(coverage.roles, 5, 'five role archetypes');
  assert.equal(coverage.domains, 3);
  assert.equal(coverage.projects, 3);
  assert.equal(coverage.seats, 5);
  assert.equal(coverage.playableSeats, 5, 'every seat now has a brief — Gap 14 closed');
  assert.ok(
    coverage.demoableSeats < coverage.playableSeats,
    'the remaining honest gap is that not every playable seat has a bundled demo plan',
  );
  assert.equal(coverage.demoableSeats, 3);
});

test('catalog: a project in a domain that does not exist is dropped, not silently kept', () => {
  const catalog = parseCatalog({
    schema: 'mentor.catalog/v1',
    roles: [{ key: 'r', title: 'R' }],
    domains: [{ key: 'web-service', title: 'Web' }],
    projects: [
      {
        key: 'orphan',
        domain: 'nope',
        why_exemplary: 'x',
        roles: [{ key: 'r', title: 'R' }],
      },
    ],
  });
  // Unreachable through the two-step choice, so keeping it would advertise a dead end.
  assert.equal(catalog.projects.length, 0);
  assert.match(catalog.warnings.join(' '), /domain "nope" is not in the catalog/);
});

test('catalog: a wrong schema throws rather than presenting an empty menu as a real one', () => {
  assert.throws(
    () => parseCatalog({ schema: 'nope/v1', roles: [], domains: [], projects: [] }),
    CatalogParseError,
  );
});

test('catalog: projectsForRole finds the seat a role can actually take', () => {
  // REPLACES the original's `projectsInDomain` test. The catalog was domain-first
  // when that was written; the split made it role-first, because a student picks the
  // shape of the job before the product it sits in. `projectsInDomain` no longer
  // exists — this is the query that took its place.
  const catalog = bundledCatalog();
  assert.deepEqual(
    projectsForRole(catalog, 'backend').map((o) => `${o.project.key}/${o.role.key}`),
    ['pricing/backend'],
  );
  assert.deepEqual(
    projectsForRole(catalog, 'cv').map((o) => `${o.project.key}/${o.role.key}`),
    ['safety-gear/cv'],
  );
  assert.deepEqual(projectsForRole(catalog, 'no-such-role'), []);
});

test('catalog: every roleIndex row states its own coverage, not a footnote', () => {
  // A student picks a *row*. A summary at the top saying "3 of 5 are demoable" does
  // not stop anyone clicking one of the other two.
  for (const row of roleIndex(bundledCatalog())) {
    assert.ok(row.projects > 0, `${row.key} is advertised but appears on no project`);
    assert.ok(row.playable <= row.projects);
    assert.ok(row.demoable <= row.playable, `${row.key} claims more demos than playable seats`);
    assert.ok(row.domains.length > 0, `${row.key} belongs to no product type`);
    assert.ok(row.blurb.length > 0 && row.youTendToOwn.length > 0);
  }
});

// ── bridge ② the brief ────────────────────────────────────────────────────────

test('brief: a role that owns nothing throws — every later check is defined against owns', () => {
  assert.throws(
    () => parseBrief({ schema: 'mentor.brief/v1', project: 'p', role: 'r', owns: [] }),
    BriefParseError,
  );
});

test('brief: owning and being given the same component resolves to owned, with a warning', () => {
  const brief = parseBrief({
    schema: 'mentor.brief/v1',
    project: 'p',
    role: 'r',
    owns: [{ component: 'tax' }],
    given: [{ component: 'Tax', owned_by: 'someone' }],
  });
  assert.equal(brief.owns.length, 1);
  assert.equal(brief.given.length, 0, 'the contradiction must resolve one way, not both');
  assert.match(brief.warnings.join(' '), /both owns and given/);
});

test('brief: no bundled brief carries a concept answer, in any shape', () => {
  // REPLACES the original's two `assertNoFix` tests. `assertNoFix` inspected a
  // `concept.answer` held *in this service* and complained when it looked like code.
  // The split removed the field itself: MCP-1's `Concept` is `{ key, question }` and
  // the answer exists only in MCP-3. So the check is no longer "is the answer code"
  // but "is there an answer here at all" — a stronger property, and the one the
  // architecture actually rests on.
  for (const seat of briefedSeats()) {
    const brief = bundledBrief(seat.project, seat.role) as Brief;
    assert.deepEqual(
      Object.keys(brief.concept).sort(),
      ['key', 'question'],
      `${seat.project}/${seat.role} concept carries more than the question`,
    );
    assert.ok(brief.concept.question.length > 0, `${seat.project}/${seat.role} asks nothing`);
    const wire = JSON.stringify(brief);
    assert.ok(!/"answer"/.test(wire), `${seat.project}/${seat.role} serialises an answer field`);
    assert.ok(
      !/"transfers_?[Tt]o"/.test(wire),
      `${seat.project}/${seat.role} serialises transfers_to — that is MCP-3's half of the reward`,
    );
  }
});

test('brief: a brief that arrives carrying an answer is REFUSED, not quietly stripped', () => {
  // The enforcement point the split moved this invariant to. `scripts/embed_fixtures.mjs`
  // strips answers on the way in and fails the build if one survives, but a generator
  // is not a runtime guarantee — `open_brief` also accepts an uploaded document. If
  // parseBrief silently dropped the field, a mis-generated fixture would ship the
  // answer into this process and nothing would say so.
  const withAnswer = {
    schema: 'mentor.brief/v1',
    project: 'p',
    role: 'r',
    owns: [{ component: 'tax' }],
    concept: { key: 'k', question: 'q', answer: 'tax the discounted amount' },
  };
  assert.throws(() => parseBrief(withAnswer), BriefParseError);
  assert.throws(() => parseBrief(JSON.stringify(withAnswer)), BriefParseError);
});

// ── bridge ②③ the scope check ─────────────────────────────────────────────────

test('scope: the fixture plan covers the backend slice exactly', () => {
  const report = checkScope(pricingBrief(), bundledPlan('pricing') as Plan);
  assert.equal(report.inScope, true, report.summary);
  assert.equal(report.coverage, 1);
  assert.deepEqual([...report.missing], []);
  assert.deepEqual([...report.outOfScope], []);
});

test("scope: drawing the receipt is caught as somebody else's job", () => {
  // `receipt` is a real component of the pricing project and belongs to frontend.
  const report = checkScope(pricingBrief(), chain(['validate', 'discount', 'tax', 'total', 'receipt']));
  assert.equal(report.inScope, false);
  assert.deepEqual([...report.outOfScope], ['receipt']);
  assert.match(report.summary, /receipt is not yours to build/);
});

test('scope: omitting an owned component is caught as missing, with its intent', () => {
  const report = checkScope(pricingBrief(), chain(['validate', 'discount', 'total']));
  assert.deepEqual([...report.missing], ['tax']);
  assert.equal(report.coverage, 0.75);
  const entry = report.entries.find((e) => e.label === 'tax');
  assert.equal(entry?.verdict, 'missing');
  assert.match(entry?.note ?? '', /Apply tax to the amount/);
});

test('scope: a given component drawn as a boundary is correct practice, not a problem', () => {
  const report = checkScope(safetyBrief(), bundledPlan('safety-gear') as Plan);
  assert.deepEqual([...report.boundary], ['camera feed'], 'camera feed is owned by platform');
  assert.equal(report.inScope, true, report.summary);
  const entry = report.entries.find((e) => e.label === 'camera feed');
  assert.equal(entry?.verdict, 'boundary');
  assert.match(entry?.note ?? '', /platform owns this/i);
});

test('scope: renaming a box with different spacing still matches — same key as drift uses', () => {
  const report = checkScope(safetyBrief(), chain(['Detect_Person', 'check helmet', 'ALERT']));
  assert.deepEqual([...report.missing], []);
  assert.deepEqual([...report.outOfScope], []);
});

test('scope: every demoable seat has a plan that covers its own slice exactly', () => {
  // The generalisation claim, asserted rather than described. If a demo seat's bundled
  // plan does not satisfy its own brief, `review_my_design` tells that student their
  // design is wrong on their first call — before they have drawn anything.
  //
  // Scoped to `demo: true` seats, and that scoping is the point rather than a
  // convenience: plans are bundled **per project**, so `pricing/frontend` shares the
  // backend's canvas and correctly does not match it (it owns cart API and receipt,
  // neither of which is on that plan). `demo` is the flag that means "a bundled plan
  // exists for *this seat*", which is also why one project cannot have two of them.
  let checked = 0;
  for (const seat of demoSeats()) {
    const plan = bundledPlan(seat.project) as Plan;
    assert.ok(plan, `${seat.project}/${seat.role} is marked demo but has no bundled plan`);
    const brief = bundledBrief(seat.project, seat.role) as Brief;
    const report = checkScope(brief, plan);

    assert.equal(report.inScope, true, `${seat.project}/${seat.role}: ${report.summary}`);
    assert.equal(report.coverage, 1, `${seat.project}/${seat.role} does not design its whole slice`);
    assert.deepEqual(
      [...report.outOfScope],
      [],
      `${seat.project}/${seat.role}: the bundled plan draws something this role does not own`,
    );
    checked++;
  }
  assert.equal(checked, 3, 'three seats run end to end with nothing uploaded');
});
