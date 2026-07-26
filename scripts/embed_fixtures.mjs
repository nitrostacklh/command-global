/**
 * Split `fixtures/` three ways and embed each half in the app that owns it.
 *
 *   node scripts/embed_fixtures.mjs           # rewrite the generated modules
 *   node scripts/embed_fixtures.mjs --check   # exit 1 if any would change
 *
 * ## Why generate rather than hand-copy
 *
 * Each MCP app deploys as a lone folder, so `fixtures/` is not on disk at runtime
 * and the demo artifacts have to travel inside the image. Hand-copying eleven
 * documents into three apps is a typo looking for a place to happen — and a typo
 * in a *fixture* does not fail as an error, it fails as a confidently wrong claim
 * about a student's code.
 *
 * ## The split is the security boundary, and this script is what enforces it
 *
 * A brief in `fixtures/` is authored as one document, because that is how a human
 * writes one. It is embedded as **two**:
 *
 *   fixtures/pricing/brief.backend.json
 *        │
 *        ├──▶ mcp-roster   the assignment, with concept.answer and
 *        │                 concept.transfers_to REMOVED
 *        └──▶ mcp-profile  the concept bank: key ▶ { question, answer, transfers_to }
 *
 * MCP‑1 therefore cannot leak a flashcard answer through a verbose tool, a log
 * line, or a widget that renders its input — the string is not in that process.
 * That is a stronger guarantee than a `withheld: true` flag, which only protects
 * against carelessness in the code paths someone remembered to check.
 *
 * The stripping is asserted both ways: the roster copy must not contain the answer
 * text, and the concept bank must. Either check failing fails the build.
 *
 * ## It also stops the catalog from lying
 *
 * `catalog.json` claims `briefed` and `demo` per seat. This script derives both
 * from what is actually on disk and fails if the claim disagrees. A catalog that
 * advertises a playable role with no brief behind it is the one bug a student meets
 * before they have any reason to trust the tool.
 *
 * Generated output is committed. The build must never need this script, because a
 * judge running `npm run verify` on a clean clone only has Node.
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FIXTURES = join(ROOT, 'fixtures');
const CHECK = process.argv.includes('--check');

const G = (s) => `\x1b[32m${s}\x1b[0m`;
const R = (s) => `\x1b[31m${s}\x1b[0m`;
const DIM = (s) => `\x1b[2m${s}\x1b[0m`;

const problems = [];
const fail = (msg) => problems.push(msg);

// ── read ─────────────────────────────────────────────────────────────────────

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));

/** Drop `$`-prefixed keys recursively — they are notes to a human reader. */
function stripComments(value) {
  if (Array.isArray(value)) return value.map(stripComments);
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (k.startsWith('$')) continue;
      out[k] = stripComments(v);
    }
    return out;
  }
  return value;
}

const catalog = readJson(join(FIXTURES, 'catalog.json'));

/** Every `<project>/brief.<role>.json` on disk, plus the demo artifacts beside it. */
const projects = [];
for (const entry of readdirSync(FIXTURES, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const dir = join(FIXTURES, entry.name);
  const briefs = readdirSync(dir)
    .filter((f) => /^brief\.[a-z0-9-]+\.json$/.test(f))
    .map((f) => ({ role: f.slice('brief.'.length, -'.json'.length), file: join(dir, f) }));
  const planFile = join(dir, 'plan.lumina.json');
  const buildFile = join(dir, 'build.history.json');
  projects.push({
    key: entry.name,
    briefs,
    plan: existsSync(planFile) ? planFile : null,
    build: existsSync(buildFile) ? buildFile : null,
  });
}

// ── the catalog cannot lie ───────────────────────────────────────────────────

const onDisk = new Map(projects.map((p) => [p.key, p]));
for (const project of catalog.projects ?? []) {
  const disk = onDisk.get(project.key);
  for (const role of project.roles ?? []) {
    const hasBrief = !!disk?.briefs.some((b) => b.role === role.key);
    const hasDemo = !!(disk?.plan && disk?.build);
    const seat = `${project.key}/${role.key}`;

    if (role.briefed === true && !hasBrief) {
      fail(
        `catalog says ${seat} is briefed, but fixtures/${project.key}/brief.${role.key}.json ` +
          'does not exist — a student would pick it and hit an empty screen',
      );
    }
    if (role.briefed !== true && hasBrief) {
      fail(
        `fixtures/${project.key}/brief.${role.key}.json exists but the catalog does not mark ` +
          `${seat} as briefed — the work is written and unreachable`,
      );
    }
    if (role.demo === true && !hasDemo) {
      fail(
        `catalog says ${seat} is demoable, but ${project.key}/ has no plan.lumina.json + ` +
          'build.history.json pair to demo with',
      );
    }
  }
}

// ── ① MCP-1: the catalog and the briefs, answers removed ─────────────────────

/** Escape for a TS template literal: backslash, backtick, and `${`. */
const forTemplate = (s) => s.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');

const json = (value) => JSON.stringify(value, null, 2);

const briefEntries = [];
const conceptEntries = [];
const lessonEntries = [];

/** Panel kinds, in the order a student walks them. `commit` must precede `witness`. */
const PANEL_KINDS = ['setup', 'commit', 'witness', 'generalise'];

/** Kept in step with `LESSON_SCHEMA` in `mcp-roster/src/catalog/lesson.ts`. */
const LESSON_SCHEMA_LITERAL = 'mentor.lesson/v1';

for (const project of projects) {
  for (const { role, file } of project.briefs) {
    const brief = stripComments(readJson(file));
    const concept = brief.concept ?? {};
    const seat = `${project.key}/${role}`;

    if (!concept.key) fail(`${seat}: brief.concept.key is missing — MCP-3 cannot file a card`);
    if (!concept.question) fail(`${seat}: brief.concept.question is missing`);
    if (!concept.answer) fail(`${seat}: brief.concept.answer is missing — nothing to earn`);

    // The lesson is its own artifact, not part of the brief. Layer 2 is a stage of
    // the loop in its own right, and every other stage hands over one versioned
    // document rather than a bigger version of the previous one.
    const { lesson, ...briefWithoutLesson } = brief;

    // The stripped copy MCP-1 gets. `answer` and `transfers_to` both go: the
    // answer is the reward, and transfers_to is the generalisation that makes the
    // answer land, so handing it over early gives away the shape of the lesson.
    const forRoster = {
      ...briefWithoutLesson,
      concept: { key: concept.key, question: concept.question },
    };

    const rosterText = json(forRoster);
    if (concept.answer && rosterText.includes(concept.answer.slice(0, 40))) {
      fail(`${seat}: the answer survived stripping into the MCP-1 copy — refusing to write it`);
    }

    // ── the lesson, and the one rule it has to obey ──────────────────────────
    //
    // A lesson that states the principle is not a lesson, it is the flashcard
    // early. These panels are allowed to set up the problem, make the student
    // commit to an order, and show the case that separates the two — and that is
    // where they stop. The student derives the rule; MCP-3 confirms it, once the
    // tests are green. So the same assertion the brief gets applies here, against
    // both the answer and the generalisation.
    if (lesson) {
      const lessonText = json(lesson);

      if (concept.answer) {
        // Sentence-wise rather than whole-string: a lesson would never paste the
        // answer entire, it would paste the sentence that gives it away.
        for (const sentence of concept.answer.split(/(?<=\.)\s+/)) {
          const s = sentence.trim();
          if (s.length > 30 && lessonText.includes(s)) {
            fail(`${seat}: a lesson panel contains the concept answer — that is the flashcard, early`);
            break;
          }
        }
      }
      for (const clause of (concept.transfers_to ?? '').split(/[:;]/)) {
        const c = clause.trim();
        if (c.length > 30 && lessonText.includes(c)) {
          fail(`${seat}: a lesson panel contains transfers_to — the student is meant to generalise, not read it`);
          break;
        }
      }

      const kinds = (lesson.panels ?? []).map((p) => p.kind);
      if (!lesson.title) fail(`${seat}: lesson.title is missing`);
      if (kinds.length < 3) fail(`${seat}: a lesson needs at least 3 panels, has ${kinds.length}`);
      for (const k of kinds) {
        if (!PANEL_KINDS.includes(k)) fail(`${seat}: unknown panel kind ${JSON.stringify(k)}`);
      }
      // The commit panel is the whole pedagogy: the witness case only teaches
      // anything to a student who already picked a side. Order is load-bearing.
      if (kinds.indexOf('commit') > kinds.indexOf('witness')) {
        fail(`${seat}: the witness panel comes before the commit panel — the reveal lands on nobody`);
      }
      const commit = (lesson.panels ?? []).find((p) => p.kind === 'commit');
      const witness = (lesson.panels ?? []).find((p) => p.kind === 'witness');
      if (commit && witness) {
        // Every choice the student can make must have a result in every case, or
        // the student picks an option the reveal has nothing to say about.
        const choiceIds = (commit.choices ?? []).map((c) => c.id);
        if (choiceIds.length < 2) fail(`${seat}: the commit panel offers fewer than 2 choices`);
        for (const kase of witness.cases ?? []) {
          for (const id of choiceIds) {
            if (!(id in (kase.results ?? {}))) {
              fail(`${seat}: witness case ${JSON.stringify(kase.input)} has no result for choice ${JSON.stringify(id)}`);
            }
          }
        }
        // A lesson whose cases all agree has no discriminating case, and a lesson
        // whose cases all diverge never shows why the bug hides.
        const outcomes = new Set((witness.cases ?? []).map((k) => k.outcome));
        if (!outcomes.has('agree') || !outcomes.has('diverge')) {
          fail(`${seat}: the witness panel needs both an 'agree' case and a 'diverge' case`);
        }
      }

      lessonEntries.push({
        seat,
        project: project.key,
        role,
        conceptKey: concept.key,
        text: lessonText,
      });
    }

    briefEntries.push({ seat, text: rosterText });
    conceptEntries.push({
      key: concept.key,
      project: project.key,
      role,
      question: concept.question,
      answer: concept.answer ?? '',
      transfersTo: concept.transfers_to ?? '',
    });
  }
}

// A concept key reused across two seats with different answers would make the
// bank's lookup non-deterministic, and the wrong lesson is worse than none.
const byKey = new Map();
for (const c of conceptEntries) {
  const prior = byKey.get(c.key);
  if (prior && prior.answer !== c.answer) {
    fail(
      `concept key ${JSON.stringify(c.key)} is used by both ${prior.project}/${prior.role} and ` +
        `${c.project}/${c.role} with different answers — the bank could return either`,
    );
  }
  byKey.set(c.key, c);
}

const lessonsModule = `/**
 * The bundled lessons — GENERATED, do not edit by hand.
 *
 * Written by \`scripts/embed_fixtures.mjs\` from the \`lesson\` block of each brief
 * under \`fixtures/\`, because this app deploys as a lone folder and cannot read that
 * directory at runtime.
 *
 * **No panel below states the principle it is teaching, and the generator asserts
 * that.** A panel carrying a sentence of \`concept.answer\`, or a clause of
 * \`concept.transfers_to\`, fails the build — the answer is what the student earns
 * from MCP-3 against their own green tests, and a lesson that pastes it here would
 * be the flashcard, early, from the one process that has never held one.
 *
 * What the panels do instead: set the problem up, make the student commit to an
 * order before they are shown anything, then show the single case that tells the
 * two answers apart. Deriving the rule is the student's job. That is the difference
 * between a lesson and documentation, and it is the reason this stage exists at all.
 *
 * To change any of these, edit the \`lesson\` block in the brief JSON under
 * \`fixtures/\` and re-run:
 *
 *   node scripts/embed_fixtures.mjs
 */

/* eslint-disable */
import { parseLesson, type Lesson } from './lesson.js';

/** Keyed \`project/role\`. */
export const LESSON_JSON: Record<string, string> = {
${lessonEntries.map((l) => `  ${JSON.stringify(l.seat)}: \`${forTemplate(l.text)}\`,`).join('\n')}
};

/** The concept each seat's lesson teaches, so a caller can name it without parsing. */
export const LESSON_CONCEPT: Record<string, string> = {
${lessonEntries.map((l) => `  ${JSON.stringify(l.seat)}: ${JSON.stringify(l.conceptKey)},`).join('\n')}
};

const cache = new Map<string, Lesson | null>();

/**
 * The lesson for one seat, or \`null\` when that seat has none written yet.
 *
 * Null is a real answer here, not a failure. Gap 14 is honest that only some of the
 * catalog's roles are playable, and a seat with a brief but no lesson should say so
 * rather than invent one.
 */
export function bundledLesson(project: string, role: string): Lesson | null {
  const seat = \`\${project}/\${role}\`;
  if (cache.has(seat)) return cache.get(seat) ?? null;

  const raw = LESSON_JSON[seat];
  if (!raw) {
    cache.set(seat, null);
    return null;
  }
  const parsed = parseLesson({
    ...JSON.parse(raw),
    schema: '${LESSON_SCHEMA_LITERAL}',
    project,
    role,
    conceptKey: LESSON_CONCEPT[seat] ?? '',
  });
  cache.set(seat, parsed);
  return parsed;
}

/** Every seat that has a lesson, as \`project/role\`. */
export function lessonSeats(): string[] {
  return Object.keys(LESSON_JSON);
}
`;

const rosterModule = `/**
 * The bundled catalog and briefs — GENERATED, do not edit by hand.
 *
 * Written by \`scripts/embed_fixtures.mjs\` from the JSON in \`fixtures/\`, because
 * this app deploys as a lone folder and cannot read that directory at runtime.
 *
 * **The concept answers are not here, and that is the point.** Each brief below has
 * had \`concept.answer\` and \`concept.transfers_to\` removed; they live only in
 * MCP-3 (\`mcp-profile/src/concepts/\`), which releases one against a student's real
 * test output. A bug in this app cannot leak what the student is meant to earn,
 * because the string is not in this process. The generator asserts the removal in
 * both directions and \`npm run fixture:check\` fails if either side drifts.
 *
 * To change any of these, edit the JSON under \`fixtures/\` and re-run:
 *
 *   node scripts/embed_fixtures.mjs
 */

/* eslint-disable */
import { parseCatalog, type Catalog } from './catalog.js';
import { parseBrief, type Brief } from './brief.js';

export const CATALOG_JSON = \`${forTemplate(json(stripComments(catalog)))}\`;

/** Keyed \`project/role\`. Answers stripped — see the header. */
export const BRIEF_JSON: Record<string, string> = {
${briefEntries.map((b) => `  ${JSON.stringify(b.seat)}: \`${forTemplate(b.text)}\`,`).join('\n')}
};

let catalogCache: Catalog | null = null;
export function bundledCatalog(): Catalog {
  catalogCache ??= parseCatalog(CATALOG_JSON);
  return catalogCache;
}

const briefCache = new Map<string, Brief | null>();

/** The brief for one seat, or \`null\` when that role has none written yet. */
export function bundledBrief(project: string, role: string): Brief | null {
  const seat = \`\${project}/\${role}\`;
  if (briefCache.has(seat)) return briefCache.get(seat) ?? null;
  const raw = BRIEF_JSON[seat];
  const brief = raw ? parseBrief(raw) : null;
  briefCache.set(seat, brief);
  return brief;
}

/** Every seat that has a brief, for the honesty line in \`list_roles\`. */
export function briefedSeats(): { project: string; role: string }[] {
  return Object.keys(BRIEF_JSON).map((seat) => {
    const [project, role] = seat.split('/');
    return { project, role };
  });
}
`;

// ── ② MCP-3: the concept bank — the only place an answer exists ──────────────

const conceptsModule = `/**
 * The concept bank — GENERATED, do not edit by hand.
 *
 * Written by \`scripts/embed_fixtures.mjs\` from the \`concept\` block of each brief
 * under \`fixtures/\`.
 *
 * **This is the only process in the system that holds a flashcard answer.** MCP-1
 * hands out the question and the key; MCP-2's verdict carries the key. Neither has
 * ever had the answer, so neither can leak it. Releasing one is gated here, in
 * \`../cards/card.ts\`, on the student's own test output — and while the tests are
 * red the \`back\` field is *absent from the response object* rather than present
 * with a flag, because a field a model can read is a field it will read out.
 *
 * To change any of these, edit the brief JSON under \`fixtures/\` and re-run:
 *
 *   node scripts/embed_fixtures.mjs
 */

/* eslint-disable */

export interface ConceptEntry {
  readonly key: string;
  readonly project: string;
  readonly role: string;
  /** The card front. Also held by MCP-1, which is fine — a question gives nothing away. */
  readonly question: string;
  /** The card back. The principle, never the corrected line. */
  readonly answer: string;
  /** Where else this shows up, so the lesson outlives the project. */
  readonly transfersTo: string;
}

export const CONCEPTS: Record<string, ConceptEntry> = {
${[...byKey.values()]
  .map(
    (c) => `  ${JSON.stringify(c.key)}: {
    key: ${JSON.stringify(c.key)},
    project: ${JSON.stringify(c.project)},
    role: ${JSON.stringify(c.role)},
    question: ${JSON.stringify(c.question)},
    answer: ${JSON.stringify(c.answer)},
    transfersTo: ${JSON.stringify(c.transfersTo)},
  },`,
  )
  .join('\n')}
};

/** Look up a concept by the key that travelled in the spec and the verdict. */
export function findConcept(key: string): ConceptEntry | null {
  return CONCEPTS[key] ?? null;
}

/**
 * The concept a seat teaches.
 *
 * Used when a student asks for their card before any verdict has been filed — the
 * key would normally arrive in the verdict, and this is how the tool can still name
 * the right lesson (and then withhold it for the right reason) instead of failing
 * with "unknown concept".
 */
export function conceptForSeat(project: string, role?: string): ConceptEntry | null {
  const matches = Object.values(CONCEPTS).filter(
    (c) => c.project === project && (!role || c.role === role),
  );
  return matches[0] ?? null;
}

export function conceptKeys(): string[] {
  return Object.keys(CONCEPTS);
}
`;

// ── ③ MCP-2: the demo plans and build histories ─────────────────────────────

const demoPlans = [];
const demoBuilds = [];
for (const project of projects) {
  if (project.plan) {
    demoPlans.push({ key: project.key, text: json(stripComments(readJson(project.plan))) });
  }
  if (project.build) {
    demoBuilds.push({ key: project.key, text: json(stripComments(readJson(project.build))) });
  }
}

const pricingSourceFile = join(FIXTURES, 'pricing', 'build', 'pricing.js');
const pricingSource = existsSync(pricingSourceFile) ? readFileSync(pricingSourceFile, 'utf8') : '';
if (!pricingSource) {
  fail('fixtures/pricing/build/pricing.js is missing — the demo has no source to show');
}

const demoModule = `/**
 * The bundled demo projects — GENERATED, do not edit by hand.
 *
 * Written by \`scripts/embed_fixtures.mjs\` from the JSON in \`fixtures/\`. This app
 * deploys as a lone folder, so a student's own artifacts arrive as tool arguments
 * and these are the fallback that makes the demo a single call with nothing to
 * upload.
 *
 * Three projects, three provenance levels — \`authored\`, \`observed\`, \`git\` — which
 * is what makes the confidence score demonstrably derived rather than tuned.
 *
 * To change any of these, edit the JSON under \`fixtures/\` and re-run:
 *
 *   node scripts/embed_fixtures.mjs
 */

/* eslint-disable */
import { parsePlan, type Plan } from '../../shared/plan.js';
import { parseBuild, type Build } from './build.js';

export const DEMO_PLAN_JSON: Record<string, string> = {
${demoPlans.map((p) => `  ${JSON.stringify(p.key)}: \`${forTemplate(p.text)}\`,`).join('\n')}
};

export const DEMO_BUILD_JSON: Record<string, string> = {
${demoBuilds.map((b) => `  ${JSON.stringify(b.key)}: \`${forTemplate(b.text)}\`,`).join('\n')}
};

/**
 * The source the student wrote, so the origin line can be shown in context.
 *
 * Read-only by construction: no tool in this app writes it, and the drift run
 * asserts it is byte-identical at the end.
 */
export const PRICING_BUILD_SOURCE = \`${forTemplate(pricingSource)}\`;

/** The opening symptom — what the student arrives with. */
export const PRICING_SYMPTOM =
  'test 3 fails: computeTotal($100 cart, 40% discount, 20% tax) returned 80.00, expected 72.00 ' +
  '(build/pricing.test.js:40). Tests 1 and 2 pass.';

/** The project used when a caller supplies nothing at all. */
export const DEFAULT_DEMO = 'pricing';

const planCache = new Map<string, Plan>();
const buildCache = new Map<string, Build>();

export function bundledPlan(project: string = DEFAULT_DEMO): Plan | null {
  if (planCache.has(project)) return planCache.get(project) ?? null;
  const raw = DEMO_PLAN_JSON[project];
  if (!raw) return null;
  const plan = parsePlan(raw);
  planCache.set(project, plan);
  return plan;
}

export function bundledBuild(project: string = DEFAULT_DEMO): Build | null {
  if (buildCache.has(project)) return buildCache.get(project) ?? null;
  const raw = DEMO_BUILD_JSON[project];
  if (!raw) return null;
  const build = parseBuild(raw);
  buildCache.set(project, build);
  return build;
}

/**
 * Same, but throws when the project has no worked example.
 *
 * For the paths where a missing demo is a build error rather than a runtime
 * condition — the tests, and the argument-free demo call, which is documented as
 * always working. Keeping the nullable pair separate means the tools that legitimately
 * handle "this project needs your own plan" cannot silently get an exception instead.
 */
export function requirePlan(project: string = DEFAULT_DEMO): Plan {
  const plan = bundledPlan(project);
  if (!plan) throw new Error(\`no bundled plan for \${project} — bundled: \${demoProjects().join(', ')}\`);
  return plan;
}

export function requireBuild(project: string = DEFAULT_DEMO): Build {
  const build = bundledBuild(project);
  if (!build) throw new Error(\`no bundled build history for \${project} — bundled: \${demoProjects().join(', ')}\`);
  return build;
}

/** Projects that run end to end with no arguments. */
export function demoProjects(): string[] {
  return Object.keys(DEMO_PLAN_JSON).filter((k) => k in DEMO_BUILD_JSON);
}
`;

// ── write or check ───────────────────────────────────────────────────────────

/**
 * MCP-1 gets the demo *plans* but not the demo build histories.
 *
 * It needs a plan because `check_scope` and `checkpoint_spec` are both defined
 * against one, and the one-click demo has to work with nothing uploaded. It has no
 * business holding a build history: what the student actually did is MCP-2's
 * subject, and a service that cannot see the build cannot be tempted to have an
 * opinion about it.
 */
const rosterPlansModule = `/**
 * The bundled demo plans — GENERATED, do not edit by hand.
 *
 * Written by \`scripts/embed_fixtures.mjs\` from each project's plan.lumina.json.
 *
 * These are the designs behind the worked examples, so \`check_scope\` and
 * \`checkpoint_spec\` run with nothing uploaded. A student's real plan arrives as a
 * tool argument and takes precedence over every one of these.
 *
 * The matching build histories are deliberately **not** here — see the note in
 * \`scripts/embed_fixtures.mjs\`. What the student actually did belongs to MCP-2.
 */

/* eslint-disable */
import { parsePlan, type Plan } from '../shared/plan.js';

export const DEMO_PLAN_JSON: Record<string, string> = {
${demoPlans.map((p) => `  ${JSON.stringify(p.key)}: \`${forTemplate(p.text)}\`,`).join('\n')}
};

const cache = new Map<string, Plan>();

/** The bundled design for a project, or \`null\` when there is no worked example. */
export function bundledPlan(project: string): Plan | null {
  if (cache.has(project)) return cache.get(project) ?? null;
  const raw = DEMO_PLAN_JSON[project];
  if (!raw) return null;
  const plan = parsePlan(raw);
  cache.set(project, plan);
  return plan;
}

/** Projects with a bundled design, so a tool can say which ones need no upload. */
export function projectsWithBundledPlans(): string[] {
  return Object.keys(DEMO_PLAN_JSON);
}
`;

const OUTPUTS = [
  { path: join(ROOT, 'mcp-roster', 'src', 'catalog', 'fixtures.roster.ts'), text: rosterModule },
  { path: join(ROOT, 'mcp-roster', 'src', 'catalog', 'fixtures.lessons.ts'), text: lessonsModule },
  { path: join(ROOT, 'mcp-roster', 'src', 'catalog', 'fixtures.plans.ts'), text: rosterPlansModule },
  { path: join(ROOT, 'mcp-profile', 'src', 'concepts', 'fixtures.concepts.ts'), text: conceptsModule },
  { path: join(ROOT, 'sentinel', 'src', 'modules', 'mentor', 'fixtures.demo.ts'), text: demoModule },
];

if (problems.length) {
  console.error(R(`\n${problems.length} fixture problem(s) — nothing written:\n`));
  for (const p of problems) console.error(`  • ${p}`);
  process.exit(1);
}

console.log(`\n\x1b[1m${CHECK ? 'Checking' : 'Embedding'}\x1b[0m fixtures → 3 apps\n`);
console.log(
  DIM(
    `  ${projects.length} project(s), ${briefEntries.length} brief(s), ` +
      `${byKey.size} concept(s), ${demoPlans.length} demo plan(s)\n`,
  ),
);

/**
 * Is the file on disk the same *content* as what we would generate?
 *
 * Line endings are deliberately not part of the answer. Git checks these files out
 * as CRLF wherever `core.autocrlf` is on — which is the default on Windows — while
 * this generator always writes LF. A raw `===` therefore reported **every** generated
 * module STALE on a Windows clone, with zero content drift: running the generator
 * produced no `git diff` at all, and the next `git checkout` put the CRLFs straight
 * back. That made `npm run fixture:check`, and so `npm run verify`, permanently red on
 * one platform for a reason that has nothing to do with fixtures.
 *
 * That is worse than it sounds. This check is the guard that stops the embedded copies
 * drifting from `fixtures/`, and a guard that cries wolf on every Windows machine is a
 * guard people learn to skip — the exact failure `GAPS.md` Gap 15 was written about.
 *
 * Normalising here rather than in `.gitattributes` on purpose: a `text eol=lf` rule
 * would renormalise the working tree of every clone, which is a large diff to take for
 * a comparison bug. The convention on disk is left alone; only the comparison changes.
 */
const sameContent = (disk, generated) =>
  disk !== null && disk.replace(/\r\n/g, '\n') === generated.replace(/\r\n/g, '\n');

let changed = 0;
for (const out of OUTPUTS) {
  const actual = existsSync(out.path) ? readFileSync(out.path, 'utf8') : null;
  const same = sameContent(actual, out.text);
  const label = out.path.slice(ROOT.length + 1).replace(/\\/g, '/');

  if (CHECK) {
    if (same) {
      console.log(`  ${G('ok')}       ${label}`);
    } else {
      console.log(`  ${R(actual === null ? 'MISSING' : 'STALE')}  ${label}`);
      changed++;
    }
    continue;
  }

  if (same) {
    console.log(`  ${DIM(`unchanged ${label}`)}`);
    continue;
  }
  mkdirSync(dirname(out.path), { recursive: true });
  writeFileSync(out.path, out.text, 'utf8');
  changed++;
  console.log(`  ${G('wrote')}    ${label}`);
}

console.log('');
if (CHECK) {
  if (changed === 0) {
    console.log(G('Embedded fixtures match fixtures/, and no answer leaked into MCP-1.'));
    process.exit(0);
  }
  console.log(R(`${changed} generated module(s) are out of date.`));
  console.log('Run:  node scripts/embed_fixtures.mjs');
  process.exit(1);
}
console.log(G(`${changed} module(s) written.`));
