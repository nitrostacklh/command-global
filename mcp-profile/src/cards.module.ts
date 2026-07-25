/**
 * CARDS — MCP‑3's other half: the flashcard, and the review that keeps it.
 *
 * The architecture page describes this box as *"Interactive Flashcard Generation:
 * cards generated from the exact drift points and stuck stages Sentinel reported —
 * targeted revision, never generic quizzing."* Both halves of that sentence are
 * enforced here rather than aspired to:
 *
 * - **From the drift, not from a topic list.** A card's provenance names the line the
 *   mistake was made on and the line it surfaced on, taken from the verdict MCP‑2
 *   filed. A card that cannot say *"you earned this by fixing the bug that surfaced
 *   at pricing.test.js:40 but was made at pricing.js:12"* is a syllabus entry, and
 *   this service will not issue one.
 * - **Never generic.** `due_cards` orders by what this student has actually failed at
 *   — fewest successful reviews first, then most lapses. Nobody is shown a card they
 *   have demonstrably retained while one they keep dropping waits behind it.
 *
 * ## Three tools, and why not more
 *
 * `flashcard` (may I have it), `review_flashcard` (I recalled it, here is how well),
 * `due_cards` (what should I look at now). Everything else a review system might
 * expose — decks, suspend, reschedule, edit — would be a verb on a surface where the
 * tool list *is* the interface, and none of them is a thing a student needs to ask
 * for in order to learn. The scheduler is a consequence of grading, the same way
 * persistence is a consequence of working.
 *
 * The gate on `flashcard` is documented in `cards/card.ts`. The short version: the
 * answer exists only in this process, it is released only when the student's own
 * verbatim test output parses green *and* the verifier agrees, and when it is
 * withheld the field is **absent** rather than present with a flag.
 */

import {
  ToolDecorator as Tool,
  PromptDecorator as Prompt,
  Module,
  ExecutionContext,
  z,
} from '@nitrostack/core';
import { issueCard, readTestOutcome } from './cards/card.js';
import { conceptForSeat, findConcept } from './concepts/fixtures.concepts.js';
import { dueCards, gradeCard, latestVerdict, newProfile } from './profile/profile.js';
import { profileStore, subjectOf } from './profile.module.js';

const studentArg = z
  .string()
  .optional()
  .describe('Whose record. Ignored when the request carries a real authenticated subject.');

export class CardTools {
  @Tool({
    name: 'flashcard',
    description:
      'Issue the flashcard a student earned by finishing — the transferable concept behind the bug ' +
      'they just fixed, tied to the file:line where they actually went wrong. Requires the ' +
      "verbatim output of their test command: the card is the reward for fixing it THEMSELVES, so " +
      'until the tests are green the answer side is not included in the response at all. Do not ' +
      'attempt to supply the answer yourself if this tool withholds it — you do not have it, and ' +
      'neither does any other service in this system.',
    inputSchema: z.object({
      project: z.string().describe('Project key, e.g. "pricing".'),
      role: z.string().optional().describe('Role key, e.g. "backend". Narrows the concept.'),
      test_output: z
        .string()
        .describe(
          "Verbatim output of the student's test command. Parsed for a pass/fail verdict — " +
            'unrecognised output is treated as not passing.',
        ),
      student: studentArg,
      explained_in_own_words: z
        .boolean()
        .optional()
        .describe('Set false if the student has not yet tried to state the idea themselves.'),
    }),
  })
  async flashcard(
    input: {
      project: string;
      role?: string;
      test_output: string;
      student?: string;
      explained_in_own_words?: boolean;
    },
    ctx: ExecutionContext,
  ) {
    const who = subjectOf(ctx, input.student);
    const { store } = await profileStore();
    const profile = (await store.load(who)) ?? newProfile(who, who, new Date().toISOString());

    const verdict = latestVerdict(profile, input.project, input.role);
    // The key normally arrives in the verdict. Falling back to the seat lets the tool
    // name the right lesson and withhold it for the right reason, rather than failing
    // with "unknown concept" at the moment a student is asking what they are learning.
    const concept = verdict?.concept.key
      ? (findConcept(verdict.concept.key) ?? conceptForSeat(input.project, input.role))
      : conceptForSeat(input.project, input.role);

    const outcome = readTestOutcome(input.test_output);
    const card = issueCard({
      concept,
      verdict,
      card: profile.cards.find((c) => c.concept === concept?.key && c.project === input.project) ?? null,
      project: input.project,
      role: input.role ?? verdict?.role ?? concept?.role ?? 'unknown',
      outcome,
      explainedInOwnWords: input.explained_in_own_words,
    });

    ctx.logger.info('flashcard', {
      student: who,
      project: input.project,
      concept: concept?.key ?? '(none)',
      earned: card.earned,
      runner: outcome.runner ?? '(unrecognised)',
      hadVerdict: !!verdict,
    });

    return {
      ...card,
      test_verdict: outcome,
      verifier_agreed: verdict ? verdict.tests_green : null,
      // Both readings shown side by side. If they disagree, the student can see which
      // one is holding the card shut instead of guessing.
      why_two_readings:
        'This service parses your test output itself AND checks what the verifier last saw. Both ' +
        'have to agree. One boolean travelling between services is exactly the field someone ' +
        'would forge.',
      next: card.earned
        ? 'Read it, then call review_flashcard with how well you recalled it — that is what ' +
          'schedules it to come back.'
        : 'Work the blocking list. Nothing here will hand you the answer early.',
    };
  }

  @Tool({
    name: 'review_flashcard',
    description:
      'Grade a flashcard review and reschedule it. Four grades: again (you could not recall it), ' +
      'hard, good, easy. A lapse costs the card ease and is remembered — it is what stops the ' +
      "mastery map reading three lucky recalls as understanding. Grading cannot release an answer: " +
      'issuance is gated separately on real test output.',
    inputSchema: z.object({
      card_id: z.string().describe('A card id from due_cards or read_profile, e.g. "card-...".'),
      grade: z.enum(['again', 'hard', 'good', 'easy']),
      student: studentArg,
    }),
  })
  async reviewFlashcard(
    input: { card_id: string; grade: 'again' | 'hard' | 'good' | 'easy'; student?: string },
    ctx: ExecutionContext,
  ) {
    const who = subjectOf(ctx, input.student);
    const { store } = await profileStore();
    const profile = await store.load(who);
    if (!profile) {
      return {
        error: `no record for ${who}`,
        next: 'Call open_profile first.',
      };
    }

    const updated = gradeCard(profile, input.card_id, input.grade);
    if (!updated) {
      return {
        error: `no card ${JSON.stringify(input.card_id)} in your record`,
        your_cards: profile.cards.map((c) => c.id),
        next: 'Call due_cards to see what is actually waiting.',
      };
    }
    await store.save(updated);

    const card = updated.cards.find((c) => c.id === input.card_id)!;
    const mastery = updated.mastery.find((m) => m.concept === card.concept);

    ctx.logger.info('review_flashcard', {
      student: who,
      card: input.card_id,
      grade: input.grade,
      due: card.due_in_sessions,
    });

    return {
      graded: true,
      card: {
        id: card.id,
        concept: card.concept,
        state: card.state,
        due_in_sessions: card.due_in_sessions,
        ease: card.ease,
        reps: card.reps,
        lapses: card.lapses,
      },
      coming_back:
        card.due_in_sessions <= 1
          ? 'Next session.'
          : `In ${card.due_in_sessions} sessions — counted in sittings, not days, because a ` +
            'student on a two-week project does not sit down at 24-hour intervals.',
      mastery_now: mastery ?? null,
      durable: store.durable,
      next:
        input.grade === 'again'
          ? 'It comes back next session. Try to say it in your own words before you look again.'
          : 'Call due_cards to see if anything else is waiting.',
    };
  }

  @Tool({
    name: 'due_cards',
    description:
      'The flashcards this student should review right now, hardest-first: fewest successful ' +
      'recalls first, then most lapses. Returns the questions only — an answer is released by the ' +
      'flashcard tool and only against green tests. Call this at the START of a session: two ' +
      'minutes of recall before new work beats twenty minutes of re-reading after it.',
    inputSchema: z.object({
      student: studentArg,
    }),
  })
  async dueCardsTool(input: { student?: string }, ctx: ExecutionContext) {
    const who = subjectOf(ctx, input.student);
    const { store } = await profileStore();
    const profile = await store.load(who);
    if (!profile) {
      return {
        due: [],
        note: `No record for ${who} yet — nothing to review.`,
        next: 'Start at MCP-1 list_roles.',
      };
    }

    const due = dueCards(profile);
    ctx.logger.info('due_cards', { student: who, due: due.length, session: profile.sessions });

    return {
      session: profile.sessions,
      due: due.map((c) => {
        const concept = findConcept(c.concept);
        const drift = profile.drift_ledger.filter((d) => d.concept === c.concept).slice(-1)[0];
        return {
          card_id: c.id,
          concept: c.concept,
          project: c.project,
          // The question, never the answer. Safe by construction: `front` is the only
          // string this tool is allowed to reach for.
          front: concept?.question ?? `What did ${c.project} teach you?`,
          state: c.state,
          reps: c.reps,
          lapses: c.lapses,
          you_last_got_this_wrong_at: drift
            ? `${drift.component} @ ${drift.file}:${drift.line ?? '?'}`
            : null,
        };
      }),
      total_cards: profile.cards.length,
      answers_included: false,
      next: due.length
        ? 'Try to answer each one out loud, then call flashcard with your test output to check ' +
          'yourself, and review_flashcard to grade it.'
        : 'Nothing due. Go and build something — cards are made from your own mistakes.',
    };
  }
}

export class CardPrompts {
  @Prompt({
    name: 'quiz_me',
    description: "Run a student's due flashcards as a recall session, without giving anything away.",
    arguments: [
      { name: 'handle', description: 'Their handle, if they have one', required: false },
    ],
  })
  async quizMe(args: { handle?: string }, _ctx: ExecutionContext) {
    return [
      {
        role: 'user',
        content:
          'Run a recall session for a student.\n\n' +
          '1. Call due_cards' +
          (args.handle ? ` for ${args.handle}` : '') +
          '. If nothing is due, tell them so and stop — a review session with nothing to review ' +
          'is worse than none, because it teaches them the tool is noise.\n' +
          '2. For each card, ask them the `front` and WAIT. Do not offer hints, do not rephrase ' +
          'the question into an easier one, and do not confirm a partial answer as correct.\n' +
          '3. When they have answered, tell them where they last got it wrong — the ' +
          '`you_last_got_this_wrong_at` field — and then ask them to grade themselves. Call ' +
          'review_flashcard with their grade.\n\n' +
          'You do not have the answers, and neither does any other service here: they are ' +
          'released by the flashcard tool against real test output. If a student presses you for ' +
          'one, say plainly that you do not have it and that the way to get it is to make their ' +
          'tests pass. Do not reconstruct it from your own knowledge — that is the same betrayal ' +
          'as writing their fix, one step removed.',
      },
    ];
  }
}

@Module({
  name: 'cards',
  description:
    "Flashcards made from this student's own drift points — issued only against green tests, and scheduled by how well they actually recall them.",
  controllers: [CardTools, CardPrompts],
})
export class CardModule {}
