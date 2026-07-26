/**
 * Verify the DEPLOYED fleet — all three services, and the invariant that spans them.
 *
 *   npm run verify:live -- <url> <url> <url>        (any order)
 *
 * "Deployed" and "deployed and working" are different claims. A green NitroCloud page
 * means three containers started. It does not mean the tool surfaces survived the
 * trip, that the right app landed at the right URL, that the bundled fixtures made it
 * into the images, that the three can reach each other — or that MCP-1 and MCP-2 are
 * still free of the one string MCP-3 exists to gate.
 *
 * ## Why this had to be rewritten rather than have its tool list updated
 *
 * The previous version drove **one** URL and called `explain_drift`, `browse_catalog`,
 * `open_brief`, `flashcard`, `whoami`, `class_progress` and `record_progress` against
 * it. After the three-way split those tools live in three different processes and two
 * of them no longer exist at all, so no single service could pass it and no edit to
 * its `EXPECTED_TOOLS` constant could fix that. Every assertion it made is kept below;
 * each one is now routed to the app that owns the tool, resolved from what each
 * service says it is rather than from the order the URLs were passed in.
 *
 * The assertions that span two apps are the point of the exercise. "A brief from MCP-1
 * carries no answer" is only interesting alongside "MCP-3 hands that exact answer over
 * when it is earned" — together they show the split is load-bearing rather than
 * filing. Neither half proves anything alone.
 *
 * ## What it does NOT do
 *
 * It never writes under the shared `anonymous` identity. Everything that records
 * anything is filed under a synthetic handle, because a verification run that
 * pollutes the demo record is a verification run that breaks the demo. The local
 * equivalent — `npm run walk` — does probe the anonymous path, because there the
 * services are disposable.
 */

import { openFleet, APPS, APP_NAMES, ANSWER, WRITER, reporter, G, R, B, DIM } from './lib/fleet.mjs';

const urls = process.argv.slice(2).filter((a) => !a.startsWith('--'));
if (urls.length === 0) {
  console.error('Usage: npm run verify:live -- <url> <url> <url>   (any order)');
  console.error('       The three service URLs are in DEPLOY.md §5b.');
  process.exit(1);
}

/**
 * The surface each app must serve — written out rather than derived, on purpose.
 *
 * Comparing the deployed list against the local build would only prove the two agree.
 * Naming them here asserts *intent*, so a module registered by accident — the Gap 11
 * failure — shows up as an extra rather than being mirrored into the expectation and
 * hidden.
 */
const EXPECTED = {
  'mentor-roster': [
    'sign_in', 'list_roles', 'projects_for_role', 'open_brief',
    'open_lesson', 'roster_status', 'check_scope', 'checkpoint_spec',
  ],
  mentor: [
    'open_session', 'build_event', 'build_verdict',
    'explain_drift', 'withhold_fix', 'mentor_status',
  ],
  'mentor-profile': [
    'open_profile', 'read_profile', 'note_role_choice', 'record_verdict',
    'class_progress', 'profile_status', 'flashcard', 'review_flashcard', 'due_cards',
  ],
};

/** Never `anonymous` — see the header. */
const STUDENT = 'handle:verify-live';

/**
 * A student's design, in the shape Lumina's exporter really produces.
 *
 * Supplied rather than reconstructed from what MCP-1 has bundled, for one concrete
 * reason: `plan_digest` ties a checkpoint spec to the exact ordering claim it was
 * derived from, and MCP-2 refuses a spec and plan that disagree. Passing the same
 * document to `checkpoint_spec` and `build_verdict` makes them agree by construction
 * instead of by luck — and it is the path a real student takes anyway, since their
 * plan comes off their own canvas.
 */
function planWith(labels) {
  const id = (l) => 'n-' + String(l).replace(/ /g, '-');
  return {
    schema: 'lumina.plan/v1',
    name: 'Pricing service',
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
}

const MY_DESIGN = planWith(['validate', 'discount', 'tax', 'total']);
/** `receipt` is a real component of the pricing project, owned by frontend. */
const SOMEONE_ELSES_JOB = planWith(['validate', 'discount', 'tax', 'total', 'receipt']);

// Bound, not destructured: `failures` is a getter, and spreading would freeze it at 0.
const report = reporter();
const check = report.check;
const fails = () => report.failures;

const section = (title) => console.log(`\n${B(title)}`);

/**
 * Run one section, turning a throw into a failed check rather than an exit.
 *
 * A half-deployed fleet is the normal reason to run this, and a version that aborted
 * on the first missing tool would print one line where the useful output is the whole
 * list of what is wrong. Every section still reports; the exit code is the sum.
 */
async function part(title, body) {
  section(title);
  try {
    await body();
  } catch (err) {
    check(
      false,
      `${title} — this section could not complete`,
      err instanceof Error ? err.message.split('\n')[0] : String(err),
    );
  }
}

let fleet;
try {
  console.log(`\n${B('Verifying the MENTOR fleet')}  ${DIM(`${urls.length} URL(s)`)}\n`);
  fleet = await openFleet({ urls, clientName: 'verify-live' });

  // ── ① three services, each the one it claims to be ─────────────────────────
  section('The fleet');
  for (const f of fleet.failures) check(false, `service reachable over MCP`, `${f.where} — ${f.why}`);
  for (const d of fleet.duplicates) {
    check(false, 'each app is deployed exactly once', `${d.name} served by ${d.first} AND ${d.second}`);
  }
  for (const name of APP_NAMES) {
    const svc = fleet.on(name);
    check(!!svc, `${APPS[name].label} ${name} is deployed`, svc ? `${svc.where} · ${svc.version}` : 'not among the URLs given');
  }
  const unknown = [...fleet.services.values()].filter((s) => !s.known);
  check(unknown.length === 0, 'nothing unrecognised answered', unknown.map((s) => `${s.name} @ ${s.where}`).join(', '));

  if (fleet.missing.length === APP_NAMES.length) {
    console.log(R('\nNothing answered. Check the URLs.\n'));
    process.exit(1);
  }

  // ── ② each surface, and only its own ───────────────────────────────────────
  section('Tool surfaces');
  for (const [name, want] of Object.entries(EXPECTED)) {
    const svc = fleet.on(name);
    if (!svc) continue;
    const missing = want.filter((t) => !svc.tools.includes(t));
    const extra = svc.tools.filter((t) => !want.includes(t));
    console.log(`  ${DIM(`${APPS[name].label} · ${APPS[name].role}`)}`);
    check(missing.length === 0, `all ${want.length} of ${name}'s tools present`, missing.join(', '));
    // Extras are the Gap 11 failure: a surface drifting back toward the pre-split
    // single server, or an app serving a verb that is another app's job.
    check(extra.length === 0, `${name} serves nothing belonging to another app`, extra.join(', '));
  }

  const writers = fleet.allTools().filter((t) => WRITER.test(t));
  check(writers.length === 0, "no tool ANYWHERE in the fleet can modify a student's build", writers.join(', '));

  const sentinel = fleet.on('mentor');
  if (sentinel) {
    check(
      sentinel.resources.some((u) => u.includes('causal-timeline')),
      'causal-timeline widget is served by MCP-2',
      sentinel.resources.join(' '),
    );
  }
  // Its example payload contained the patch MENTOR exists to withhold, one layer
  // below the tool surface. It must not be back, on any of the three.
  const missionTrace = [...fleet.services.values()].filter((s) => s.resources.some((u) => u.includes('mission-trace')));
  check(missionTrace.length === 0, 'mission-trace is served by NOBODY (it leaked the fix)', missionTrace.map((s) => s.name).join(', '));

  // ── ③ the peers — the check that tells three services from one product ─────
  //
  // Every other check here passes on a completely disconnected fleet, because a
  // missing peer is a *supported* state rather than a crash. This is the only
  // question that distinguishes the two.
  await part('The bridges', async () => {
  if (fleet.on('mentor-roster')) {
    const status = await fleet.call('roster_status', {});
    const profile = status.peers?.profile ?? {};
    const sent = status.peers?.sentinel ?? {};
    check(profile.configured === true, 'MCP-1 has PROFILE_URL set', profile.url ?? '(unset)');
    check(profile.reachable === true, 'MCP-1 can actually reach MCP-3', profile.note ?? '');
    check(sent.configured === true, 'MCP-1 has SENTINEL_URL set', sent.url ?? '(unset)');
  }
  if (fleet.on('mentor-profile')) {
    const status = await fleet.call('profile_status', {});
    check(
      typeof status.storage?.durable === 'boolean' && !!status.storage?.why_this_backend,
      'MCP-3 reports storage durability rather than assuming it',
      `${status.storage?.backend}, durable=${status.storage?.durable}`,
    );
    check(
      status.answers_live_only_here?.includes('Neither has ever held an answer'),
      'MCP-3 states out loud that it is the only holder of an answer',
    );
  }
  });

  // ── ④ MCP-1 — the journey, and the bundled fixtures that make it demoable ──
  await part('MCP-1 · the assignment', async () => {
  if (fleet.on('mentor-roster')) {
    const roles = await fleet.call('list_roles', {});
    check(roles.coverage?.domains === 3, 'catalog bundled and travelled inside the image', `${roles.coverage?.domains} product types, ${roles.coverage?.seats} seats`);
    check(
      /\bseats?\b/.test(roles.honesty ?? '') && roles.coverage?.playableSeats >= 1,
      'says up front how many seats are actually playable',
      `${roles.coverage?.playableSeats}/${roles.coverage?.seats} playable`,
    );

    // The catalog is asked a different question per role, not filtered. Two roles,
    // two different project lists, is the cheapest proof of that.
    const backend = await fleet.call('projects_for_role', { role: 'backend' });
    const cv = await fleet.call('projects_for_role', { role: 'cv' });
    check(backend.projects?.[0]?.project === 'pricing', 'backend is offered the pricing project');
    check(
      JSON.stringify(backend.projects?.map((p) => p.project)) !== JSON.stringify(cv.projects?.map((p) => p.project)),
      'the project list is derived from the role, not a static catalog',
      `backend: ${backend.projects?.map((p) => p.project).join()} · cv: ${cv.projects?.map((p) => p.project).join()}`,
    );

    const brief = await fleet.call('open_brief', { project: 'pricing', role: 'backend', handle: 'verify-live' });
    check(
      brief.you_own?.length === 4 && brief.not_yours?.length === 1,
      'role-scoped brief bundled',
      `owns ${brief.you_own?.map((o) => o.component).join()} · not yours ${brief.not_yours?.join()}`,
    );
    check(brief.given_to_you?.length === 2, 'and names the interfaces other people hand them');

    // ⭐ The cross-app invariant, half one. See the header.
    check(!JSON.stringify(brief).includes(ANSWER), 'the concept answer is NOT in the assignment MCP-1 serves');
    check(
      /not held by this service/.test(brief.concept_you_are_here_to_learn?.answer ?? ''),
      'and MCP-1 says where it does live, rather than showing a withheld flag next to it',
    );

    // The lesson withholds its reveal the same way the flashcard withholds its answer:
    // the panels are absent, not present behind a flag.
    const lesson = await fleet.call('open_lesson', { project: 'pricing', role: 'backend' });
    check(Array.isArray(lesson.panels) && lesson.panels.length > 0, 'open_lesson serves the setup panels', `${lesson.panels?.length} panel(s)`);
    check(/panel\(s\), until a choice is made/.test(lesson.withheld ?? ''), 'and WITHHOLDS the reveal until the student commits', lesson.withheld);
    check((lesson.awaiting?.choices ?? []).length >= 2, 'offering a real choice to commit to');
    const guessed = await fleet.call('open_lesson', { project: 'pricing', role: 'backend', chose: 'whichever' });
    check(!!guessed.rejected, 'a made-up choice is refused rather than accepted', guessed.rejected ?? '(accepted!)');

    // Scope drift — a different failure from the ordering drift MCP-2 finds, and the
    // one that proves the brief's `not_yours` list is machine-readable rather than prose.
    const mine = await fleet.call('check_scope', { project: 'pricing', role: 'backend', plan: MY_DESIGN });
    check(mine.in_scope === true && mine.coverage === 1, 'check_scope: my four boxes are exactly my slice', mine.summary);
    const foreign = await fleet.call('check_scope', { project: 'pricing', role: 'backend', plan: SOMEONE_ELSES_JOB });
    check(
      foreign.in_scope === false && JSON.stringify(foreign.out_of_scope) === JSON.stringify(['receipt']),
      "check_scope: drawing someone else's component is caught, and named",
      (foreign.out_of_scope ?? []).join(),
    );
  }
  });

  // ── ⑤ MCP-2 — the drift claim, and the verdict it files ────────────────────
  await part('MCP-2 · the drift and the verdict', async () => {
  if (sentinel) {
    // The argument-free demo. This is the check that catches a deploy which built
    // fine and has nothing to talk about.
    const drift = await fleet.call('explain_drift', {});
    check(
      drift.origin?.file === 'build/pricing.js' && drift.origin?.line === 12,
      'explain_drift names the origin from the bundled demo',
      `${drift.origin?.component} @ ${drift.origin?.file}:${drift.origin?.line}`,
    );
    check(drift.confidence === 0.91, 'confidence 0.91, computed not hardcoded', String(drift.confidence));
    check(drift.fix_withheld === true, 'fix_withheld');
    check(
      !/subtotal\s*\*|taxable\s*\*/.test(JSON.stringify(drift)),
      'and the corrected line appears nowhere in the payload',
    );

    const refusal = await fleet.call('withhold_fix', { asked_for: 'the corrected line' });
    check(refusal.refused === true, 'withhold_fix refuses');
    check((refusal.instead ?? []).length > 0, 'and offers something to do instead of just saying no');

    // The verify loop, end to end and stateless — the path a client takes when it
    // holds its own history. Needs MCP-1's spec, so it is also a live bridge test.
    if (fleet.on('mentor-roster')) {
      const derived = await fleet.call('checkpoint_spec', {
        project: 'pricing',
        role: 'backend',
        plan: MY_DESIGN,
        handle: 'verify-live',
        hand_off: false,
      });
      check(derived.spec?.schema === 'mentor.checkpoints/v1', 'MCP-1 mints a checkpoint spec', `${derived.gates} gates`);
      check(
        JSON.stringify(derived.spec?.checkpoints?.filter((c) => c.kind === 'implement').map((c) => c.subject)) ===
          JSON.stringify(['validate', 'discount', 'tax', 'total']),
        'and sequences the gates by the order the STUDENT drew, not ours',
      );
      check(!JSON.stringify(derived.spec).includes(ANSWER), 'the spec crossing the bridge carries no answer');

      const plan = MY_DESIGN;
      if (derived.spec) {
        const events = [
          { kind: 'component_built', component: 'validate', file: 'build/pricing.js', line: 8, at: 'T+03m', source: 'verify-live' },
          { kind: 'component_built', component: 'tax', file: 'build/pricing.js', line: 12, at: 'T+11m', source: 'verify-live' },
          { kind: 'component_built', component: 'discount', file: 'build/pricing.js', line: 14, at: 'T+19m', source: 'verify-live' },
          { kind: 'component_built', component: 'total', file: 'build/pricing.js', line: 17, at: 'T+24m', source: 'verify-live' },
          { kind: 'test_run', outcome: 'fail', file: 'build/pricing.test.js', line: 40, at: 'T+38m', source: 'verify-live' },
        ];
        const verdict = await fleet.call('build_verdict', {
          spec: derived.spec,
          plan,
          events,
          student: STUDENT,
          finalise: true,
          hand_off: false,
        });
        check(verdict.status === 'escalated', 'a drifted build escalates rather than completing', verdict.status);
        check(
          verdict.verdict?.drift?.origin?.line === 12,
          'and the verdict names line 12 from a history it WITNESSED, not the bundled one',
          `${verdict.verdict?.drift?.origin?.component} @ ${verdict.verdict?.drift?.origin?.file}:${verdict.verdict?.drift?.origin?.line}`,
        );
        check(verdict.verdict?.provenance === 'observed', 'provenance observed — the evidence was seen, not remembered');
        check(verdict.fix_withheld === true, 'the verdict withholds the fix too');
        check(!JSON.stringify(verdict).includes(ANSWER), 'and carries no answer across the bridge to MCP-3');
        // Checked against the spec rather than against a key written down here. The
        // concept key is a fixture detail the code owns; copying it into this file
        // would make the script assert its own copy — the exact drift Gap 15 is about.
        const specKey = derived.spec?.concept?.key;
        const verdictConcept = verdict.verdict?.concept ?? {};
        check(
          !!specKey && verdictConcept.key === specKey && !('answer' in verdictConcept),
          'the verdict carries MCP-1\'s concept KEY and no answer field at all',
          `${verdictConcept.key} · fields ${Object.keys(verdictConcept).join()}`,
        );
      }
    }
  }
  });

  // ── ⑥ MCP-3 — the boundary, checked as an unauthenticated caller ───────────
  //
  // This script never presents a token, which is exactly the interesting case: it is
  // the position anyone who finds the URL is in.
  await part('MCP-3 · the record, and the gate', async () => {
  if (fleet.on('mentor-profile')) {
    const me = await fleet.call('profile_status', {});
    check(me.you?.authenticated === false, 'an unauthenticated caller is admitted as anonymous, not rejected', `${me.you?.id} / ${me.you?.role}`);
    check(me.can_read_other_students === false, 'anonymous cannot read other students');
    check(
      /shared with every other anonymous caller/.test(me.how ?? ''),
      'and is TOLD their record is shared rather than private',
      (me.how ?? '').slice(0, 70),
    );

    const klass = await fleet.call('class_progress', {});
    check(klass.refused === true, 'class_progress REFUSES an anonymous caller — the boundary holds live', klass.refused ? '' : JSON.stringify(klass).slice(0, 120));

    // ⭐ The gate, both ways. Red first.
    const red = await fleet.call('flashcard', {
      project: 'pricing',
      role: 'backend',
      student: STUDENT,
      test_output: '# tests 3\n# pass 2\n# fail 1',
    });
    check(red.earned === false && !('back' in red), 'flashcard withholds, and the `back` field is ABSENT not flagged');
    check(!JSON.stringify(red).includes(ANSWER), 'the answer appears nowhere in the withheld payload');
    check(red.test_verdict?.runner === 'node:test', 'it read the real runner output', red.test_verdict?.evidence);

    for (const junk of ['looks fine to me', 'all good, trust me', 'PASSED??']) {
      const j = await fleet.call('flashcard', { project: 'pricing', role: 'backend', student: STUDENT, test_output: junk });
      check(j.earned === false, `unrecognised output is not treated as passing: ${JSON.stringify(junk).slice(0, 20)}`);
    }

    // Green output alone must NOT be enough — the verifier has to agree.
    const greenOnly = await fleet.call('flashcard', {
      project: 'pricing',
      role: 'backend',
      student: `${STUDENT}-nobody`,
      test_output: '# tests 3\n# pass 3\n# fail 0',
    });
    check(
      greenOnly.earned === false && greenOnly.blocking?.some((b) => /verifier has not filed/.test(b)),
      'green text alone does not release it — MCP-2 has to have filed a verdict',
      greenOnly.blocking?.[0]?.slice(0, 60),
    );
  }
  });

  // ── ⑦ the invariant the whole architecture exists to create ────────────────
  section('The split');
  const holders = [];
  for (const svc of fleet.services.values()) {
    if (JSON.stringify(svc.toolSpecs).includes(ANSWER)) holders.push(`${svc.name} (tool surface)`);
  }
  check(holders.length === 0, 'no flashcard answer in any tool description, on any service', holders.join(', '));
  console.log(
    DIM(
      '\n  The answer string was searched for in every payload above. MCP-1 serves the assignment\n' +
        '  and the lesson, MCP-2 serves the drift and the verdict, and neither contains it — not\n' +
        '  because it is filtered, but because it is not in those processes.',
    ),
  );

  // ── report ────────────────────────────────────────────────────────────────
  console.log(`\n${fails() === 0 ? G('FLEET VERIFIED') : R(fails() + ' CHECK(S) FAILED')}`);
  if (fails() === 0) {
    console.log('\nThree services, each serving its own surface, wired to each other, and no answer');
    console.log('in a process that should not have one.');
  } else {
    console.log(DIM('\nA tool count that is short usually means the build step did not run in the cloud.'));
    console.log(DIM('An unset peer means the env vars were never set on that service — see DEPLOY.md §5c.'));
  }
  process.exitCode = fails() === 0 ? 0 : 1;
} catch (err) {
  console.error(R('\nTHREW: ') + (err instanceof Error ? err.message : String(err)));
  process.exitCode = 1;
} finally {
  fleet?.close();
}
