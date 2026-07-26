/**
 * Catch documentation that contradicts the code, or itself.
 *
 * ## Why this exists
 *
 * A reviewer found `DEPLOY.md` asserting two incompatible things in one table: a test count
 * from *after* the loop was built, next to `tools/list → exactly 3 tools` from *before* it.
 * Two pages later its own demo script called five of the tools that world does not contain.
 *
 * The cause was mechanical and will recur: those numbers are **facts the code owns and the
 * prose copies.** I updated the test counts with a bulk replace and never swept the tool
 * counts. A judge running `tools/list` against the deployed server after reading our
 * pre-flight table would have found the discrepancy for us, live.
 *
 * So the numbers are now checked rather than trusted. Anything a doc asserts about the tool
 * surface is verified against the built server; anything it claims about the study is
 * verified against whether the study has actually been run.
 *
 *   npm run check:docs
 */

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { openFleet, APPS, APP_NAMES } from './lib/fleet.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const problems = [];
const notes = [];

/**
 * The ground truth, from all three running servers.
 *
 * This used to ask one. After the split there is no single number for "how many
 * tools does MENTOR have" — there are three surfaces and a fleet total — so a guard
 * that compared every asserted count against `sentinel`'s alone reported every
 * correct sentence in `DEPLOY.md`'s fleet table as a defect. A guard that fires on a
 * document doing its job gets switched off within a week, and then it protects
 * nothing (Gap 15 learned this once already, from the other direction).
 *
 * So the truth is now a *set*: each app's own count, and the fleet total. A prose
 * number is wrong only if it is none of those.
 */
async function fleetSurfaces() {
  const unbuilt = APP_NAMES.filter((n) => !existsSync(join(ROOT, APPS[n].dir, 'dist', 'index.js')));
  if (unbuilt.length) {
    notes.push(
      `${unbuilt.map((n) => APPS[n].dir).join(', ')} not built — skipped the tool-surface checks. ` +
        'Run npm run build:all.',
    );
    return null;
  }

  const fleet = await openFleet({ local: true, clientName: 'check-docs' });
  try {
    if (fleet.missing.length) {
      notes.push(`${fleet.missing.join(', ')} would not start — skipped the tool-surface checks.`);
      return null;
    }
    const perApp = new Map();
    for (const name of APP_NAMES) perApp.set(name, fleet.on(name).tools);
    return { perApp, all: fleet.allTools() };
  } finally {
    fleet.close();
  }
}

const docs = () => {
  const out = [];
  for (const f of readdirSync(ROOT)) if (f.endsWith('.md')) out.push(f);
  for (const d of ['pricing', 'safety-gear']) {
    const p = join('fixtures', d, 'README.md');
    if (existsSync(join(ROOT, p))) out.push(p);
  }
  return out;
};

const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
const lineOf = (text, index) => text.slice(0, index).split('\n').length;

const surfaces = await fleetSurfaces();

// ── 1. any asserted tool count must be the real one ───────────────────────────
//
// Scoped deliberately narrowly. The first version of this check also flagged every
// mention of an unregistered tool name, and produced 25 findings that were all
// correct behaviour: `ARCHITECTURE.md` *documents* the platform, so naturally it
// names `self_heal`; `DEPLOY.md` §7b is a backup demo script explicitly headed "not
// runnable as shipped"; `GAPS.md` explains why those tools were cut. A guard that
// fires on a doc doing its job gets switched off within a week, and then it protects
// nothing. So this checks the one thing that actually went wrong — an asserted
// *count* that the code owns and the prose copied — and leaves prose about the
// platform alone.
if (surfaces) {
  // Every count a doc is allowed to state: each app's own surface, and the fleet
  // total. `1` is added because "1 tool" appears in ordinary prose about a single
  // tool and flagging it would be noise rather than a finding.
  const legal = new Set([
    ...[...surfaces.perApp.values()].map((t) => t.length),
    surfaces.all.length,
    1,
  ]);
  const truth =
    [...surfaces.perApp.entries()].map(([n, t]) => `${n} ${t.length}`).join(', ') +
    `, fleet ${surfaces.all.length}`;
  const pattern = /(?:tools \((\d+)\)|(?:exactly |returns )?(\d+) tools)/gi;
  // A wrong count is legitimate when the sentence is history ("was exposing 23"),
  // a transition ("went 23 → 3"), or a diagnostic ("if you see 23, …").
  //
  // The arrow clause must require **digit → digit**. A bare `→` exemption looked
  // right and was useless: I reintroduced the original defect to test this guard and
  // it sailed through, because the defective line was literally
  // `tools/list → exactly 3 tools` and the arrow excused it. Testing the guard by
  // breaking the thing it exists to catch is the only way that surfaces.
  const HISTORICAL = /\bif you (?:see|get)\b|\bwas\b|\bwere\b|\bwent\b|\d+\s*(?:→|->)\s*\d+|pre-Gap|previously|used to\b|no longer\b/i;
  for (const rel of docs()) {
    const text = read(rel);
    const lines = text.split('\n');
    for (const m of text.matchAll(pattern)) {
      const n = Number(m[1] ?? m[2]);
      if (legal.has(n)) continue;
      const line = lineOf(text, m.index);
      // Markdown wraps, so the qualifying word is frequently on the line above the
      // number. Judging one line at a time produced two false positives on prose
      // that was already correct, so look at the sentence's neighbourhood instead.
      const context = lines.slice(Math.max(0, line - 3), line + 1).join(' ');
      if (HISTORICAL.test(context)) continue;
      problems.push(
        `${rel}:${line} asserts "${m[0]}", which is no app's surface and not the fleet total ` +
          `(${truth})\n      ${context.trim().slice(0, 130)}`,
      );
    }
  }

  // ── 2. reader instructions must not tell you to call a tool that is gone ─────
  // Only the two documents that are pure step-by-step instruction. Reference and
  // design docs are allowed — required, even — to discuss unregistered code.
  const INSTRUCTIONAL = ['TESTING.md', 'WALKTHROUGH.md'];
  const known = new Set(surfaces.all);
  const retired = ['self_heal', 'propose_patch', 'optimize_spend', 'run_organization', 'apply_for_scheme', 'verify_output', 'redline_contract'];
  for (const rel of INSTRUCTIONAL) {
    if (!existsSync(join(ROOT, rel))) continue;
    const text = read(rel);
    const lines = text.split('\n');
    for (const name of retired) {
      if (known.has(name)) continue;
      for (const m of text.matchAll(new RegExp('`' + name + '`', 'g'))) {
        const line = lineOf(text, m.index);
        const context = lines.slice(Math.max(0, line - 4), line + 1).join(' ').trim();
        // "No `self_heal`" is an assertion that it is absent — the opposite of an
        // instruction to call it.
        if (/\bNo `|must not|should not|absent|unregistered|Gap 11|if you see/i.test(context)) continue;
        problems.push(`${rel}:${line} tells the reader to use \`${name}\`, which the server does not serve\n      ${context.slice(0, 130)}`);
      }
    }
  }
}

// ── 3. nothing may claim a measurement until the study has one ────────────────
const studyPath = join(ROOT, 'STUDY.md');
if (existsSync(studyPath)) {
  const study = read('STUDY.md');
  const hasResults = !/⬜ \*\*No data yet\.\*\*/.test(study);
  if (!hasResults) {
    for (const rel of docs()) {
      if (rel === 'STUDY.md') continue;
      const text = read(rel);
      const lines = text.split('\n');
      // A doc is allowed to QUOTE the overclaim in order to disown it — Gap 15 does
      // exactly that, and the first run of this check flagged my own correction.
      // Distinguish making the claim from criticising it.
      const DISOWNED = /previously said|overclaim|must never|never say|rather than|instead of|was removed|is gone|do not say|NOT evidence|which was a|used to say/i;
      for (const m of text.matchAll(/\bwe measured it\b|\bwe measured\b|\bthe study (?:found|showed)\b/gi)) {
        const line = lineOf(text, m.index);
        const context = lines.slice(Math.max(0, line - 4), line + 3).join(' ');
        if (DISOWNED.test(context)) continue;
        problems.push(
          `${rel}:${line} claims a measurement ("${m[0]}") but STUDY.md has no results yet — ` +
            'say "designed", not "done"',
        );
      }
    }
  } else {
    notes.push('STUDY.md has results — measurement claims are now permitted.');
  }
}

// ── report ────────────────────────────────────────────────────────────────────
const G = (s) => '\x1b[32m' + s + '\x1b[0m';
const R = (s) => '\x1b[31m' + s + '\x1b[0m';

for (const n of notes) console.log(`  note  ${n}`);

if (problems.length) {
  console.error(R(`\nFAIL — ${problems.length} doc(s) contradict the code:\n`));
  for (const p of problems) console.error(`  · ${p}`);
  console.error('\nThese are the discrepancies a judge finds by running tools/list after reading the docs.');
  process.exit(1);
}

console.log(
  G('ok') +
    '  docs agree with the code' +
    (surfaces
      ? ` (${[...surfaces.perApp.entries()].map(([n, t]) => `${n} ${t.length}`).join(' · ')} · ` +
        `${surfaces.all.length} across the fleet)`
      : ''),
);
