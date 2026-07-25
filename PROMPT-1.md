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

## Four repos, three apps — read this before you touch git

You work in **one** repo, `command-global`. It contains three deployable apps as
subdirectories. Each app *also* exists as its own GitHub repo, because NitroCloud's Connect
Repository dialog has **no Root Directory field** — it deploys a repo at that repo's root, so
an app in a subdirectory cannot be deployed by it. Those three extra repos are **mirrors**:
generated, one-way, never edited by hand.

```
command-global/  ← you work HERE. The only repo with history you author.
├── mcp-roster/   ─ subtree push ─▶  nitrostacklh/mentor-roster    ─▶ NitroCloud (MCP-1)
├── sentinel/     ─ subtree push ─▶  nitrostacklh/mentor-mcp       ─▶ NitroCloud (MCP-2)
├── mcp-profile/  ─ subtree push ─▶  nitrostacklh/mentor-profile   ─▶ NitroCloud (MCP-3)
└── shared/       ─ copied into all three by `npm run sync:shared`
```

| | Folder | Owns | Live |
|---|---|---|---|
| MCP-1 | `mcp-roster/` | catalog, role-scoped briefs, lessons, checkpoint spec | `roster-6a654317-…` |
| MCP-2 | `sentinel/` | verification, drift, the build verdict | `mentor-6a64f852-…` |
| MCP-3 | `mcp-profile/` | the student record, and the flashcards | `profile-6a65408b-…` |

*(full URLs are in `DEPLOY.md`; the host suffix is
`the-localhosts-amrita-university-coimbatore.app.nitrocloud.ai`)*

**`npm run push`** commits nothing — it pushes `command-global` to `origin` and then
force-pushes each subtree to its mirror, which makes NitroCloud redeploy that app. So the
normal loop is: commit here → `npm run push` → the right app redeploys. A mirror only moves
when its own folder changed; a commit touching only root-level files updates `origin` alone,
and that is correct rather than a failure.

**Never commit inside a mirror.** The next push force-overwrites it and the work is gone with
no warning.

**MCP-3 is the only process that ever holds a flashcard answer** — a load-bearing invariant,
not filing. A bug anywhere else cannot leak what the student is meant to earn, because the
string is not in that process. If a task ever seems to want an answer in MCP-1 or MCP-2, the
task is wrong.

## Your three tasks, in order

### A1 — Wire the peers, and fix the verifier that lies

**All three are already deployed and verified.** `npm run verify:fleet -- <three urls>`
passes: 8 / 3 / 9 tools, each app serving its own surface and only its own, no flashcard
answer present in MCP-1 or MCP-2. `open_lesson`'s gate was driven on the live roster too.
Do not redo this.

Two things remain.

**A1a — the peers are unset.** `roster_status` on the live service reports
`PROFILE_URL` and `SENTINEL_URL` both `configured: false`. Every check above passes anyway,
because a missing peer is a *supported state* rather than a crash — which means **a fully
disconnected fleet is indistinguishable from a healthy one** unless you ask this exact
question. Right now there are three working services and not one product.

In NitroCloud, set env vars per service. Each app needs the **other two**:

| Service | Set |
|---|---|
| roster | `SENTINEL_URL` `PROFILE_URL` |
| sentinel | `ROSTER_URL` `PROFILE_URL` |
| profile | `ROSTER_URL` `SENTINEL_URL` |

Values are the three live URLs in `DEPLOY.md`. `MENTOR_PEER_TOKEN` is **optional** — a shared
secret sent as a bearer header between the services when set. Leave it unset unless asked;
the services already admit anonymous callers by design, so it buys little here. Redeploy,
then confirm with `roster_status` that every peer reports reachable.

**A1b — `npm run verify:live` is structurally single-server, not merely stale.** Read all 178
lines of `scripts/verify-deployed.mjs` before planning this; the fix is bigger than its
`EXPECTED_TOOLS` constant suggests. It drives, against **one** URL:

| Call | Now lives in |
|---|---|
| `explain_drift` | MCP-2 `sentinel` |
| `browse_catalog` | **nowhere** — the tool no longer exists; roster has `list_roles` + `projects_for_role` |
| `open_brief` | MCP-1 `mcp-roster` |
| `flashcard` | MCP-3 `mcp-profile` |
| `whoami`, `class_progress`, `record_progress` | MCP-3 `mcp-profile` |

So no single service can pass it, and it cannot be repaired by editing a list.

**Do not delete it.** Its assertions are the most valuable in the repo and
`scripts/verify-fleet.mjs` does not replace them — it checks surfaces, this checks
*behaviour*: that the answer string appears nowhere in a live payload, that `flashcard`
withholds with the field **absent** rather than flagged, that an unauthenticated caller is
admitted as anonymous but `class_progress` refuses them, that anonymous progress is not
persisted (or one visitor's run leaks into the next), and that `mission-trace` is not served
because it leaked the fix.

Rewrite it to take the three URLs, resolve each service by `serverInfo.name`, and route every
call to the app that owns that tool — keeping every assertion. Replace `browse_catalog` with
whatever the catalog journey is now. Where an assertion spans two apps (a brief from MCP-1
carrying no answer that only MCP-3 holds), that is not a problem to work around — it is the
most valuable thing in the file, because it is the invariant the whole split exists to create.

**Deliverable:** `roster_status` reporting all peers reachable, and one verify command that
tells the truth about all three.

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
