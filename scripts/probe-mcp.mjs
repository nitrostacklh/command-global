/**
 * Print MENTOR's entire MCP surface, so you can eyeball it without hand-writing
 * JSON-RPC. Talks to the BUILT server over stdio — the same artifact NitroCloud
 * runs — so what you see here is what a client sees.
 *
 *   npm run probe            # the whole surface + explain_drift on the fixture
 *   npm run probe -- --json  # raw JSON, for diffing between runs
 *
 * Build first (`npm run sentinel:build`); this deliberately does not build for
 * you, so you are always probing the artifact you think you are.
 */

import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { existsSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SENTINEL = join(ROOT, 'sentinel');
const ENTRY = join(SENTINEL, 'dist', 'index.js');
const RAW = process.argv.includes('--json');

if (!existsSync(ENTRY)) {
  console.error('No build found at sentinel/dist/index.js — run `npm run sentinel:build` first.');
  process.exit(1);
}

const srv = spawn(process.execPath, [ENTRY], { cwd: SENTINEL, stdio: ['pipe', 'pipe', 'ignore'] });
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
      /* not a JSON-RPC frame */
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

const h = (s) => console.log('\n\x1b[1m' + s + '\x1b[0m');
const ok = (s) => '\x1b[32m' + s + '\x1b[0m';

try {
  const init = await rpc('initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'probe', version: '1' },
  });
  await rpc('notifications/initialized', undefined, true);

  const [tools, prompts, resources] = await Promise.all([
    rpc('tools/list', {}),
    rpc('prompts/list', {}),
    rpc('resources/list', {}),
  ]);
  const drift = await rpc('tools/call', { name: 'explain_drift', arguments: {} });
  const payload = JSON.parse(drift.result.content.find((c) => c.type === 'text').text);

  if (RAW) {
    console.log(JSON.stringify({
      serverInfo: init.result.serverInfo,
      tools: tools.result.tools.map((t) => t.name),
      prompts: prompts.result?.prompts?.map((p) => p.name) ?? [],
      resources: resources.result.resources.map((r) => r.uri),
      explain_drift: payload,
    }, null, 2));
  } else {
    h('server');
    console.log(`  ${init.result.serverInfo.name} ${init.result.serverInfo.version}`);

    h(`tools (${tools.result.tools.length})`);
    for (const t of tools.result.tools) {
      console.log(`  ${ok(t.name)}`);
      console.log(`    ${t.description.slice(0, 110)}${t.description.length > 110 ? '…' : ''}`);
    }

    h(`prompts (${prompts.result?.prompts?.length ?? 0})`);
    for (const p of prompts.result?.prompts ?? []) console.log(`  ${ok(p.name)}`);

    h(`resources (${resources.result.resources.length})`);
    for (const r of resources.result.resources) console.log(`  ${ok(r.uri)}`);

    const d = payload.drift ?? payload;
    h('explain_drift (bundled fixture, no arguments)');
    console.log(`  origin      ${ok(d.origin.component)} @ ${d.origin.file}:${d.origin.line}`);
    console.log(`  plan  row   ${(payload.plan_row ?? []).join(' -> ')}`);
    console.log(`  build row   ${(payload.build_row ?? []).join(' -> ')}`);
    console.log(`  failure     ${payload.failure?.file}:${payload.failure?.line}  ${payload.failure?.message}`);
    console.log(`  confidence  ${ok(String(d.confidence))}`);
    let sum = 0;
    for (const [name, c] of Object.entries(d.confidence_components ?? {})) {
      sum += c.score * c.weight;
      console.log(`     ${name.padEnd(12)} ${String(Math.round(c.score * 100) + '%').padStart(4)} x ${c.weight}   ${c.reason}`);
    }
    console.log(`     ${'sum'.padEnd(12)} ${sum.toFixed(4)}  ${Math.abs(sum - d.confidence) < 5e-3 ? ok('matches reported confidence') : '\x1b[31mMISMATCH\x1b[0m'}`);
    console.log(`  fix_withheld ${payload.fix_withheld === true ? ok('true') : '\x1b[31m' + payload.fix_withheld + '\x1b[0m'}`);

    const writers = tools.result.tools.filter((t) => /patch|write|fix_code|edit|apply|heal/i.test(t.name));
    h('refusal check');
    console.log(`  tools that could modify a student's build: ${writers.length === 0 ? ok('none') : '\x1b[31m' + writers.map((t) => t.name).join(', ') + '\x1b[0m'}`);

    await walkTheLoop();
  }
} finally {
  srv.kill();
}

/**
 * Walk all five bridges over the wire.
 *
 * The unit tests cover this logic in-process; this proves the same chain survives
 * being an MCP server — schemas, JSON round-trips, and the client holding the
 * progress log between calls, which it must because the server stores nothing.
 *
 * It doubles as the demo script, which is the real reason it lives here: if this
 * section is green, the ≤3-min video has very little left to go wrong in.
 */
async function walkTheLoop() {
  const call = async (name, args) => {
    const res = await rpc('tools/call', { name, arguments: args });
    const text = res.result?.content?.find((c) => c.type === 'text')?.text;
    if (!text) throw new Error(`${name} returned no text content`);
    return JSON.parse(text);
  };
  const step = (n, label) => console.log(`  ${'①②③④⑤'[n - 1]} ${label}`);
  const bad = (s) => '\x1b[31m' + s + '\x1b[0m';

  h('the learning loop, end to end over MCP');

  // ① pick a product type, then a project
  const domains = await call('browse_catalog', {});
  const vision = await call('browse_catalog', { domain: 'vision' });
  const project = vision.projects[0];
  step(1, `${domains.domains.length} domains → ${project.project} (${project.roles.length} roles)`);
  console.log(`     ${domains.honesty}`);

  // ② the role-scoped brief — owns / given / not yours
  const brief = await call('open_brief', { project: 'safety-gear', role: 'cv' });
  step(2, `brief: owns ${brief.you_own.length}, given ${brief.given_to_you.length}, not yours ${brief.not_yours.length}`);
  console.log(`     owns      ${brief.you_own.map((o) => o.component).join(', ')}`);
  console.log(`     given     ${brief.given_to_you.map((g) => `${g.component} (${g.owned_by})`).join(', ')}`);
  console.log(`     not yours ${brief.not_yours.join(', ')}`);
  const LESSON = 'condition has to be established';
  console.log(
    `     concept answer withheld with the assignment: ${JSON.stringify(brief).includes(LESSON) ? bad('LEAKED') : ok('yes')}`,
  );

  // ③ does the design cover the slice?
  const scope = await call('check_scope', { project: 'safety-gear', role: 'cv' });
  step(3, `in_scope=${scope.in_scope ? ok('true') : bad('false')} — ${scope.summary}`);
  console.log(`     boundary drawn correctly: ${scope.boundary.join(', ') || '(none)'}`);

  const foreign = await call('check_scope', {
    project: 'pricing',
    role: 'backend',
    plan: JSON.stringify(planWith(['validate', 'discount', 'tax', 'total', 'receipt'])),
  });
  console.log(
    `     drawing "receipt" (frontend's job) → ${
      !foreign.in_scope && foreign.out_of_scope.length === 1 ? ok('caught as out_of_scope') : bad('NOT CAUGHT')
    }`,
  );

  // ④ checkpoints from the student's own plan, then build it in the wrong order
  const cps = await call('checkpoints', { project: 'safety-gear', role: 'cv' });
  const idOf = (s) => cps.checkpoints.find((c) => c.subject === s)?.id;
  step(4, `${cps.checkpoints.length} checkpoints derived from the student's own design`);
  for (const c of cps.checkpoints) {
    const after = c.blocked_by.length ? `  ← after ${c.blocked_by.join(',')}` : '';
    console.log(`     ${c.id}  ${c.kind.padEnd(9)} ${c.subject}${after}`);
  }

  const progress = await call('record_progress', {
    project: 'safety-gear',
    role: 'cv',
    reached: [
      { checkpoint: idOf('detect person'), file: 'detect.py', line: 14, at: 'T+00m' },
      { checkpoint: idOf('alert'), file: 'alert.py', line: 9, at: 'T+07m' },
      { checkpoint: idOf('check helmet'), file: 'detect.py', line: 31, at: 'T+21m' },
      // They ran the acceptance tests and a1 went red. Recorded as a failure:
      // still in the history (MENTOR needs it to link the failure to the work),
      // but not counted toward done.
      { checkpoint: idOf('a1'), file: 'test_safety.py', line: 22, at: 'T+29m', outcome: 'fail' },
    ],
  });
  console.log(
    `     out-of-order work: ${
      progress.out_of_order.length
        ? ok(`recorded not blocked — ${progress.out_of_order[0].checkpoint} should have followed ${progress.out_of_order[0].should_have_followed.join(', ')}`)
        : bad('not detected')
    }`,
  );
  console.log(`     build history provenance: ${ok(progress.build_history.provenance)}`);

  // the join: that progress log IS explain_drift's input
  const drift = await call('explain_drift', {
    plan: JSON.stringify(await bundledSafetyPlan()),
    build: JSON.stringify({
      ...progress.build_history,
      failure: {
        test: 'a1',
        file: 'test_safety.py',
        line: 22,
        message: 'alerted on a compliant worker: expected 0 alerts, got 1',
      },
    }),
    symptom: 'my safety test fails on a worker who IS wearing a helmet',
  });
  console.log(
    `     → explain_drift on the tracked history: origin ${ok(`${drift.origin?.component} @ ${drift.origin?.file}:${drift.origin?.line}`)}, confidence ${ok(String(drift.confidence))}`,
  );
  console.log(
    `       provenance scored ${ok(String(drift.confidence_components.provenance.score))} — a hand-authored history would be 0.4`,
  );

  // ⑤ the card: refused while red, earned when green
  const red = await call('flashcard', {
    project: 'safety-gear',
    role: 'cv',
    test_output: '1 failed, 2 passed in 0.11s',
  });
  const green = await call('flashcard', {
    project: 'safety-gear',
    role: 'cv',
    test_output: '3 passed in 0.09s',
  });
  step(5, 'flashcard');
  console.log(
    `     tests red   → earned=${red.earned}  answer in payload: ${JSON.stringify(red).includes(LESSON) ? bad('LEAKED') : ok('no — the field is absent')}`,
  );
  console.log(
    `     tests green → earned=${green.earned}  ${green.earned ? ok('answer released') : bad('still withheld')}`,
  );
  console.log(`     earned by   ${green.earnedBy?.origin}, which surfaced at ${green.earnedBy?.surfaced}`);
  console.log(
    `     junk output "looks fine to me" → ${(await call('flashcard', { project: 'safety-gear', role: 'cv', test_output: 'looks fine to me' })).earned === false ? ok('not accepted as passing') : bad('ACCEPTED')}`,
  );

  const done = await call('is_it_done', {
    project: 'safety-gear',
    role: 'cv',
    log: JSON.stringify(progress.log),
  });
  h('is_it_done (built, but nothing verified)');
  console.log(`  done=${done.done === false ? ok('false') : bad('true')} — ${done.blocking.length} condition(s) outstanding`);
  console.log(`  e.g. "${done.blocking[0]}"`);
  console.log(`  expected-unbuilt reconciliation: ${done.expected_unbuilt.map((e) => e.component).join(', ') || '(none)'}`);
}

/** A chain plan with the given labels — for the negative scope case. */
function planWith(labels) {
  return {
    schema: 'lumina.plan/v1',
    name: 'probe',
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
  };
}

/** Read the bundled plan out of the built app, so this script holds no copy of it. */
async function bundledSafetyPlan() {
  const mod = await import(
    new URL('../sentinel/dist/modules/learn/fixtures.learn.js', import.meta.url).href
  );
  return JSON.parse(mod.SAFETY_PLAN_JSON);
}
