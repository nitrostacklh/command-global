/**
 * The drawer student work is kept in.
 *
 * Ported from `sentinel/src/modules/registrar/registrar.test.ts` (deleted at
 * `aab534d`; `git show e15810a:`). **The contract changed shape in the split** and
 * these cases changed with it, deliberately rather than incidentally:
 *
 * | before | now |
 * |---|---|
 * | `ProgressStore`, keyed `(student, project, role)` | `ProfileStore`, keyed `student` |
 * | stored a `ProgressLog` per seat | stores one whole `mentor.profile/v1` per student |
 * | `load(student, project, role)` · `listForStudent` · `listAll` | `load(student)` · `listAll` |
 * | `MENTOR_STORE` / `MENTOR_DB_PATH` | `PROFILE_STORE` / `PROFILE_DB_PATH`, old names still honoured |
 *
 * The old "reached counts distinct passing checkpoints only" case had no home: the
 * store no longer counts checkpoints, because the record is stored whole and nothing
 * queries inside it. Its intent — *the summary row an instructor scans is derived,
 * and derived correctly* — is preserved as the last two cases here.
 *
 * The cases worth writing are the ones where a plausible implementation is quietly
 * wrong in a way that costs a real person:
 *
 * - a second save appending instead of replacing would grow a record without bound;
 * - one student's record reachable through another's key is the failure this module
 *   exists to prevent;
 * - reporting `durable: true` on a runtime that cannot persist would tell a student
 *   their term of work is safe when it is one restart from gone.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  MemoryProfileStore,
  openStore,
  type Clock,
  type ProfileStore,
} from './store.js';
import { applyVerdict, newProfile } from './profile.js';
import { parseVerdict, type Profile, type Verdict } from '../shared/contracts.js';

const FIXED: Clock = () => '2026-07-25T12:00:00.000Z';

/** A record for one student, optionally with `projects` folded in from verdicts. */
function record(student: string, ...verdicts: Verdict[]): Profile {
  let profile = newProfile(student, student, '2026-07-25T00:00:00.000Z');
  for (const verdict of verdicts) profile = applyVerdict(profile, verdict, 'T1').profile;
  return profile;
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
    drift: null,
    stuck: null,
    concept: { key: 'order-of-operations-in-money-math', question: 'which first?' },
    provenance: 'observed',
    tests_green: false,
    at: '2026-07-26T00:00:00.000Z',
    ...over,
  });
}

/**
 * Registers the shared contract for every backend.
 *
 * Synchronous on purpose. An earlier version of the original file was `async` and
 * `await`ed each `test()`, which registers cases while the runner is already draining
 * and dies as `cancelledByParent: Promise resolution is still pending but the event
 * loop has already resolved` — under `--test-force-exit` that surfaces as a random
 * unrelated case failing. Register tests synchronously; only the bodies are async.
 */
function storeBehaviour(name: string, make: () => ProfileStore) {
  test(`${name}: saves, loads, and overwrites in place`, async () => {
    const store = make();
    await store.save(record('s1'));
    await store.save({ ...record('s1'), handle: 'renamed' });

    const got = await store.load('s1');
    assert.equal(got?.handle, 'renamed', 'the second save must replace, not duplicate');
    assert.equal((await store.listAll()).length, 1, 'one row per student, not one per save');
    assert.equal((await store.listAll())[0].updatedAt, FIXED());
    store.close();
  });

  test(`${name}: keeps students apart`, async () => {
    const store = make();
    await store.save(record('s1'));
    await store.save(record('s2', verdict({ student: 's2' })));

    assert.equal((await store.load('s1'))?.projects.length, 0);
    assert.equal((await store.load('s2'))?.projects.length, 1, "s2's work is s2's");
    assert.equal((await store.listAll()).length, 2);
    store.close();
  });

  test(`${name}: a missing record is null, not a throw`, async () => {
    const store = make();
    assert.equal(await store.load('nobody'), null);
    assert.deepEqual(await store.listAll(), []);
    store.close();
  });

  test(`${name}: the whole record round-trips unchanged`, async () => {
    // The store is the only place the record leaves this process's memory. If a
    // backend loses the drift ledger or a card's review state on the way through,
    // every downstream claim — mastery, due cards, the card's provenance — silently
    // degrades rather than failing.
    const store = make();
    const original = record('s1', verdict({ status: 'complete', tests_green: true }));
    await store.save(original);
    assert.deepEqual(await store.load('s1'), original);
    store.close();
  });

  test(`${name}: the instructor summary is derived on write, and counts what it says`, async () => {
    const store = make();
    await store.save(
      record(
        's1',
        verdict({ project: 'pricing', status: 'complete', tests_green: true }),
        verdict({ project: 'safety-gear', role: 'cv', status: 'escalated', concept: { key: 'establish-the-condition-before-acting-on-it', question: 'q' } }),
      ),
    );
    const [row] = await store.listAll();
    assert.equal(row.student, 's1');
    assert.equal(row.projects, 2, 'two seats attempted');
    assert.equal(row.completed, 1, 'only the complete one counts as complete');
    assert.equal(row.cards, 2, 'a card per concept met, earned or not');
    store.close();
  });
}

storeBehaviour('MemoryProfileStore', () => new MemoryProfileStore(FIXED));

// Only meaningful where node:sqlite exists (Node 22.5+). Skipped rather than failed
// elsewhere, because the deployed runtime is Node 20 and a red suite there would be
// reporting the environment, not a defect.
const sqliteAvailable = await import('node:sqlite').then(
  () => true,
  () => false,
);

if (sqliteAvailable) {
  const { SqliteProfileStore } = await import('./store.js');
  const { DatabaseSync } = (await import('node:sqlite')) as never as {
    DatabaseSync: new (p: string) => never;
  };
  storeBehaviour(
    'SqliteProfileStore',
    () => new SqliteProfileStore(new DatabaseSync(':memory:'), ':memory:', FIXED),
  );

  test('SqliteProfileStore: a saved record survives the JSON boundary intact', async () => {
    const store = new SqliteProfileStore(new DatabaseSync(':memory:'), ':memory:', FIXED);
    const original = record('s1', verdict({ status: 'complete', tests_green: true }));
    await store.save(original);
    const loaded = await store.load('s1');
    assert.deepEqual(loaded, original);
    // The indexed summary and the document must agree — they are written together and
    // an instructor scanning the class reads the index, not the documents.
    const [row] = await store.listAll();
    assert.equal(row.cards, loaded?.cards.length);
    assert.equal(row.projects, loaded?.projects.length);
    store.close();
  });
} else {
  test('SqliteProfileStore tests skipped — node:sqlite unavailable on this runtime', () => {
    assert.ok(true);
  });
}

// ── backend selection ─────────────────────────────────────────────────────────

test('openStore: defaults to memory with no configuration at all', async () => {
  const { store, reason } = await openStore({}, FIXED);
  assert.equal(store.backend, 'memory');
  assert.equal(store.durable, false);
  assert.match(reason, /no configuration, no network and no secret/);
  store.close();
});

test('openStore: asking for sqlite on a runtime without it FALLS BACK, never throws', async () => {
  // The important one. This is what happens on NitroCloud's Node 20 image, and an
  // exception here would take the whole server down at startup to protect a feature
  // nobody had relied on yet.
  const { store, reason } = await openStore(
    { PROFILE_STORE: 'sqlite', PROFILE_DB_PATH: ':memory:' },
    FIXED,
  );
  assert.ok(['memory', 'sqlite'].includes(store.backend));
  if (store.backend === 'memory') {
    assert.equal(store.durable, false);
    assert.match(reason, /node:sqlite is unavailable/);
    assert.match(reason, /Reported rather than thrown/i);
  } else {
    assert.equal(store.durable, true);
    assert.match(reason, /records persist/);
  }
  store.close();
});

test('openStore: the pre-split env names still work', async () => {
  // `MENTOR_STORE` / `MENTOR_DB_PATH` are what `DEPLOY.md` and every existing note
  // say to set. Renaming them to `PROFILE_*` without keeping the old ones would make
  // a documented deployment silently non-durable.
  const { store } = await openStore({ MENTOR_STORE: 'sqlite', MENTOR_DB_PATH: ':memory:' }, FIXED);
  assert.equal(store.backend, sqliteAvailable ? 'sqlite' : 'memory');
  store.close();
});

test('openStore: anything other than "sqlite" is memory, not an error', async () => {
  for (const value of ['', 'postgres', 'SQLITE3', 'yes']) {
    const { store } = await openStore({ PROFILE_STORE: value }, FIXED);
    assert.equal(store.backend, 'memory', `${JSON.stringify(value)} selected a durable backend`);
    store.close();
  }
});

test('durability is reported honestly, never assumed', async () => {
  const { store } = await openStore({}, FIXED);
  assert.equal(store.durable, false);
  assert.match(store.note, /not a server restart or redeploy/);
  store.close();
});

// ── the invariant the whole module exists to protect ──────────────────────────

test("a student cannot reach another student's record through any store call", async () => {
  const store = new MemoryProfileStore(FIXED);
  await store.save(record('alice', verdict({ student: 'alice' })));

  // `load` is keyed by student, so bob asking gets his own (absent) record rather
  // than alice's. There is no call that takes a project and returns whoever's.
  assert.equal(await store.load('bob'), null);

  // listAll DOES cross students — which is why the tool layer, not the store, is
  // where the instructor check lives. Asserted so nobody "fixes" it by filtering
  // here and quietly breaking class_progress.
  const all = await store.listAll();
  assert.equal(all.length, 1);
  assert.equal(all[0].student, 'alice');
  store.close();
});
