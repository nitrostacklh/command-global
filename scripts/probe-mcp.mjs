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
  }
} finally {
  srv.kill();
}
