/**
 * One client for three MCP applications.
 *
 * MENTOR is three separately deployed services, and every script that drives the
 * product has the same problem: a tool call has to go to *the app that serves that
 * tool*, and which app that is must be discovered rather than hardcoded — otherwise
 * a script asserts the layout it was written against instead of the layout that is
 * deployed.
 *
 * So: connect to all three, ask each what it is (`serverInfo.name`), ask each what
 * it serves (`tools/list`), and build the routing table from the answers.
 *
 *     const fleet = await openFleet({ urls: [a, b, c] });   // deployed, over HTTP
 *     const fleet = await openFleet({ local: true });       // built, over stdio
 *     await fleet.call('open_brief', { project: 'pricing', role: 'backend' });
 *
 * ## Two things this refuses to paper over
 *
 * 1. **A tool nobody serves** throws, naming the tool and listing every surface.
 *    Silently skipping would let a script go green against a fleet that is missing
 *    an entire app.
 * 2. **A tool two apps serve** throws too, and that is the more valuable of the two.
 *    Two apps answering to the same verb is the Gap 11 failure — a surface drifting
 *    back toward the pre-split single server — and it would otherwise present as
 *    "everything works", because whichever app answered first would answer correctly.
 *
 * ## Transports
 *
 * Both real. Deployed services speak **streamable HTTP at `{base}/mcp`**, where the
 * replies come back SSE-framed (`event: message` / `data: {…}`) even on the POST
 * endpoint, so the body needs unwrapping before it is JSON. Local builds speak
 * **stdio**, launched the way NitroStudio launches them — `node dist/index.js` with
 * the app directory as the working directory, because `@nitrostack/core` resolves
 * widget HTML relative to `process.cwd()` and starting from the repo root dies on a
 * missing file.
 */

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

/**
 * The three apps, keyed by the name each one reports at `initialize`.
 *
 * The key is the identity a service claims for itself over the wire; the directory
 * is only how the local transport finds it. Resolving by the claimed name is what
 * makes URL order irrelevant, and it is what catches two repos connected the same way.
 */
export const APPS = {
  'mentor-roster': {
    dir: 'mcp-roster',
    label: 'MCP-1',
    role: 'catalog, role-scoped briefs, lessons, the checkpoint spec',
  },
  mentor: {
    dir: 'sentinel',
    label: 'MCP-2',
    role: 'verification, drift, the build verdict',
  },
  'mentor-profile': {
    dir: 'mcp-profile',
    label: 'MCP-3',
    role: 'the student record, and the flashcards',
  },
};

export const APP_NAMES = Object.keys(APPS);

// ── transports ───────────────────────────────────────────────────────────────

/** Streamable HTTP against a deployed service. */
function httpTransport(base) {
  const url = `${base.replace(/\/+$/, '')}/mcp`;
  let session = null;
  let id = 0;

  return {
    where: base.replace(/\/+$/, ''),
    async rpc(method, params, notify = false) {
      const headers = {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
      };
      if (session) headers['Mcp-Session-Id'] = session;

      const body = { jsonrpc: '2.0', method, ...(params !== undefined ? { params } : {}) };
      if (!notify) body.id = ++id;

      const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
      const sid = res.headers.get('mcp-session-id');
      if (sid) session = sid;
      if (notify) return null;

      const text = await res.text();
      // `event: message\ndata: {…}` — the last data line is the reply.
      const line = text
        .split('\n')
        .filter((l) => l.startsWith('data:'))
        .pop();
      if (!line) {
        throw new Error(`${method}: no data frame in the response — ${text.slice(0, 200)}`);
      }
      const msg = JSON.parse(line.slice(5).trim());
      if (msg.error) throw new Error(`${method}: ${JSON.stringify(msg.error)}`);
      return msg.result ?? null;
    },
    close() {},
  };
}

/** stdio against a local build, launched the way Studio launches it. */
function stdioTransport(appDir) {
  const cwd = join(ROOT, appDir);
  const entry = join(cwd, 'dist', 'index.js');
  if (!existsSync(entry)) {
    throw new Error(`${appDir}/dist/index.js not found — run:  npm --prefix ${appDir} run build`);
  }

  const child = spawn(process.execPath, ['dist/index.js'], {
    cwd,
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env, NODE_ENV: 'development' },
  });

  const pending = new Map();
  const stderr = [];
  let buffer = '';
  let id = 0;

  child.stdout.on('data', (chunk) => {
    buffer += chunk.toString('utf8');
    let nl;
    while ((nl = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (!line.startsWith('{')) continue;
      let msg;
      try {
        msg = JSON.parse(line);
      } catch {
        continue;
      }
      const settle = pending.get(msg.id);
      if (settle) {
        pending.delete(msg.id);
        settle(msg);
      }
    }
  });
  child.stderr.on('data', (c) => stderr.push(c.toString('utf8')));

  return {
    where: appDir,
    async rpc(method, params, notify = false) {
      const body = { jsonrpc: '2.0', method, ...(params !== undefined ? { params } : {}) };
      if (notify) {
        child.stdin.write(JSON.stringify(body) + '\n');
        return null;
      }
      body.id = ++id;
      const msg = await new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          pending.delete(body.id);
          // The stderr tail is the difference between "it timed out" and a real
          // diagnosis — NitroStack writes its startup failures there, and stdout is
          // where the client is listening, so a crashed server is otherwise silent.
          reject(
            new Error(
              `${method} timed out after 30s on ${appDir}` +
                (stderr.length ? `\n--- ${appDir} stderr ---\n${stderr.join('').slice(-1500)}` : ''),
            ),
          );
        }, 30_000);
        pending.set(body.id, (m) => {
          clearTimeout(timer);
          resolve(m);
        });
        child.stdin.write(JSON.stringify(body) + '\n');
      });
      if (msg.error) throw new Error(`${method}: ${JSON.stringify(msg.error)}`);
      return msg.result ?? null;
    },
    close() {
      child.kill();
    },
  };
}

// ── the fleet ────────────────────────────────────────────────────────────────

/**
 * Connect to every service and learn what each one is.
 *
 * `urls` drives deployed services; `local: true` drives the built apps in this repo.
 * A service that will not answer is recorded as `failed` rather than thrown, because
 * "two of three came up" is a diagnosis a caller wants to print, not an exception.
 */
export async function openFleet({ urls, local, clientName = 'fleet' } = {}) {
  const transports = local
    ? APP_NAMES.map((name) => stdioTransport(APPS[name].dir))
    : (urls ?? []).map((u) => httpTransport(u));

  const services = new Map();
  const failures = [];
  const duplicates = [];

  for (const transport of transports) {
    let init;
    try {
      init = await transport.rpc('initialize', {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: clientName, version: '1' },
      });
      await transport.rpc('notifications/initialized', undefined, true);
    } catch (err) {
      failures.push({ where: transport.where, why: err instanceof Error ? err.message : String(err) });
      transport.close();
      continue;
    }

    const name = init?.serverInfo?.name ?? '(unnamed)';
    const { tools } = await transport.rpc('tools/list', {});
    const { resources } = await transport.rpc('resources/list', {}).catch(() => ({ resources: [] }));
    const { prompts } = await transport.rpc('prompts/list', {}).catch(() => ({ prompts: [] }));

    const service = {
      name,
      version: init?.serverInfo?.version ?? '',
      where: transport.where,
      known: name in APPS,
      label: APPS[name]?.label ?? '(unknown app)',
      role: APPS[name]?.role ?? '',
      tools: (tools ?? []).map((t) => t.name),
      toolSpecs: tools ?? [],
      resources: (resources ?? []).map((r) => r.uri),
      prompts: (prompts ?? []).map((p) => p.name),
      rpc: transport.rpc,
      close: transport.close,
    };

    if (services.has(name)) {
      duplicates.push({ name, first: services.get(name).where, second: service.where });
    } else {
      services.set(name, service);
    }
  }

  /** Which service serves this tool. Ambiguity is an error, never a first-wins. */
  function owner(tool) {
    const serving = [...services.values()].filter((s) => s.tools.includes(tool));
    if (serving.length === 1) return serving[0];
    if (serving.length === 0) {
      throw new Error(
        `no service in this fleet serves \`${tool}\`.\n  Surfaces: ` +
          [...services.values()].map((s) => `${s.name}[${s.tools.join(' ')}]`).join('\n            '),
      );
    }
    throw new Error(
      `\`${tool}\` is served by ${serving.length} apps (${serving.map((s) => s.name).join(', ')}). ` +
        'Two apps answering to one verb is a surface drifting back toward the pre-split single ' +
        'server — see GAPS.md Gap 11.',
    );
  }

  return {
    services,
    failures,
    duplicates,
    missing: APP_NAMES.filter((n) => !services.has(n)),
    /** The service claiming this name, or null. */
    on: (name) => services.get(name) ?? null,
    owner,
    /** Route one tool call to the app that owns the tool, and parse its JSON reply. */
    async call(tool, args = {}) {
      const service = owner(tool);
      const result = await service.rpc('tools/call', { name: tool, arguments: args });
      const text = result?.content?.find((c) => c.type === 'text')?.text;
      if (typeof text !== 'string') throw new Error(`${tool}: no text content in the reply`);
      try {
        return JSON.parse(text);
      } catch {
        throw new Error(`${tool}: reply was not JSON — ${text.slice(0, 200)}`);
      }
    },
    /** Every tool name across the fleet, deduplicated. */
    allTools: () => [...new Set([...services.values()].flatMap((s) => s.tools))].sort(),
    close() {
      for (const s of services.values()) s.close();
    },
  };
}

// ── the invariants every driver asserts, defined once ────────────────────────

/**
 * The one string that must never leave a service unearned.
 *
 * It lives in MCP-3's concept bank and nowhere else, so its appearance in an MCP-1 or
 * MCP-2 payload is not a leak to be tightened later — it means the split stopped
 * being the security boundary it is the whole reason for.
 */
export const ANSWER = 'Tax is charged on what the customer actually pays';

/** A tool name that sounds like it could touch a student's source. */
export const WRITER = /patch|write|fix_code|edit|apply|heal/i;

export const G = (s) => `\x1b[32m${s}\x1b[0m`;
export const R = (s) => `\x1b[31m${s}\x1b[0m`;
export const Y = (s) => `\x1b[33m${s}\x1b[0m`;
export const B = (s) => `\x1b[1m${s}\x1b[0m`;
export const DIM = (s) => `\x1b[2m${s}\x1b[0m`;

/** A shared pass/fail reporter, so every driver's output reads the same. */
export function reporter() {
  let failures = 0;
  return {
    check(ok, label, extra = '') {
      if (!ok) failures++;
      console.log(`  ${ok ? G('PASS') : R('FAIL')}  ${label}${extra ? DIM('  — ' + extra) : ''}`);
      return ok;
    },
    get failures() {
      return failures;
    },
  };
}
