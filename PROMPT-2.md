# PROMPT 2 — Stream B · "Restore the proof and finish the loop"

> Paste everything below the line into a fresh Claude Code session opened at the repo
> root (`command-global`). It is written to be self-contained: it does not assume the
> session has seen any earlier conversation.
>
> **Run this stream on Account 2.** Stream A (`PROMPT-1.md`) runs in parallel on
> Account 1 and touches a disjoint set of files — see "Boundaries" below. Neither
> stream needs to wait for the other.

---

You are working on **MENTOR**, an education product built as **three separately deployed
NitroStack MCP applications** in one monorepo. Read `GAPS.md` first — especially **Gap 16**,
which records the current damage — then `MENTOR-CONCEPT.md`, then this brief.

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
├── mcp-roster/   ─ mirror ─▶  nitrostacklh/mentor-roster    ─▶ NitroCloud (MCP-1)  ← yours
├── sentinel/     ─ mirror ─▶  nitrostacklh/mentor-mcp       ─▶ NitroCloud (MCP-2)  ← NOT yours
├── mcp-profile/  ─ mirror ─▶  nitrostacklh/mentor-profile   ─▶ NitroCloud (MCP-3)  ← yours
└── shared/       ─ copied into all three by `npm run sync:shared`
```

**All three are already deployed and live**, verified over the wire — 8 / 3 / 9 tools, each
serving its own surface. URLs are in `DEPLOY.md`. You do not deploy anything and you never
run `npm run push`; that is Stream A's, and two force-pushes racing on one mirror is the one
way to actually lose work here. Commit to a branch and open a PR — Stream A pushes.

**Never commit inside a mirror repo.** The next push force-overwrites it, silently.

| | Folder | Owns |
|---|---|---|
| MCP-1 | `mcp-roster/` | catalog, role-scoped briefs, **lessons**, checkpoint spec |
| MCP-2 | `sentinel/` | verification, drift, the build verdict |
| MCP-3 | `mcp-profile/` | the student record, and the **flashcards** |

**MCP-3 is the only process that ever holds a flashcard answer.** This is load-bearing, not
filing: a bug anywhere else — a tool echoing its input, a log line, a widget rendering a raw
artifact — cannot leak what the student is meant to earn, because the string is not in that
process. `scripts/embed_fixtures.mjs` strips answers on the way into MCP-1 and **fails the
build** if one survives. If a task ever seems to want an answer in MCP-1 or MCP-2, the task
is wrong.

## Your three tasks, in order

### B1 — Port the 58 deleted tests. This is the urgent one.

The three-way split moved `learn/` and `registrar/` out of `sentinel/` into the new apps and
**deleted their test files without recreating them.** `mcp-profile` is serving live traffic
right now — 9 tools, publicly reachable — with **zero tests**. It builds, it runs, and
nothing proves it behaves. That is the single weakest point in the product today.

Current real counts, so you can tell when you are done: **sentinel 47 · mcp-roster 14 ·
mcp-profile 0**. Any number you report must be one you watched print.

Recover the originals from git — they are good tests, and rewriting from scratch loses the
edge cases their authors already found:

```bash
git show e15810a:sentinel/src/modules/learn/learn.test.ts          # 42 cases → mcp-roster
git show e15810a:sentinel/src/modules/registrar/registrar.test.ts  # 16 cases → mcp-profile
```

Port rather than paste. The modules moved and were reshaped in the split — `catalog.ts`,
`brief.ts` and `spec.ts` now live under `mcp-roster/src/catalog/`, the card logic is
`mcp-profile/src/cards/card.ts`, identity is `shared/identity.ts`. Split the files along the
new boundaries so each app tests only what it owns.

Some tests will fail because behaviour genuinely changed in the split. **Each such failure is
a finding, not a nuisance** — decide whether the code or the test is right, and say which in
your commit message.

Use `mcp-roster/src/catalog/lesson.test.ts` as the house style. **Deliverable:** every app
has tests, all green, with the real counts stated.

### B2 — The lesson widget (finishes Gap 13)

Layer 2 shipped as a working tool but renders as structured JSON. `MENTOR-CONCEPT.md` §3 asks
for **panels, not prose** — authored text and figures, deterministic, never image-model
output, because a lesson you cannot re-read is not a lesson and nothing may fail on stage.

- `mcp-roster/src/catalog/lesson.ts` defines `mentor.lesson/v1`. Each panel already carries a
  `figure` field — the structured shape a widget would draw. Start there.
- `mcp-roster` has a `widget` npm script pointing at a `src/widgets` that **does not exist**.
  `sentinel/src/widgets/` is a working example to mirror (Next.js, `widget-manifest.json`,
  `@Widget('name')` on the tool).
- `sentinel/src/widgets/app/causal-timeline/page.tsx` is the visual language to match. Note
  it has **no `Panel` component** to reuse — `GAPS.md` claimed one existed; it has `chip` and
  `row` helpers. You are writing the panel renderer.
- **The gate must survive the widget.** `open_lesson` withholds the reveal by *omitting* the
  later panels from the first response, not by flagging them. A widget that fetches the whole
  lesson and hides part of it client-side destroys the entire mechanism. Read the tests in
  `lesson.test.ts` before you design this.

### B3 — Make the documentation true, and name the product

1. **Test counts.** `GAPS.md` said 128/128; `FINAL_README.md` said 109. Neither was true after
   the split. Update every count to what the suite actually reports once B1 lands, and run
   `npm run check:docs`.
2. **`FINAL_README.md` still describes one app at `sentinel/`.** It carries a banner saying so.
   The ideas are accurate; many file paths and module names are not. Reconcile it.
3. **Gap 8 — the product is still called `[[PRODUCT NAME]]`** in `MENTOR-CONCEPT.md`'s own
   title, plus ~10 other open `[[placeholders]]`. Resolve them. Where a placeholder asks a
   question only the human can answer (`[[CONFIRM which official track name]]`), surface it as
   a short list at the end of your report rather than guessing.

## Boundaries — do not cross these

Stream A is working in the same repo at the same time.

**You own:** `mcp-roster/`, `mcp-profile/`, `fixtures/`, and every `*.md` **except**
`DEPLOY.md`
**Do not touch:** `scripts/`, `package.json`, `sentinel/`, `DEPLOY.md`

You are also the only stream that edits `GAPS.md` — Stream A reports findings in commit
messages, and you fold them in. **Never run `npm run push`**; that is Stream A's, and two
force-pushes racing on one mirror is the one way to actually lose work here.

Work on a branch off `main` and open a PR.

## How this project expects you to work

- **Run it, don't infer it.** "128/128 tests green" survived in the docs for a day after the
  suite had stopped compiling, because everyone read it instead of running it. That is the
  specific failure this stream exists to undo — do not reintroduce it by reporting a number
  you did not watch print.
- **Tests are offline** — no API key, no network, no model. Keep it that way.
- `npm test` runs per app (`cd mcp-roster && npm test`). The `--test-force-exit` flag is
  required: importing `@nitrostack/core` leaves a handle open and the run hangs without it.
- After editing anything under `fixtures/`, run `node scripts/embed_fixtures.mjs` — the app
  copies are generated and `npm run fixture:check` fails if they drift.
- Imports are ESM: relative paths end in `.js` even from `.ts`.
- NitroStack decorators are aliased on import: `ToolDecorator as Tool`, `PromptDecorator as
  Prompt`, `ResourceDecorator as Resource`. Bare `Prompt`/`Resource` are *types* and will not
  compile.
- Match the prose style of the file you are editing. Comments here explain *why a decision
  was made*, not what the line does.

State plainly what you finished, what you did not, and what you had to change your mind
about.
