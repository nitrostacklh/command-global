/**
 * `mentor.card/v1` — the concept the student walks away with, and the gate on it.
 *
 * The loop has to close somewhere. A student who fixes their own bug and gets
 * nothing but a green test has learned the *project*; the point of the whole thing
 * is that they learn the *idea*, and can still state it three projects later. So the
 * last step converts one debugging session into one card.
 *
 * ## This is the sharpest place the product could betray itself
 *
 * MENTOR's whole claim is that it will not write the fix. A flashcard whose back
 * reads *"compute tax on the discounted subtotal, not the sticker price"* **is the
 * fix**, wearing a lesson's clothes. Shipping that would make the refusal theatre:
 * the client's model would simply call `flashcard` instead and read the answer out.
 *
 * Four defences, and they are structural rather than advisory:
 *
 * 1. **The other two services do not have the answer.** MCP‑1 hands out the
 *    question; MCP‑2's verdict carries the concept *key*. The string exists only in
 *    `../concepts/`, in this process. See `scripts/embed_fixtures.mjs`.
 * 2. **The back is gated on the student's own test output**, parsed here from
 *    verbatim runner text. Not on a boolean argument — a boolean is a gate that
 *    lives inside the client's model, and a model being pressed by a student for the
 *    answer is the worst possible place to keep one.
 * 3. **MCP‑2's verdict must agree.** `tests_green` on the verdict is necessary but
 *    not sufficient: two independent readings of the same fact, because a lone
 *    boolean travelling over a bridge is exactly the field an attacker would set.
 * 4. **When unearned, `back` is absent from the payload — not present with a flag.**
 *    This matters more than it looks. A field a model can read is a field it will
 *    read out, however it is labelled; `{ earned: false, back: "…" }` leaks on the
 *    first client that renders the whole object. So the return type is a union and
 *    the unearned branch has no `back` property at all.
 */

import { CARD_SCHEMA, type ProfileCard, type Verdict } from '../shared/contracts.js';
import type { ConceptEntry } from '../concepts/fixtures.concepts.js';

/** What the card was earned against — this student's own session, not a syllabus. */
export interface CardProvenance {
  readonly project: string;
  readonly role: string;
  /** Where the mistake was actually made. */
  readonly origin: string | null;
  /** Where it showed up, which is somewhere else. That gap is the lesson. */
  readonly surfaced: string | null;
  /** The design decision in one clause. */
  readonly drift: string | null;
  /** Where they got bogged down, if MCP-2 saw it. */
  readonly stuck: string | null;
}

interface CardBase {
  readonly schema: typeof CARD_SCHEMA;
  readonly id: string;
  readonly concept: string;
  /** The question. Always safe — it is what the student should be able to answer. */
  readonly front: string;
  readonly earnedBy: CardProvenance;
  readonly review: { readonly state: string; readonly due_in_sessions: number; readonly reps: number };
}

export interface EarnedCard extends CardBase {
  readonly earned: true;
  /** The principle. Present only on this branch of the union. */
  readonly back: string;
  readonly transfersTo: string;
  /** Carried from the verdict — a card is only as sound as the claim behind it. */
  readonly confidence: number;
  readonly note: string;
}

export interface UnearnedCard extends CardBase {
  readonly earned: false;
  /** No `back` property at all. See the header — the absence *is* the mechanism. */
  readonly blocking: readonly string[];
  readonly note: string;
}

export type Card = EarnedCard | UnearnedCard;

export interface TestOutcome {
  /** True only when a runner was recognised AND it reported no failures. */
  readonly green: boolean;
  /** Which runner's output shape matched, or null if none did. */
  readonly runner: string | null;
  readonly failures: number | null;
  /** The line the verdict was read from, quoted back so a human can check it. */
  readonly evidence: string;
}

/**
 * Read a pass/fail verdict out of real test-runner output.
 *
 * **Unrecognised output is not green.** If no runner shape matches, the outcome is a
 * refusal to judge rather than a pass. That asymmetry is deliberate: the cost of
 * wrongly withholding a card is a mildly annoyed student, and the cost of wrongly
 * issuing one is handing over the reasoning the entire product exists to withhold.
 * Those are not comparable, so the tie does not go to the student.
 *
 * Recognises `node --test`, pytest, jest/vitest, and go test.
 */
export function readTestOutcome(raw: string): TestOutcome {
  const text = (raw ?? '').trim();
  if (!text) {
    return { green: false, runner: null, failures: null, evidence: 'no test output provided' };
  }

  const shapes: Array<{ runner: string; re: RegExp; failIndex: number }> = [
    // node:test summary — "# fail 0"
    { runner: 'node:test', re: /^#\s*fail\s+(\d+)\s*$/im, failIndex: 1 },
    // pytest — "1 failed, 2 passed"
    { runner: 'pytest', re: /(\d+)\s+failed/i, failIndex: 1 },
    // jest / vitest — "Tests: 1 failed, 2 passed"
    { runner: 'jest/vitest', re: /tests?:\s*(?:.*?)(\d+)\s+failed/i, failIndex: 1 },
  ];

  for (const shape of shapes) {
    const m = shape.re.exec(text);
    if (!m) continue;
    const failures = Number(m[shape.failIndex]);
    return { green: failures === 0, runner: shape.runner, failures, evidence: m[0].trim() };
  }

  // Green shapes that report no failure count at all.
  const cleanPytest = /(\d+)\s+passed(?:[^,]*)\s+in\s+[\d.]+s/i.exec(text);
  if (cleanPytest && !/fail|error/i.test(text)) {
    return { green: true, runner: 'pytest', failures: 0, evidence: cleanPytest[0].trim() };
  }
  const goOk = /^ok\s+\S+/im.exec(text);
  if (goOk && !/^(FAIL|---\s*FAIL)/im.test(text)) {
    return { green: true, runner: 'go test', failures: 0, evidence: goOk[0].trim() };
  }

  return {
    green: false,
    runner: null,
    failures: null,
    evidence:
      'could not recognise this as test-runner output, so it is not treated as passing — paste ' +
      'the full output of your test command',
  };
}

export interface IssueInput {
  readonly concept: ConceptEntry | null;
  /** MCP-2's verdict for this project, if one has been filed. */
  readonly verdict: Verdict | null;
  /** This student's review state for the card, if it exists yet. */
  readonly card: ProfileCard | null;
  readonly project: string;
  readonly role: string;
  /** Parsed from the student's verbatim runner output — never from a boolean. */
  readonly outcome: TestOutcome;
  /** Did the student state the concept in their own words first? */
  readonly explainedInOwnWords?: boolean;
}

/**
 * Issue the card, or explain exactly what is still owed.
 *
 * Order of checks matters. The concept has to exist before the gate is worth
 * evaluating: a project with no concept authored can never yield a card no matter
 * how green the tests are, and telling a student "keep going" when the real answer
 * is "this project has no lesson written" would be a lie about their progress.
 */
export function issueCard(input: IssueInput): Card {
  const { concept, verdict, card, project, role, outcome, explainedInOwnWords } = input;

  const origin = verdict?.drift?.origin ?? null;
  const failure = verdict?.drift?.failure ?? null;
  const earnedBy: CardProvenance = {
    project,
    role,
    origin: origin ? `${origin.file}:${origin.line ?? '?'}` : null,
    surfaced: failure ? `${failure.file}:${failure.line ?? '?'}` : null,
    drift: origin
      ? `${origin.component} was designed after ${origin.shouldFollow}, but built before it`
      : null,
    stuck: verdict?.stuck ? `${verdict.stuck.subject} — ${verdict.stuck.why}` : null,
  };

  const front = concept?.question || `What did ${project} teach you?`;
  const review = {
    state: card?.state ?? 'new',
    due_in_sessions: card?.due_in_sessions ?? 0,
    reps: card?.reps ?? 0,
  };
  const id = card?.id ?? `card-${concept?.key ?? 'unknown'}-${project}`;

  const blocking: string[] = [];
  if (!concept) {
    blocking.push(
      `no concept is authored for ${project}, so there is no card to earn here — that is a gap ` +
        'in the curriculum, not in your work',
    );
  }
  if (!outcome.green) {
    blocking.push(
      'your acceptance tests are not passing yet — the card is the reward for fixing it ' +
        `yourself, so it stays shut until they are green (read from: ${outcome.evidence})`,
    );
  }
  // The cross-service half of the gate. A student who has genuinely finished has a
  // verdict; someone pasting green-looking text has not.
  if (!verdict) {
    blocking.push(
      'the verifier has not filed a verdict for this project yet. Finish your gates with MCP-2 ' +
        'and call build_verdict — the card is issued against what it saw, not against pasted text ' +
        'alone',
    );
  } else if (!verdict.tests_green) {
    blocking.push(
      'the verifier last saw your tests failing. Run them again through MCP-2 so the two ' +
        'readings agree — this service will not release an answer on one of them alone',
    );
  }
  if (explainedInOwnWords === false) {
    blocking.push(
      'say the idea back in your own words first — reading an answer you have not tried to ' +
        'produce is the one study method that reliably does nothing',
    );
  }

  if (blocking.length || !concept) {
    return {
      schema: CARD_SCHEMA,
      id,
      concept: concept?.key ?? 'unknown',
      front,
      earnedBy,
      review,
      earned: false,
      blocking,
      note:
        'The answer is not included in this response — not hidden in it, not present under a ' +
        'flag. Absent. That is the same refusal MCP-2 applies to the patch, applied here to the ' +
        'lesson: handing over reasoning the student has not done yet is what removes the lesson.',
    };
  }

  return {
    schema: CARD_SCHEMA,
    id,
    concept: concept.key,
    front,
    earnedBy,
    review,
    earned: true,
    back: concept.answer,
    transfersTo: concept.transfersTo,
    confidence: verdict?.drift?.confidence ?? 0,
    note:
      earnedBy.origin && earnedBy.surfaced
        ? `You earned this by fixing a bug that surfaced at ${earnedBy.surfaced} but was made at ` +
          `${earnedBy.origin}. Keep the card; the distance between those two is the point.`
        : 'You earned this by fixing it yourself.',
  };
}
