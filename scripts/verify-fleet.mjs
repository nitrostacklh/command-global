/**
 * Verify all three DEPLOYED apps, and the invariant that spans them.
 *
 *   npm run verify:fleet -- <roster-url> <sentinel-url> <profile-url>
 *
 * Order does not matter — each service is identified by what it says it is, not by
 * the position you passed it in, because getting those the wrong way round is
 * exactly the mistake worth catching.
 *
 * `verify:live` checks one service deeply (it drives a real drift report). This
 * checks the *fleet*: that three separate deployments came up, that each is serving
 * its own surface and only its own, and that the thing the whole architecture exists
 * to protect is still true across all of them.
 *
 * ## What "deployed properly" actually means here
 *
 * A green NitroCloud page means a container started. It does not mean:
 *   - the tool surface survived the trip (a missed build step drops tools silently),
 *   - the right app landed at the right URL (three near-identical deployments),
 *   - the apps can reach each other (peer URLs are set per-service and a missing
 *     peer is a *supported state*, so a half-wired fleet looks perfectly healthy),
 *   - MCP-1 and MCP-2 still do not contain a flashcard answer.
 *
 * The last one is the one that matters. It is asserted here over the wire, against
 * the real deployments, because a local test proves it about a local build.
 */

const G = (s) => '\x1b[32m' + s + '\x1b[0m';
const R = (s) => '\x1b[31m' + s + '\x1b[0m';
const Y = (s) => '\x1b[33m' + s + '\x1b[0m';
const B = (s) => '\x1b[1m' + s + '\x1b[0m';
const DIM = (s) => '\x1b[2m' + s + '\x1b[0m';

const urls = process.argv.slice(2).filter((a) => !a.startsWith('--')).map((u) => u.replace(/\/+$/, ''));
if (urls.length === 0) {
  console.error('Usage: npm run verify:fleet -- <url> <url> <url>   (any order)');
  process.exit(1);
}

/** The surface each app must serve. Derived from `node scripts/tools-of.mjs <app>`. */
const SURFACES = {
  'mentor-roster': {
    role: 'MCP-1 · catalog, briefs, lessons',
    tools: ['sign_in', 'list_roles', 'projects_for_role', 'open_brief', 'open_lesson', 'roster_status', 'check_scope', 'checkpoint_spec'],
  },
  mentor: {
    role: 'MCP-2 · drift and verdict',
    tools: ['explain_drift', 'withhold_fix', 'mentor_status'],
  },
  'mentor-profile': {
    role: 'MCP-3 · student record and cards',
    tools: ['open_profile', 'read_profile', 'note_role_choice', 'record_verdict', 'class_progress', 'profile_status', 'flashcard', 'review_flashcard', 'due_cards'],
  },
};

/** If this leaves any service unearned, the product is broken. MCP-3 gates it. */
const ANSWER = 'Tax is charged on what the customer actually pays';

let failures = 0;
const check = (ok, label, extra = '') => {
  if (!ok) failures++;
  console.log(`    ${ok ? G('PASS') : R('FAIL')}  ${label}${extra ? DIM('  — ' + extra) : ''}`);
};

/** One MCP session against one service. Responses are SSE-framed even on POST. */
function client(base) {
  let session = null;
  let id = 0;
  return async function rpc(method, params, notify = false) {
    const res = await fetch(`${base}/mcp`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json, text/event-stream',
        ...(session ? { 'Mcp-Session-Id': session } : {}),
      },
      body: JSON.stringify({ jsonrpc: '2.0', method, ...(params !== undefined ? { params } : {}), ...(notify ? {} : { id: ++id }) }),
    });
    const sid = res.headers.get('mcp-session-id');
    if (sid) session = sid;
    if (notify) return null;
    const text = await res.text();
    const line = text.split('\n').find((l) => l.startsWith('data:'));
    const payload = JSON.parse(line ? line.slice(5).trim() : text);
    if (payload.error) throw new Error(`${method}: ${payload.error.message}`);
    return payload.result;
  };
}

const seen = new Map();

for (const base of urls) {
  console.log(`\n${B(base)}`);
  let rpc, init;
  try {
    rpc = client(base);
    init = await rpc('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'verify-fleet', version: '1' },
    });
    await rpc('notifications/initialized', undefined, true);
  } catch (err) {
    check(false, 'service reachable over MCP', err.message);
    continue;
  }

  const name = init.serverInfo?.name ?? '(unnamed)';
  const surface = SURFACES[name];
  check(!!surface, `identifies as one of the three apps`, `${name} ${init.serverInfo?.version ?? ''}`);
  if (!surface) continue;

  console.log(`    ${DIM(surface.role)}`);
  if (seen.has(name)) {
    check(false, 'each app deployed exactly once', `${name} also served by ${seen.get(name)}`);
  }
  seen.set(name, base);

  const { tools } = await rpc('tools/list', {});
  const names = tools.map((t) => t.name).sort();
  const want = [...surface.tools].sort();
  const missing = want.filter((t) => !names.includes(t));

  // Extra tools are the Gap 11 failure: a surface that drifted back toward the
  // pre-split single server, or an app serving a verb that is another app's job.
  const extra = names.filter((t) => !want.includes(t));

  check(missing.length === 0, `all ${want.length} tools present`, missing.join(', '));
  check(extra.length === 0, 'nothing belonging to another app', extra.join(', '));

  // The answer must not be in this process at all — not withheld, not flagged, absent.
  if (name !== 'mentor-profile') {
    const wire = JSON.stringify(tools);
    check(!wire.includes(ANSWER), 'no flashcard answer anywhere in the tool surface');
  }
}

// ── the fleet, rather than the services ──────────────────────────────────────
console.log(`\n${B('Fleet')}`);
for (const app of Object.keys(SURFACES)) {
  check(seen.has(app), `${app} is deployed`, seen.get(app) ?? 'not among the URLs given');
}

console.log('');
if (failures) {
  console.log(R(`${failures} check(s) failed.`));
  console.log(DIM('A tool count that is short usually means the build step did not run in the cloud.'));
  console.log(DIM('An app identifying as the wrong name means two repos are connected the same way.\n'));
  process.exit(1);
}
console.log(G('All three deployed, each serving its own surface, no answer in the wrong process.'));
console.log(DIM('\nStill worth checking by hand: roster_status reports which peers it can actually reach.'));
console.log(DIM('A missing peer is a supported state, so unset ROSTER_URL/SENTINEL_URL/PROFILE_URL looks healthy.\n'));
