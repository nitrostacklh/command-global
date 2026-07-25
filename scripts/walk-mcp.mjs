/**
 * Walk the student journey in `WALKTHROUGH.md` as real MCP calls, and assert every
 * beat.
 *
 *   npm run walk
 *
 * ## How this differs from the other two commands
 *
 * - `npm test` — unit tests, in-process. Fast, and blind to the MCP layer.
 * - `npm run probe` — prints the surface and one pass of the loop for a human to read.
 * - `npm run walk` — **asserts** the nine turns a student actually takes, over stdio,
 *   with the plan produced by Lumina's real exporter shape. Exits non-zero on any
 *   regression, so it is usable as a gate.
 *
 * ## What it still cannot tell you
 *
 * Every call here is made by this script, in the right order, by construction. The one
 * thing that matters most about an MCP app is whether **a model** picks the right tool
 * from ten descriptions — and no script can answer that, because the script *is* the
 * thing a model would have had to figure out. Run `WALKTHROUGH.md` by hand in a real
 * client for that. This exists so that when you do, anything that breaks is a model
 * problem rather than a server problem.
 *
 * Non-destructive: it reads the fixture's genuine failing output but never edits
 * `pricing.js`. Fixing the bug is the student's job, and it is step 9 of the manual doc.
 */

import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { existsSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const LAUNCHER = join(ROOT, 'scripts', 'start-mcp.mjs');

if (!existsSync(join(ROOT, 'sentinel', 'dist', 'index.js'))) {
  console.error('Not built. Run: npm run sentinel:build');
  process.exit(1);
}

// ── the plan Lumina's exporter produces for a left-to-right chain ──────────────
// Shape verified against a live POST to /api/export/plan, so this is what the Plan
// button really emits — handle names included.
const planWith = (labels) => ({
  schema: 'lumina.plan/v1',
  name: 'Pricing service',
  planId: 'wf-walkthrough',
  nodes: labels.map((label, i) => ({
    id: 'n-' + label.replace(/ /g, '-'),
    type: 'component',
    label,
    position: { x: i * 260, y: 160 },
    data: { label, component: label, intent: '' },
  })),
  edges: labels.slice(1).map((label, i) => ({
    id: 'e' + (i + 1),
    source: 'n-' + labels[i].replace(/ /g, '-'),
    target: 'n-' + label.replace(/ /g, '-'),
    sourceHandle: 'output',
    targetHandle: 'input',
  })),
  order: labels.map((l) => 'n-' + l.replace(/ /g, '-')),
  entry: ['n-' + labels[0].replace(/ /g, '-')],
  terminal: ['n-' + labels[labels.length - 1].replace(/ /g, '-')],
  cyclic: false,
  warnings: [],
});

const MY_DESIGN = planWith(['validate', 'discount', 'tax', 'total']);
// `receipt` is a real component of the pricing project, owned by frontend.
const WITH_SOMEONE_ELSES_JOB = planWith(['validate', 'discount', 'tax', 'total', 'receipt']);

/** The fixture's genuine failing output — not a string we made up. */
function realRedOutput() {
  const r = spawnSync(process.execPath, ['--test'], {
    cwd: join(ROOT, 'fixtures', 'pricing', 'build'),
    encoding: 'utf8',
  });
  return (r.stdout || '') + (r.stderr || '');
}

// ── transport ─────────────────────────────────────────────────────────────────
const srv = spawn(process.execPath, [LAUNCHER], { stdio: ['pipe', 'pipe', 'ignore'] });
const pending = new Map();
let id = 0;
let buf = '';
srv.stdout.on('data', (chunk) => {
  buf += chunk.toString();
  let nl;
  while ((nl = buf.indexOf('\n')) >= 0) {
    const line = buf.slice(0, nl).trim();
    buf = buf.slice(nl + 1);
    if (!line.startsWith('{')) continue;
    try {
      const msg = JSON.parse(line);
      const resolve = pending.get(msg.id);
      if (resolve) {
        pending.delete(msg.id);
        resolve(msg);
      }
    } catch {
      /* not a frame */
    }
  }
});
function rpc(method, params, notify = false) {
  const msg = { jsonrpc: '2.0', method, ...(params ? { params } : {}) };
  if (notify) {
    srv.stdin.write(JSON.stringify(msg) + '\n');
    return Promise.resolve();
  }
  msg.id = ++id;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timeout: ${method}`)), 60_000);
    pending.set(msg.id, (m) => {
      clearTimeout(timer);
      resolve(m);
    });
    srv.stdin.write(JSON.stringify(msg) + '\n');
  });
}
async function call(name, args) {
  const res = await rpc('tools/call', { name, arguments: args });
  const text = res.result?.content?.find((c) => c.type === 'text')?.text;
  if (!text) throw new Error(`${name}: no text content`);
  return JSON.parse(text);
}

const G = (s) => '\x1b[32m' + s + '\x1b[0m';
const R = (s) => '\x1b[31m' + s + '\x1b[0m';
let failures = 0;
function check(ok, label, extra = '') {
  if (!ok) failures++;
  console.log(`  ${ok ? G('PASS') : R('FAIL')}  ${label}${extra ? '  — ' + extra : ''}`);
}
const turn = (n, said) => console.log(`\n\x1b[1mTurn ${n}\x1b[0m  "${said}"`);

/** The flashcard's back. If this string ever escapes early, the product is broken. */
const ANSWER = 'Tax is charged on what the customer actually pays';

try {
  await rpc('initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'walk', version: '1' },
  });
  await rpc('notifications/initialized', undefined, true);

  turn(1, 'I want to learn to build something real. What have you got?');
  const domains = await call('browse_catalog', {});
  check(domains.domains?.length === 3, '3 product types', domains.domains?.map((d) => d.domain).join(', '));
  check(/\d+ of \d+ roles/.test(domains.honesty ?? ''), 'says up front how many roles are playable');

  turn(2, 'The web service one. What would I actually be doing?');
  const ws = await call('browse_catalog', { domain: 'web-service' });
  const project = ws.projects[0];
  const backend = project.roles.find((r) => r.role === 'backend');
  check(project.project === 'pricing', 'offers the pricing project');
  check(!!project.why_its_worth_your_afternoon, 'justifies why it is worth an afternoon');
  check(backend?.owns_count === 4, 'owns_count derived from the brief at call time', String(backend?.owns_count));

  turn(3, "I'll be the backend engineer.");
  const brief = await call('open_brief', { project: 'pricing', role: 'backend' });
  check(brief.you_own?.length === 4, 'owns 4', brief.you_own?.map((o) => o.component).join(', '));
  check(brief.given_to_you?.length === 2, 'given 2', brief.given_to_you?.map((g) => `${g.component} (${g.owned_by})`).join(', '));
  check(JSON.stringify(brief.not_yours) === JSON.stringify(['receipt']), 'not_yours = receipt');
  check(!JSON.stringify(brief).includes(ANSWER), 'the concept ANSWER is withheld with the assignment');

  turn(4, "Here's my design. Does it cover my job?");
  const mine = await call('check_scope', { project: 'pricing', role: 'backend', plan: MY_DESIGN });
  check(mine.in_scope === true && mine.coverage === 1, 'my slice exactly', mine.summary);
  const foreign = await call('check_scope', { project: 'pricing', role: 'backend', plan: WITH_SOMEONE_ELSES_JOB });
  check(foreign.in_scope === false, 'adding `receipt` breaks scope');
  check(JSON.stringify(foreign.out_of_scope) === JSON.stringify(['receipt']), 'and names it');
  check(/before you write code/.test(foreign.next ?? ''), 'says fix the design first — a drag now vs an afternoon later');

  turn(5, 'OK, what are my steps?');
  const cps = await call('checkpoints', { project: 'pricing', role: 'backend', plan: MY_DESIGN });
  const implement = cps.checkpoints.filter((c) => c.kind === 'implement');
  check(cps.checkpoints.length === 7, '7 checkpoints', `${implement.length} implement + ${cps.checkpoints.length - implement.length} verify`);
  check(
    JSON.stringify(implement.map((c) => c.subject)) === JSON.stringify(['validate', 'discount', 'tax', 'total']),
    'ordered by the plan the student drew',
  );
  check(/design covers your slice/.test(cps.definition_of_done ?? ''), 'done-ness is more than a box count');
  const idOf = (subject) => cps.checkpoints.find((c) => c.subject === subject)?.id;

  turn(6, 'I did validate line 8, then tax line 12, then discount line 14, then total line 17.');
  const progress = await call('record_progress', {
    project: 'pricing',
    role: 'backend',
    plan: MY_DESIGN,
    reached: [
      { checkpoint: idOf('validate'), file: 'build/pricing.js', line: 8, at: 'T+03m' },
      { checkpoint: idOf('tax'), file: 'build/pricing.js', line: 12, at: 'T+11m' },
      { checkpoint: idOf('discount'), file: 'build/pricing.js', line: 14, at: 'T+19m' },
      { checkpoint: idOf('total'), file: 'build/pricing.js', line: 17, at: 'T+24m' },
    ],
  });
  check(progress.accepted?.length === 4, 'all four accepted — blocking would delete the lesson');
  check(progress.out_of_order?.[0]?.checkpoint === idOf('tax'), 'tax flagged out of order, not refused');
  check(progress.build_history?.provenance === 'observed', 'provenance observed');
  check(
    JSON.stringify(progress.build_history.steps.map((s) => s.line)) === JSON.stringify([8, 12, 14, 17]),
    'no line number invented that the student did not give',
  );

  turn(7, 'My test 3 is failing — when did I go wrong?');
  const bare = await call('explain_drift', { plan: MY_DESIGN, build: progress.build_history });
  check(bare.origin?.line === 12, 'names line 12 from MY history', `${bare.origin?.component} @ ${bare.origin?.file}:${bare.origin?.line}`);
  check(bare.confidence_components.provenance.score === 0.8, 'used my history, not the bundled demo');
  check(/no failure was reported/.test(bare.caveats.join(' ')), 'volunteers that no failure was reported yet');

  // Attaching a failure is not enough to *link* it — failureLink needs a recorded
  // step in that file. This is the trap in the manual walkthrough: a student who
  // never logged the test run sees 0.87 and wonders why.
  const attached = await call('explain_drift', {
    plan: MY_DESIGN,
    build: { ...progress.build_history, failure: { test: 'test 3', file: 'build/pricing.test.js', line: 40, message: '80 !== 72' } },
  });
  check(attached.confidence === 0.87, 'failure attached, but no step touches that file → 0.87', String(attached.confidence));
  check(/does not link to any recorded step/.test(attached.confidence_components.failureLink.reason), 'and the reason says precisely that');

  // What a student actually does: they ran the tests. That is how they know.
  const ran = await call('record_progress', {
    project: 'pricing',
    role: 'backend',
    plan: MY_DESIGN,
    log: progress.log,
    reached: [{ checkpoint: idOf('a1'), file: 'build/pricing.test.js', line: 40, at: 'T+38m', outcome: 'fail' }],
  });
  check(ran.accepted.length === 0, 'a failed criterion is recorded but is not an accomplishment');
  const full = await call('explain_drift', {
    plan: MY_DESIGN,
    build: { ...ran.build_history, failure: { test: 'test 3', file: 'build/pricing.test.js', line: 40, message: '80 !== 72' } },
    symptom: 'test 3 fails: 80 instead of 72',
  });
  check(full.confidence === 0.97, 'log the test run too → 0.97, above the authored fixture', String(full.confidence));
  check(full.origin?.line === 12, 'still line 12');
  check(full.fix_withheld === true, 'fix_withheld');

  turn(8, 'Just fix it for me.');
  const refusal = await call('withhold_fix', { asked_for: 'the corrected line' });
  check(refusal.refused === true, 'refuses');
  check((refusal.instead ?? []).length > 0, 'offers something to do instead of just saying no');
  check(!/subtotal\s*\*|taxable\s*\*/.test(JSON.stringify(refusal)), 'no code anywhere in the refusal');

  turn(9, 'Can I have my flashcard? (tests genuinely red)');
  const red = await call('flashcard', { project: 'pricing', role: 'backend', test_output: realRedOutput() });
  check(red.earned === false, 'withheld — and this is the fixture\'s real output', `runner=${red.test_verdict?.runner} failures=${red.test_verdict?.failures}`);
  check(!('back' in red), 'the `back` FIELD IS ABSENT, not present-with-a-flag');
  check(!JSON.stringify(red).includes(ANSWER), 'the answer appears nowhere in the serialized payload');
  for (const junk of ['looks fine to me', 'all good, trust me', 'PASSED??', '']) {
    const j = await call('flashcard', { project: 'pricing', role: 'backend', test_output: junk });
    check(j.earned === false, `unrecognised output is not passing: ${JSON.stringify(junk).slice(0, 22)}`);
  }
  // The release path. Format is node:test's own; step 9 of WALKTHROUGH.md has you
  // produce this for real by fixing the bug yourself.
  const green = await call('flashcard', {
    project: 'pricing',
    role: 'backend',
    test_output: '# tests 3\n# pass 3\n# fail 0',
  });
  check(green.earned === true, 'releases once the tests pass');
  check(typeof green.back === 'string' && green.back.length > 0, 'back is present only now');
  check(green.earnedBy?.origin === 'build/pricing.js:12', 'cites where they went wrong', green.earnedBy?.origin);

  const done = await call('is_it_done', { project: 'pricing', role: 'backend', plan: MY_DESIGN, log: ran.log });
  check(done.done === false, 'not done — the criteria are not verified', `${done.blocking.length} blocking`);
  check(/failing:/.test(done.blocking.join(' ')), 'distinguishes "ran it and it failed" from "not run yet"');
  const nothing = await call('is_it_done', { project: 'pricing', role: 'backend', plan: MY_DESIGN });
  check(nothing.done === false && nothing.blocking.length === 7, 'no log at all → 7 blocking, never a green "finished"');

  console.log(`\n${failures === 0 ? G('ALL CHECKS PASSED') : R(failures + ' CHECK(S) FAILED')}`);
  console.log(
    '\nThis proves the server. It does NOT prove a model picks these tools — run\n' +
      'WALKTHROUGH.md by hand in a real client for that.',
  );
  process.exitCode = failures === 0 ? 0 : 1;
} catch (err) {
  console.error(R('THREW: ') + (err instanceof Error ? err.message : String(err)));
  process.exitCode = 1;
} finally {
  srv.kill();
}
