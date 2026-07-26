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
 *
 * ## What used to be here, and why it is gone
 *
 * A second part compared the plan, build history and source embedded in
 * `sentinel/src/modules/mentor/fixtures.ts` against the files on disk. The split
 * renamed that module to `fixtures.demo.ts` and changed its exports, and the check
 * was written to *skip* when it could not find the file — so it had been printing
 * `skipped — sentinel/dist not built yet` on a fully built tree, and guarding
 * nothing, since the split. A guard that silently does nothing is worse than no
 * guard, because the green line reads as evidence.
 *
 * It is not repaired because it is superseded rather than broken:
 * `node scripts/embed_fixtures.mjs --check` regenerates every embedded module from
 * `fixtures/` and fails on any byte of difference, across all three apps, which is
 * strictly stronger than the semantic comparison this did for one. It runs next in
 * `npm run fixture:check`.
 */

import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
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

if (problems.length) {
  console.error('FAIL — the pricing fixture is not in its intended state:\n');
  for (const p of problems) console.error(`  · ${p}`);
  console.error('\nSee fixtures/pricing/README.md. Do not fix pricing.js.');
  process.exit(1);
}

console.log('ok  fixture is correctly broken:');
console.log(`ok    ${EXPECTED.pass}/${EXPECTED.total} pass, ${EXPECTED.fail} fails as designed`);
console.log(`ok    surfaces at pricing.test.js:${EXPECTED.atLine} ("${EXPECTED.message}")`);
console.log('ok    origin is pricing.js:12 — tax computed before discount exists');
console.log('note  embedded-copy sync is checked next, by embed_fixtures.mjs --check');
