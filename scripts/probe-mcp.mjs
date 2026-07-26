/**
 * Walk the loop once on the SECOND project, over real MCP, and print every artifact.
 *
 *   npm run probe
 *
 * ## What this is for
 *
 * One question decides how a demo lands: *"is this one hardcoded example?"* The honest
 * answer is a different project, a different role, a different bug and a different
 * confidence score, produced live in about fifteen seconds. That is this script.
 *
 * `safety-gear/cv` owns three components instead of pricing's four, the bug is
 * alerting on a condition that did not exist yet rather than taxing before a discount,
 * and its build history is **tracked** rather than hand-authored — so it scores higher
 * on the same formula, because the evidence is better and not because anything was
 * tuned.
 *
 * `npm run walk` asserts the pricing journey and exits non-zero on a regression; this
 * one prints, so you can time the beats and read the numbers before you point a camera
 * at anything. Both drive all three apps.
 *
 * ## Why it had to be rewritten
 *
 * It drove one server, calling `browse_catalog`, `checkpoints`, `record_progress` and
 * `is_it_done`, and read its fixture out of `sentinel/dist/modules/learn/` — a path
 * deleted in the three-way split. None of those tools or paths exist any more.
 */

import { openFleet, ROOT, ANSWER, G, R, B, DIM } from './lib/fleet.mjs';
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';

const ok = (s) => G(s);
const bad = (s) => R(s);
const h = (title) => console.log(`\n${B(title)}`);

const PROJECT = 'safety-gear';
const ROLE = 'cv';
const HANDLE = 'probe';

/**
 * The bundled design and history, read out of the built app rather than copied here.
 *
 * MCP-2 embeds them because it deploys as a lone folder and cannot read `fixtures/` at
 * runtime. Importing the built module means this script holds no fourth copy of an
 * artifact that already exists in three places.
 */
async function bundledSafetyGear() {
  const mod = await import(
    pathToFileURL(join(ROOT, 'sentinel', 'dist', 'modules', 'mentor', 'fixtures.demo.js')).href
  );
  return {
    plan: JSON.parse(mod.DEMO_PLAN_JSON[PROJECT]),
    build: JSON.parse(mod.DEMO_BUILD_JSON[PROJECT]),
  };
}

/** The build history, replayed as the event stream a client would have streamed. */
const asEvents = (build) => [
  ...build.steps
    .filter((s) => s.kind === 'implement')
    .map((s) => ({
      schema: 'lumina.build_event/v1',
      kind: 'component_built',
      component: s.component,
      file: s.file,
      line: s.line,
      at: s.at,
      summary: s.summary,
      source: 'probe',
    })),
  ...(build.failure
    ? [
        {
          schema: 'lumina.build_event/v1',
          kind: 'test_run',
          outcome: 'fail',
          file: build.failure.file,
          line: build.failure.line,
          at: 'T+90m',
          summary: build.failure.message,
          source: 'probe',
        },
      ]
    : []),
];

let fleet;
try {
  fleet = await openFleet({ local: true, clientName: 'probe' });
  if (fleet.missing.length) {
    console.error(R(`\nNot built: ${fleet.missing.join(', ')}. Run: npm run build:all\n`));
    process.exit(1);
  }
  const call = fleet.call;

  h('The fleet');
  for (const svc of fleet.services.values()) {
    console.log(`  ${svc.label}  ${svc.name} ${svc.version}  ${DIM(svc.role)}`);
    console.log(`        ${DIM(svc.tools.join('  '))}`);
  }
  const writers = fleet.allTools().filter((t) => /patch|write|fix_code|edit|apply|heal/i.test(t));
  console.log(`  can modify a student's build: ${writers.length ? bad(writers.join(', ')) : ok('nothing')}`);

  // ① the choice ─────────────────────────────────────────────────────────────
  h('① list_roles → projects_for_role  (MCP-1)');
  const roles = await call('list_roles', { handle: HANDLE });
  console.log(`  ${roles.coverage.roles} roles across ${roles.coverage.projects} projects · ${roles.coverage.playableSeats}/${roles.coverage.seats} seats playable`);
  console.log(`  ${DIM(roles.honesty)}`);
  const offers = await call('projects_for_role', { role: ROLE, handle: HANDLE });
  const seat = offers.projects.find((p) => p.project === PROJECT);
  console.log(`  ${ROLE} → ${offers.projects.map((p) => p.project).join(', ')}`);
  console.log(`  ${DIM(seat.why_its_worth_your_afternoon)}`);

  // ② the role slice ─────────────────────────────────────────────────────────
  h('② open_brief  (MCP-1)');
  const brief = await call('open_brief', { project: PROJECT, role: ROLE, handle: HANDLE });
  console.log(`  owns     ${brief.you_own.map((o) => o.component).join(', ')}`);
  console.log(`  given    ${brief.given_to_you.map((g) => `${g.component} (${g.owned_by})`).join(', ')}`);
  console.log(`  not ours ${brief.not_yours.join(', ') || '(nothing)'}`);
  console.log(`  concept  ${brief.concept_you_are_here_to_learn.question}`);
  console.log(`  answer   ${JSON.stringify(brief).includes(ANSWER) ? bad('LEAKED') : ok('not in this process')}`);

  // ③ the design ─────────────────────────────────────────────────────────────
  h('③ check_scope  (MCP-1) — scope drift, before a line of code');
  const { plan, build } = await bundledSafetyGear();
  const scope = await call('check_scope', { project: PROJECT, role: ROLE, plan });
  console.log(`  in_scope=${scope.in_scope ? ok('true') : bad('false')}  ${DIM(scope.summary)}`);
  const withExtra = {
    ...plan,
    nodes: [...plan.nodes, { id: 'n-dashboard', type: 'component', label: 'dashboard', position: { x: 900, y: 0 }, data: {} }],
    order: [...plan.order, 'n-dashboard'],
  };
  const foreign = await call('check_scope', { project: PROJECT, role: ROLE, plan: withExtra });
  console.log(`  + dashboard → in_scope=${foreign.in_scope === false ? ok('false') : bad('true')}  out_of_scope=${(foreign.out_of_scope ?? []).join(', ')}`);

  // ④ the work plan ──────────────────────────────────────────────────────────
  h('④ checkpoint_spec  (MCP-1) — gates in the order THEY drew');
  const derived = await call('checkpoint_spec', { project: PROJECT, role: ROLE, plan, handle: HANDLE });
  const spec = derived.spec;
  for (const c of spec.checkpoints) {
    console.log(`  ${c.id.padEnd(6)} ${c.kind.padEnd(9)} ${c.subject}${c.blockedBy.length ? DIM(`   after ${c.blockedBy.join(', ')}`) : ''}`);
  }
  console.log(`  ${DIM(spec.definition_of_done)}`);

  // ⑤ the build, watched ─────────────────────────────────────────────────────
  h('⑤ open_session → build_event  (MCP-2) — watching, not blocking');
  const opened = await call('open_session', { spec, plan, student: `handle:${HANDLE}` });
  const events = asEvents(build);
  const streamed = await call('build_event', { session: opened.session.id, events });
  console.log(`  session ${opened.session.id} · ${streamed.accepted} event(s) accepted, ${streamed.rejected.length} rejected`);
  console.log(`  gates   ${streamed.passed}/${streamed.of} passed`);
  console.log(`  order   ${streamed.out_of_order.length ? bad(streamed.out_of_order.join(' · ')) : ok('as designed')}`);
  if (streamed.stuck) console.log(`  stuck   ${streamed.stuck.subject} — ${DIM(streamed.stuck.why)}`);

  // ⑥ the verdict ────────────────────────────────────────────────────────────
  h('⑥ build_verdict  (MCP-2) — the artifact MCP-3 files');
  const verdict = await call('build_verdict', { session: opened.session.id, student: `handle:${HANDLE}`, finalise: true });
  const d = verdict.verdict.drift;
  console.log(`  status      ${verdict.status === 'escalated' ? ok('escalated') : verdict.status}`);
  console.log(`  origin      ${d?.origin ? `${d.origin.component} @ ${d.origin.file}:${d.origin.line}` : '(none)'}`);
  console.log(`  should be   after ${d?.origin?.shouldFollow ?? '—'}  (planned ${d?.origin?.plannedPosition}, built ${d?.origin?.actualPosition})`);
  console.log(`  surfaced    ${d?.failure ? `${d.failure.file}:${d.failure.line}` : '(none)'}`);
  console.log(`  confidence  ${ok(String(d?.confidence))}  ${DIM(`provenance ${verdict.verdict.provenance} — pricing's authored history scores 0.91`)}`);
  console.log(`  boundary    ${(verdict.expected_unbuilt ?? []).join(', ') || '(none)'} ${DIM('— correctly unbuilt, not outstanding work')}`);
  console.log(`  fix         ${verdict.fix_withheld ? ok('withheld') : bad('RETURNED')}`);
  console.log(`  next        ${DIM(verdict.next_question)}`);

  // ⑦ the card ───────────────────────────────────────────────────────────────
  h('⑦ record_verdict → flashcard  (MCP-3) — the only process with an answer');
  await call('record_verdict', { verdict: verdict.verdict, student: `handle:${HANDLE}` });
  const red = await call('flashcard', { project: PROJECT, role: ROLE, student: `handle:${HANDLE}`, test_output: '# tests 4\n# pass 3\n# fail 1' });
  console.log(`  tests red   earned=${red.earned === false ? ok('false') : bad('true')} · back field ${'back' in red ? bad('PRESENT') : ok('absent')}`);
  console.log(`  ${DIM(red.blocking?.[0] ?? '')}`);
  const junk = await call('flashcard', { project: PROJECT, role: ROLE, student: `handle:${HANDLE}`, test_output: 'looks fine to me' });
  console.log(`  junk output ${junk.earned === false ? ok('not accepted as passing') : bad('ACCEPTED')}`);

  await call('build_event', { session: opened.session.id, events: [{ schema: 'lumina.build_event/v1', kind: 'test_run', outcome: 'pass', file: build.tests, at: 'T+120m', source: 'probe' }] });
  const done = await call('build_verdict', { session: opened.session.id, student: `handle:${HANDLE}`, finalise: true });
  await call('record_verdict', { verdict: done.verdict, student: `handle:${HANDLE}` });
  const earned = await call('flashcard', { project: PROJECT, role: ROLE, student: `handle:${HANDLE}`, test_output: '# tests 4\n# pass 4\n# fail 0' });
  console.log(`  tests green earned=${earned.earned ? ok('true') : bad('false')} · earned against ${earned.earnedBy?.origin ?? '(nothing)'}`);
  console.log(`  ${DIM((earned.back ?? '(withheld)').slice(0, 110))}`);

  console.log(`\n${G('Six stages, three services, a second project.')}`);
  console.log(DIM('The bridges are not live over stdio — the artifacts were carried by hand, which is'));
  console.log(DIM('the supported path. Set the peer URLs (DEPLOY.md §5c) and the same walk goes over HTTP.\n'));
} catch (err) {
  console.error(R('\nTHREW: ') + (err instanceof Error ? (err.stack ?? err.message) : String(err)));
  process.exitCode = 1;
} finally {
  fleet?.close();
}
