/**
 * Layer 2 — the lesson stage.
 *
 * Two things are worth testing here and they are not the same thing:
 *
 *  1. **The panels are shaped like a lesson.** A commit panel before the witness
 *     panel, every offered choice answered in every case, and at least one case
 *     where the two answers agree — because the agreeing case is the one that
 *     explains why the bug shipped.
 *  2. **The reveal is gated.** The witness panel is *absent* from the first
 *     response, not present behind a flag. This is the same construction as the
 *     flashcard's answer side, and it is tested the same way: by asserting the
 *     string does not appear anywhere in the payload a model could read.
 *
 * The leak assertion — that no panel contains `concept.answer` — cannot live here,
 * because this service has never held an answer to compare against. It runs in
 * `scripts/embed_fixtures.mjs`, where both halves exist, and `npm run fixture:check`
 * fails the build on it.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { parseLesson, LessonParseError, LESSON_SCHEMA } from './lesson.js';
import { bundledLesson, lessonSeats } from './fixtures.lessons.js';
import { RosterTools } from '../roster.module.js';

/** openLesson only reaches for the logger. */
const ctx = () => ({ logger: { info: () => {}, warn: () => {}, error: () => {} } }) as never;

const tools = () => new RosterTools();

// ── the bundled lessons ──────────────────────────────────────────────────────

test('every seat with a lesson parses, and names the concept it teaches', () => {
  const seats = lessonSeats();
  assert.ok(seats.length > 0, 'no lessons are bundled at all');

  for (const seat of seats) {
    const [project, role] = seat.split('/');
    const lesson = bundledLesson(project, role);
    assert.ok(lesson, `${seat} is listed but did not load`);
    assert.equal(lesson.schema, LESSON_SCHEMA);
    assert.equal(lesson.project, project);
    assert.equal(lesson.role, role);
    assert.ok(lesson.conceptKey, `${seat} teaches no named concept`);
    assert.ok(lesson.title, `${seat} has no title`);
  }
});

test('a seat with no lesson returns null rather than inventing one', () => {
  assert.equal(bundledLesson('pricing', 'no-such-role'), null);
  assert.equal(bundledLesson('no-such-project', 'backend'), null);
});

test('the student commits before the reveal, in every bundled lesson', () => {
  for (const seat of lessonSeats()) {
    const [project, role] = seat.split('/');
    const lesson = bundledLesson(project, role)!;
    const kinds = lesson.panels.map((p) => p.kind);
    const commitAt = kinds.indexOf('commit');
    const witnessAt = kinds.indexOf('witness');

    assert.notEqual(commitAt, -1, `${seat} never asks the student to commit`);
    assert.notEqual(witnessAt, -1, `${seat} never shows the discriminating case`);
    assert.ok(commitAt < witnessAt, `${seat} reveals before it asks`);
  }
});

test('every choice is answered in every witness case', () => {
  for (const seat of lessonSeats()) {
    const [project, role] = seat.split('/');
    const lesson = bundledLesson(project, role)!;
    const commit = lesson.panels.find((p) => p.kind === 'commit')!;
    const witness = lesson.panels.find((p) => p.kind === 'witness')!;

    assert.ok((commit.choices ?? []).length >= 2, `${seat} offers fewer than two choices`);
    for (const kase of witness.cases ?? []) {
      for (const choice of commit.choices ?? []) {
        assert.ok(
          choice.id in kase.results,
          `${seat}: case ${JSON.stringify(kase.input)} says nothing about ${choice.id}`,
        );
      }
    }
  }
});

test('every lesson has a case where the answers agree, and one where they part', () => {
  for (const seat of lessonSeats()) {
    const [project, role] = seat.split('/');
    const lesson = bundledLesson(project, role)!;
    const witness = lesson.panels.find((p) => p.kind === 'witness')!;
    const outcomes = new Set((witness.cases ?? []).map((k) => k.outcome));

    // Without the agreeing case there is no explanation of why the bug survived
    // testing, which is the part students actually need.
    assert.ok(outcomes.has('agree'), `${seat} never shows the case where the bug hides`);
    assert.ok(outcomes.has('diverge'), `${seat} never shows the case that separates the answers`);
  }
});

test("the pricing lesson uses the fixture's real numbers", () => {
  // If the injected bug in `fixtures/pricing/build/pricing.js` ever changes, this
  // fails — a lesson quoting totals the service does not produce is worse than no
  // lesson, because the student checks it against their own failing test.
  const lesson = bundledLesson('pricing', 'backend')!;
  const witness = lesson.panels.find((p) => p.kind === 'witness')!;
  const diverge = (witness.cases ?? []).find((k) => k.outcome === 'diverge')!;

  assert.equal(diverge.results.discount_first, '$72.00'); // what test 3 expects
  assert.equal(diverge.results.tax_first, '$80.00'); // what the bug actually returns
});

// ── the parser ───────────────────────────────────────────────────────────────

test('parseLesson refuses a lesson that reveals before it asks', () => {
  assert.throws(
    () =>
      parseLesson({
        schema: LESSON_SCHEMA,
        title: 'backwards',
        panels: [
          { id: 'w', kind: 'witness', title: 'the reveal' },
          { id: 'c', kind: 'commit', title: 'now choose' },
        ],
      }),
    LessonParseError,
  );
});

test('parseLesson refuses an empty lesson and an unknown panel kind', () => {
  assert.throws(() => parseLesson({ schema: LESSON_SCHEMA, panels: [] }), LessonParseError);
  assert.throws(
    () => parseLesson({ schema: LESSON_SCHEMA, panels: [{ id: 'x', kind: 'lecture', title: 'no' }] }),
    LessonParseError,
  );
});

test('parseLesson refuses a schema it does not know', () => {
  assert.throws(
    () => parseLesson({ schema: 'mentor.lesson/v2', panels: [{ id: 'a', kind: 'setup', title: 't' }] }),
    LessonParseError,
  );
});

// ── the gate ─────────────────────────────────────────────────────────────────

test('the first call withholds the reveal — absent, not flagged', async () => {
  const res: any = await tools().openLesson({ project: 'pricing', role: 'backend' }, ctx());

  const kinds = res.panels.map((p: any) => p.kind);
  assert.deepEqual(kinds, ['setup', 'commit']);
  assert.ok(res.awaiting.choices.length >= 2);

  // The real assertion: the withheld content is nowhere in the payload at all.
  const wire = JSON.stringify(res);
  assert.ok(!wire.includes('$72.00'), 'the reveal leaked into the first response');
  assert.ok(!wire.includes('$80.00'), 'the reveal leaked into the first response');
  assert.ok(!wire.includes('witness'), 'the withheld panel appears by kind in the first response');
});

test('a made-up choice is refused, and the reveal stays withheld', async () => {
  const res: any = await tools().openLesson(
    { project: 'pricing', role: 'backend', chose: 'whatever-i-like' },
    ctx(),
  );

  assert.ok(res.rejected, 'an unknown choice was accepted');
  assert.deepEqual(
    res.panels.map((p: any) => p.kind),
    ['setup', 'commit'],
  );
  assert.ok(!JSON.stringify(res).includes('$72.00'));
});

test('committing to a real choice releases the rest, and marks what they picked', async () => {
  const res: any = await tools().openLesson(
    { project: 'pricing', role: 'backend', chose: 'tax_first' },
    ctx(),
  );

  assert.equal(res.you_chose.id, 'tax_first');
  const kinds = res.panels.map((p: any) => p.kind);
  assert.deepEqual(kinds, ['witness', 'generalise']);
  assert.ok(JSON.stringify(res).includes('$80.00'), 'the reveal did not arrive');
});

test('the reveal still does not hand over the principle', async () => {
  const res: any = await tools().openLesson(
    { project: 'pricing', role: 'backend', chose: 'discount_first' },
    ctx(),
  );

  // Even having chosen correctly, the student is not told they were right — the
  // witness panel shows both columns and lets them read it off. And the generalise
  // panel asks for the transferable shape rather than supplying it.
  const generalise = res.panels.find((p: any) => p.kind === 'generalise');
  assert.ok(generalise.prompt, 'the generalise panel asks nothing');
  assert.ok(!/^you (were|are) (right|correct)/i.test(JSON.stringify(res)));
  assert.match(res.concept_you_are_here_to_learn.answer, /not held by this service/);
});

test('a project with no lesson says so, and points at the ones that exist', async () => {
  const res: any = await tools().openLesson({ project: 'pricing', role: 'nobody' }, ctx());
  assert.ok(res.error);
  assert.ok(Array.isArray(res.seats_with_lessons) && res.seats_with_lessons.length > 0);
});
