# PROMPT 1 — Stream A · "Get it live and finish MCP-2"

> Paste everything below the line into a fresh Claude Code session opened at the repo
> root (`command-global`). It is written to be self-contained: it does not assume the
> session has seen any earlier conversation.
>
> **Run this stream on Account 1.** Stream B (`PROMPT-2.md`) runs in parallel on
> Account 2 and touches a disjoint set of files — see "Boundaries" below. Neither
> stream needs to wait for the other.

---

You are working on **MENTOR**, an education product built as **three separately deployed
NitroStack MCP applications** in one monorepo. Read `GAPS.md` first — especially **Gap 16**,
which records the current damage — then `DEPLOY.md`, then this brief.

## The product, in four lines

A student picks a real project and a role on it, gets the slice they'd actually own, designs
that slice in Lumina, builds it against checkpoints derived from their own design, and when
it breaks MENTOR shows them the exact moment their build stopped matching their plan — **and
refuses to write the fix.** The refusal is the product. Every architectural decision in this
repo exists to protect it.

## The three apps

| | Folder | Mirror repo | Owns |
|---|---|---|---|
| MCP-1 | `mcp-roster/` | `nitrostacklh/mentor-roster` | catalog, role-scoped briefs, lessons, checkpoint spec |
| MCP-2 | `sentinel/` | `nitrostacklh/mentor-mcp` | verification, drift, the build verdict |
| MCP-3 | `mcp-profile/` | `nitrostacklh/mentor-profile` | the student record, and the flashcards |

They share nothing but `shared/`, copied into each app by `npm run sync:shared`. They talk to
each other over HTTP via `shared/peer.ts`. **MCP-3 is the only process that ever holds a
flashcard answer** — that is a load-bearing invariant, not filing. If a task ever seems to
want an answer in MCP-1 or MCP-2, the task is wrong.

`npm run push` pushes the monorepo to `origin` and force-pushes each subtree to its mirror.
**Mirrors are one-way** — never commit inside one.

## Your three tasks, in order

### A1 — Deploy all three to NitroCloud, and prove they are live

The mirrors already exist and are current. NitroCloud's Connect Repository dialog has **no
Root Directory field** (confirmed in the real console — `DEPLOY.md` §5), which is the entire
reason the mirrors exist: each mirror's *root* is an app.

1. For each of the three mirrors: New Project → Connect GitHub → select repo → deploy.
2. Collect the three service URLs.
3. Set the peer env vars on each service. Each app needs the **other two**:
   ```
   ROSTER_URL   = https://<roster>/
   SENTINEL_URL = https://<sentinel>/
   PROFILE_URL  = https://<profile>/
   MENTOR_PEER_TOKEN = <shared secret>   # optional; sent as a bearer token
   ```
4. **Verify over the wire, do not assume.** `npm run verify:live` exists for this. A missing
   peer is a *supported state* rather than a crash, so a half-configured deployment looks
   healthy — call `roster_status`, which reports which peers it can actually reach, and make
   it say all of them.

Extend `scripts/verify-deployed.mjs` to cover all three services if it only covers one.

**Deliverable:** three live URLs, `verify:live` green against each, and `DEPLOY.md` updated
with the real URLs and anything that surprised you.

### A2 — Make `npm run verify` green again

It is currently red, and not because of anything anyone wrote today.
`scripts/embed_learn_fixtures.mjs` writes `sentinel/src/modules/learn/fixtures.learn.ts` — a
path deleted in the three-way split. It was superseded by `scripts/embed_fixtures.mjs`, which
writes all three apps. The orphan is still wired into `npm run fixture:check`.

Work out whether it has any remaining job. If it does not, remove it and its wiring; if it
does, repoint it. Then make `npm run verify` pass end to end and say so with the output.

### A3 — Wire `sentinel/src/modules/verify/` — MCP-2's actual job

`verifyCheckpoints`, `findStuck`, `buildFromEvents` were added by the split and are **dead
code**: no `@Module`, no `@Tool`, no tests, and nothing imports them. MCP-2 is supposed to be
the app that verifies each checkpoint against the build and files the verdict, and right now
it cannot.

- Read `shared/contracts.ts` for `mentor.checkpoints/v1`, `lumina.build_event/v1` and
  `mentor.verdict/v1` — the artifacts this code already speaks.
- Give it a `@Module` and the smallest tool surface that does the job. **Resist adding
  verbs.** `GAPS.md` Gap 11 is the record of what a wide tool surface cost this project once:
  the test each tool must pass is not "is it useful" but "is it the same story".
- Write real tests. Follow the style in `sentinel/src/modules/mentor/drift.test.ts`.
- Nothing you add may hand over a fix or a flashcard answer.

## Boundaries — do not cross these

Stream B is working in the same repo at the same time.

**You own:** `scripts/`, `package.json`, `sentinel/`, `DEPLOY.md`
**Do not touch:** `mcp-roster/`, `mcp-profile/`, `fixtures/`, `GAPS.md`, `README.md`,
`FINAL_README.md`, `MENTOR-CONCEPT.md`

Report anything you find that belongs in `GAPS.md` in your commit message instead — Stream B
folds it in. **You are the only stream that runs `npm run push`**; two force-pushes racing on
one mirror is the one way to actually lose work here.

Work on a branch off `main` and open a PR. `npm run push` deploys whatever branch you are on,
so never push mirrors from a feature branch.

## How this project expects you to work

- **Run it, don't infer it.** The claim "128/128 tests green" survived in the docs for a day
  after the suite had stopped compiling, because everyone read it instead of running it.
- **Tests are offline** — no API key, no network, no model. Keep it that way.
- `npm test` runs per app (`cd sentinel && npm test`). The `--test-force-exit` flag is
  required: importing `@nitrostack/core` leaves a handle open and the run hangs without it.
- Imports are ESM: relative paths end in `.js` even from `.ts`.
- NitroStack decorators are aliased on import: `ToolDecorator as Tool`, `PromptDecorator as
  Prompt`, `ResourceDecorator as Resource`. Bare `Prompt`/`Resource` are *types* and will not
  compile.
- Match the prose style of the file you are editing. Comments here explain *why a decision
  was made*, not what the line does.

State plainly what you finished, what you did not, and what you had to change your mind
about.
