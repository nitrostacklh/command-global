/**
 * Generate `sentinel/src/modules/learn/fixtures.learn.ts` from the JSON in
 * `fixtures/`.
 *
 * ## Why generate rather than hand-copy
 *
 * The deployed bundle is the `sentinel/` folder alone, so `fixtures/` is not
 * there at runtime (`ARCHITECTURE.md` §15) and the demo artifacts have to travel
 * inside the app. `mentor/fixtures.ts` solves that by holding a verbatim copy as
 * a template string, kept honest by `scripts/check_fixture.mjs`.
 *
 * That pattern works, but hand-copying five documents is a typo looking for a
 * place to happen, and a typo in a *fixture* fails as a wrong claim about a
 * student's code rather than as an error. So this writes the copy instead, from
 * the files themselves, and `check_fixture.mjs` then verifies the result still
 * matches. Generated once and committed — the build must never need this script,
 * because a judge running `npm run verify` on a clean clone only has Node.
 *
 *   node scripts/embed_learn_fixtures.mjs           # rewrite the module
 *   node scripts/embed_learn_fixtures.mjs --check   # exit 1 if it would change
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'sentinel', 'src', 'modules', 'learn', 'fixtures.learn.ts');
const CHECK = process.argv.includes('--check');

/** [constant name, path under fixtures/] */
const DOCS = [
  ['CATALOG_JSON', 'catalog.json'],
  ['PRICING_BRIEF_JSON', 'pricing/brief.backend.json'],
  ['SAFETY_BRIEF_JSON', 'safety-gear/brief.cv.json'],
  ['SAFETY_PLAN_JSON', 'safety-gear/plan.lumina.json'],
  ['SAFETY_BUILD_JSON', 'safety-gear/build.history.json'],
];

/** Escape for a TS template literal: backslash, backtick, and `${`. */
const forTemplate = (s) => s.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');

const header = `/**
 * The bundled learning-loop artifacts — GENERATED, do not edit by hand.
 *
 * Written by \`scripts/embed_learn_fixtures.mjs\` from the JSON in \`fixtures/\`,
 * because the deployed bundle is \`sentinel/\` alone and cannot read that
 * directory at runtime (\`ARCHITECTURE.md\` §15). Same reasoning as
 * \`mentor/fixtures.ts\`, which predates this and is still hand-maintained.
 *
 * To change any of these, edit the JSON under \`fixtures/\` and re-run:
 *
 *   node scripts/embed_learn_fixtures.mjs
 *
 * \`npm run fixture:check\` fails if this file and those files disagree.
 */

/* eslint-disable */
import { parseCatalog, type Catalog } from './catalog.js';
import { parseBrief, type Brief } from './brief.js';
import { parsePlan, type Plan } from '../mentor/plan.js';
import { parseBuild, type Build } from '../mentor/build.js';
`;

const body = DOCS.map(([name, rel]) => {
  const raw = readFileSync(join(ROOT, 'fixtures', rel), 'utf8');
  return `\n/** Verbatim copy of \`fixtures/${rel}\`. */\nexport const ${name} = \`${forTemplate(raw)}\`;\n`;
}).join('');

const footer = `
/** Every embedded document, for the sync guard to walk. */
export const EMBEDDED: ReadonlyArray<{ name: string; file: string; json: string }> = [
${DOCS.map(([name, rel]) => `  { name: '${name}', file: 'fixtures/${rel}', json: ${name} },`).join('\n')}
];

export function bundledCatalog(): Catalog {
  return parseCatalog(CATALOG_JSON);
}

/** The briefs that exist, keyed \`project/role\` — the catalog's \`briefed: true\` set. */
const BRIEFS: Readonly<Record<string, string>> = {
  'pricing/backend': PRICING_BRIEF_JSON,
  'safety-gear/cv': SAFETY_BRIEF_JSON,
};

/** null for a role the catalog advertises but has no brief for yet. */
export function bundledBrief(project: string, role: string): Brief | null {
  const raw = BRIEFS[\`\${project}/\${role}\`];
  return raw ? parseBrief(raw) : null;
}

export function bundledBriefKeys(): string[] {
  return Object.keys(BRIEFS);
}

/**
 * The plan + build for a project, when one is bundled.
 *
 * \`pricing\` deliberately is not here: its plan and build live in
 * \`mentor/fixtures.ts\` and are \`explain_drift\`'s default. Duplicating them
 * would create a second copy of the one demo everything else asserts against.
 */
export function bundledProjectArtifacts(project: string): { plan: Plan; build: Build } | null {
  if (project !== 'safety-gear') return null;
  return { plan: parsePlan(SAFETY_PLAN_JSON), build: parseBuild(SAFETY_BUILD_JSON) };
}
`;

const generated = header + body + footer;

if (CHECK) {
  let current = '';
  try {
    current = readFileSync(OUT, 'utf8');
  } catch {
    console.error('fixtures.learn.ts is missing — run: node scripts/embed_learn_fixtures.mjs');
    process.exit(1);
  }
  if (current !== generated) {
    console.error(
      'fixtures.learn.ts is out of sync with fixtures/*.json — run: node scripts/embed_learn_fixtures.mjs',
    );
    process.exit(1);
  }
  console.log('ok  fixtures.learn.ts matches fixtures/*.json');
} else {
  writeFileSync(OUT, generated);
  console.log(`wrote ${OUT} (${DOCS.length} documents)`);
}
