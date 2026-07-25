/**
 * Print one app's MCP surface over STDIO — the fastest possible sanity check.
 *
 *   node scripts/tools-of.mjs mcp-roster
 *   node scripts/tools-of.mjs sentinel --json
 *
 * `npm run probe` is the real journey walker; this exists for the ten seconds after
 * a build when the only question is "did the tools register at all". It launches the
 * app the way NitroStudio does — `node dist/index.js` with the app directory as the
 * working directory, because `@nitrostack/core` resolves widget HTML relative to
 * `process.cwd()` and starting it from the repo root fails on a missing file.
 */

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const app = process.argv[2];
const asJson = process.argv.includes('--json');

if (!app) {
  console.error('Usage: node scripts/tools-of.mjs <app-dir> [--json]');
  process.exit(1);
}

const cwd = join(ROOT, app);
const entry = join(cwd, 'dist', 'index.js');
if (!existsSync(entry)) {
  console.error(`${app}/dist/index.js not found — run:  npm --prefix ${app} run build`);
  process.exit(1);
}

const child = spawn(process.execPath, ['dist/index.js'], {
  cwd,
  stdio: ['pipe', 'pipe', 'pipe'],
  env: { ...process.env, NODE_ENV: 'development' },
});

let buffer = '';
let id = 0;
const pending = new Map();

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
    const resolve = pending.get(msg.id);
    if (resolve) {
      pending.delete(msg.id);
      resolve(msg);
    }
  }
});

const stderr = [];
child.stderr.on('data', (c) => stderr.push(c.toString('utf8')));

function rpc(method, params, notify = false) {
  const body = { jsonrpc: '2.0', method, ...(params !== undefined ? { params } : {}) };
  if (notify) {
    child.stdin.write(JSON.stringify(body) + '\n');
    return Promise.resolve(null);
  }
  body.id = ++id;
  return new Promise((resolve, reject) => {
    pending.set(body.id, (msg) => (msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result)));
    child.stdin.write(JSON.stringify(body) + '\n');
    setTimeout(() => reject(new Error(`${method} timed out after 15s`)), 15000);
  });
}

try {
  const init = await rpc('initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'tools-of', version: '1' },
  });
  await rpc('notifications/initialized', undefined, true);

  const { tools } = await rpc('tools/list', {});
  const { prompts } = await rpc('prompts/list', {}).catch(() => ({ prompts: [] }));
  const { resources } = await rpc('resources/list', {}).catch(() => ({ resources: [] }));

  const surface = {
    app,
    server: `${init.serverInfo?.name} ${init.serverInfo?.version}`,
    tools: tools.map((t) => t.name),
    prompts: (prompts ?? []).map((p) => p.name),
    resources: (resources ?? []).map((r) => r.uri),
  };

  if (asJson) {
    console.log(JSON.stringify(surface, null, 2));
  } else {
    console.log(`\n\x1b[1m${surface.server}\x1b[0m  (${app})`);
    console.log(`  tools (${surface.tools.length}):  ${surface.tools.join('  ')}`);
    if (surface.prompts.length) console.log(`  prompts (${surface.prompts.length}): ${surface.prompts.join('  ')}`);
    if (surface.resources.length) {
      console.log(`  resources (${surface.resources.length}): ${surface.resources.join('  ')}`);
    }
    // The invariant that matters across all three apps: nothing can touch the build.
    const writers = surface.tools.filter((n) => /patch|write|fix_code|edit|apply|heal/i.test(n));
    console.log(
      `  can modify a student's build: ${writers.length ? '\x1b[31m' + writers.join(', ') + '\x1b[0m' : '\x1b[32mnothing\x1b[0m'}`,
    );
    console.log('');
  }
  child.kill();
  process.exit(0);
} catch (err) {
  console.error(`\n\x1b[31mFAILED\x1b[0m ${err instanceof Error ? err.message : String(err)}`);
  if (stderr.length) console.error('\n--- stderr ---\n' + stderr.join('').slice(0, 3000));
  child.kill();
  process.exit(1);
}
