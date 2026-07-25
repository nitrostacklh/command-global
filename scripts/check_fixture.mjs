/**
 * Assert the pricing fixture is in its intended BROKEN state.
 *
 * Run from the monorepo root:  npm run fixture:check
 *
 * Why this exists: `fixtures/pricing/build/pricing.js` is supposed to fail test 3.
 * The broken build *is* the fixture — MENTOR has nothing to explain if it's green.
 * But a red test is an irresistible target, and prose warnings in README.md and
 * GAPS.md don't stop anyone. So the intended state is asserted here instead:
 * exits 0 when the fixture is correctly broken, and non-zero if someone fixed it.
 *
 * `npm run fixture:test` shows the raw runner output; this is the check.
 */

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TEST_FILE = join(ROOT, 'fixtures', 'pricing', 'build', 'pricing.test.js');

const EXPECTED = {
  total: 3,
  pass: 2,
  fail: 1,
  failingTest: 'test 3 — 40% discount, 20% tax',
  atLine: 40,
  message: '80 !== 72',
};

const run = spawnSync(process.execPath, ['--test', TEST_FILE], { encoding: 'utf8' });
const out = `${run.stdout}${run.stderr}`;

const num = (label) => {
  const m = out.match(new RegExp(`^# ${label} (\\d+)$`, 'm'));
  return m ? Number(m[1]) : null;
};

const problems = [];
const got = { total: num('tests'), pass: num('pass'), fail: num('fail') };

if (got.total !== EXPECTED.total) problems.push(`expected ${EXPECTED.total} tests, saw ${got.total}`);
if (got.pass !== EXPECTED.pass) problems.push(`expected ${EXPECTED.pass} passing, saw ${got.pass}`);
if (got.fail !== EXPECTED.fail) {
  problems.push(
    got.fail === 0
      ? `expected ${EXPECTED.fail} FAILING test, saw 0 — has pricing.js been "fixed"? Revert it; the broken build is the fixture.`
      : `expected ${EXPECTED.fail} failing, saw ${got.fail}`,
  );
}
if (!out.includes(EXPECTED.failingTest)) {
  problems.push(`the failing test is no longer "${EXPECTED.failingTest}"`);
}
if (!out.includes(`pricing.test.js:${EXPECTED.atLine}`)) {
  problems.push(
    `the failure no longer reports at pricing.test.js:${EXPECTED.atLine} — ` +
      `MENTOR-CONCEPT.md §3 and fixtures/pricing/README.md both cite that line`,
  );
}
if (!out.includes(EXPECTED.message)) {
  problems.push(`expected the assertion message "${EXPECTED.message}"`);
}

// ── Part 2: the fixture MENTOR ships must match the fixture on disk ────────
//
// `sentinel/src/modules/mentor/fixtures.ts` embeds copies of plan.lumina.json and
// build.history.json, because on NitroCloud the app can't read this directory.
// Copies drift. A demo that disagrees with the fixture it documents is worse than
// either alone, so the two are compared here rather than trusted.
//
// Compared semantically, not byte-for-byte: the embedded copies are reformatted
// for readability, and the on-disk files carry authoring extras ($comment,
// planId, expectedDrift) that the app has no reason to ship.
const IGNORED_KEYS = new Set(['$comment', 'planId', 'planRef', 'expectedDrift', 'note', 'whyItHidUntilNow']);

function strip(value) {
  if (Array.isArray(value)) return value.map(strip);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([k, v]) => !IGNORED_KEYS.has(k) && v !== null)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => [k, strip(v)]),
    );
  }
  return value;
}

const syncProblems = [];
const bundlePath = join(ROOT, 'sentinel', 'dist', 'modules', 'mentor', 'fixtures.js');

if (!existsSync(bundlePath)) {
  console.log('note  skipped embedded-fixture sync check — sentinel/dist not built yet');
  console.log('note  run `npm test` first (or `npm run verify`, which does)');
} else {
  const bundled = await import(pathToFileURL(bundlePath).href);
  const pairs = [
    ['plan.lumina.json', bundled.PRICING_PLAN_JSON, join(ROOT, 'fixtures', 'pricing', 'plan.lumina.json')],
    ['build.history.json', bundled.PRICING_BUILD_JSON, join(ROOT, 'fixtures', 'pricing', 'build.history.json')],
  ];
  for (const [label, embedded, diskPath] of pairs) {
    const a = strip(JSON.parse(embedded));
    const b = strip(JSON.parse(readFileSync(diskPath, 'utf8')));
    if (JSON.stringify(a) !== JSON.stringify(b)) {
      syncProblems.push(
        `${label} has drifted from the copy embedded in sentinel/src/modules/mentor/fixtures.ts — ` +
          'update whichever is stale so the demo matches the documented fixture',
      );
    }
  }

  // The build source MENTOR shows must be the file the student is looking at.
  const diskSource = readFileSync(join(ROOT, 'fixtures', 'pricing', 'build', 'pricing.js'), 'utf8');
  if (diskSource.replace(/\r\n/g, '\n') !== bundled.PRICING_BUILD_SOURCE.replace(/\r\n/g, '\n')) {
    syncProblems.push(
      'fixtures/pricing/build/pricing.js differs from PRICING_BUILD_SOURCE in fixtures.ts — ' +
        'MENTOR would show the student source they are not actually running',
    );
  }
}

if (problems.length || syncProblems.length) {
  console.error('FAIL — the pricing fixture is not in its intended state:\n');
  for (const p of [...problems, ...syncProblems]) console.error(`  · ${p}`);
  console.error('\nSee fixtures/pricing/README.md. Do not fix pricing.js.');
  process.exit(1);
}

console.log('ok  fixture is correctly broken:');
console.log(`ok    ${EXPECTED.pass}/${EXPECTED.total} pass, ${EXPECTED.fail} fails as designed`);
console.log(`ok    surfaces at pricing.test.js:${EXPECTED.atLine} ("${EXPECTED.message}")`);
console.log('ok    origin is pricing.js:12 — tax computed before discount exists');
if (existsSync(bundlePath)) {
  console.log('ok    MENTOR\'s embedded plan + build + source match the files on disk');
}
