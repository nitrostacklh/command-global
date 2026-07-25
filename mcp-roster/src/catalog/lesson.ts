/**
 * `mentor.lesson/v1` — Layer 2. The stage that teaches the concept, before the
 * student designs anything.
 *
 * ## Why this is a stage and not a paragraph in the brief
 *
 * The brief declares the concept as a *question* and then walks away. Until this
 * existed, a student who did not already know the answer had nowhere to learn it:
 * the loop declared the idea at the start and released it as a flashcard at the
 * end, and the middle was empty (`GAPS.md` Gap 13). The lesson is that middle.
 *
 * ## The one rule these panels obey
 *
 * **No panel states the principle.** That is not a stylistic preference, it is the
 * same invariant the rest of the app is built on: MCP‑1 has never held a concept
 * answer, and a lesson that pastes the answer into a panel would put one here by
 * the back door. So the panels do a different job — they set the problem up, make
 * the student *commit* to an order, and then show the one case that separates the
 * two answers. The student derives the rule. MCP‑3 confirms it, against their real
 * test output, once they have fixed the bug themselves.
 *
 * `scripts/embed_fixtures.mjs` asserts this rather than trusting it: a panel
 * containing a sentence of `concept.answer`, or a clause of `concept.transfers_to`,
 * fails the build.
 *
 * ## The four panel kinds, and why the order is load-bearing
 *
 * | Kind | Does |
 * |---|---|
 * | `setup` | names the two operations, neutrally. Nothing here hints at an order |
 * | `commit` | the student picks one, *before* seeing anything. This is the pedagogy |
 * | `witness` | the discriminating case — where the two answers agree, and where they part |
 * | `generalise` | asks for the transferable shape. Does not supply it |
 *
 * `commit` must come before `witness`. A reveal shown to somebody who never picked
 * a side teaches nothing — they read it, agree with it, and retain none of it. The
 * generator enforces the ordering, and enforces that every choice offered in
 * `commit` has a stated result in every `witness` case, so a student cannot pick an
 * option the reveal is silent about.
 *
 * ## Deterministic, not generated
 *
 * Panels are authored text and structured figures, never image-model output
 * (`MENTOR-CONCEPT.md` §3). Two reasons, and the second is the real one: the whole
 * platform is testable offline with no API key, and a lesson you cannot re-read is
 * not a lesson. The same lesson renders the same way on stage as it did in the test.
 */

export const LESSON_SCHEMA = 'mentor.lesson/v1';

export class LessonParseError extends Error {}

/** How a student walks a lesson. See the table in the header. */
export type PanelKind = 'setup' | 'commit' | 'witness' | 'generalise';

/**
 * An authored figure. Deliberately not SVG: a shape the widget renders, so the
 * same lesson can be drawn by a widget, printed as text by a client with no UI,
 * and asserted on by a test — from one source.
 *
 * `unordered` is the only kind so far, and it is the one that matters: two boxes
 * with no arrow between them, which is exactly the claim the setup panel makes.
 */
export interface Figure {
  readonly kind: 'unordered';
  readonly items: readonly string[];
}

/** One option in the `commit` panel. */
export interface Choice {
  readonly id: string;
  readonly label: string;
}

/**
 * One row of the `witness` panel: an input, what each choice produces for it, and
 * whether the choices can be told apart on this input at all.
 *
 * `agree` cases are not filler. They are the reason the bug ships: they are the
 * inputs under which a wrong answer looks exactly like a right one.
 */
export interface WitnessCase {
  readonly input: string;
  /** Keyed by `Choice.id`. Every choice appears in every case. */
  readonly results: Readonly<Record<string, string>>;
  readonly outcome: 'agree' | 'diverge';
}

export interface Panel {
  readonly id: string;
  readonly kind: PanelKind;
  readonly title: string;
  readonly body: string;
  readonly figure?: Figure | null;
  readonly choices?: readonly Choice[];
  readonly cases?: readonly WitnessCase[];
  /** The line under a `witness` panel that says what to notice. */
  readonly note?: string;
  /** The `generalise` panel's ask. A question — never its answer. */
  readonly prompt?: string;
}

export interface Lesson {
  readonly schema: typeof LESSON_SCHEMA;
  readonly project: string;
  readonly role: string;
  /** The concept this teaches. The same key the verdict and the card travel under. */
  readonly conceptKey: string;
  readonly title: string;
  readonly panels: readonly Panel[];
}

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback);

const PANEL_KINDS: readonly PanelKind[] = ['setup', 'commit', 'witness', 'generalise'];

const isPanelKind = (v: unknown): v is PanelKind =>
  typeof v === 'string' && (PANEL_KINDS as readonly string[]).includes(v);

function safeJson(raw: string, what: string): unknown {
  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new LessonParseError(
      `${what} is not valid JSON: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

function parseFigure(input: unknown): Figure | null {
  if (!isObj(input)) return null;
  if (input.kind !== 'unordered') return null;
  const items = Array.isArray(input.items)
    ? input.items.filter((x): x is string => typeof x === 'string')
    : [];
  return items.length ? { kind: 'unordered', items } : null;
}

function parsePanel(input: unknown, index: number): Panel {
  if (!isObj(input)) throw new LessonParseError(`panel ${index} must be a JSON object`);

  const kind = input.kind;
  if (!isPanelKind(kind)) {
    throw new LessonParseError(
      `panel ${index} has kind ${JSON.stringify(kind)} — expected one of ${PANEL_KINDS.join(', ')}`,
    );
  }

  const id = str(input.id) || `panel-${index}`;
  const title = str(input.title);
  if (!title) throw new LessonParseError(`panel ${JSON.stringify(id)} has no title`);

  const choices = Array.isArray(input.choices)
    ? input.choices.filter(isObj).map((c) => ({ id: str(c.id), label: str(c.label) }))
    : undefined;

  const cases = Array.isArray(input.cases)
    ? input.cases.filter(isObj).map((k) => {
        const results: Record<string, string> = {};
        if (isObj(k.results)) {
          for (const [key, value] of Object.entries(k.results)) results[key] = str(value);
        }
        return {
          input: str(k.input),
          results,
          outcome: k.outcome === 'diverge' ? ('diverge' as const) : ('agree' as const),
        };
      })
    : undefined;

  return {
    id,
    kind,
    title,
    body: str(input.body),
    figure: parseFigure(input.figure),
    ...(choices?.length ? { choices } : {}),
    ...(cases?.length ? { cases } : {}),
    ...(str(input.note) ? { note: str(input.note) } : {}),
    ...(str(input.prompt) ? { prompt: str(input.prompt) } : {}),
  };
}

/**
 * Parse and validate a lesson. Accepts the JSON string the generator embeds, or an
 * already-parsed object.
 *
 * The ordering rule is enforced here as well as in the generator, because these are
 * two different failures: the generator catches a lesson somebody *authored* wrong,
 * and this catches a lesson that arrived wrong from anywhere else.
 */
export function parseLesson(input: unknown): Lesson {
  const raw: unknown = typeof input === 'string' ? safeJson(input, 'lesson') : input;
  if (!isObj(raw)) throw new LessonParseError('lesson must be a JSON object');

  const schema = str(raw.schema, LESSON_SCHEMA);
  if (schema !== LESSON_SCHEMA) {
    throw new LessonParseError(
      `unsupported lesson schema ${JSON.stringify(schema)} — expected ${LESSON_SCHEMA}`,
    );
  }

  const panelsRaw = Array.isArray(raw.panels) ? raw.panels : [];
  if (panelsRaw.length === 0) throw new LessonParseError('a lesson with no panels teaches nothing');

  const panels = panelsRaw.map(parsePanel);

  const kinds = panels.map((p) => p.kind);
  const commitAt = kinds.indexOf('commit');
  const witnessAt = kinds.indexOf('witness');
  if (commitAt !== -1 && witnessAt !== -1 && commitAt > witnessAt) {
    throw new LessonParseError(
      'the witness panel precedes the commit panel — the reveal would land on a student who never picked a side',
    );
  }

  return {
    schema: LESSON_SCHEMA,
    project: str(raw.project),
    role: str(raw.role),
    conceptKey: str(raw.conceptKey) || str(raw.concept_key),
    title: str(raw.title),
    panels,
  };
}
