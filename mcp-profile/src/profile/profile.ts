/**
 * The student record, and every rule for changing it.
 *
 * Pure functions over `mentor.profile/v1`: each one takes a profile and returns a
 * new one. No I/O, so the rules below are testable without standing up a store —
 * which is the only way anyone will ever check them.
 *
 * ## The record is derived from verdicts, not reported by the student
 *
 * Nothing here has a `set_mastery` or a `mark_complete`. Everything downstream of
 * "what has this student actually done" is computed from the `mentor.verdict/v1`
 * documents MCP‑2 files, because a self-reported mastery level is a mood. The one
 * thing the student is trusted to state directly is how well they recalled a card,
 * and that is graded per review and *discounted by their lapses*.
 *
 * ## Mastery is a formula with its evidence attached
 *
 * `deriveMastery` returns a level **and the sentence that justifies it**. That is
 * not decoration. A dashboard that shows a student "62% on order-of-operations" and
 * cannot say why is asking to be either disbelieved or over-trusted, and both are
 * worse than a smaller claim with a reason. Same stance MCP‑2 takes with its
 * confidence score.
 */

import {
  PROFILE_SCHEMA,
  type Profile,
  type ProfileCard,
  type ProfileDifficulty,
  type ProfileDriftEntry,
  type ProfileMastery,
  type ProfileProject,
  type Verdict,
} from '../shared/contracts.js';

export type Grade = 'again' | 'hard' | 'good' | 'easy';

export function newProfile(student: string, handle: string, at: string): Profile {
  return {
    schema: PROFILE_SCHEMA,
    student,
    handle: handle || student,
    created_at: at,
    sessions: 1,
    role_history: [],
    projects: [],
    drift_ledger: [],
    difficulty: [],
    mastery: [],
    cards: [],
    verdicts: [],
  };
}

/**
 * Begin a new sitting.
 *
 * Bumps the session counter and brings every card one session closer to due. This
 * is the only place time advances in MCP‑3, which is what makes the scheduler
 * deterministic under test.
 */
export function beginSession(profile: Profile): Profile {
  return {
    ...profile,
    sessions: profile.sessions + 1,
    cards: profile.cards.map((c) => ({
      ...c,
      due_in_sessions: Math.max(0, c.due_in_sessions - 1),
    })),
  };
}

/**
 * Record that the student took a role on a project.
 *
 * Called by MCP‑1 when a brief is opened. Idempotent on the *seat* — reopening the
 * same brief does not add a second history entry, because a student re-reading
 * their assignment has not changed roles.
 */
export function noteRoleChoice(
  profile: Profile,
  project: string,
  role: string,
  at: string,
): Profile {
  const already = profile.role_history.some((r) => r.project === project && r.role === role);
  const projects = upsertProject(profile.projects, project, role, (existing) => ({
    project,
    role,
    status: existing?.status ?? 'attempted',
    started_at: existing?.started_at ?? at,
    updated_at: at,
    checkpoints: existing?.checkpoints ?? [],
  }));

  return {
    ...profile,
    role_history: already ? profile.role_history : [...profile.role_history, { role, project, at }],
    projects,
  };
}

export interface ApplyVerdictResult {
  readonly profile: Profile;
  /** Cards created by this verdict. Empty when the concept already had one. */
  readonly newCards: readonly string[];
  /** What actually changed, in words, for the tool response. */
  readonly changes: readonly string[];
}

/**
 * Fold one of MCP‑2's verdicts into the record.
 *
 * This is the write side of the architecture's "written by MCP‑2's verdicts" arrow,
 * and it is where five of the six things the profile owns get their values:
 * checkpoint pass records, project status, the drift ledger, the difficulty ledger,
 * and — when there is something to learn from — a card.
 *
 * A card is created for an `escalated` **or** a `complete` verdict, but never for
 * `in_progress`. The reason is not tidiness: an in-progress snapshot is a guess
 * about a session that has not finished, and issuing a card against it would file
 * a lesson the student has not yet had.
 */
export function applyVerdict(profile: Profile, verdict: Verdict, at: string): ApplyVerdictResult {
  const changes: string[] = [];
  const newCards: string[] = [];

  const status: ProfileProject['status'] =
    verdict.status === 'complete'
      ? 'complete'
      : verdict.status === 'escalated'
        ? 'escalated'
        : 'attempted';

  const projects = upsertProject(profile.projects, verdict.project, verdict.role, (existing) => ({
    project: verdict.project,
    role: verdict.role,
    // A completed project is never walked back to attempted by a later snapshot:
    // finishing something is a fact about the past, and a student who opens an old
    // project to look at it has not un-finished it.
    status: existing?.status === 'complete' ? 'complete' : status,
    started_at: existing?.started_at ?? at,
    updated_at: at,
    checkpoints: verdict.checkpoints.map((c) => ({
      id: c.id,
      subject: c.subject,
      status: c.status,
      at: c.at,
    })),
  }));
  changes.push(
    `${verdict.project}/${verdict.role} is now ${status} — ` +
      `${verdict.implemented.reached}/${verdict.implemented.total} built, ` +
      `${verdict.verified.reached}/${verdict.verified.total} verified`,
  );

  // ── the drift ledger: one entry per time a build left its design ─────────────
  let drift_ledger: readonly ProfileDriftEntry[] = profile.drift_ledger;
  const origin = verdict.drift?.origin ?? null;
  if (verdict.drift?.found && origin) {
    const entry: ProfileDriftEntry = {
      at,
      project: verdict.project,
      role: verdict.role,
      component: origin.component,
      file: origin.file,
      line: origin.line,
      should_follow: origin.shouldFollow,
      confidence: verdict.drift.confidence,
      concept: verdict.concept.key,
    };
    // Deduplicated on the *decision*, not the timestamp. Re-running the verifier on
    // the same unfixed build should not make a student's history look like they made
    // the same mistake nine times.
    const same = profile.drift_ledger.some(
      (d) =>
        d.project === entry.project &&
        d.role === entry.role &&
        d.component === entry.component &&
        d.line === entry.line,
    );
    if (!same) {
      drift_ledger = [...profile.drift_ledger, entry];
      changes.push(`filed drift: ${origin.component} @ ${origin.file}:${origin.line ?? '?'}`);
    }
  }

  // ── the difficulty ledger: how often a concept showed up, and how often it bit ──
  const struggled = !!verdict.drift?.found || !verdict.tests_green || !!verdict.stuck;
  const difficulty = bumpDifficulty(profile.difficulty, verdict.concept.key, struggled, at);

  // ── the card ────────────────────────────────────────────────────────────────
  let cards: readonly ProfileCard[] = profile.cards;
  if (verdict.status !== 'in_progress' && verdict.concept.key) {
    const id = cardId(verdict.concept.key, verdict.project);
    if (!profile.cards.some((c) => c.id === id)) {
      cards = [
        ...profile.cards,
        {
          id,
          concept: verdict.concept.key,
          project: verdict.project,
          state: 'new',
          due_in_sessions: 0,
          ease: 2.3,
          reps: 0,
          lapses: 0,
          last_grade: null,
        },
      ];
      newCards.push(id);
      changes.push(`created card ${id} (not yet earned — the answer is gated on green tests)`);
    }
  }

  // Latest verdict per seat, superseded rather than appended. The card is issued
  // against this, so it has to be the evidence itself and not a digest of it.
  const verdicts = [
    ...profile.verdicts.filter(
      (v) => !(v.project === verdict.project && v.role === verdict.role),
    ),
    verdict,
  ];

  const next: Profile = {
    ...profile,
    projects,
    drift_ledger,
    difficulty,
    cards,
    verdicts,
  };

  return { profile: { ...next, mastery: deriveMastery(next) }, newCards, changes };
}

/** The verifier's most recent word on one seat, or null if it has never spoken. */
export function latestVerdict(
  profile: Profile,
  project: string,
  role?: string,
): Verdict | null {
  const matches = profile.verdicts.filter(
    (v) => v.project === project && (!role || v.role === role),
  );
  return matches.length ? matches[matches.length - 1] : null;
}

export function cardId(concept: string, project: string): string {
  return `card-${concept}-${project}`;
}

/**
 * Grade a review, and reschedule.
 *
 * A deliberately small SM‑2 derivative, counted in sessions. Two properties are
 * worth more than the exact arithmetic:
 *
 * - **`again` costs ease and records a lapse.** Lapses are what stop `deriveMastery`
 *   from reading three lucky recalls as understanding.
 * - **Nothing here can promote a card the student has not earned.** Grading is
 *   downstream of issuance, and issuance is gated on real test output in
 *   `../cards/card.ts`. A student cannot grade their way to an answer.
 */
export function gradeCard(profile: Profile, id: string, grade: Grade): Profile | null {
  const card = profile.cards.find((c) => c.id === id);
  if (!card) return null;

  const prior = Math.max(1, card.due_in_sessions || 1);
  let ease = card.ease;
  let due: number;
  let reps = card.reps;
  let lapses = card.lapses;
  let state: ProfileCard['state'];

  switch (grade) {
    case 'again':
      lapses += 1;
      ease = Math.max(1.3, ease - 0.2);
      due = 1;
      state = 'learning';
      break;
    case 'hard':
      reps += 1;
      ease = Math.max(1.3, ease - 0.15);
      due = Math.max(1, Math.round(prior * 1.2));
      state = reps >= 3 ? 'review' : 'learning';
      break;
    case 'good':
      reps += 1;
      due = Math.max(2, Math.round(prior * ease));
      state = reps >= 2 ? 'review' : 'learning';
      break;
    case 'easy':
      reps += 1;
      ease = Math.min(3.0, ease + 0.15);
      due = Math.max(4, Math.round(prior * ease * 1.3));
      state = 'review';
      break;
  }

  const cards = profile.cards.map((c) =>
    c.id === id
      ? {
          ...c,
          state,
          due_in_sessions: due,
          ease: Math.round(ease * 100) / 100,
          reps,
          lapses,
          last_grade: grade,
        }
      : c,
  );
  const next: Profile = { ...profile, cards };
  return { ...next, mastery: deriveMastery(next) };
}

/** Cards the student should see this sitting. */
export function dueCards(profile: Profile): ProfileCard[] {
  return profile.cards
    .filter((c) => c.due_in_sessions <= 0)
    .sort((a, b) => a.reps - b.reps || b.lapses - a.lapses);
}

// ── mastery ───────────────────────────────────────────────────────────────────

/**
 * The weak-spot map, with the reasoning attached to every row.
 *
 * Three signals, weighted, and each one is something that actually happened rather
 * than something the student said about themselves:
 *
 * | signal | weight | what it means |
 * |---|---|---|
 * | `fixed_it_yourself` | 0.40 | a verdict for this concept reached `complete` with green tests |
 * | `card_retained`     | 0.40 | successful reviews, discounted by lapses |
 * | `first_time_clean`  | 0.20 | how often the concept has been attached to a drift |
 *
 * `fixed_it_yourself` carries the most weight because it is the only signal that
 * cannot be produced by re-reading — the same reason the flashcard is gated on test
 * output rather than on a claim. `first_time_clean` is weighted lowest and *cannot*
 * reach zero: a student who got it wrong four times and then fixed it has learned
 * more than one who never met the problem, and a formula that punished the first
 * harder than the second would be measuring exposure rather than understanding.
 */
export function deriveMastery(profile: Profile): ProfileMastery[] {
  const concepts = new Set<string>([
    ...profile.difficulty.map((d) => d.concept),
    ...profile.cards.map((c) => c.concept),
    ...profile.drift_ledger.map((d) => d.concept),
  ]);

  const out: ProfileMastery[] = [];
  for (const concept of concepts) {
    if (!concept) continue;
    const cards = profile.cards.filter((c) => c.concept === concept);
    const drifts = profile.drift_ledger.filter((d) => d.concept === concept);
    const difficulty = profile.difficulty.find((d) => d.concept === concept);

    // Completed a project whose concept this is. `complete` is MCP-2's word and it
    // already required green tests, so this needs no second gate.
    const completedProjects = new Set(
      profile.projects.filter((p) => p.status === 'complete').map((p) => p.project),
    );
    const fixedItYourself = cards.some((c) => completedProjects.has(c.project)) ? 1 : 0;

    const reps = cards.reduce((n, c) => n + c.reps, 0);
    const lapses = cards.reduce((n, c) => n + c.lapses, 0);
    const cardRetained = reps === 0 ? 0 : Math.max(0, Math.min(1, (reps - lapses * 0.5) / 3));

    const firstTimeClean = drifts.length === 0 ? 1 : drifts.length === 1 ? 0.5 : 0.25;

    const level =
      Math.round((0.4 * fixedItYourself + 0.4 * cardRetained + 0.2 * firstTimeClean) * 100) / 100;

    const parts = [
      fixedItYourself
        ? 'finished a project on it with green tests'
        : 'has not yet finished a project on it',
      reps === 0
        ? 'no card reviews yet'
        : `${reps} review(s)${lapses ? `, ${lapses} lapse(s)` : ''}`,
      drifts.length === 0
        ? 'never drifted on it'
        : `drifted ${drifts.length} time(s) — most recently ${drifts[drifts.length - 1].component} ` +
          `at ${drifts[drifts.length - 1].file}:${drifts[drifts.length - 1].line ?? '?'}`,
    ];

    out.push({
      concept,
      level,
      evidence: `${parts.join('; ')}. Seen ${difficulty?.seen ?? 0} time(s).`,
    });
  }

  return out.sort((a, b) => a.level - b.level);
}

// ── helpers ───────────────────────────────────────────────────────────────────

function upsertProject(
  projects: readonly ProfileProject[],
  project: string,
  role: string,
  build: (existing: ProfileProject | undefined) => ProfileProject,
): ProfileProject[] {
  const index = projects.findIndex((p) => p.project === project && p.role === role);
  const next = build(index >= 0 ? projects[index] : undefined);
  if (index < 0) return [...projects, next];
  const copy = [...projects];
  copy[index] = next;
  return copy;
}

function bumpDifficulty(
  ledger: readonly ProfileDifficulty[],
  concept: string,
  struggled: boolean,
  at: string,
): ProfileDifficulty[] {
  if (!concept) return [...ledger];
  const index = ledger.findIndex((d) => d.concept === concept);
  if (index < 0) {
    return [...ledger, { concept, seen: 1, struggled: struggled ? 1 : 0, last_at: at }];
  }
  const copy = [...ledger];
  const prior = copy[index];
  copy[index] = {
    concept,
    seen: prior.seen + 1,
    struggled: prior.struggled + (struggled ? 1 : 0),
    last_at: at,
  };
  return copy;
}
