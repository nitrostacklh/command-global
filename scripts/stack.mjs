/**
 * Run the whole product as one stack: three MCP services + the Lumina console.
 *
 * ## Why this exists
 *
 * MENTOR is three deployed applications and a web console, and the interesting
 * behaviour only exists *between* them — MCP-1 files a role choice with MCP-3 and
 * hands a spec to MCP-2, MCP-2 files its verdict back to MCP-3, and only then does
 * MCP-3 release a card. Running one service at a time hides every one of those
 * joints. `npm run mentor:ui` alone points the console at the deployed fleet, which
 * works but puts a 12–19s handshake in front of every beat of a recorded demo.
 *
 * So this launches the local fleet over **http** (stdio cannot be reached from a
 * browser at all) with the peer URLs pointed at each other, and starts the console
 * with `NEXT_PUBLIC_*_URL` set so it defaults to the local fleet instead of the
 * deployed one.
 *
 * Two things the local stack gets that the deployed fleet cannot:
 *
 * - **Durable storage.** `PROFILE_STORE=sqlite` needs `node:sqlite`, which landed in
 *   Node 22.5. NitroCloud's images are Node 20, so the deployed MCP-3 reports
 *   `durable=false` and loses records on redeploy. Locally it persists.
 * - **Attested cross-service writes.** `MENTOR_PEER_TOKEN` is unset on the
 *   deployment, so MCP-3 accepts a verdict from any caller and records it as
 *   unattested. Here all three hold the same value, so a write that did not come
 *   from a sibling is rejected.
 *
 *   Usage:  npm run stack           # all four
 *           npm run stack -- --no-ui   # services only
 */

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const withUi = !process.argv.includes('--no-ui');

/**
 * `localhost`, not `127.0.0.1` — the services bind IPv6.
 *
 * The framework's HTTP transport listens on `::1` and nothing is bound on the
 * IPv4 loopback, so `http://127.0.0.1:7101/mcp` is refused outright while
 * `http://localhost:7101/mcp` answers 200. Using the literal IPv4 address here
 * breaks it in the least visible way possible: the console still loads, and each
 * service still reports itself healthy, but every server-to-server bridge fails
 * and the loop just never closes. `localhost` resolves to whichever family is
 * actually listening.
 */
const HOST = 'localhost';
const PORTS = { roster: 7101, sentinel: 7102, profile: 7103, ui: 3000 };
const base = (port) => `http://${HOST}:${port}`;

/**
 * Peer URLs are base origins — `shared/peer.ts` appends `/mcp` itself. Passing a
 * URL that already ends in `/mcp` produces `/mcp/mcp` and a silent 404 bridge.
 */
const ROSTER = base(PORTS.roster);
const SENTINEL = base(PORTS.sentinel);
const PROFILE = base(PORTS.profile);

// Local-only shared secret. Its value is irrelevant as long as all three agree —
// it exists so writes are attested rather than anonymous, not to protect anything
// on a loopback interface.
const PEER_TOKEN = 'local-stack-peer-token';

/**
 * `PORT` is the one that matters, and it is not the obvious one.
 *
 * `MCP_SERVER_PORT` looks like the knob — the framework reads it — but only for
 * the OAuth *discovery* server. The Streamable HTTP transport that actually
 * serves `/mcp` reads `process.env.PORT` and otherwise defaults to 3000
 * (@nitrostack/core `core/server.js`). Set only `MCP_SERVER_PORT` and all three
 * services quietly bind 3000: the first wins, the second dies with
 * `EADDRINUSE ::1:3000`, and the error names a port you never configured. Both
 * are set here so the discovery server follows the service it belongs to.
 */
const portEnv = (port) => ({ PORT: String(port), MCP_SERVER_PORT: String(port) });

const shared = {
  MCP_TRANSPORT_TYPE: 'http',
  ENABLE_CORS: 'true',
  MENTOR_PEER_TOKEN: PEER_TOKEN,
};

const SERVICES = [
  {
    label: 'MCP-1 roster',
    colour: '\x1b[34m',
    cwd: join(ROOT, 'mcp-roster'),
    args: [join(ROOT, 'mcp-roster', 'dist', 'index.js')],
    port: PORTS.roster,
    env: { ...shared, ...portEnv(PORTS.roster), SENTINEL_URL: SENTINEL, PROFILE_URL: PROFILE },
  },
  {
    label: 'MCP-2 sentinel',
    colour: '\x1b[33m',
    // Through start-mcp.mjs: @nitrostack/core resolves widget HTML from
    // process.cwd(), and MCP-2 is the one service that serves a widget
    // (causal-timeline). Launched from the repo root it dies at startup with an
    // error about a missing HTML file, which reads like a broken widget build.
    cwd: ROOT,
    args: [join(ROOT, 'scripts', 'start-mcp.mjs')],
    port: PORTS.sentinel,
    env: { ...shared, ...portEnv(PORTS.sentinel), ROSTER_URL: ROSTER, PROFILE_URL: PROFILE },
  },
  {
    label: 'MCP-3 profile',
    colour: '\x1b[38;5;208m',
    cwd: join(ROOT, 'mcp-profile'),
    args: [join(ROOT, 'mcp-profile', 'dist', 'index.js')],
    port: PORTS.profile,
    env: {
      ...shared,
      ...portEnv(PORTS.profile),
      ROSTER_URL: ROSTER,
      SENTINEL_URL: SENTINEL,
      PROFILE_STORE: 'sqlite',
      PROFILE_DB_PATH: join(ROOT, 'mentor-profiles.db'),
    },
  },
];

const missing = SERVICES.filter((s) => s.args[0].endsWith('index.js') && !existsSync(s.args[0]));
if (missing.length) {
  console.error(
    `Not built:\n${missing.map((s) => `  ${s.label} — ${s.args[0]}`).join('\n')}\n\n` +
      'Run:\n\n  npm run install:all && npm run build:all\n',
  );
  process.exit(1);
}

const RESET = '\x1b[0m';
const DIM = '\x1b[2m';
const children = [];

/**
 * Collapse the framework's structured log lines to their message.
 *
 * `@nitrostack/core` emits `NITRO_LOG::{...}` with the whole record inline, and
 * on a provider failure the record embeds the offending class's **source** — one
 * startup warning arrives as ~30KB on a single line and scrolls the three
 * genuinely useful lines ("Application initialized with 8 tools") off screen.
 * Truncated rather than dropped: it is noise here, not nothing.
 */
function pretty(line) {
  const marker = line.indexOf('NITRO_LOG::');
  if (marker === -1) return line;
  try {
    const record = JSON.parse(line.slice(marker + 'NITRO_LOG::'.length));
    const message = String(record.message ?? '').replace(/\s+/g, ' ').trim();
    const level = record.level === 'info' ? '' : `[${record.level}] `;
    return `${level}${message.length > 160 ? `${message.slice(0, 160)}…` : message}`;
  } catch {
    return line.length > 200 ? `${line.slice(0, 200)}…` : line;
  }
}

function launch({ label, colour, cwd, args, env }) {
  const child = spawn(process.execPath, args, {
    cwd,
    env: { ...process.env, ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const tag = `${colour}${label.padEnd(15)}${RESET}`;
  const relay = (stream) => {
    let buffer = '';
    stream.setEncoding('utf8');
    stream.on('data', (chunk) => {
      buffer += chunk;
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() ?? '';
      for (const line of lines) if (line.trim()) console.log(`${tag} ${pretty(line)}`);
    });
  };
  relay(child.stdout);
  relay(child.stderr);
  child.on('exit', (code, signal) => {
    if (shuttingDown) return;
    console.log(`${tag} ${DIM}exited (${signal ?? code}) — stopping the stack${RESET}`);
    shutdown(code ?? 1);
  });
  children.push({ label, child });
  return child;
}

let shuttingDown = false;
function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const { child } of children) {
    if (child.exitCode !== null || child.signalCode !== null) continue;
    // On Windows a signal reaches only the direct child, and `next dev` runs its
    // compiler in a subprocess of its own — SIGTERM alone leaves that holding
    // port 3000, so the next `npm run stack` dies on EADDRINUSE for a service
    // the user believes they just stopped. taskkill /T takes the tree.
    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' }).on('error', () =>
        child.kill(),
      );
    } else {
      child.kill();
    }
  }
  setTimeout(() => process.exit(code), 600);
}
process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

console.log(`
${DIM}MENTOR — full stack${RESET}

  MCP-1 roster     ${ROSTER}/mcp    role, projects, brief, lesson, checkpoint spec
  MCP-2 sentinel   ${SENTINEL}/mcp    verification, drift, the build verdict
  MCP-3 profile    ${PROFILE}/mcp    student record, the only copy of an answer
${withUi ? `  Console          ${base(PORTS.ui)}/mentor\n` : ''}
  ${DIM}storage sqlite (durable) · peer writes attested · Ctrl-C stops everything${RESET}
`);

for (const service of SERVICES) launch(service);

if (withUi) {
  // Given a beat to bind their ports first, so the console's first handshake does
  // not race a service that is still starting.
  setTimeout(() => {
    launch({
      label: 'console',
      colour: '\x1b[36m',
      cwd: join(ROOT, 'lumina'),
      args: [join(ROOT, 'lumina', 'node_modules', 'next', 'dist', 'bin', 'next'), 'dev', '-p', String(PORTS.ui)],
      env: {
        NEXT_PUBLIC_ROSTER_URL: `${ROSTER}/mcp`,
        NEXT_PUBLIC_SENTINEL_URL: `${SENTINEL}/mcp`,
        NEXT_PUBLIC_PROFILE_URL: `${PROFILE}/mcp`,
      },
    });
  }, 1500);
}
