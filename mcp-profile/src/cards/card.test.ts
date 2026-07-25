/**
 * The flashcard gate — where the product could betray its own thesis.
 *
 * Ported from the flashcard section of `sentinel/src/modules/learn/learn.test.ts`
 * (deleted at `aab534d`; `git show e15810a:`). `issueCard`'s signature changed in the
 * split — it took `{ brief, drift, testsGreen }` and now takes
 * `{ concept, verdict, card, project, role, outcome }`, because the brief no longer
 * holds an answer and the drift now arrives as MCP-2's verdict rather than as a local
 * computation. Every original case survives that change; three are new, covering the
 * cross-service half of the gate the split introduced.
 *
 * The single most important assertion in this repo is in here: while the tests are
 * red, the answer is **absent from the payload**, not present behind a flag. A card
 * whose back reads *"compute tax on the discounted subtotal"* **is the patch**
 * wearing a lesson's clothes, and a client model pressed by a student for the answer
 * would call `flashcard` instead of `explain_drift` and read it out.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { issueCard, readTestOutcome } from './card.js';
import { CONCEPTS, conceptForSeat, conceptKeys, findConcept } from '../concepts/fixtures.concepts.js';
import { parseVerdict, type Verdict } from '../shared/contracts.js';

const RED = '# tests 3\n# pass 2\n# fail 1';
const GREEN = '# tests 3\n# pass 3\n# fail 0';
const CONCEPT_KEY = 'order-of-operations-in-money-math';

const pricingConcept = () => findConcept(CONCEPT_KEY)!;

/**
 * Does this read as a principle rather than as source?
 *
 * The old `sentinel/src/modules/learn/brief.ts` had `assertNoFix` for this. It did not
 * survive the split — the answer no longer exists in MCP-1 to check — so the property
 * is asserted here instead, against the one process that really holds the string.
 *
 * The heuristic is **not** the original's. That one was
 * `/[;{}]|\b(const|let|var|function|return|=>)\b|\*=|\/=|\+=/`, and porting it verbatim
 * failed, correctly, on two counts:
 *
 * 1. A bare `;` reads as code, but prose uses semicolons. `record-before-you-notify`
 *    is a legitimate answer with `…watching the screen; it fails the first time…` in
 *    it. That concept was authored after the split, which is why the original suite
 *    never caught its own false positive.
 * 2. `=>` sat inside `\b(…)\b`, and `\b=>\b` cannot match. The alternative was dead,
 *    so the original would have passed an arrow function straight through.
 *
 * So: keywords and operators still fire, a semicolon only fires next to code, and
 * `=>` is matched outside the word-boundary group. Verified against six pasted-source
 * shapes and all five real answers.
 *
 * Deliberately still a heuristic. It catches the mechanical case — someone pasting
 * source in — and cannot detect a well-worded fix. The real defence is that the back
 * is gated on the student's own green tests regardless.
 */
function looksLikeProse(answer: string): boolean {
  const code = /\b(const|let|var|function|return)\b|=>|[{}]|\*=|\/=|\+=|;\s*(?:const|let|var|return|\})/;
  return !code.test(answer);
}

function verdict(over: Record<string, unknown> = {}): Verdict {
  return parseVerdict({
    schema: 'mentor.verdict/v1',
    issued_by: 'mentor-mcp/1.0.0 (MCP-2)',
    student: 's1',
    project: 'pricing',
    role: 'backend',
    status: 'escalated',
    statement: 'built, with drift',
    checkpoints: [],
    implemented: { reached: 4, total: 4 },
    verified: { reached: 3, total: 3 },
    drift: {
      found: true,
      explanation: 'tax was built before discount',
      origin: {
        component: 'tax', file: 'build/pricing.js', line: 12, shouldFollow: 'discount',
        plannedPosition: 3, actualPosition: 2, dependency: 'direct', at: 'T+11m',
      },
      failure: { test: 'test 3', file: 'build/pricing.test.js', line: 40, message: '80 !== 72' },
      planned_order: ['validate', 'discount', 'tax', 'total'],
      actual_order: ['validate', 'tax', 'discount', 'total'],
      confidence: 0.91,
      confidence_components: {},
      caveats: [],
    },
    stuck: null,
    concept: { key: CONCEPT_KEY, question: 'which one first?' },
    provenance: 'observed',
    tests_green: true,
    at: '2026-07-26T00:00:00.000Z',
    ...over,
  });
}

const issue = (over: Partial<Parameters<typeof issueCard>[0]> = {}) =>
  issueCard({
    concept: pricingConcept(),
    verdict: verdict(),
    card: null,
    project: 'pricing',
    role: 'backend',
    outcome: readTestOutcome(GREEN),
    ...over,
  });

// ── the gate ──────────────────────────────────────────────────────────────────

test('flashcard: while the tests are red, the answer is ABSENT from the payload', () => {
  // The single most important assertion in this file. A card that ships its answer
  // with `earned: false` leaks on the first client that renders the whole object, so
  // the guarantee has to be structural: no field, not a flag.
  const card = issue({ outcome: readTestOutcome(RED) });

  assert.equal(card.earned, false);
  assert.ok(!('back' in card), 'the answer must not be present at all, however it is labelled');
  assert.equal(
    JSON.stringify(card).includes(pricingConcept().answer),
    false,
    'the answer text must not appear anywhere in the serialized payload',
  );
  assert.equal(
    JSON.stringify(card).includes(pricingConcept().transfersTo),
    false,
    'nor the generalisation, which gives away the shape of the answer',
  );
  // The question is still safe to show — it is what they should be able to answer.
  assert.ok(card.front.length > 0);
  assert.match(
    card.earned === false ? card.blocking.join(' ') : '',
    /reward for fixing it yourself/,
  );
});

test('flashcard: earned once the tests are green, and it cites where they went wrong', () => {
  const card = issue();

  assert.equal(card.earned, true);
  assert.ok(card.earned && card.back.includes('after the discount is taken off'));
  assert.ok(card.earned && card.transfersTo.length > 0);
  assert.equal(card.earnedBy.origin, 'build/pricing.js:12');
  assert.equal(card.earnedBy.surfaced, 'build/pricing.test.js:40');
  assert.equal(card.earned && card.confidence, 0.91, 'a card is only as sound as the claim behind it');
  assert.match(card.earnedBy.drift ?? '', /tax was designed after discount, but built before it/);
  assert.match(card.earned ? card.note : '', /surfaced at build\/pricing\.test\.js:40/);
});

test('flashcard: no verdict at all withholds it, however green the pasted text looks', () => {
  // NEW — the cross-service half of the gate, which did not exist before the split.
  // Someone pasting green-looking output has not finished; a student who has, has a
  // verdict on file.
  const card = issue({ verdict: null });
  assert.equal(card.earned, false);
  assert.ok(!('back' in card));
  assert.match(
    card.earned === false ? card.blocking.join(' ') : '',
    /verifier has not filed a verdict/,
  );
});

test('flashcard: the two readings must agree — a disagreeing verifier withholds it', () => {
  // NEW. `tests_green` on the verdict is necessary but not sufficient, and this is
  // the other direction: MCP-3 parsed green, MCP-2 last saw red. A lone boolean
  // travelling over a bridge is exactly the field someone would forge, so neither
  // reading is trusted alone.
  const card = issue({ verdict: verdict({ tests_green: false }) });
  assert.equal(card.earned, false);
  assert.ok(!('back' in card));
  assert.match(
    card.earned === false ? card.blocking.join(' ') : '',
    /will not release an answer on one of them alone/,
  );
});

test('flashcard: not having tried to say it yourself withholds it too', () => {
  const card = issue({ explainedInOwnWords: false });
  assert.equal(card.earned, false);
  assert.ok(!('back' in card));
  assert.match(card.earned === false ? card.blocking.join(' ') : '', /in your own words/);
});

test('flashcard: an unauthored concept blames the curriculum, not the student', () => {
  // Telling a student "keep going" when the real answer is "no lesson is written for
  // this project" would be a lie about their progress.
  const card = issueCard({
    concept: null,
    verdict: verdict(),
    card: null,
    project: 'untaught',
    role: 'backend',
    outcome: readTestOutcome(GREEN),
  });
  assert.equal(card.earned, false);
  assert.ok(!('back' in card));
  assert.equal(card.concept, 'unknown');
  assert.match(card.front, /What did untaught teach you\?/, 'still asks something rather than nothing');
  assert.match(
    card.earned === false ? card.blocking.join(' ') : '',
    /gap in the curriculum, not in your work/,
  );
});

test('flashcard: every withheld card explains the absence rather than hiding it', () => {
  for (const over of [
    { outcome: readTestOutcome(RED) },
    { verdict: null },
    { verdict: verdict({ tests_green: false }) },
    { explainedInOwnWords: false },
  ]) {
    const card = issue(over);
    assert.equal(card.earned, false, JSON.stringify(over));
    assert.match(card.note, /Absent/, 'the note must state that the answer is absent, not hidden');
    assert.ok(
      card.earned === false && card.blocking.length > 0,
      'a card can never be withheld without saying what is owed',
    );
  }
});

test('flashcard: the review state carries through, so a re-issue does not reset the schedule', () => {
  const card = issue({
    card: {
      id: 'card-existing', concept: CONCEPT_KEY, project: 'pricing', state: 'review',
      due_in_sessions: 4, ease: 2.6, reps: 3, lapses: 1, last_grade: 'good',
    },
  });
  assert.equal(card.id, 'card-existing', 'the stored id wins, or grading would target a new card');
  assert.deepEqual(card.review, { state: 'review', due_in_sessions: 4, reps: 3 });
});

// ── the test-output gate ──────────────────────────────────────────────────────

test('test-output gate: unrecognised output is not treated as passing', () => {
  // The asymmetry is deliberate — wrongly withholding annoys a student, wrongly
  // issuing hands over the reasoning the product exists to withhold.
  for (const raw of ['', '   ', 'looks fine to me', 'all good, trust me', 'PASSED??', 'no errors!']) {
    const outcome = readTestOutcome(raw);
    assert.equal(outcome.green, false, `"${raw}" was treated as green`);
    assert.equal(outcome.runner, null);
    assert.ok(outcome.evidence.length > 0, 'must say why it would not judge');
  }
});

test('test-output gate: reads node:test, pytest, jest and go verdicts', () => {
  assert.deepEqual(
    [readTestOutcome('# pass 2\n# fail 1').green, readTestOutcome('# pass 3\n# fail 0').green],
    [false, true],
  );
  assert.equal(readTestOutcome('1 failed, 2 passed in 0.04s').green, false);
  assert.equal(readTestOutcome('3 passed in 0.04s').green, true);
  assert.equal(readTestOutcome('Tests:       1 failed, 2 passed, 3 total').green, false);
  assert.equal(readTestOutcome('ok  \texample/pkg\t0.02s').green, true);
  assert.equal(readTestOutcome('--- FAIL: TestThing (0.00s)\nFAIL').green, false);
  assert.equal(readTestOutcome('# fail 0').runner, 'node:test');
});

test('test-output gate: the evidence is the line it judged from, quotable back at it', () => {
  // A gate a human cannot check is a gate nobody will trust when it withholds.
  assert.equal(readTestOutcome(RED).evidence, '# fail 1');
  assert.equal(readTestOutcome(RED).failures, 1);
  assert.equal(readTestOutcome(GREEN).failures, 0);
});

test("test-output gate: a failure count anywhere in the output beats a passing summary", () => {
  // Real output has both lines in it. Matching the optimistic one would issue on a
  // red run, which is the only failure mode here that actually costs the lesson.
  const mixed = '# tests 3\n# pass 2\n# fail 1\n# cancelled 0\n# skipped 0';
  assert.equal(readTestOutcome(mixed).green, false);
  assert.equal(readTestOutcome('2 passed, 1 failed').green, false);
  assert.equal(readTestOutcome('1 failed, 2 passed').green, false);
});

test('flashcard: the real red fixture output withholds the card end to end', () => {
  // What a student actually has in front of them before they fix it.
  const outcome = readTestOutcome(RED);
  const card = issue({ outcome });
  assert.equal(outcome.green, false);
  assert.equal(card.earned, false);
  assert.equal(JSON.stringify(card).includes('after the discount is taken off'), false);
});

// ── the concept bank ──────────────────────────────────────────────────────────

test('concepts: this is the only service with answers, and every entry has a complete one', () => {
  assert.equal(conceptKeys().length, 5, 'one concept per briefed seat');
  for (const key of conceptKeys()) {
    const concept = findConcept(key)!;
    assert.equal(concept.key, key, `${key} is filed under a different key than it carries`);
    for (const field of ['project', 'role', 'question', 'answer', 'transfersTo'] as const) {
      assert.ok(concept[field].length > 0, `${key} has no ${field}`);
    }
    assert.ok(looksLikeProse(concept.answer), `${key}'s answer looks like code rather than a principle`);
    assert.ok(concept.answer.length > 80, `${key}'s answer is too short to be an explanation`);
  }
});

test('concepts: the anti-fix heuristic actually catches a pasted fix', () => {
  // Asserting a guard passes on a clean tree proves nothing — Gap 15's lesson, and
  // the reason the original `=>` alternative could sit dead in the regex unnoticed.
  // So: break the thing it exists to catch.
  for (const pasted of [
    'const taxable = subtotal - discount; return taxable * taxRate;',
    'return subtotal * (1 - d);',
    'if (x) { alert(); }',
    'total += tax',
    'subtotal *= 1.2',
    'x => x * 2', // the shape the original heuristic let through
  ]) {
    assert.equal(looksLikeProse(pasted), false, `${JSON.stringify(pasted)} was accepted as a principle`);
  }

  // And it must not fire on ordinary prose, or an author works around it and the
  // guard protects nothing. A semicolon mid-sentence is the case that broke the port.
  for (const prose of [
    'Record before you notify; an alert with no durable record is unauditable.',
    'Tax is charged on what the customer actually pays, so it comes after the discount.',
  ]) {
    assert.equal(looksLikeProse(prose), true, `${JSON.stringify(prose)} was flagged as code`);
  }
});

test('concepts: every seat maps to its own lesson, and no two seats share one', () => {
  // A seat silently sharing another's concept would issue the wrong card for work the
  // student actually did — and hide that a lesson was never authored.
  const seats = [
    ['pricing', 'backend'], ['pricing', 'frontend'], ['safety-gear', 'cv'],
    ['safety-gear', 'platform'], ['event-ingest', 'data'],
  ] as const;

  const found = seats.map(([project, role]) => {
    const concept = conceptForSeat(project, role);
    assert.ok(concept, `${project}/${role} has no concept`);
    assert.equal(concept.project, project);
    assert.equal(concept.role, role);
    return concept.key;
  });
  assert.equal(new Set(found).size, seats.length, 'two seats share a concept');
  assert.equal(new Set(found).size, Object.keys(CONCEPTS).length, 'a concept belongs to no seat');
});

test('concepts: an unknown key is null rather than a plausible-looking neighbour', () => {
  assert.equal(findConcept('no-such-concept'), null);
  assert.equal(findConcept(''), null);
  assert.equal(conceptForSeat('no-such-project', 'backend'), null);
  assert.equal(conceptForSeat('pricing', 'no-such-role'), null);
});
