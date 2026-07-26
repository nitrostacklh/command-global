/**
 * Walk the whole student journey across all three apps, as real MCP calls, and
 * assert every beat.
 *
 *   npm run walk
 *
 * ## How this differs from the other commands
 *
 * - `npm test` — unit tests, in-process, per app. Fast, and blind to the MCP layer.
 * - `npm run verify:live` — the same product, over HTTP, against the **deployed** fleet.
 * - `npm run walk` — the **built** apps, over stdio, offline: no network, no key, no
 *   model. This is the one that runs in `npm run verify`, so it is the gate.
 *
 * ## Why it had to be rewritten
 *
 * It used to drive one server with nine tools. Six of those now live in two other
 * processes and two no longer exist, so it failed on turn 1 with `browse_catalog: no
 * text content` — a single-server script against a three-server product. It launches
 * all three and routes each call to the app that owns the tool, resolved from what
 * each app says it is.
 *
 * ## The bridges are deliberately NOT live here, and that is the interesting case
 *
 * Peer calls go over HTTP; these three are stdio children with no `PROFILE_URL` or
 * `SENTINEL_URL` set. So this walks the **artifact-passing** path — the student's
 * client carries `mentor.checkpoints/v1` from MCP-1 to MCP-2 and `mentor.verdict/v1`
 * from MCP-2 to MCP-3 by hand. That path is fully supported by design, and it is
 * exactly what a judge on a fresh clone gets, so it is the one worth gating on.
 * Each service is also asserted to *say* its peer is absent rather than implying the
 * work is being kept.
 *
 * ## What it still cannot tell you
 *
 * Every call here is made by this script, in the right order, by construction. The
 * thing that matters most about an MCP app is whether **a model** picks the right
 * tool from twenty-three descriptions across three servers, and no script can answer
 * that, because the script *is* the thing a model would have had to work out. This
 * exists so that when you do try it by hand, anything that breaks is a model problem
 * rather than a server problem.
 *
 * Non-destructive to the fixture: it reads the pricing fixture's genuine failing
 * output and never edits `pricing.js`. Fixing that bug is the student's job.
 */

import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { openFleet, ROOT, ANSWER, reporter, G, R, B, DIM } from './lib/fleet.mjs';

const report = reporter();
const check = report.check;
const turn = (n, said) => console.log(`\n${B(`Turn ${n}`)}  ${DIM(`"${said}"`)}`);

/** A handle, not a login — which is what `sign_in` says about itself. */
const HANDLE = 'walk-student';
const STUDENT = `handle:${HANDLE}`;

/** The plan Lumina's exporter produces for a left-to-right chain. */
const planWith = (labels) => {
  const id = (l) => 'n-' + String(l).replace(/ /g, '-');
  return {
    schema: 'lumina.plan/v1',
    name: 'Pricing service',
    planId: 'wf-walkthrough',
    nodes: labels.map((label, i) => ({
      id: id(label),
      type: 'component',
      label,
      position: { x: i * 260, y: 160 },
      data: { label, component: label, intent: '' },
    })),
    edges: labels.slice(1).map((label, i) => ({
      id: `e${i + 1}`,
      source: id(labels[i]),
      target: id(label),
      sourceHandle: 'output',
      targetHandle: 'input',
    })),
    order: labels.map(id),
    entry: [id(labels[0])],
    terminal: [id(labels[labels.length - 1])],
    cyclic: false,
    warnings: [],
  };
};

// The brief says to draw `cart API` as the boundary and not implement it. Doing that
// is what makes the "correctly unbuilt" reconciliation testable at all — a design
// that simply omits the boundary has nothing for MCP-2 to get wrong about it.
const MY_DESIGN = planWith(['cart API', 'validate', 'discount', 'tax', 'total']);
/** `receipt` is a real component of the pricing project, owned by frontend. */
const SOMEONE_ELSES_JOB = planWith(['cart API', 'validate', 'discount', 'tax', 'total', 'receipt']);

/**
 * The same four events, as the `mentor.build/v1` a client keeps for itself.
 *
 * Rebuilt from `HISTORY` rather than read back out of the verdict, because the
 * verdict lists gates in *spec* order and the whole claim being checked is about
 * *build* order — reconstructing from it would flatten the drift being looked for.
 */
const MY_HISTORY = {
  schema: 'mentor.build/v1',
  project: 'pricing',
  entry: 'build/pricing.js',
  tests: 'build/pricing.test.js',
  provenance: 'observed',
  steps: [],
  failure: { test: 'test 3 — 40% discount, 20% tax', file: 'build/pricing.test.js', line: 40, message: '80 !== 72' },
  warnings: [],
};

/** The order they actually built in: tax before discount. The whole demo. */
const ev = (over) => ({ schema: 'lumina.build_event/v1', source: 'walk', ...over });
const HISTORY = [
  ev({ kind: 'component_built', component: 'validate', file: 'build/pricing.js', line: 8, at: 'T+03m' }),
  ev({ kind: 'component_built', component: 'tax', file: 'build/pricing.js', line: 12, at: 'T+11m' }),
  ev({ kind: 'component_built', component: 'discount', file: 'build/pricing.js', line: 14, at: 'T+19m' }),
  ev({ kind: 'component_built', component: 'total', file: 'build/pricing.js', line: 17, at: 'T+24m' }),
];
MY_HISTORY.steps = HISTORY.map((e, i) => ({
  seq: i + 1,
  at: e.at,
  component: e.component,
  kind: 'implement',
  file: e.file,
  line: e.line,
  summary: `Built ${e.component}.`,
}));

const RAN_THE_TESTS = (outcome) =>
  ev({ kind: 'test_run', outcome, file: 'build/pricing.test.js', line: 40, at: outcome === 'fail' ? 'T+38m' : 'T+52m' });

/** The same history, plus the step where they actually ran the tests. */
const withTestRun = (build) => ({
  ...build,
  steps: [
    ...build.steps,
    {
      seq: build.steps.length + 1,
      at: 'T+38m',
      component: 'tests',
      kind: 'verify',
      file: 'build/pricing.test.js',
      line: 40,
      summary: 'Ran the tests — red.',
    },
  ],
});

/** The fixture's genuine failing output — not a string we made up. */
function realRedOutput() {
  const r = spawnSync(process.execPath, ['--test'], {
    cwd: join(ROOT, 'fixtures', 'pricing', 'build'),
    encoding: 'utf8',
  });
  return (r.stdout || '') + (r.stderr || '');
}

let fleet;
try {
  fleet = await openFleet({ local: true, clientName: 'walk' });
  for (const f of fleet.failures) check(false, `${f.where} started`, f.why);
  if (fleet.missing.length) {
    console.error(R(`\nNot built: ${fleet.missing.join(', ')}. Run: npm run build:all\n`));
    process.exit(1);
  }
  const call = fleet.call;

  // ── 1 ──────────────────────────────────────────────────────────────────────
  turn(1, 'I want to learn to build something real. Who am I here?');
  const me = await call('sign_in', { handle: HANDLE });
  check(me.you?.student === STUDENT, 'signed in against a stable identity', me.you?.student);
  check(me.you?.authenticated === false, 'and it says plainly that a handle is not a login');
  check(me.record_kept === false, 'no profile plane configured over stdio — reported, not implied');
  check(/Nothing is being kept/.test(me.what_that_means ?? ''), 'and says so in the words a student reads', me.what_that_means?.slice(0, 50));

  // ── 2 ──────────────────────────────────────────────────────────────────────
  turn(2, 'What have you got?');
  const roles = await call('list_roles', { handle: HANDLE });
  check(roles.coverage?.domains === 3, '3 product types', roles.product_types?.map((d) => d.domain).join(', '));
  check(
    roles.coverage?.seats > 0 && /\bseats?\b/.test(roles.honesty ?? ''),
    'says up front how many seats are actually playable',
    `${roles.coverage?.playableSeats}/${roles.coverage?.seats}`,
  );
  check((roles.roles ?? []).every((r) => 'you_have_played_this' in r), 'and asks the record what this student has already played');

  // ── 3 ──────────────────────────────────────────────────────────────────────
  turn(3, "I'll be a backend engineer. What would I actually be doing?");
  const offers = await call('projects_for_role', { role: 'backend', handle: HANDLE });
  const pricing = offers.projects?.find((p) => p.project === 'pricing');
  check(!!pricing, 'offers the pricing project', offers.projects?.map((p) => p.project).join(', '));
  check(!!pricing?.why_its_worth_your_afternoon, 'justifies why it is worth an afternoon');
  check(pricing?.your_seat?.components_you_would_own === 4, 'owns-count derived from the brief at call time', String(pricing?.your_seat?.components_you_would_own));
  check(
    (pricing?.every_component_in_the_system ?? []).length > 4,
    'and shows the whole system, including the parts that are NOT theirs',
    (pricing?.every_component_in_the_system ?? []).join(', '),
  );

  // ── 4 ──────────────────────────────────────────────────────────────────────
  turn(4, 'Pricing, then. What am I on the hook for?');
  const brief = await call('open_brief', { project: 'pricing', role: 'backend', handle: HANDLE });
  check(brief.you_own?.length === 4, 'owns 4', brief.you_own?.map((o) => o.component).join(', '));
  check(brief.given_to_you?.length === 2, 'given 2', brief.given_to_you?.map((g) => `${g.component} (${g.owned_by})`).join(', '));
  check(JSON.stringify(brief.not_yours) === JSON.stringify(['receipt']), 'not_yours = receipt');
  check(!JSON.stringify(brief).includes(ANSWER), 'the concept ANSWER is withheld with the assignment');

  // ── 5 ──────────────────────────────────────────────────────────────────────
  turn(5, 'Before I start — teach me the idea.');
  const setup = await call('open_lesson', { project: 'pricing', role: 'backend' });
  const choices = setup.awaiting?.choices ?? [];
  check(setup.panels?.length > 0 && choices.length >= 2, 'the setup panels come with a real choice', `${setup.panels?.length} panel(s), ${choices.length} choices`);
  check(/until a choice is made/.test(setup.withheld ?? ''), 'and the reveal is ABSENT, not behind a flag', setup.withheld);
  const made_up = await call('open_lesson', { project: 'pricing', role: 'backend', chose: 'the-third-one' });
  check(!!made_up.rejected, 'a made-up choice is refused rather than guessed at');
  const revealed = await call('open_lesson', { project: 'pricing', role: 'backend', chose: choices[0].id });
  check(revealed.panels?.length > 0, 'committing releases the discriminating case', `${revealed.panels?.length} panel(s)`);
  check(!JSON.stringify(revealed).includes(ANSWER), 'and even the reveal does not state the principle — they derive it');

  // ── 6 ──────────────────────────────────────────────────────────────────────
  turn(6, "Here's my design. Does it cover my job?");
  const mine = await call('check_scope', { project: 'pricing', role: 'backend', plan: MY_DESIGN });
  check(mine.in_scope === true && mine.coverage === 1, 'my slice exactly', mine.summary);
  const foreign = await call('check_scope', { project: 'pricing', role: 'backend', plan: SOMEONE_ELSES_JOB });
  check(foreign.in_scope === false, 'adding `receipt` breaks scope');
  check(JSON.stringify(foreign.out_of_scope) === JSON.stringify(['receipt']), 'and names it');
  check(/before you write code/.test(foreign.next ?? ''), 'says fix the design first — a drag now vs an afternoon later');

  // ── 7 ──────────────────────────────────────────────────────────────────────
  turn(7, 'OK, what are my steps?');
  const derived = await call('checkpoint_spec', { project: 'pricing', role: 'backend', plan: MY_DESIGN, handle: HANDLE });
  const spec = derived.spec;
  const implement = spec?.checkpoints?.filter((c) => c.kind === 'implement') ?? [];
  check(spec?.schema === 'mentor.checkpoints/v1', 'a versioned artifact, not a screen', `${derived.gates} gates`);
  check(
    JSON.stringify(implement.map((c) => c.subject)) === JSON.stringify(['validate', 'discount', 'tax', 'total']),
    'ordered by the plan the student drew',
  );
  check(/design covers your slice/.test(spec?.definition_of_done ?? ''), 'done-ness is more than a box count');
  check(derived.handed_off_to_sentinel === false, 'no SENTINEL_URL over stdio, so the spec comes back to be carried by hand');
  check(/pass it to MCP-2/.test(derived.bridge?.note ?? ''), 'and the response says exactly how to carry it', derived.bridge?.note?.slice(0, 60));
  check(!JSON.stringify(spec).includes(ANSWER), 'the spec crossing to MCP-2 carries the concept KEY and no answer');

  // ── 8 ──────────────────────────────────────────────────────────────────────
  turn(8, 'Watch me build. (validate, then tax, then discount, then total.)');
  const opened = await call('open_session', { spec, plan: MY_DESIGN, student: STUDENT });
  check(!!opened.session?.id, 'MCP-2 opened a session against MY spec', opened.session?.id);
  check(
    JSON.stringify(opened.watching?.given) === JSON.stringify(['cart API', 'payment gateway']),
    'and knows which boxes are somebody else\'s before it judges anything',
  );

  const streamed = await call('build_event', { session: opened.session.id, events: [...HISTORY, RAN_THE_TESTS('fail')] });
  check(streamed.accepted === 5 && streamed.rejected.length === 0, 'all five events accepted — blocking would delete the lesson');
  check(
    JSON.stringify(streamed.out_of_order) === JSON.stringify(['tax was reached before discount']),
    'tax flagged out of order, not refused',
    (streamed.out_of_order ?? []).join(),
  );
  const junkEvent = await call('build_event', { session: opened.session.id, events: [{ kind: 'vibes' }] });
  check(junkEvent.rejected?.[0]?.index === 0, 'a malformed event is rejected by index, and the session survives');

  // ── 9 ──────────────────────────────────────────────────────────────────────
  turn(9, 'My test 3 is failing — when did I go wrong?');
  const red = await call('build_verdict', { session: opened.session.id, student: STUDENT, finalise: true });
  check(red.status === 'escalated', 'escalated, with the drift report attached', red.status);
  check(red.verdict?.drift?.origin?.line === 12, 'names line 12 from MY history', `${red.verdict?.drift?.origin?.component} @ ${red.verdict?.drift?.origin?.file}:${red.verdict?.drift?.origin?.line}`);
  check(red.verdict?.provenance === 'observed', 'provenance observed — it watched, it did not take my word');
  check(red.verdict?.tests_green === false, 'and it saw the tests fail');
  check(
    JSON.stringify(red.expected_unbuilt) === JSON.stringify(['cart API']),
    'the boundary I drew is reconciled, never reported as missing work',
    (red.expected_unbuilt ?? []).join(', ') || '(none)',
  );
  check(
    (red.blocking ?? []).every((b) => !/cart API/i.test(b)),
    'and it is not on the blocking list either — that false accusation is the one that would cost trust',
  );
  check(red.filed_with_profile === false && red.bridge?.mode === 'absent', 'no PROFILE_URL, so the verdict comes back to be carried by hand');

  const drift = await call('explain_drift', { plan: MY_DESIGN, build: MY_HISTORY });
  check(drift.origin?.line === 12, 'explain_drift agrees, from the same four events', `${drift.origin?.component} @ ${drift.origin?.file}:${drift.origin?.line}`);
  // The trap in the manual walkthrough, and worth keeping as an assertion: attaching a
  // failure is not enough to *link* it. A student who never logged the test run sees
  // 0.87 and has no idea why, so the score has to say so itself.
  check(drift.confidence === 0.87, 'failure attached, but no step touches that file → 0.87', String(drift.confidence));
  check(
    /does not link to any recorded step/.test(drift.confidence_components?.failureLink?.reason ?? ''),
    'and the reason names precisely that, rather than leaving them to guess',
  );

  const complete = await call('explain_drift', { plan: MY_DESIGN, build: withTestRun(MY_HISTORY) });
  check(
    complete.confidence === 0.97,
    'log the test run too → 0.97, above the bundled fixture, because the evidence was observed',
    String(complete.confidence),
  );
  check(complete.origin?.line === 12, 'still line 12');

  turn(9.5, 'Just fix it for me.');
  const refusal = await call('withhold_fix', { asked_for: 'the corrected line' });
  check(refusal.refused === true, 'refuses');
  check((refusal.instead ?? []).length > 0, 'offers something to do instead of just saying no');
  check(!/subtotal\s*\*|taxable\s*\*/.test(JSON.stringify(refusal)), 'no code anywhere in the refusal');
  check(!/subtotal\s*\*|taxable\s*\*/.test(JSON.stringify(red)), 'and none in the verdict either');

  // ── 10 ─────────────────────────────────────────────────────────────────────
  turn(10, 'Can I have my flashcard? (tests genuinely red)');
  const filedRed = await call('record_verdict', { verdict: red.verdict, student: STUDENT });
  check(filedRed.recorded === true, 'MCP-3 files the verdict it was handed', `${filedRed.new_cards?.length ?? 0} new card(s)`);
  check(filedRed.attestation?.attested === false, 'and marks it unattested rather than implying it came from the verifier');

  const card = await call('flashcard', { project: 'pricing', role: 'backend', student: STUDENT, test_output: realRedOutput() });
  check(card.earned === false, "withheld — and this is the fixture's real output", `runner=${card.test_verdict?.runner} failures=${card.test_verdict?.failures}`);
  check(!('back' in card), 'the `back` FIELD IS ABSENT, not present-with-a-flag');
  check(!JSON.stringify(card).includes(ANSWER), 'the answer appears nowhere in the serialized payload');
  for (const junk of ['looks fine to me', 'all good, trust me', 'PASSED??', '']) {
    const j = await call('flashcard', { project: 'pricing', role: 'backend', student: STUDENT, test_output: junk });
    check(j.earned === false, `unrecognised output is not passing: ${JSON.stringify(junk).slice(0, 22)}`);
  }
  const forged = await call('flashcard', { project: 'pricing', role: 'backend', student: STUDENT, test_output: '# tests 3\n# pass 3\n# fail 0' });
  check(
    forged.earned === false && forged.blocking?.some((b) => /verifier last saw your tests failing/.test(b)),
    'green text alone does not release it — both readings have to agree',
    forged.blocking?.find((b) => /verifier/.test(b))?.slice(0, 60),
  );

  // ── 11 ─────────────────────────────────────────────────────────────────────
  turn(11, 'I fixed it myself. Tests are green.');
  await call('build_event', { session: opened.session.id, events: [RAN_THE_TESTS('pass')] });
  const green = await call('build_verdict', { session: opened.session.id, student: STUDENT, finalise: true });
  check(green.status === 'complete', 'complete', green.statement?.slice(0, 70));
  check(green.verdict?.tests_green === true, 'and the verifier saw it go green');
  check(/detour/.test(green.statement ?? ''), 'the statement credits the fix without erasing the drift');

  await call('record_verdict', { verdict: green.verdict, student: STUDENT });
  const earned = await call('flashcard', { project: 'pricing', role: 'backend', student: STUDENT, test_output: '# tests 3\n# pass 3\n# fail 0' });
  check(earned.earned === true, 'releases once BOTH readings are green');
  check(
    typeof earned.back === 'string' && earned.back.includes(ANSWER),
    'and the answer is the principle, released by the one service that holds it',
  );
  check(earned.earnedBy?.origin === 'build/pricing.js:12', 'cited against where THEY went wrong', earned.earnedBy?.origin);
  // `surfaced` is read off the *latest* verdict's failure, and by the time a card is
  // earned the student has fixed the failure — so it is null on every card that is
  // actually issued, and the card's own "surfaced at X but made at Y" line can never
  // fire in the normal flow. Recorded here rather than asserted away; the fix belongs
  // in MCP-3, which this stream does not own.
  check(
    earned.earnedBy?.surfaced === null,
    'KNOWN GAP: the card cannot say where the bug surfaced, because fixing it cleared the failure',
    String(earned.earnedBy?.surfaced),
  );
  check(!/subtotal\s*\*|taxable\s*\*/.test(JSON.stringify(earned)), 'the card is a principle, never the corrected line');

  const graded = await call('review_flashcard', { card_id: earned.id, grade: 'good', student: STUDENT });
  check(graded.graded === true && graded.card?.due_in_sessions >= 1, 'grading schedules it to come back', `due in ${graded.card?.due_in_sessions} session(s)`);
  const due = await call('due_cards', { student: STUDENT });
  check(due.answers_included === false, 'due_cards returns questions only');
  check(!JSON.stringify(due).includes(ANSWER), 'and no answer leaks through the review list');

  // ── 12 ─────────────────────────────────────────────────────────────────────
  turn(12, '(someone else, with no account, pokes the URL)');
  const stranger = await call('profile_status', {});
  check(stranger.you?.authenticated === false, 'an unauthenticated caller is admitted as anonymous, not rejected', stranger.you?.id);
  check(stranger.can_read_other_students === false, 'and cannot read other students');
  const klass = await call('class_progress', {});
  check(klass.refused === true, 'class_progress REFUSES them — the refusal is the point of having roles');

  // The pre-split REGISTRAR made anonymous stateless so one visitor's run could not
  // surface in the next one's session. MCP-3 made a different call: anonymous is a
  // real shared record, and the deployment says so. Measured rather than assumed,
  // because "your progress is private" is the single most damaging thing a learning
  // tool can say when it is not true.
  await call('note_role_choice', { project: 'pricing', role: 'backend' });
  const nextVisitor = await call('read_profile', {});
  const shared = nextVisitor.found === true && (nextVisitor.role_history ?? []).length > 0;
  check(
    !shared || /shared with every other anonymous caller/.test(stranger.how ?? ''),
    shared
      ? 'anonymous progress IS shared between callers — and the service says so up front'
      : 'anonymous progress is not persisted, so one visitor cannot leak into the next',
    shared ? 'one drawer, disclosed' : 'stateless',
  );
  check(!JSON.stringify(nextVisitor).includes(ANSWER), 'and a stranger reading the record still gets no answer');

  // ── report ─────────────────────────────────────────────────────────────────
  console.log(`\n${report.failures === 0 ? G('ALL CHECKS PASSED') : R(report.failures + ' CHECK(S) FAILED')}`);
  console.log(
    DIM(
      '\nThree apps, one loop, offline: no network, no key, no model. This proves the servers.\n' +
        'It does NOT prove a model picks these tools — run WALKTHROUGH.md by hand for that.',
    ),
  );
  process.exitCode = report.failures === 0 ? 0 : 1;
} catch (err) {
  console.error(R('\nTHREW: ') + (err instanceof Error ? err.stack ?? err.message : String(err)));
  process.exitCode = 1;
} finally {
  fleet?.close();
}
