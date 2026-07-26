/**
 * The student record, and every rule for changing it.
 *
 * **New in this stream, not a port.** `profile.ts` arrived with the three-MCP split
 * and shipped with no tests at all, on a service that is publicly reachable. It is
 * the write side of the architecture's "written by MCP-2's verdicts" arrow, so
 * everything a student is told about their own progress is computed here.
 *
 * The cases worth writing are the ones where a plausible implementation is quietly
 * wrong in a way that misrepresents a person to themselves or to their instructor:
 *
 * - re-running the verifier on an unfixed build must not make a student's history
 *   read as though they made the same mistake nine times;
 * - a card issued from an `in_progress` snapshot files a lesson they have not had;
 * - a completed project walked back to `attempted` by a later snapshot would erase a
 *   fact about the past;
 * - a mastery formula that punished meeting a hard problem more than never meeting it
 *   would be measuring exposure rather than understanding.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  applyVerdict,
  beginSession,
  cardId,
  deriveMastery,
  dueCards,
  gradeCard,
  latestVerdict,
  newProfile,
  noteRoleChoice,
} from './profile.js';
import { PROFILE_SCHEMA, parseVerdict, type Verdict } from '../shared/contracts.js';

const CONCEPT = 'order-of-operations-in-money-math';

function verdict(over: Record<string, unknown> = {}): Verdict {
  return parseVerdict({
    schema: 'mentor.verdict/v1',
    issued_by: 'mentor-mcp/1.0.0 (MCP-2)',
    student: 's1',
    project: 'pricing',
    role: 'backend',
    status: 'escalated',
    statement: 'built, with drift',
    checkpoints: [
      { id: 'cp-1', subject: 'validate', kind: 'implement', status: 'pass', at: 'T+03m', file: 'build/pricing.js', line: 8, out_of_order: false, should_follow: [], attempts: 1 },
      { id: 'cp-3', subject: 'tax', kind: 'implement', status: 'pass', at: 'T+11m', file: 'build/pricing.js', line: 12, out_of_order: true, should_follow: ['discount'], attempts: 1 },
    ],
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
    concept: { key: CONCEPT, question: 'which one first?' },
    provenance: 'observed',
    tests_green: true,
    at: '2026-07-26T00:00:00.000Z',
    ...over,
  });
}

const fresh = () => newProfile('s1', 'sam', 'T0');

// ── the shape of a new record ─────────────────────────────────────────────────

test('newProfile: a new record declares its schema and starts on session one', () => {
  const profile = fresh();
  assert.equal(profile.schema, PROFILE_SCHEMA);
  assert.equal(profile.student, 's1');
  assert.equal(profile.sessions, 1);
  for (const ledger of [profile.projects, profile.cards, profile.drift_ledger, profile.mastery]) {
    assert.deepEqual([...ledger], []);
  }
});

test('newProfile: a missing handle falls back to the id rather than an empty label', () => {
  assert.equal(newProfile('s1', '', 'T0').handle, 's1');
});

// ── folding in a verdict ──────────────────────────────────────────────────────

test('applyVerdict: an escalated verdict records the seat, files the drift, and opens a card', () => {
  const { profile, newCards, changes } = applyVerdict(fresh(), verdict(), 'T1');

  assert.equal(profile.projects.length, 1);
  assert.equal(profile.projects[0].status, 'escalated');
  assert.equal(profile.projects[0].checkpoints.length, 2, 'the checkpoint records travel with it');

  assert.equal(profile.drift_ledger.length, 1);
  assert.equal(profile.drift_ledger[0].component, 'tax');
  assert.equal(profile.drift_ledger[0].line, 12);
  assert.equal(profile.drift_ledger[0].concept, CONCEPT);

  assert.deepEqual([...newCards], [cardId(CONCEPT, 'pricing')]);
  assert.match(changes.join(' '), /not yet earned/, 'the change log must not imply the answer is out');
});

test('applyVerdict: re-running the verifier on the same unfixed build files one drift, not two', () => {
  // A student who runs the verifier three times while working on the same bug has not
  // made the mistake three times, and a history that says so would be a lie about them.
  const first = applyVerdict(fresh(), verdict(), 'T1');
  const second = applyVerdict(first.profile, verdict(), 'T2');

  assert.equal(second.profile.drift_ledger.length, 1);
  assert.equal(second.profile.cards.length, 1, 'nor a second card for the same concept');
  assert.deepEqual([...second.newCards], []);
  assert.ok(
    !second.changes.join(' ').includes('filed drift'),
    'and it must not report filing something it did not file',
  );
});

test('applyVerdict: the same mistake on a different line IS a second entry', () => {
  // The dedup key is the decision, not the timestamp. A different line is a different
  // decision, and collapsing the two would hide a repeat of the same class of bug.
  const first = applyVerdict(fresh(), verdict(), 'T1');
  const moved = verdict({
    drift: {
      found: true, explanation: 'again, lower down',
      origin: { component: 'tax', file: 'build/pricing.js', line: 31, shouldFollow: 'discount', plannedPosition: 3, actualPosition: 2, dependency: 'direct', at: 'T+40m' },
      failure: null, planned_order: [], actual_order: [], confidence: 0.9, confidence_components: {}, caveats: [],
    },
  });
  assert.equal(applyVerdict(first.profile, moved, 'T2').profile.drift_ledger.length, 2);
});

test('applyVerdict: an in_progress snapshot is recorded but issues no card', () => {
  // An in-progress snapshot is a guess about a session that has not finished. Issuing
  // a card against it would file a lesson the student has not yet had.
  const { profile, newCards } = applyVerdict(fresh(), verdict({ status: 'in_progress' }), 'T1');
  assert.equal(profile.projects[0].status, 'attempted');
  assert.deepEqual([...newCards], []);
  assert.equal(profile.cards.length, 0);
});

test('applyVerdict: a completed project is never walked back by a later snapshot', () => {
  // Finishing something is a fact about the past. A student who reopens an old project
  // to look at it has not un-finished it.
  const done = applyVerdict(fresh(), verdict({ status: 'complete' }), 'T1');
  assert.equal(done.profile.projects[0].status, 'complete');

  const reopened = applyVerdict(done.profile, verdict({ status: 'in_progress' }), 'T2');
  assert.equal(reopened.profile.projects[0].status, 'complete');
});

test('applyVerdict: one verdict kept per seat, superseded rather than appended', () => {
  // The card is issued against the stored verdict, so it has to be the evidence
  // itself. A growing history of snapshots would answer no question the ledgers do
  // not already answer.
  let profile = fresh();
  for (const at of ['T1', 'T2', 'T3']) profile = applyVerdict(profile, verdict({ at }), at).profile;
  assert.equal(profile.verdicts.length, 1);
  assert.equal(profile.verdicts[0].at, 'T3');

  profile = applyVerdict(profile, verdict({ project: 'safety-gear', role: 'cv', concept: { key: 'establish-the-condition-before-acting-on-it', question: 'q' } }), 'T4').profile;
  assert.equal(profile.verdicts.length, 2, 'a different seat is a different verdict');
});

test('applyVerdict: the difficulty ledger counts a struggle only when there was one', () => {
  const struggled = applyVerdict(fresh(), verdict(), 'T1').profile.difficulty[0];
  assert.equal(struggled.seen, 1);
  assert.equal(struggled.struggled, 1, 'drift found counts as a struggle');

  const clean = applyVerdict(fresh(), verdict({ status: 'complete', drift: null, tests_green: true }), 'T1')
    .profile.difficulty[0];
  assert.equal(clean.seen, 1);
  assert.equal(clean.struggled, 0);
});

test('latestVerdict: the verifier has said nothing about a seat it has never seen', () => {
  const { profile } = applyVerdict(fresh(), verdict(), 'T1');
  assert.ok(latestVerdict(profile, 'pricing', 'backend'));
  assert.equal(latestVerdict(profile, 'pricing', 'frontend'), null, 'a different seat is not a match');
  assert.equal(latestVerdict(profile, 'no-such-project'), null);
});

// ── mastery ───────────────────────────────────────────────────────────────────

test('mastery: finishing it yourself outweighs everything else, and cites its evidence', () => {
  const escalated = applyVerdict(fresh(), verdict(), 'T1').profile;
  const completed = applyVerdict(fresh(), verdict({ status: 'complete', drift: null }), 'T1').profile;

  const [low] = escalated.mastery;
  const [high] = completed.mastery;
  assert.ok(high.level > low.level, 'fixing it must score above drifting on it');
  assert.match(high.evidence, /finished a project on it with green tests/);
  assert.match(low.evidence, /drifted 1 time\(s\)/);
  for (const row of [...escalated.mastery, ...completed.mastery]) {
    assert.ok(row.evidence.length > 0, `${row.concept} reports a level with no reason attached`);
    assert.ok(row.level >= 0 && row.level <= 1, `${row.concept} level ${row.level} is out of range`);
  }
});

test('mastery: drifting repeatedly never scores zero — that would measure exposure', () => {
  // A student who got it wrong four times and then fixed it has learned more than one
  // who never met the problem. `first_time_clean` floors at 0.25 for exactly this.
  let profile = fresh();
  for (const line of [12, 20, 31, 44]) {
    profile = applyVerdict(profile, verdict({
      drift: {
        found: true, explanation: 'again',
        origin: { component: 'tax', file: 'build/pricing.js', line, shouldFollow: 'discount', plannedPosition: 3, actualPosition: 2, dependency: 'direct', at: 'T' },
        failure: null, planned_order: [], actual_order: [], confidence: 0.9, confidence_components: {}, caveats: [],
      },
    }), `T${line}`).profile;
  }
  assert.equal(profile.drift_ledger.length, 4);
  assert.ok(profile.mastery[0].level > 0, 'four drifts scored zero mastery');
});

test('mastery: sorted weakest first, because that is the list worth acting on', () => {
  let profile = applyVerdict(fresh(), verdict({ status: 'complete', drift: null }), 'T1').profile;
  profile = applyVerdict(profile, verdict({
    project: 'safety-gear', role: 'cv',
    concept: { key: 'establish-the-condition-before-acting-on-it', question: 'q' },
  }), 'T2').profile;

  const levels = deriveMastery(profile).map((m) => m.level);
  assert.deepEqual([...levels].sort((a, b) => a - b), levels);
});

// ── the review schedule ───────────────────────────────────────────────────────

test('gradeCard: "again" costs ease and records a lapse', () => {
  // Lapses are what stop `deriveMastery` reading three lucky recalls as understanding.
  const { profile } = applyVerdict(fresh(), verdict(), 'T1');
  const id = profile.cards[0].id;
  const before = profile.cards[0];

  const after = gradeCard(profile, id, 'again')!.cards.find((c) => c.id === id)!;
  assert.equal(after.lapses, before.lapses + 1);
  assert.ok(after.ease < before.ease);
  assert.equal(after.state, 'learning');
  assert.equal(after.due_in_sessions, 1, 'a lapsed card comes back next session');
  assert.equal(after.reps, before.reps, 'a failed recall is not a repetition');
});

test('gradeCard: better grades push the card further out, and ease never runs away', () => {
  const { profile } = applyVerdict(fresh(), verdict(), 'T1');
  const id = profile.cards[0].id;
  const due = (grade: 'again' | 'hard' | 'good' | 'easy') =>
    gradeCard(profile, id, grade)!.cards.find((c) => c.id === id)!;

  assert.ok(due('again').due_in_sessions <= due('hard').due_in_sessions);
  assert.ok(due('hard').due_in_sessions <= due('good').due_in_sessions);
  assert.ok(due('good').due_in_sessions < due('easy').due_in_sessions);
  assert.equal(due('easy').state, 'review');

  // Ease is clamped in both directions, so a long streak either way cannot make the
  // schedule nonsensical.
  let repeated = profile;
  for (let i = 0; i < 30; i++) repeated = gradeCard(repeated, id, 'again')!;
  assert.ok(repeated.cards[0].ease >= 1.3);
  for (let i = 0; i < 30; i++) repeated = gradeCard(repeated, id, 'easy')!;
  assert.ok(repeated.cards[0].ease <= 3.0);
});

test('gradeCard: a card that does not exist is null — grading cannot invent one', () => {
  // The gate is upstream, in `cards/card.ts`. This asserts the schedule cannot be used
  // to conjure a card and thereby an answer.
  const { profile } = applyVerdict(fresh(), verdict(), 'T1');
  assert.equal(gradeCard(profile, 'card-does-not-exist', 'easy'), null);
  assert.equal(gradeCard(fresh(), cardId(CONCEPT, 'pricing'), 'easy'), null);
});

test('beginSession: the only place time moves, and it brings cards closer to due', () => {
  const { profile } = applyVerdict(fresh(), verdict(), 'T1');
  const id = profile.cards[0].id;
  const scheduled = gradeCard(profile, id, 'easy')!;
  const away = scheduled.cards[0].due_in_sessions;
  assert.ok(away > 1);

  const next = beginSession(scheduled);
  assert.equal(next.sessions, scheduled.sessions + 1);
  assert.equal(next.cards[0].due_in_sessions, away - 1);

  // And it floors at zero rather than going negative, so a student returning after a
  // long break does not accumulate a phantom backlog depth.
  let later = next;
  for (let i = 0; i < 20; i++) later = beginSession(later);
  assert.equal(later.cards[0].due_in_sessions, 0);
});

test('dueCards: the ones never seen come first, then the ones that keep lapsing', () => {
  const { profile } = applyVerdict(fresh(), verdict(), 'T1');
  assert.deepEqual(dueCards(profile).map((c) => c.id), [profile.cards[0].id], 'a new card is due now');

  const scheduled = gradeCard(profile, profile.cards[0].id, 'easy')!;
  assert.deepEqual(dueCards(scheduled), [], 'and not again until it comes back round');
});

// ── taking a seat ─────────────────────────────────────────────────────────────

test('noteRoleChoice: idempotent on the seat — re-reading a brief is not a career change', () => {
  const once = noteRoleChoice(fresh(), 'pricing', 'backend', 'T1');
  const twice = noteRoleChoice(once, 'pricing', 'backend', 'T2');

  assert.equal(twice.role_history.length, 1);
  assert.equal(twice.projects.length, 1);
  assert.equal(twice.projects[0].status, 'attempted');
  assert.equal(twice.projects[0].started_at, 'T1', 'the start of the work does not move');
  assert.equal(twice.projects[0].updated_at, 'T2');

  const another = noteRoleChoice(twice, 'pricing', 'frontend', 'T3');
  assert.equal(another.role_history.length, 2, 'a different seat on the same project does count');
  assert.equal(another.projects.length, 2);
});

test('noteRoleChoice then a verdict: taking a seat does not erase what the verifier said', () => {
  const seated = noteRoleChoice(fresh(), 'pricing', 'backend', 'T1');
  const judged = applyVerdict(seated, verdict({ status: 'complete' }), 'T2').profile;
  const reopened = noteRoleChoice(judged, 'pricing', 'backend', 'T3');

  assert.equal(reopened.projects[0].status, 'complete', 'reopening the brief un-finished the project');
  assert.equal(reopened.projects[0].checkpoints.length, 2, 'and dropped the checkpoint records');
});
