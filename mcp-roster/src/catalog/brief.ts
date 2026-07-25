/**
 * `mentor.brief/v1` — the contract for one role on one project.
 *
 * This is the artifact that replaces a paragraph with a fact. A README saying
 * *"you are the backend engineer who owns pricing"* is markdown a human reads:
 * nothing can act on it, so nothing can check whether what a student drew was
 * actually their job. This makes role-scoping enforceable.
 *
 * ## `owns` vs `given` is the whole idea
 *
 * A real engineer joining a real team does not build the system. They build a
 * *slice* of it, against interfaces other people own. So the brief names both:
 *
 * - **`owns`** — the components this role is on the hook for. Your slice.
 * - **`given`** — components someone else owns, that you build *against*. You are
 *   expected to draw them (they are your boundary) but not to implement them.
 *
 * Everything else on the canvas is out of scope, and `checkScope` says so.
 *
 * ## MCP-1 holds the question and has never held the answer
 *
 * `Concept` here has `key`, `question` and `transfersTo` — and **no `answer`
 * field at all**. That is the point, and it is why this file is not a copy of the
 * pre-split version.
 *
 * The answers live in MCP‑3 (`mcp-profile/src/concepts/`), which is the only
 * service allowed to release one and only against a student's real test output.
 * The generator that embeds these briefs strips the answer out and asserts it is
 * gone (`scripts/embed_fixtures.mjs`), so this is enforced by the build rather
 * than by a reviewer noticing.
 *
 * The value of that is precise: a bug anywhere in MCP‑1 — a tool that returns its
 * whole input, a log line, a widget that renders the raw brief — **cannot** leak
 * the thing the student is supposed to earn, because it is not in this process.
 * A boolean flag saying `withheld: true` protects against carelessness. Not having
 * the data protects against everything.
 */

import { normalizeComponent } from '../shared/component.js';
import type { Plan } from '../shared/plan.js';

export const BRIEF_SCHEMA = 'mentor.brief/v1';

/** A component this role is on the hook for. */
export interface OwnedComponent {
  readonly component: string;
  /** What it is for. Seeds the `intent` field of the student's canvas node. */
  readonly intent: string;
  /** Why this one lands on this role rather than another. */
  readonly whyYours: string;
}

/** A component someone else owns, that this role builds against. */
export interface GivenComponent {
  readonly component: string;
  /** Which role really owns it — the person you would go and ask. */
  readonly ownedBy: string;
  /** The interface you can rely on. The only thing you are allowed to assume. */
  readonly contract: string;
}

/** One signed-off acceptance criterion. The definition of done, itemised. */
export interface AcceptanceCriterion {
  readonly id: string;
  readonly given: string;
  readonly must: string;
}

/**
 * The transferable idea, declared before the student starts.
 *
 * Declared up front rather than derived from whatever broke: a lesson
 * reverse-engineered from a failure is a rationalisation, whereas a lesson stated
 * in advance and then demonstrated by the student's own failure is a curriculum.
 *
 * **There is deliberately no `answer` and no `transfersTo` field.** The answer is
 * the reward; `transfers_to` is the generalisation that makes the answer land, so
 * handing it over with the assignment gives away the shape of the lesson. Both live
 * only in MCP‑3. See the file header.
 */
export interface Concept {
  readonly key: string;
  /** The flashcard front. A question, not a topic — and safe to show up front. */
  readonly question: string;
}

export interface Brief {
  readonly schema: string;
  readonly project: string;
  readonly role: string;
  readonly title: string;
  /** Second person, present tense. "You own the function finance reports off." */
  readonly youAre: string;
  /** Who is hurt when this is wrong. What makes it a job rather than an exercise. */
  readonly stakes: string;
  readonly deliverable: string;
  readonly concept: Concept;
  readonly owns: readonly OwnedComponent[];
  readonly given: readonly GivenComponent[];
  readonly acceptance: readonly AcceptanceCriterion[];
  /** Where the student's code goes, relative to the project root. */
  readonly entry: string;
  readonly tests: string;
  readonly warnings: readonly string[];
}

export class BriefParseError extends Error {}

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback);

const toStringArray = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];

function safeJson(raw: string, what: string): unknown {
  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new BriefParseError(
      `${what} is not valid JSON: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

/**
 * Parse a `mentor.brief/v1` document (object or JSON string).
 *
 * @throws BriefParseError when the envelope is unusable, or when `owns` is empty.
 *   A brief that gives a student nothing to own is not a role — every downstream
 *   bridge (scope, the checkpoint spec, MCP‑2's verdict) is defined in terms of
 *   `owns`, so an empty one would produce a green "you're finished" for a student
 *   who has done nothing. That is the worst failure available here.
 * @throws BriefParseError when the document carries a concept answer. MCP‑1 is not
 *   allowed to hold one, and silently dropping it would let a mis-generated
 *   fixture ship the answer into this process without anyone noticing.
 */
export function parseBrief(input: unknown): Brief {
  const raw: unknown = typeof input === 'string' ? safeJson(input, 'brief') : input;
  if (!isObj(raw)) throw new BriefParseError('brief must be a JSON object');

  const schema = str(raw.schema);
  if (schema !== BRIEF_SCHEMA) {
    throw new BriefParseError(
      `unsupported brief schema ${JSON.stringify(schema || '(missing)')} — expected ${BRIEF_SCHEMA}`,
    );
  }

  const warnings: string[] = [...toStringArray(raw.warnings)];

  const owns: OwnedComponent[] = [];
  const ownKeys = new Set<string>();
  for (const o of Array.isArray(raw.owns) ? raw.owns : []) {
    if (!isObj(o)) continue;
    const component = str(o.component).trim();
    if (!component) continue;
    const key = normalizeComponent(component);
    if (ownKeys.has(key)) {
      warnings.push(`brief.owns lists ${component} twice`);
      continue;
    }
    ownKeys.add(key);
    owns.push({
      component,
      intent: str(o.intent).trim(),
      whyYours: str(o.why_yours).trim(),
    });
  }
  if (owns.length === 0) {
    throw new BriefParseError(
      'brief.owns is empty — a role with nothing to own is not a role, and every downstream ' +
        'check (scope, checkpoints, the verdict) is defined against it',
    );
  }

  const given: GivenComponent[] = [];
  for (const g of Array.isArray(raw.given) ? raw.given : []) {
    if (!isObj(g)) continue;
    const component = str(g.component).trim();
    if (!component) continue;
    if (ownKeys.has(normalizeComponent(component))) {
      // Owning and being given the same component is a contradiction that would
      // make the scope check answer both ways depending on evaluation order.
      warnings.push(
        `${component} is in both owns and given — treating it as owned, since that is the ` +
          'stricter reading',
      );
      continue;
    }
    given.push({
      component,
      ownedBy: str(g.owned_by).trim() || 'another role',
      contract: str(g.contract).trim(),
    });
  }

  const acceptance: AcceptanceCriterion[] = [];
  for (const [i, a] of (Array.isArray(raw.acceptance) ? raw.acceptance : []).entries()) {
    if (!isObj(a)) continue;
    const must = str(a.must).trim();
    if (!must) continue;
    acceptance.push({ id: str(a.id).trim() || `a${i + 1}`, given: str(a.given).trim(), must });
  }
  if (acceptance.length === 0) {
    warnings.push(
      'brief has no acceptance criteria — done-ness cannot be judged against anything',
    );
  }

  const rawConcept = isObj(raw.concept) ? raw.concept : {};
  // Checked at parse time, not at authoring time, because this is the boundary a
  // mis-generated fixture would cross. Dropping the field silently would let the
  // answer sit in this process's memory with nobody aware of it.
  for (const forbidden of ['answer', 'transfers_to'] as const) {
    const value = rawConcept[forbidden];
    if (typeof value === 'string' && value.trim()) {
      throw new BriefParseError(
        `brief for ${str(raw.project)}/${str(raw.role)} carries concept.${forbidden}, and MCP-1 ` +
          'must never hold one. Both live only in MCP-3, which releases them against a real test ' +
          'result. Re-run: node scripts/embed_fixtures.mjs',
      );
    }
  }
  const concept: Concept = {
    key: str(rawConcept.key).trim() || 'unnamed-concept',
    question: str(rawConcept.question).trim(),
  };
  if (!concept.question) {
    warnings.push('brief.concept has no question — no flashcard can be earned from this project');
  }

  return {
    schema,
    project: str(raw.project).trim(),
    role: str(raw.role).trim(),
    title: str(raw.title).trim() || `${str(raw.role)} — ${str(raw.project)}`,
    youAre: str(raw.you_are).trim(),
    stakes: str(raw.stakes).trim(),
    deliverable: str(raw.deliverable).trim(),
    concept,
    owns,
    given,
    acceptance,
    entry: str(raw.entry).trim(),
    tests: str(raw.tests).trim(),
    warnings,
  };
}

// ── the scope check ───────────────────────────────────────────────────────────

export type ScopeVerdict = 'covered' | 'boundary' | 'out_of_scope' | 'missing';

export interface ScopeEntry {
  /** The student's own word for it when they drew it; the brief's when they didn't. */
  readonly label: string;
  readonly verdict: ScopeVerdict;
  readonly note: string;
}

export interface ScopeReport {
  readonly project: string;
  readonly role: string;
  /** Owned components the student drew. */
  readonly covered: readonly string[];
  /** `given` components they drew — correct practice, not a problem. */
  readonly boundary: readonly string[];
  /** Drawn, but neither owned nor given. Someone else's job. */
  readonly outOfScope: readonly string[];
  /** Owned but never drawn. Their slice is not covered by their own design. */
  readonly missing: readonly string[];
  readonly entries: readonly ScopeEntry[];
  /** 0..1 — fraction of `owns` that appears on the canvas. */
  readonly coverage: number;
  readonly inScope: boolean;
  readonly summary: string;
}

/**
 * Compare the student's canvas against their role's brief.
 *
 * This produces a second kind of drift, independent of the ordering drift MCP‑2
 * finds later:
 *
 * - **order drift** (MCP‑2) — you built your own components in the wrong sequence
 * - **scope drift** (here) — you designed the wrong *set* of components
 *
 * They want different conversations. Building `tax` before `discount` is a
 * reasoning error. Designing the payment gateway when you own pricing is a scope
 * error — and in a company it is the more expensive of the two, because nobody
 * notices until integration.
 *
 * Joined on `normalizeComponent`, the same key MCP‑2 uses, so a student renaming a
 * box is not told it is in scope by one service and foreign by another.
 */
export function checkScope(brief: Brief, plan: Plan): ScopeReport {
  const ownByKey = new Map(brief.owns.map((o) => [normalizeComponent(o.component), o]));
  const givenByKey = new Map(brief.given.map((g) => [normalizeComponent(g.component), g]));

  const entries: ScopeEntry[] = [];
  const covered: string[] = [];
  const boundary: string[] = [];
  const outOfScope: string[] = [];
  const drawnKeys = new Set<string>();

  for (const node of plan.nodes) {
    const key = normalizeComponent(node.label);
    drawnKeys.add(key);

    const owned = ownByKey.get(key);
    if (owned) {
      covered.push(node.label);
      entries.push({
        label: node.label,
        verdict: 'covered',
        note: owned.whyYours || 'yours to build',
      });
      continue;
    }

    const lent = givenByKey.get(key);
    if (lent) {
      boundary.push(node.label);
      entries.push({
        label: node.label,
        verdict: 'boundary',
        note: `${lent.ownedBy} owns this — you build against it. ${lent.contract}`.trim(),
      });
      continue;
    }

    outOfScope.push(node.label);
    entries.push({
      label: node.label,
      verdict: 'out_of_scope',
      note:
        'not in your brief — either it belongs to another role, or your brief and your design ' +
        'disagree about what this project is',
    });
  }

  const missing: string[] = [];
  for (const owned of brief.owns) {
    if (drawnKeys.has(normalizeComponent(owned.component))) continue;
    missing.push(owned.component);
    entries.push({
      label: owned.component,
      verdict: 'missing',
      note: owned.intent
        ? `you own this but did not design it — ${owned.intent}`
        : 'you own this but did not design it',
    });
  }

  const coverage = brief.owns.length === 0 ? 0 : covered.length / brief.owns.length;

  return {
    project: brief.project,
    role: brief.role,
    covered,
    boundary,
    outOfScope,
    missing,
    entries,
    coverage: Math.round(coverage * 1000) / 1000,
    inScope: missing.length === 0 && outOfScope.length === 0,
    summary: describeScope(missing, outOfScope, covered.length, brief.owns.length),
  };
}

function describeScope(
  missing: readonly string[],
  outOfScope: readonly string[],
  coveredCount: number,
  ownedCount: number,
): string {
  if (missing.length === 0 && outOfScope.length === 0) {
    return `Your design covers your slice exactly: all ${ownedCount} component(s) you own, nothing you don't.`;
  }
  const parts: string[] = [`${coveredCount} of ${ownedCount} owned component(s) designed`];
  if (missing.length) parts.push(`missing ${missing.join(', ')}`);
  if (outOfScope.length) {
    parts.push(
      `${outOfScope.join(', ')} ${outOfScope.length === 1 ? 'is' : 'are'} not yours to build`,
    );
  }
  return parts.join('; ') + '.';
}
