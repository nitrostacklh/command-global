/**
 * Where the student record lives.
 *
 * MCP‑3 is the **single owner** of everything about a student — the architecture
 * page is explicit that it is "created at register, read by MCP‑1, written by
 * MCP‑2's verdicts". So this file is the only place in the whole system that holds
 * a durable fact about a person, and the other two services reach it over MCP.
 *
 * ## Why an interface and not just a database
 *
 * MENTOR's pitch — and it is genuinely load-bearing for an education judge — is
 * that it runs with no API key and no per-student cost. A required hosted database
 * contradicts that: it makes the app un-runnable without a secret, and turns "clone
 * it and go" into "provision Postgres first".
 *
 * So persistence is a **capability, not a prerequisite.** The default backend needs
 * no configuration and no network. A durable one is opt-in. Nothing above this file
 * knows which it got — but every tool that depends on durability *reports* which it
 * got, because silently losing a student's term of work would be far worse than
 * telling them up front that today's session is ephemeral.
 *
 * ## Why `node:sqlite` and not a driver
 *
 * The hackathon rules say to build with the official NitroStack TypeScript SDK and
 * not to add others. `node:sqlite` is in the Node standard library, so the durable
 * path adds **zero dependencies** — no native `better-sqlite3` build to fail on
 * their image, no `pg`, no connection string.
 *
 * The catch is real: `node:sqlite` landed in **Node 22.5** and NitroCloud's build
 * images are **Node 20**, so on the deployed service it will very likely be
 * missing. That is handled by detection and honest reporting rather than a crash —
 * `openStore()` falls back to memory and says why, and `profile_status` surfaces it.
 * An exception at startup would take the whole demo down to protect a feature nobody
 * had yet relied on.
 *
 * ## The record is stored whole
 *
 * One JSON document per student rather than a normalised schema. Nothing queries
 * inside it — every read is "give me this student's record" and every write is
 * "here is the new one" — so tables per checkpoint and per card would buy nothing
 * except migrations to get wrong. The one thing that *is* indexed is the summary
 * row an instructor scans, and that is derived on write.
 */

import type { Profile } from '../shared/contracts.js';

export type StoreBackend = 'memory' | 'sqlite';

/** Enough for an instructor to scan a class without loading every record. */
export interface ProfileSummary {
  readonly student: string;
  readonly handle: string;
  readonly projects: number;
  readonly completed: number;
  readonly cards: number;
  readonly updatedAt: string;
}

export interface ProfileStore {
  readonly backend: StoreBackend;
  /** False when a restart or redeploy loses everything. Reported, never hidden. */
  readonly durable: boolean;
  /** One sentence a student can read about where their record lives. */
  readonly note: string;

  load(student: string): Promise<Profile | null>;
  save(profile: Profile): Promise<Profile>;
  /** Every student. Instructor-only at the tool layer — this API does not police it. */
  listAll(): Promise<ProfileSummary[]>;
  close(): void;
}

/** Injected so tests are deterministic; nothing here reads the clock directly. */
export type Clock = () => string;
const systemClock: Clock = () => new Date().toISOString();

function summarise(profile: Profile, updatedAt: string): ProfileSummary {
  return {
    student: profile.student,
    handle: profile.handle,
    projects: profile.projects.length,
    completed: profile.projects.filter((p) => p.status === 'complete').length,
    cards: profile.cards.length,
    updatedAt,
  };
}

// ── memory ────────────────────────────────────────────────────────────────────

/**
 * The zero-config default. Survives a conversation and a reconnect; does not
 * survive a restart.
 *
 * Worth having rather than treating "no database" as "no persistence": within one
 * deployment a student can close their client, come back, and resume — which is
 * most of the value, and it costs nothing to configure.
 */
export class MemoryProfileStore implements ProfileStore {
  readonly backend = 'memory' as const;
  readonly durable = false;
  readonly note =
    'In memory. Your record survives this conversation and reconnecting, but not a server ' +
    'restart or redeploy. Export it with read_profile if you need it to outlive today.';

  private readonly rows = new Map<string, { profile: Profile; updatedAt: string }>();

  constructor(private readonly now: Clock = systemClock) {}

  async load(student: string): Promise<Profile | null> {
    return this.rows.get(student)?.profile ?? null;
  }

  async save(profile: Profile): Promise<Profile> {
    this.rows.set(profile.student, { profile, updatedAt: this.now() });
    return profile;
  }

  async listAll(): Promise<ProfileSummary[]> {
    return [...this.rows.values()]
      .map((r) => summarise(r.profile, r.updatedAt))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  close(): void {
    this.rows.clear();
  }
}

// ── sqlite ────────────────────────────────────────────────────────────────────

/** Minimal shape of the bits of `node:sqlite` used here. */
interface SqliteDb {
  exec(sql: string): void;
  prepare(sql: string): {
    run(...params: unknown[]): unknown;
    get(...params: unknown[]): Record<string, unknown> | undefined;
    all(...params: unknown[]): Record<string, unknown>[];
  };
  close(): void;
}

export class SqliteProfileStore implements ProfileStore {
  readonly backend = 'sqlite' as const;
  readonly durable = true;
  readonly note: string;

  constructor(
    private readonly db: SqliteDb,
    path: string,
    private readonly now: Clock = systemClock,
  ) {
    this.note = `SQLite at ${path}. Your record persists across restarts and redeploys.`;
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS profiles (
        student    TEXT PRIMARY KEY,
        handle     TEXT NOT NULL,
        document   TEXT NOT NULL,
        projects   INTEGER NOT NULL,
        completed  INTEGER NOT NULL,
        cards      INTEGER NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
  }

  async load(student: string): Promise<Profile | null> {
    const row = this.db.prepare('SELECT document FROM profiles WHERE student = ?').get(student);
    if (!row) return null;
    return JSON.parse(String(row.document)) as Profile;
  }

  async save(profile: Profile): Promise<Profile> {
    const updatedAt = this.now();
    const s = summarise(profile, updatedAt);
    this.db
      .prepare(
        `INSERT INTO profiles (student, handle, document, projects, completed, cards, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(student) DO UPDATE SET
           handle = excluded.handle, document = excluded.document,
           projects = excluded.projects, completed = excluded.completed,
           cards = excluded.cards, updated_at = excluded.updated_at`,
      )
      .run(
        profile.student,
        profile.handle,
        JSON.stringify(profile),
        s.projects,
        s.completed,
        s.cards,
        updatedAt,
      );
    return profile;
  }

  async listAll(): Promise<ProfileSummary[]> {
    return this.db
      .prepare(
        'SELECT student, handle, projects, completed, cards, updated_at FROM profiles ORDER BY updated_at DESC',
      )
      .all()
      .map((r) => ({
        student: String(r.student),
        handle: String(r.handle),
        projects: Number(r.projects),
        completed: Number(r.completed),
        cards: Number(r.cards),
        updatedAt: String(r.updated_at),
      }));
  }

  close(): void {
    this.db.close();
  }
}

// ── selection ─────────────────────────────────────────────────────────────────

export interface OpenStoreResult {
  readonly store: ProfileStore;
  /** Why this backend and not another. Surfaced, never swallowed. */
  readonly reason: string;
}

/**
 * Choose a backend from the environment, and be explicit about why.
 *
 * `PROFILE_STORE=sqlite` asks for durability; anything else (including unset) gets
 * memory. Asking for SQLite on a runtime that lacks it is **not** an error.
 */
export async function openStore(
  env: Record<string, string | undefined> = process.env,
  clock: Clock = systemClock,
): Promise<OpenStoreResult> {
  const want = (env.PROFILE_STORE ?? env.MENTOR_STORE ?? 'memory').toLowerCase();
  if (want !== 'sqlite') {
    return {
      store: new MemoryProfileStore(clock),
      reason:
        'PROFILE_STORE is not set to "sqlite", so records are kept in memory. This is the default ' +
        'on purpose: the app runs with no configuration, no network and no secret.',
    };
  }

  const path = env.PROFILE_DB_PATH ?? env.MENTOR_DB_PATH ?? 'mentor-profiles.db';
  try {
    // Imported by expression so a runtime without the module fails here, where it
    // can be reported, rather than at module load where it would kill the server.
    const sqlite = (await import('node:sqlite')) as unknown as {
      DatabaseSync: new (p: string) => SqliteDb;
    };
    return {
      store: new SqliteProfileStore(new sqlite.DatabaseSync(path), path, clock),
      reason: `PROFILE_STORE=sqlite and node:sqlite is available — records persist at ${path}.`,
    };
  } catch (err) {
    return {
      store: new MemoryProfileStore(clock),
      reason:
        'PROFILE_STORE=sqlite was requested but node:sqlite is unavailable on this runtime ' +
        `(${err instanceof Error ? err.message : String(err)}). It requires Node 22.5+, and ` +
        'NitroCloud builds on Node 20. Falling back to memory — records are kept but are not ' +
        'durable across a restart. Reported rather than thrown, so a missing optional feature ' +
        'cannot take the server down.',
    };
  }
}
