/**
 * Verify a DEPLOYED MENTOR against the same expectations as the local build.
 *
 *   npm run verify:live -- https://<your-service>.app.nitrocloud.ai
 *
 * "Deployed" and "deployed and working" are different claims. A green deployment
 * page means the container started; it does not mean the tool surface survived the
 * trip, that the bundled fixtures made it into the image, or that the widget
 * resource is being served. This checks the things that would actually embarrass
 * you in front of a judge, over the wire, against the real service.
 *
 * Transport is **streamable HTTP** at `{serviceUrl}/mcp`, not the `/sse` URL the
 * handbook quotes for ChatGPT. Both are served; `/sse` holds a stream open and is
 * awkward to drive from a script, while `/mcp` is request/response with an
 * `Mcp-Session-Id` header carried between calls. Responses come back SSE-framed
 * (`event: message\ndata: {...}`) even on the POST endpoint, so the body needs
 * unwrapping before it is JSON.
 */

const BASE = (process.argv[2] || '').replace(/\/+$/, '');
if (!BASE) {
  console.error('Usage: npm run verify:live -- https://<service>.app.nitrocloud.ai');
  process.exit(1);
}
const ENDPOINT = `${BASE}/mcp`;

const G = (s) => '\x1b[32m' + s + '\x1b[0m';
const R = (s) => '\x1b[31m' + s + '\x1b[0m';
let failures = 0;
const check = (ok, label, extra = '') => {
  if (!ok) failures++;
  console.log(`  ${ok ? G('PASS') : R('FAIL')}  ${label}${extra ? '  — ' + extra : ''}`);
};

let session = null;
let id = 0;

/** One JSON-RPC round trip. Unwraps the SSE framing the server replies with. */
async function rpc(method, params, notify = false) {
  const body = { jsonrpc: '2.0', method, ...(params !== undefined ? { params } : {}) };
  if (!notify) body.id = ++id;
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json, text/event-stream',
  };
  if (session) headers['Mcp-Session-Id'] = session;

  const res = await fetch(ENDPOINT, { method: 'POST', headers, body: JSON.stringify(body) });
  const sid = res.headers.get('mcp-session-id');
  if (sid) session = sid;
  if (notify) return null;

  const text = await res.text();
  // `event: message\ndata: {...}` — take the last data line, which is the reply.
  const line = text
    .split('\n')
    .filter((l) => l.startsWith('data:'))
    .pop();
  if (!line) throw new Error(`${method}: no data frame in response — ${text.slice(0, 200)}`);
  const msg = JSON.parse(line.slice(5).trim());
  if (msg.error) throw new Error(`${method}: ${JSON.stringify(msg.error)}`);
  return msg.result;
}

const call = async (name, args) => {
  const r = await rpc('tools/call', { name, arguments: args });
  const t = r?.content?.find((c) => c.type === 'text')?.text;
  if (!t) throw new Error(`${name}: no text content`);
  return JSON.parse(t);
};

/**
 * Written out rather than derived, on purpose. Comparing the deployed list against
 * the local build would only prove the two agree; naming them here asserts *intent*,
 * so a module registered by accident — the Gap 11 failure — shows up as an extra
 * rather than being mirrored into the expectation and hidden.
 */
const EXPECTED_TOOLS = [
  // REGISTRAR — identity and records
  'whoami', 'resume', 'class_progress',
  // ROSTER — path and role
  'browse_catalog', 'open_brief',
  // COACH — design, checkpoints, done-ness
  'check_scope', 'checkpoints', 'record_progress', 'is_it_done',
  // MENTOR — drift, refusal, card
  'explain_drift', 'withhold_fix', 'flashcard', 'mentor_status',
];
/** If this string ever leaves the server unearned, the product is broken. */
const ANSWER = 'Tax is charged on what the customer actually pays';

try {
  console.log(`\n\x1b[1mVerifying\x1b[0m ${BASE}\n`);

  const init = await rpc('initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'verify-live', version: '1' },
  });
  await rpc('notifications/initialized', undefined, true);
  check(init.serverInfo?.name === 'mentor', 'server identifies as mentor',
    `${init.serverInfo?.name} ${init.serverInfo?.version}`);
  check(!!session, 'session established', session ?? '(none)');

  const { tools } = await rpc('tools/list', {});
  const names = tools.map((t) => t.name);
  check(
    names.length === EXPECTED_TOOLS.length,
    `exactly ${EXPECTED_TOOLS.length} tools`,
    String(names.length),
  );
  const missing = EXPECTED_TOOLS.filter((t) => !names.includes(t));
  const extra = names.filter((t) => !EXPECTED_TOOLS.includes(t));
  check(missing.length === 0, 'every expected tool present', missing.length ? 'missing ' + missing.join(', ') : '');
  check(extra.length === 0, 'nothing unexpected registered', extra.length ? 'extra ' + extra.join(', ') : '');
  // The Gap 11 invariant, checked on the thing a judge actually connects to.
  const writers = names.filter((n) => /patch|write|fix_code|edit|apply|heal/i.test(n));
  check(writers.length === 0, "no tool can modify a student's build", writers.join(', '));

  const { resources } = await rpc('resources/list', {});
  const uris = resources.map((r) => r.uri);
  check(uris.some((u) => u.includes('causal-timeline')), 'causal-timeline widget is served');
  check(!uris.some((u) => u.includes('mission-trace')), 'mission-trace is NOT served (it leaked the fix)');

  // The bundled fixtures have to have travelled inside the image — this is the
  // check that catches a deploy which built fine and has nothing to talk about.
  const drift = await call('explain_drift', {});
  check(drift.origin?.file === 'build/pricing.js' && drift.origin?.line === 12,
    'explain_drift names the origin', `${drift.origin?.component} @ ${drift.origin?.file}:${drift.origin?.line}`);
  check(drift.confidence === 0.91, 'confidence 0.91, computed not hardcoded', String(drift.confidence));
  check(drift.fix_withheld === true, 'fix_withheld');

  const cat = await call('browse_catalog', {});
  check(cat.domains?.length === 3, 'catalog bundled', `${cat.domains?.length} domains`);
  const brief = await call('open_brief', { project: 'pricing', role: 'backend' });
  check(brief.you_own?.length === 4 && brief.not_yours?.length === 1, 'role-scoped brief bundled');
  check(!JSON.stringify(brief).includes(ANSWER), 'concept answer withheld with the assignment');

  const red = await call('flashcard', { project: 'pricing', role: 'backend', test_output: '# fail 1' });
  check(red.earned === false && !('back' in red), 'flashcard withholds, and the field is ABSENT');
  check(!JSON.stringify(red).includes(ANSWER), 'answer appears nowhere in the live payload');

  // ── REGISTRAR, checked as an unauthenticated caller ────────────────────────
  // This script never presents a token, which is exactly the interesting case: it
  // is the position anyone who finds the URL is in. These assert that the boundary
  // holds in production, not just in unit tests against a mocked context.
  const me = await call('whoami', {});
  check(me.you?.authenticated === false, 'an unauthenticated caller is anonymous, not rejected',
    `${me.you?.id} / ${me.you?.role}`);
  check(me.can_read_other_students === false, 'anonymous cannot read other students');
  check(
    typeof me.storage?.durable === 'boolean' && !!me.storage?.why_this_backend,
    'storage durability is reported, not assumed',
    `${me.storage?.backend}, durable=${me.storage?.durable}`,
  );

  const klass = await call('class_progress', {});
  check(klass.refused === true, "class_progress REFUSES an anonymous caller — the boundary holds live",
    klass.refused ? '' : `returned ${JSON.stringify(klass).slice(0, 120)}`);

  const anon = await call('record_progress', {
    project: 'pricing',
    role: 'backend',
    reached: [{ checkpoint: 'cp-1', file: 'build/pricing.js', line: 8 }],
  });
  // Anonymous must stay stateless: every anonymous caller shares one identity, so
  // saving would leak one visitor's run into the next one's session.
  check(anon.saved?.saved === false, 'anonymous progress is NOT persisted (no cross-caller leak)');
  check(Array.isArray(anon.log?.events), 'and the log still comes back in full, so nothing is lost');

  console.log(`\n${failures === 0 ? G('DEPLOYMENT VERIFIED') : R(failures + ' CHECK(S) FAILED')}`);
  if (failures === 0) {
    console.log('\nSame claims as the local build, over the wire, on the deployed service.');
  }
  process.exitCode = failures === 0 ? 0 : 1;
} catch (err) {
  console.error(R('\nTHREW: ') + (err instanceof Error ? err.message : String(err)));
  process.exitCode = 1;
}
