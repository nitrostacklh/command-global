# GAPS — what is not done, in the order it should be done

> Written 2026-07-25, immediately after consolidating `lumina/`, `sentinel-mcp/` and
> `agentic_ai_hackton/` into this monorepo. This is the maintained "what's left" list
> and it supersedes `ARCHITECTURE.md` §16, which describes the *platform* and was
> written before the idea moved to MENTOR.
>
> **Verified vs. inferred** is marked on every gap. Verified = I ran it.

## The one-paragraph summary

**MENTOR is built** (Gap 3) **and so are both its widgets** (Gaps 4 and 13). **182 tests green
across three apps — mcp-roster 46 · sentinel 72 · mcp-profile 64**, every number watched
printing on 2026-07-26 (Node 22.19). On Node 20 it is **177**: see the note below. Verified end-to-end over real MCP: `explain_drift` returns the exact
claim the concept doc promises — origin `pricing.js:12`, error surfaced at
`pricing.test.js:40`, confidence 0.91 computed rather than hardcoded — and the causal-timeline
widget renders it with the fix withheld and a follow-up question wired to chat. The engine
reframe worked, so the §6 Research claim holds: **one engine, six unrelated domains, the sixth
of which inverts it.**

> **Read the count above as the corrected one.** This file said `128/128` for a day after the
> three-MCP split had stopped that from being true, which is the specific failure Gap 16 and
> Gap 15 are both about. Every count in this file is now a number someone ran. Where a number
> is inherited from before the split and has not been re-observed, it says so.

Gap 2 is now closed too: Lumina has a real **`component`** node, and the fixture's plan is
no longer a stand-in shape but a byte-identical **real export** from the canvas. Gap 11 —
found and fixed the same day — was the most dangerous of the lot: the deployed server was
exposing 23 tools, 20 of which belonged to a different product and one of which offered to
*autonomously patch the very bug MENTOR refuses to patch.*

**Gap 12 — the bridges — was the real gap, and it is now closed.** The four layers each
worked, and the *handoffs between them did not exist in code*: role-scoping was a paragraph
in a README that nothing could read, nothing turned a design into a work plan, nothing
produced a build history except a human writing one, and there was no artifact at the end of
the loop at all. Four of the five handoffs are new; the fifth is no longer hand-authored.
Every one is a versioned JSON document with tests, and `npm run probe` now walks all six
stages over real MCP.

That also settles **Gap 5**: a tracked checkpoint log *is* a build history, so pricing's 0.91
is the floor rather than the ceiling — `safety-gear` scores **0.97** on evidence that was
actually observed rather than remembered.

What's left is no longer engineering. It is: **run the n=5 study** (Gap 7, the cheapest
unclaimed points in a Research track) and **get two questions answered by people** (Gaps 9
and 17). The deploy is done, the product is named, and Layer 2 has both a tool and a widget.

| # | Gap | Severity | Who unblocks it |
|---|---|---|---|
| 7 | Evidence study (n=5) not run — **protocol ready** in `STUDY.md` | 🟠 **do this next** · free points, Research track | ~2h with classmates |
| 16 | ~~The three-MCP split left `main` broken~~ | ✅ **closed** — build fixed, 58 tests ported, `verify/` wired | done |
| 9 | Six official tracks never confirmed | 🟡 submission hygiene | **organizers** |
| 17 | Who authors the next three projects? | 🟡 blocks the curriculum slide, not the demo | **a person has to volunteer** |
| 18 | ~~Root `npm test` and `check:docs` only see one of three apps~~ | ✅ **fixed** — every gate now spans all three | done |
| 10 | Lumina hygiene (uncommitted work, no CI) | 🟢 low | ~1h |
| 1 | ~~Deploy to NitroCloud~~ | ✅ **done** — three services live, verified over the wire | done |
| 8 | ~~Open `[[placeholders]]` incl. product name~~ | ✅ **resolved** — the product is **MENTOR** | done |
| 13 | ~~Layer 2 (lesson panels)~~ | ✅ **closed, both halves** — `mentor.lesson/v1` + the `lesson-panels` widget | done |
| 14 | ~~Only 2 of 5 catalog roles are playable~~ | ✅ **closed** — all 5 seats briefed, 3 demoable | done |
| 12 | ~~The bridges between the layers~~ | ✅ **closed** — 5 versioned artifacts | done |
| 5 | ~~Build history is authored, not derived~~ | ✅ **resolved** — `provenance: observed` | done |
| 2 | ~~Lumina can't express a software architecture~~ | ✅ **closed** — `component` node | done |
| 6 | ~~Plan can't reach a deployed MENTOR~~ | ✅ **resolved** — tool argument | done |
| 3 | ~~MENTOR doesn't exist~~ | ✅ **built** | done |
| 4 | ~~`causal-timeline` widget~~ | ✅ **built** | done |
| 11 | ~~Tool surface contradicted the thesis~~ | ✅ **fixed** — 23 → 3, now 23 across three services, all one story | done |
| 15 | ~~Docs asserted counts the code owns, and drifted~~ | ✅ **fixed** — `npm run check:docs`, now fleet-aware | done |
| 19 | ~~Student work did not survive the conversation~~ | ✅ **fixed** — REGISTRAR, now MCP-3. *(Was a second Gap 16; renumbered.)* | done |
| 20 | ~~`fixture:check` failed on every Windows clone~~ | ✅ **fixed** — CRLF/LF false positive; `npm run verify` is green on Windows for the first time | done |

*Reordered 2026-07-26 (seventh time): after the deploy landed, after the 58 tests were ported,
after Gap 13's widget shipped, and after porting the tests proved Gap 14 had already closed
without anyone noticing. **Gap 7 is now the critical path** — it is the only remaining item
that would change how the submission is read, and it needs people rather than code.*

> **Two gaps were added by finishing the others**, which is the honest way for this list to
> grow: Gap 17 (the curriculum needs an author) was hiding inside Gap 8's placeholder, and
> Gap 18 (the root guards only see sentinel) was invisible while sentinel was the only app.

---

## Gap 16 — ~~The three-MCP split left `main` broken~~ ✅ **CLOSED** (2026-07-26) — build fixed, 58 tests ported, `verify/` wired

**Found 2026-07-26, by running the suite rather than reading about it.** PR #1
(`three-mcp-architecture`, merge `aab534d`) moved `learn/` and `registrar/` out of `sentinel/`
into the two new apps and left the imports behind. Consequences, all verified:

| | State on `aab534d` | Now |
|---|---|---|
| `sentinel` build | ❌ 5 × TS2307 — `npx tsc` fails, so **0 tests ran** | ✅ compiles, **72/72** |
| `sentinel` tool surface | declared a `flashcard` tool whose code had moved to MCP-3 | ✅ removed |
| `mcp-roster` tests | **0** | ✅ **46/46** |
| `mcp-profile` tests | **0** — on a service serving live public traffic | ✅ **64/64** (59 on Node 20) |
| `npm run fixture:check` | ❌ red | ✅ green, and its sync check actually runs — see below |

**The 58 tests are ported.** `learn.test.ts` (42) and `registrar.test.ts` (16) were recovered
from `e15810a` and split along the new deployment boundaries — six files, and the counts above
are what the runner printed. The modules had been reshaped by the split, so this was a port and
not a paste; five things it turned up are in the commit message, and three of them are findings
about the *original* tests rather than about the new code:

- **`assertNoFix`'s regex had a false positive and a dead alternative.** It flagged any `;` as
  code, and `record-before-you-notify` — a concept authored *after* the split — legitimately
  reads *"…watching the screen; it fails the first time…"*. Separately its `=>` alternative sat
  inside `\b(…)\b`, and `\b=>\b` cannot match, so an arrow function would have passed straight
  through. The original suite never caught either, because it only ever checked two concepts.
- **Gap 14 had already closed and nobody had noticed** — see that gap below.
- **Bundled plans are per *project*, not per seat**, so `demo: true` is the flag that means a
  plan exists for *this* seat. A consequence worth knowing: one project cannot have two
  demoable seats.

**The coverage hole is closed.** `sentinel/src/modules/verify/` — `verifyCheckpoints`,
`findStuck`, `buildFromEvents`, which are **MCP-2's actual job** — had no `@Module`, no tools,
no tests and no importer. It now has `verify.module.ts` and three tools, and the names were not
a design choice: `mcp-roster/src/gates.module.ts` already called `open_session` and told the
student to stream `build_event`, and `mcp-profile/src/cards/card.ts` already told them to call
`build_verdict`. Three dangling references in a distributed system, now resolved.

25 tests came with it, covering the cases where a naive verifier would be *authoritatively
wrong*: a red whole-suite run must accuse no criterion by name, a green-then-red suite must
take its gates back, and a `given` boundary component must never be reported as outstanding
work. Thirteen of the original 58 cases (`recordProgress`, `buildFromProgress`, `judgeDone`,
`passedCheckpoints`, and two on `findDrift`) still could not be ported — those functions exist
nowhere now — and remain recorded at the foot of `mcp-roster/src/catalog/spec.test.ts`.

**Fixed here:** the build. `sentinel/src/app.module.ts` no longer imports three modules that
do not exist in the package, and `mentor.module.ts` no longer carries the pre-split
`flashcard` tool. That deletion is not tidying — MCP-3 is the only process allowed to hold a
card answer, so a `flashcard` tool living in MCP-2 contradicts the invariant rather than
merely duplicating a verb. `mcp-profile/src/cards.module.ts` already has the real one.

**Both of the `scripts/` items are also fixed** (Stream A owns that boundary):

1. **`scripts/embed_learn_fixtures.mjs` was orphaned** — it wrote
   `sentinel/src/modules/learn/fixtures.learn.ts`, a path deleted in the split, and was still
   wired into `npm run fixture:check`. It had no remaining job: every document it embedded is
   covered by `embed_fixtures.mjs`, which writes all three apps *and* strips the concept answer
   out of MCP-1's copy. Removed; `fixture:check` and `fixture:embed` repointed. A second
   silently-dead guard turned up in the same file — `check_fixture.mjs`'s embedded-copy check
   looked for `dist/modules/mentor/fixtures.js` (renamed `fixtures.demo.js` in the split) and
   was written to *skip* when absent, so it had been printing `skipped — dist not built yet` on
   a fully built tree. Removed rather than repaired: `embed_fixtures.mjs --check` regenerates
   all five modules and fails on a byte, which is strictly stronger.
2. **The root guards only ever looked at `sentinel`** — promoted to its own gap, **Gap 18**,
   and fixed there.

---

## Gap 1 — ~~Deploy to NitroCloud~~ ✅ **DONE** — three services live and verified over the wire

**All three are deployed and serving: MCP-1 `mentor-roster` (8 tools), MCP-2 `mentor-mcp`
(6 tools), MCP-3 `mentor-profile` (9 tools) — 23 tools, verified over the wire.** URLs are in
`DEPLOY.md`. This was the critical path for two days and it is no longer on the list.

**Path C turned out to matter after all**, which is why the repo now has four remotes rather
than one. NitroCloud's *Connect Repository* dialog has **no Root Directory field** — the
handbook's omission was accurate, not incomplete — so a repo deploys at its own root and an app
in a subdirectory cannot be deployed by it. Hence the three one-way mirrors
(`nitrostacklh/mentor-roster`, `mentor-mcp`, `mentor-profile`) generated by
`scripts/push-mirrors.mjs`. The monorepo stays the source of truth; the mirrors are never
edited by hand.

**One rules question is still open and it is not ours:** whether connecting `{serviceUrl}/sse`
to ChatGPT is a hard submission criterion, or whether a NitroStudio AI Chat demo satisfies it.
See the box below — that is a *people* problem, and it is the only part of this gap that is.

<details><summary>The original analysis, kept for the record</summary>

**Resolved by `NitroStack_Studio_Handbook.pdf` §9, read 2026-07-25.** This was written as
the blocker. It isn't one: the handbook documents **three** deploy paths, and two of them
deploy a *folder* rather than a repo, so the monorepo layout never comes up.

| Path | Deploys | Monorepo-safe? |
|---|---|---|
| **A. Deploy from Studio** (App Canvas / Compose header → **Deploy**) | the connected project folder — bundles + uploads it | ✅ **yes** |
| **B. Upload a code package** (`.zip`, ≤100 MB) | whatever you zip | ✅ yes — `sentinel/` zips to **0.21 MB** |
| **C. Connect GitHub** (auto-deploy on push) | the linked repo **at its root** | ⚠️ still open |

**Do path A.** It gets you live today and the subdirectory question evaporates. Path C is
push-to-deploy convenience — worth having, not worth blocking on.

For C, the handbook's *Connect Repository* step is repo + branch only, with no Root
Directory field documented. That's evidence, not proof — check the real dialog. If it
isn't there, `DEPLOY.md` §5 mirrors `sentinel/`'s contents to a second repo via
`git subtree` (`npm run push:sentinel`), monorepo stays the source of truth.

**What genuinely remains a hard prerequisite** (and is a *people* problem, not a code one):

- **The organizer-provided NitroCloud account** — submissions must go through it.
- **The NitroStudio desktop app.** Not optional and not a web app: STDIO spawns a local
  process and HTTP needs a CORS bypass.

### The ChatGPT question — resolved in favour of local (2026-07-25)

The team's constraint is **no paid ChatGPT plan**. That turns out to cost almost nothing:

- **`sentinel/` calls no LLM at all.** Verified: zero LLM references in its own source, zero
  outbound HTTP, four dependencies (`@nitrostack/core`, `@modelcontextprotocol/ext-apps`,
  `dotenv`, `zod`), and every test passes with no key and no network — 128/128 when this was
  written, **182 across the three apps today** (177 on Node 20). In MCP the *client* model
  is the agent (`ARCHITECTURE.md` §2, Idea 2), and MENTOR needs one least of all six
  commanders — drift detection is an ordering comparison, the confidence is a formula, the
  refusal is hardcoded. **There is nothing to generate.**
- **NitroStudio's AI Chat is a full MCP client** with a model picker, gated on NitroCloud
  sign-in rather than a ChatGPT subscription. That is the demo surface — `DEPLOY.md` §6a.
- **Any local MCP client also works** (`DEPLOY.md` §6c) — Claude Code, Open WebUI, LibreChat,
  Continue — including ones backed by local Ollama models. Small models are poor multi-step
  planners, but `explain_drift` is one argument-free call, so the model only picks a tool.

> ⚠️ **The one thing to verify with a human.** Notes from the official handbook and Do's &
> Don'ts record a submission requirement to connect to ChatGPT at `{serviceUrl}/sse`. If that
> is a hard criterion then it's a *rules* problem no amount of local inference solves —
> **ask the organizers whether a NitroStudio AI Chat demo satisfies it.** If they insist,
> borrow one teammate's Plus account for the ten minutes it takes to connect and record.

**Turn this into a pitch line rather than an apology:** *runs offline, no API key, no
per-student cost.* Schools cannot buy Copilot seats for every student, and that argument
lands with an education judge while reinforcing the §5 incentive moat.

> **Verified (2026-07-25, pre-split — sentinel alone is 72/72 today):** `sentinel/` builds and passes 128/128 from its new path, and
> `npx tsx src/index.ts` — Studio's actual launch command — serves `initialize` +
> `tools/list` over stdio with every tool registered. Also fixed along the way: **`tsx`
> was not a declared dependency**, so Studio's launch relied on `npx` fetching it and
> failed here with an `EPERM` npm-cache error, server never starting. It's a
> `devDependency` now. That would have presented on the day as Studio's
> *"Dependencies not installed / tsx is not available"* and cost real debugging time.

</details>

---

## Gap 2 — ~~Lumina cannot express a software architecture~~ ✅ **CLOSED** (2026-07-25)

**Resolved via option A below.** Lumina now has a `design` category whose first member is
a generic **`component`** node — `lumina/c/nodes/ComponentNode.tsx`, registered in
`l/reactFlowTypes.ts`, catalogued in `l/types.ts`, grouped first in the palette because
designing before building is the entire point of Layer 3.

It is the one node in the catalog with **no runtime**: no backend handler, no upstream
trigger, no output. Two fields, and both are the contract with MENTOR — `component`
(joins to a build step) and `intent` (quoted back when the build drifts). It writes
`label` alongside `component` because `export_plan._label_for()` reads `label` first.

**Verified end to end in a browser**, against the real Next.js app and the real FastAPI
backend — not unit tests:

| Step | Evidence |
|---|---|
| Palette | `DESIGN → Component` is the first group; 35 catalog entries |
| Node created | `react-flow__node[data-id=node-100]` type `component`, both handles, violet accent |
| Fields write the contract | typing produced `{label: "tax", component: "tax", intent: "Tax the DISCOUNTED amount…"}` in canvas state |
| Real export | `POST :8000/api/export/plan` on a 4-component graph → `lumina.plan/v1`, order `validate → discount → tax → total`, `cyclic: false`, `warnings: []`, intent preserved |
| Fixture is now a real export | that graph compiles **byte-identical** to the checked-in `fixtures/pricing/plan.lumina.json` — no normalisation |

That last row is the one that matters: the fixture is no longer a hand-made shape that
merely resembles a student export, it **is** one. `scripts/regen_fixture_plan.py` now
builds it from `component` nodes with named edge handles (`output` → `input`), exactly
what a wired canvas produces.

**MENTOR's finding did not change** — origin still `tax @ build/pricing.js:12`,
confidence still **0.91**, failure still `pricing.test.js:40`. That was the prediction
when this gap was opened ("switching to A requires no change to the plan artifact"), and
it held: the whole suite passed untouched (128/128 at the time; **182** today), and
`fixture:check` confirmed the embedded copies still matched disk.

<details>
<summary>The original analysis, kept for the record</summary>

Layer 3 says the student "builds the **architecture** in Lumina: components as nodes,
data flow as edges." Lumina's node catalog (`lumina/l/types.ts`, `NODE_CATALOG`) had
**34 node types and not one of them was a generic software component**:

| Category | Count | What they are |
|---|---|---|
| input | 5 | camera, video, ipCamera, mic, audioFile |
| ai | 11 | detection, visualLlm, llm, faceMatch, pose, ocr, whisperStt, audioDetect, audioLlm, geminiLive, toolUse |
| logic | 5 | timer, logic, debounce, merge, script |
| output | 13 | slack, email, sms, discord, mqtt, sheets, webhook, speak, sound, log, file, notify, screenshot |

Lumina is a **vision/audio AI-pipeline builder**. A student cannot draw
`validate → discount → tax → total` in it. There is no `component`, `module`,
`function`, or `service` node. The closest is `script`.

**This is load-bearing.** Without a plan graph MENTOR has no record of intent, and
without intent MENTOR degrades into "an AI explaining a stack trace" — which is
precisely the comparison `MENTOR-CONCEPT.md` §5 promises to survive.

### Three ways out — pick one

**A. Add a `design` category with a generic `component` node.** ~2 hours: one entry in
`NODE_CATALOG`, one `c/nodes/ComponentNode.tsx` modelled on the existing
`ScriptNode.tsx`, register it in `c/Canvas.tsx`'s `nodeTypes`. Fields: label, intent,
one-line contract. **Recommended** — it keeps the pricing fixture, which is already
implemented in three places (`sentinel/src/modules/sentinel/fixtures.ts`,
`reference/python/service/app/pricing.py`, `fixtures/pricing/build/pricing.js`) and is
what the §3 causal-timeline artwork is drawn around.

**B. Change the demo project to an AI pipeline Lumina already expresses.** e.g.
*"camera → detect → LLM → notify"* with a drift bug like debounce placed after the LLM
instead of before it, burning quota. §8 marks the fixture as `[[the pricing/tax-discount
fixture]]` — a placeholder, so this is permitted. **More coherent**: Lumina's 34 nodes
become an asset instead of a liability, and the student is designing the kind of system
Lumina is actually for. **Costs** re-authoring the fixture and the §3 diagram.

**C. Keep `script` nodes as stand-ins.** Zero work. But the student sees four boxes
labelled "Script", and a judge sees a canvas that clearly wasn't built for this.

> The state at the time of writing was **C**. The fixture was honest about it —
> `data.label` carried `validate`/`discount`/`tax`/`total` and `export_plan.py` prefers
> the student's label over the node type, so **switching to A required no change to the
> plan artifact.** It didn't.

**Chose A.** B looked cheaper but wasn't: re-aiming the demo would have invalidated the
already-verified fixture, the drift tests, and §2's own headline ("broke on line 40, went
wrong on line 12"). A is additive and widens Lumina instead of narrowing the demo to fit
the nodes Lumina happened to already have.

</details>

---

## Gap 3 — ~~MENTOR doesn't exist~~ ✅ **BUILT** (2026-07-25)

`sentinel/src/modules/mentor/` — 8 files, registered in `app.module.ts`, 33 new tests.

| File | What it does |
|---|---|
| `plan.ts` | parse `lumina.plan/v1`; `dependencyPath()` and `orderDeterminism()` graph queries |
| `build.ts` | parse `mentor.build/v1`; first-touch `actualOrder()`; the lenient join key |
| `drift.ts` | the algorithm + the five-signal confidence score |
| `fixtures.ts` | the bundled pricing demo (plan + build + source), sync-checked against disk |
| `mentor.adapter.ts` | `DomainAdapter` — explains, refuses, and proves it changed nothing |
| `mentor.module.ts` | `explain_drift` (+widget), `withhold_fix`, `mentor_status`, `debugging_tutor` prompt |
| `drift.test.ts` / `mentor.test.ts` | 18 + 15 tests |

**Verified over real MCP** (`node dist/index.js`, stdio): `explain_drift`
returns origin `tax @ build/pricing.js:12` (planned 3rd, built 2nd), failure at
`pricing.test.js:40`, drift confidence **0.91**, engine gate **0.964 autonomous**,
`fix_withheld: true`.

### 3b — the engine reframe, and how it landed ✅

The concern was real: `core/engine.ts` has no successful exit that skips `deploy()`, and not
deploying is MENTOR's whole point. Resolved by **re-reading the lifecycle rather than
bypassing it** — full mapping table in `ARCHITECTURE.md` §7.6. The two decisions that made it
work rather than merely compile:

- **`awaitRecovery` asserts the student's source is byte-identical.** The vestigial "did it
  come back up?" hook becomes the refusal's enforcement point: if MENTOR ever modifies the
  build, recovery fails and the incident ESCALATES. There is a test that mutates the source
  and asserts recovery goes false.
- **`blastRadius` carries claim confidence, inverted.** An ambiguous plan now pushes the gate
  *below* threshold and pauses for a human, instead of showing a student a guessed line.

This preserves the §6 Research claim — one engine, six unrelated domains — which was the
reason to take the harder path. A plain `@Tool` would have been half the work and forfeited it.

> **Also caught by writing the tests:** the `failureLink` confidence signal was comparing the
> failure's file against `implement` steps only. Failures surface in *test* files, which are
> recorded as `verify` steps, so the signal could never fire. Fixed to compare against all
> steps — the demo's confidence went 0.81 → 0.91, which is where the arithmetic always said
> it should be.


## Gap 4 — ~~`causal-timeline` widget~~ ✅ **BUILT** (2026-07-25)

`sentinel/src/widgets/app/causal-timeline/page.tsx`, registered in `widget-manifest.json`
with a worked example, attached to `explain_drift` via `@Widget('causal-timeline')`.
`npm run build` reports **2 widgets bundled**.

Renders: the claim in one sentence · the plan row · a labelled drift connector · the build row
(with the drifted component highlighted in **both** rows) · the failing test · the five
confidence bars each with its reason · a "where I'm less sure" line · and the refusal.

**The refusal is not a dead end.** `sendFollowUpMessage()` powers an *"Ask instead → Why does
tax have to come after discount?"* button, so declining the patch still moves the student
forward. Also wired: `requestFullscreen()` (the timeline is wide) and `displayMode`.

**Verified in a browser** against the manifest's example payload: all sections render, `tax`
highlights in both rows, no console errors, no horizontal body scroll, and clicking the button
really does call `sendFollowUpMessage({prompt: 'Why does tax have to come after discount?'})`.


## Gap 5 — The build history is authored, not derived 🟡

**Verified — and deliberate.** `fixtures/pricing/build.history.json` is hand-written.
Nothing derives it from real activity.

For the demo this is fine and it is what makes MENTOR runnable today. It stops being
fine the moment there is a second project or a real student, because MENTOR's claim to
have "a time axis" (§5) rests on a history it did not observe.

`MENTOR-CONCEPT.md` §10 already recommends the scope: **one file with a git history.**
Deriving `mentor.build/v1` from `git log -p` on a single file is tractable — walk the
commits, attribute each hunk to a component by line range, take first-touch as `seq`.

**MENTOR already discounts itself for this.** `provenance` is a field on
`mentor.build/v1` and one of the five confidence signals (weight 0.15, `authored` scores
0.4 against `git`'s 1.0). It is why the demo reports **0.91** and not 0.97 — the gap is
this gap, priced in and shown to the student rather than hidden. Building the deriver
raises the score honestly, and there's a test asserting exactly that.

**Recommendation: don't build this for the submission.** Ship the authored fixture, and
say plainly on the roadmap slide that history derivation is next. An honest authored
fixture reads better than a half-working deriver that mis-attributes a line — and §10
already argues that a tool which confidently points at the wrong line is worse than
useless in education.

---

## Gap 6 — ~~A deployed MENTOR cannot read the student's plan file~~ ✅ **resolved**

Settled the way this file recommended: **the plan and build are tool arguments**, with the
bundled fixture as the default.

```
explain_drift({})                      -> runs the bundled pricing demo (stage-safe, one click)
explain_drift({plan, build, symptom})  -> runs a real student's project
```

Both accept a JSON string or an already-parsed object (`z.union([z.string(), z.record(...)])`),
because clients differ on which they send. There is a test that drives a completely different
project (a three-step scraper) through the same tool and gets the right origin.

The fixture is embedded in `mentor/fixtures.ts` rather than read from `fixtures/pricing/`,
because on NitroCloud this app can't see the monorepo — same constraint that bundled
SENTINEL's broken service. `npm run fixture:check` compares the embedded copies against the
on-disk files so they can't silently diverge. (It immediately earned its keep: it caught a
single character — `^` where the file had `↑`.)


## Gap 7 — The evidence study has not been run 🟡

**n = 0.** `MENTOR-CONCEPT.md` §7 specifies it (n=5, split A/B against Copilot, measure
time-to-locate on a second bug of the same class, unaided). Its old *"RUN THIS"* placeholder was
resolved on 2026-07-26 into plain prose — not because anything was done, but because a
placeholder pretending to be a task was hiding a gap that belongs on this list instead.

That annotation is correct and this is the cheapest unclaimed points in the whole
submission. The track is **Education & Research**; almost no hackathon entry contains a
measurement. Two hours with five classmates produces a number, and reporting it honestly
— stated sample size, mixed result if that's the result — reads as research where a
confident unsupported claim reads as marketing.

**The protocol is now written and ready to run: [`STUDY.md`](STUDY.md).** That closes the
half of this gap that was a design problem. What remains is purely logistical — five people
and two hours.

`STUDY.md` pre-commits the analysis *before* the data exists, which matters more than it
sounds: with n=5 it is trivially easy to find a flattering comparison afterwards, and a judge
who suspects you did discounts the whole result. It also fixes the outcome measure at
**time-to-locate the origin** rather than time-to-fix (fixing adds typing speed as noise) and
rules out a significance test, because n=5 cannot support one and a p-value would be the
fastest way to lose a research-minded judge.

> **What this measurement is not.** The confidence score (`0.91` / `0.97`) is the tool's own
> stated certainty about a drift claim. It is a transparency feature, and it is **not evidence
> that MENTOR helps a human debug better.** Raised in review 2026-07-25 and the distinction is
> correct — `MENTOR-CONCEPT.md` §6 previously said "We measured it. See §7" while §7 was an
> unrun plan, which was a straight overclaim. Fixed, and `npm run check:docs` now fails the
> build if any doc claims a measurement while `STUDY.md` has no results.

Gap 3 is done, so nothing blocks this but scheduling.

---

## Gap 8 — ~~Unresolved `[[placeholders]]`~~ ✅ **RESOLVED** (2026-07-26)

**The product is MENTOR.** Every `[[placeholder]]` in `MENTOR-CONCEPT.md` is now closed, and
the two that only a person can answer are marked **ASK** in place rather than guessed at.

| Placeholder | Resolution |
|---|---|
| **`[[PRODUCT NAME]]`** ×3 | **MENTOR.** See below — the code had already decided |
| §3 Layer 1: role-based or project-based? | *(was already struck)* both, in that order |
| §3 Layer 2: how many panels per lesson? | **four** — `setup` · `commit` · `witness` · `generalise`, on all five seats. Answered by building it, not by picking from the suggested 4–6 |
| §3: `[[N]]` deliverables | **three** acceptance criteria, the same on every seat |
| §7: `n = [[5]]` | **5**, pre-committed in `STUDY.md` along with the analysis |
| §7: `[[RUN THIS]]` | still not run — that is Gap 7, and it stays open as a *gap* rather than as a placeholder |
| §6: which official track name | **ASK — organizers.** Gap 9 |
| §10: multi-file causality? | **answered**: every one of the five seats scopes to a single entry file |
| §10: who authors project #2? | **ASK — a person.** Promoted to Gap 17, because three projects ship now and the real question changed |

**Why MENTOR rather than a new student-facing name.** §9 asked whether the product needed one
separate from the commander. It does not, and the honest reason is that the decision had
already been made by the code — the document was the only thing that had not caught up:

- the MCP servers identify as `mentor-roster` / `mentor` / `mentor-profile`
- the packages are `mentor`, `mentor-roster`, `mentor-profile`
- **all seven artifact schemas** are `mentor.*`
- the three deployed services are `mentor-*`

Minting a second name now would make the slide and `tools/list` disagree — which is precisely
the failure Gap 15 exists to prevent, committed deliberately and at the level of the product's
own name.

**Left alone on purpose: the repo is still `command-global`.** Renaming it breaks three mirror
remotes and `scripts/push-mirrors.mjs` on submission day to fix something no judge sees. It is
the platform's name, and the platform is what this repo is a history of.

## Gap 9 — The six official tracks were never confirmed 🟡

Carried over from `ARCHITECTURE.md` §16.2 and still open. The commanders were mapped to
*guessed* tracks (SENTINEL→Developer Tools, LEDGER→Cloud, AEGIS→Security, VERDICT→Legal,
RELAY→Civic) and `MENTOR-CONCEPT.md` §6 asks to confirm "Education & Research" is the
real printed track name. Get the list from the organizers; it affects the slide, the
README, and each commander's framing text.

**This is the one open question no work in this repo can close.** Everything else on this list
is either code or a decision we are allowed to make. Marked **ASK** in `MENTOR-CONCEPT.md` §6.

## Gap 17 — Nobody is committed to authoring the next three projects 🟡

**Split out of Gap 8 on 2026-07-26, because finishing Gap 8 changed the question.** The old
placeholder asked *"who authors project #2, and when?"* — three projects and five seats now
ship, so #2 is answered by the repo. The live question is whether anyone is committed to
writing the **fourth, fifth and sixth**, which is what turns a demo into a curriculum.

**This blocks a slide, not the demo.** The submission is complete without it. But
`MENTOR-CONCEPT.md` §8 lists "a curriculum" on the roadmap, and a roadmap item with no name
against it is the kind of claim a judge is trained to discount — the same reason §6 warns
against leading with "we built more than we are showing you".

The cost is known and small, which is what makes the absence of a volunteer the whole problem:
roughly an hour per seat — `owns`, `given`, three acceptance criteria, four lesson panels, and
a concept whose answer is a principle rather than code. **ASK: get a name against it, or drop
"curriculum" from the roadmap slide and say "three projects, and the authoring cost is an hour
a seat" instead.** The second is a better slide than an unowned promise.

## Gap 18 — ~~The root guards only ever look at `sentinel`~~ ✅ **FIXED** (2026-07-26, Stream A)

**Found 2026-07-26 by running them after the test count tripled.** Both of the repo's
top-level quality gates were written when `sentinel` was the only app, and the split left them
measuring one third of the project while still reporting green:

| Gate | What it does now | Consequence |
|---|---|---|
| Gate | Was | Now |
|---|---|---|
| `npm test` (root) | `npm --prefix sentinel test` — 135 of 182 tests never ran | runs **all three apps**: 46 · 72 · 64 |
| `npm run check:docs` | started `sentinel/dist` and read *its* `tools/list`, so every count was compared against MCP-2's alone | starts **all three**, and compares against a *set* — each app's own surface plus the fleet total |
| `npm run fixture:check` | called the orphaned `embed_learn_fixtures.mjs` | calls `embed_fixtures.mjs --check`, which regenerates all five embedded modules and fails on a byte |
| `npm run sync:shared` | named in twenty generated file headers and **not an npm script** — and unpassable on Windows, since the banner is built with `\n` while git checks the copies out with `\r\n`, so all 20 read as DRIFTED | wired, newline-insensitive, and inside `npm run verify` |

`check:docs` is the awkward one, and it deserves care rather than deletion.

**Measured 2026-07-26, before and after the documentation pass** (`git stash` on the doc
changes, ran the gate, unstashed):

| | Findings | Exit |
|---|---|---|
| Before the doc corrections | **17** | 1 |
| After | **27** | 1 |

**Correcting the docs made the gate noisier, and that is the right trade.** All 27 findings are
tool counts, and every one in a doc that was updated is now a *true* statement being
mis-measured: `README.md` saying MCP-1 serves 8 tools is correct, and gets flagged because the
checker asked MCP-2. The count went up precisely because the docs now state the real per-service
surface instead of a single stale number.

The two ways to make the gate green were both worse than leaving it red:

- **Delete the tool counts** — the docs get less useful to satisfy a checker measuring the wrong
  thing.
- **Spell the numbers out** (`eight tools`) so the digit pattern stops matching — that is
  evading the guard, and Gap 15's whole lesson is that a guard people work around protects
  nothing.

So the numbers stayed true and the gate stayed red. That was the right call, and the fix landed
exactly the way this gap asked for it: `check_docs.mjs` now starts **all three** servers and
compares every asserted count against the set {each app's surface, the fleet total}, keeping
the digit-arrow-digit narrowing that made it useful. The true surface is **23 tools across
three services (8 · 6 · 9)**, and it is now checked. Verified by planting a wrong count and
watching the gate fail — asserting a guard passes on a clean tree proves nothing (Gap 15).

Of the 27, **5 were genuinely stale and all 5 were in `DEPLOY.md`**, which still asserted the
pre-split count. That file was outside the documentation stream's boundary; Stream A owns it and
has corrected all five. `sentinel/README.md` line 73 said the same thing and is not scanned by
the gate at all — corrected by hand at the same time, and still a real hole in the gate's reach.

> **Do not "fix" this by relaxing the guard.** Gap 15 records that the first version of
> `check_docs.mjs` was too broad, produced 25 correct-behaviour findings, and that *"a guard
> that fires on a document doing its job gets switched off within a week, and then it protects
> nothing."* A guard that asks one of three services is the same failure with the opposite
> sign. Either teach it the three-app shape or retire it — leaving it noisy is the one option
> that guarantees it stops being read.

**Fixed by Stream A**, along with `DEPLOY.md`'s five stale counts and `sentinel/README.md`
line 73. `npm run verify` is now green end to end.

## Gap 11 — The tool surface contradicted the thesis ✅ **FIXED** (2026-07-25)

**Found by asking "does RELAY actually help?" and following the answer.** It doesn't — but
it turned out not to be the problem either. The problem was the whole platform surface.

The deployed server registered **23 MCP tools. Three were MENTOR.** In an MCP app the tool
list *is* the interface: the client's model picks from it. The other twenty cost us three
ways, in ascending order of severity:

1. **RELAY earns nothing.** It appears in `MENTOR-CONCEPT.md` exactly once — the word
   "Civic" in §6's Research claim. Drop it and the claim still reads "four unrelated
   domains" (DevOps, FinOps, Legal, Education). 262 lines for zero marginal argument. It
   also autofills a masked Aadhaar and files a mock government application — not a
   question worth spending demo time on in an education submission.
2. **Write-to-source tools weaken the refusal.** `propose_patch`, `run_tests`,
   `resolve_incident` rewrite source. MENTOR *proves* it cannot modify a student's build
   (`awaitRecovery` asserts byte-identity). That proof is much weaker on a server that
   also ships tools which do exactly that.
3. **`self_heal` directly contradicts the pitch.** This is the real one.
   `sentinel.tools.ts` describes it as running on *the bundled pricing service* — reads
   the logs, *patches it*, proves it, deploys — and its default argument is
   **`'tax-before-discount'`**. That is MENTOR's fixture bug. Two tools, one server, same
   bug, opposite theses, and `self_heal`'s description is far more actionable. Ask a model
   *"the pricing test is failing, help"* and it picks the tool that promises a fix. The
   product would contradict its own thesis live, on stage, on its own demo bug.

**Fixed by unregistering, not deleting.** `app.module.ts` now imports only `MentorModule`;
the other five commanders and the coordinator stay in `modules/` with their tests green,
one uncommented line from returning. Deleting would have cascaded into 5 sites in
`command.module.ts`, a test assertion, `sentinel.tools.ts`'s hardcoded `domains:` array
and three docs — and destroyed the generalization evidence for no gain.

**The §6 Research claim survives intact**, because it is a claim about the *engine*: five
adapters against one lifecycle, evidenced by code and passing tests. It never required the
tools to be live in the judge's client.

Also fixed here: the server identified itself as **`command-platform`** and the package as
`sentinel-mcp`. Both are judged surfaces on an education submission (Gap 8's actual
complaint). Now `mentor`, with a description that states the pitch.

**Verified over real stdio MCP** — `initialize` reports `mentor 1.0.0`, `tools/list`
returns exactly `explain_drift`, `withhold_fix`, `mentor_status`, and an assertion for
fifteen platform tool names finds none of them.

> **The irony, recorded deliberately:** we built the tool that detects "your build stopped
> matching your design" and shipped it inside a repo doing exactly that. The four layers
> that *are* the product were 1/4 built while a one-word footnote was 100% built with a
> widget. Worth keeping on the slide — it is a better demonstration of the thesis than the
> fixture is.

---

## Gap 10 — Lumina hygiene 🟢

- **The original `C:\Users\himes\lumina` has ~25 modified files never committed** (as of
  the copy). This monorepo has that working-tree state, so nothing is lost — but the
  original repo's `main` is behind its own disk. Worth a commit there for a clean
  fallback.
- **No CI.** `sentinel`'s 32 tests, `lumina/test_export_plan.py`'s 15, and the fixture's
  `node --test` all run only when someone remembers. `npm run verify` at the root chains
  the first two; a GitHub Action would be ~20 lines and would also catch a broken
  NitroCloud build before the push (`DEPLOY.md` troubleshooting lists exactly that
  failure mode).
- **`lumina/m/` is 26 MB of ONNX weights**, gitignored here as in the original. Nothing
  documents where to re-fetch them, so a fresh clone gets a Lumina whose detection and
  audio nodes fail at runtime. One line in `lumina/README.md` fixes it.

---

## What I verified, so you can trust the rest

| Check | Result |
|---|---|
| `npm test` (root — all three) | ✅ `mcp-roster` **46/46** · `sentinel` **72/72** · `mcp-profile` **64/64** — **182 total** on Node 22.19; **177** on Node 20, where five SQLite cases skip. Re-observed 2026-07-26 (was 128/128 on one app pre-split) |
| `explain_drift` over real MCP (`node dist/index.js`, stdio) | ✅ origin `tax @ build/pricing.js:12`, planned 3rd / built 2nd |
| … its confidence | ✅ **0.91**, computed from 5 signals; engine gate **0.964 autonomous** |
| … its refusal | ✅ `fix_withheld: true` + a follow-up question, not a patch |
| `tools/list` | ✅ **23 tools across three services (8 · 6 · 9), all one loop** — was 23 before Gap 11, 3 after it, 13 after the bridges (Gap 12), then split three ways |
| `npm run probe` — all six stages over real MCP | ✅ every bridge green, refusal check still `none` |
| `npx tsx src/index.ts` — Studio's real launch command | ✅ serves the full tool list over stdio |
| Studio project validity | ✅ `sentinel/` valid · monorepo root correctly **invalid** |
| `sentinel/` zipped for the upload path | ✅ **0.21 MB** vs the 100 MB limit |
| `npm run build` | ✅ **2 widgets bundled** (mission-trace + causal-timeline) |
| causal-timeline in a browser, real payload | ✅ renders; `tax` highlighted in both rows; 0 console errors; no h-scroll |
| … the "Ask instead" button | ✅ actually calls `sendFollowUpMessage({prompt})` |
| MENTOR refuses to be given a write tool | ✅ 6 plausible tool names all return `unknown tool` |
| `awaitRecovery` with a mutated source | ✅ returns **false** → incident ESCALATES |
| `cd lumina && npx tsc --noEmit` | ✅ **clean**, including the plan export |
| `cd lumina && python -m pytest test_export_plan.py` | ✅ **15/15 pass** |
| `npm run fixture:plan` twice → `git diff` | ✅ byte-identical (deterministic) |
| `npm run fixture:check` | ✅ 2 pass / 1 fail as designed, **and** embedded copies match disk |
| Failing test location | ✅ `pricing.test.js:40`, `80 !== 72` |
| Drift origin location | ✅ `pricing.js:12`, `const tax = subtotal * taxRate;` |
| Lumina `POST /api/export/plan` from a real browser | ✅ 200, no console errors |

The line numbers in `MENTOR-CONCEPT.md` §3 ("broke on line 40… went wrong on line 12")
are now literally true of `fixtures/pricing/`, not illustrative.

**Not verified:** whether NitroCloud's *Connect Repository* dialog has a Root Directory
field (needs the account — and it no longer matters much, see Gap 1), and anything that
requires actually deploying. A screenshot of the widget was not possible in this
environment; it was verified through the DOM and the SDK call instead, which is stronger
evidence than a picture but does not prove it looks *good*. **Put eyes on it in Studio.**

---

## Gap 12 — ~~The bridges between the layers did not exist~~ ✅ **CLOSED** (2026-07-25)

**The complaint that opened this:** *"The four layers are done but the bridge between them
is not clearly implemented."* That was correct, and it was the most important thing wrong
with the project. Each layer worked. Almost nothing carried a student from one to the next.

### What was actually missing

| Handoff | Before | Now |
|---|---|---|
| ① path → project | ✗ nothing. No catalog existed. | `mentor.catalog/v1` — product type → project → role |
| ② project → role slice | ⚠ **a paragraph in a README** | `mentor.brief/v1` — `owns` / `given` / acceptance / concept |
| ② → ③ is the design right? | ✗ nothing checked it | `check_scope` — a second, independent kind of drift |
| ③ design → work plan | ✗ nothing | `checkpoints`, derived from the student's *own* plan order |
| ④ build → history | ⚠ **a human wrote it by hand** | `record_progress` → `provenance: observed` |
| ⑤ drift → takeaway | ✗ nothing. The loop just ended. | `mentor.card/v1`, gated on real test output |

The one that mattered most is row 2. `fixtures/pricing/README.md` has always said *"You are
the backend engineer who owns pricing"* — but that is markdown a human reads. No code could
act on it, so nothing could check whether what a student drew was actually their job.
Role-scoping was a claim about the product rather than a property of it.

### Two things that fell out of the design rather than being added

**Scope drift is a genuinely different failure from order drift.** `explain_drift` catches
building *your* components in the wrong sequence. `check_scope` catches designing the wrong
*set* of them. In a company the second is the more expensive, because nobody notices until
integration — and it was invisible to this product until the brief became machine-readable.

**Checkpoints retired Gap 5 as a side effect.** The tracker's visible job is ticking boxes.
Its real job is that the log it accumulates *is* a `mentor.build/v1`, so the demo's weakest
link — a hand-authored timeline nobody observed — goes away for any student who tracked
their work. `safety-gear` scores **0.97** where pricing scores 0.91, on the same formula.
The number went up because the evidence improved.

### The two places this could have betrayed the thesis, and what stops it

1. **The flashcard could have become the fix.** A card whose back reads *"compute tax after
   the discount"* **is** the patch wearing a lesson's clothes, and a client model pressed for
   the answer would call `flashcard` instead of `explain_drift` and read it out. Two
   defences, both structural rather than advisory: the answer is gated on the student's real
   test output (`readTestOutcome`, and unrecognised output is **not** treated as passing),
   and while unearned **the `back` field is absent from the payload entirely** rather than
   present with an `earned: false` flag. A field a model can read is a field it will read
   out, however it is labelled. `learn.test.ts` asserts the answer string appears nowhere in
   the serialized response.
2. **The tool surface went back up.** 3 → 10, which is the exact direction Gap 11 warned
   about. The test each new tool had to pass was not *is it useful* but *is it the same
   story*, and the surface is grouped into three agents that are three stages of one loop
   (ROSTER → COACH → MENTOR) so the shape is legible from `tools/list` alone. The refusal
   check in `npm run probe` still reports **no tool that can modify a student's build.**

> **Verified (2026-07-25, pre-split):** 109/109 tests (was 67). `npm run probe` walks all six stages over real MCP
> against `safety-gear` and prints each artifact. `npm run fixture:check` now also asserts
> the generated `fixtures.learn.ts` matches `fixtures/*.json`.
>
> **One self-correction worth recording:** the `safety-gear` fixture's own `expectedDrift`
> asserted `plannedPosition: 4`, and the code said 3. The code was right — positions are
> counted over components present in *both* artifacts, and `camera feed` is a boundary this
> role correctly never implements. The fixture assertion was wrong and the test caught it,
> which is the entire reason `expectedDrift` blocks exist.

---

## Gap 13 — ~~Layer 2, the lesson panels~~ ✅ **BUILT** (2026-07-26)

**`mentor.lesson/v1`, five lessons, one tool, 14 tests.** Authored in the `lesson` block of
each brief under `fixtures/`, embedded into MCP-1 by `scripts/embed_fixtures.mjs`, served by
`open_lesson` in `mcp-roster`. Four panels per seat — `setup` · `commit` · `witness` ·
`generalise` — for all five playable seats.

**The design decision that mattered.** A lesson that states the principle is just the
flashcard, early, delivered by the one service that has never held an answer. So no panel
states it. The panels set the problem up, make the student **commit to an order before they
are shown anything**, then show the single case that tells the two answers apart — for
pricing, the cart with no discount code where both orders return `$120.00`, next to the
40%-off cart where they return `$72.00` and `$80.00`. The student derives the rule; MCP-3
still confirms it against their own green tests.

Two enforcement points, because neither is worth trusting:

- `scripts/embed_fixtures.mjs` **fails the build** if a panel contains a sentence of
  `concept.answer` or a clause of `concept.transfers_to`. Verified by deliberately pasting
  the answer into a panel: the generator refused and wrote nothing.
- `open_lesson` **withholds the reveal the same way the flashcard withholds its answer** —
  the witness and generalise panels are *absent from the first response*, not present behind
  a flag, because a field a model can read is a field it will read out, and a reveal read to
  a student who never picked a side teaches nothing. A made-up `chose` value is refused.

✅ **The widget shipped 2026-07-26, and Gap 13 is now closed in both halves.**
`mcp-roster/src/widgets/app/lesson-panels/page.tsx`, registered in `widget-manifest.json` with
both halves of the lesson as worked examples, attached via `@Widget('lesson-panels')`.
`npm run build` reports **1 widget bundled**. mcp-roster went 41 → **46** tests.

**The gate survives the widget, and it is structural rather than promised.** The obvious
implementation — fetch the lesson, hide the back half, reveal on click — would have destroyed
the mechanism, because the withheld panels would then be sitting in the page one inspection
away from a student who never picked a side. Instead the choice buttons call `open_lesson`
**again** with `chose` set, and the reveal arrives as a fresh tool result. The widget cannot
show the reveal early *even if it wanted to*, because it has never been sent it — the same
construction as the flashcard's absent `back` field.

Verified in a browser against four real payload shapes, not inferred:

| Check | Result |
|---|---|
| Part 1 rendered | setup + commit only; body text contains no reveal string |
| The **shipped bundle** grepped for lesson content | ✅ no `$72.00`, no `$80.00`, no concept key, no answer phrase — it is a renderer, and holds no lesson |
| Commit → reveal | one click → one `callTool('open_lesson', {chose})`; witness + generalise arrive |
| A made-up choice | server returns part 1 again with `rejected`; the panel shows the refusal and does not advance |
| Dark theme, no-lesson state, console | legible · handled · **zero errors**; the witness table scrolls in its own box, the body does not |

Three things found by building it, all recorded in the commit rather than quietly fixed:
a bare `?` between the two setup chips read as a **missing-font glyph** (the `unordered`
figure's whole point is the *absence* of an arrow, so it now says "then? or first?");
`disabled={asking !== null}` does **not** prevent a double submit because React batches state,
so the guard is a synchronous ref (five clicks in one tick → one call); and the manifest's
example payloads are now **checked against live `open_lesson` output** by
`src/catalog/widget.test.ts`, because hand-copying a payload into a shipped JSON file is
exactly the drift Gap 15 is about — and the manifest is served to hosts, so it is the one
place a leak would hide in a file nobody reads as code.

⬜ **What genuinely did not survive:** `MENTOR-CONCEPT.md` §3's *"one rendering component, two
uses"*. `causal-timeline` is in MCP-2 and `lesson-panels` in MCP-1 — separate deployments, so
literal sharing is impossible. They share the visual language and nothing else. That is a real
cost of the three-app architecture, and it is paid here rather than papered over.

<details><summary>The original gap, for the record</summary>

Every other stage of the loop now has code and tests behind it. This one has a `concept`
block in each brief — a question, an answer, and what it transfers to — and **nothing that
teaches it.** The concept is declared before the student starts and released as a flashcard
at the end; the middle, where a student who *doesn't already know it* would learn it, is
missing.

That is a real hole and it is now the visible one. It is also the least dangerous kind:
the loop is coherent without it for a student who can already read the brief and reason,
which is exactly the audience a hackathon demo has.

**The constraint on building it** (from `MENTOR-CONCEPT.md` §3): panels must be
*deterministic, not generated*. A generative image model would make the lesson different
every run, and a lesson you cannot re-read is not a lesson. The reference the user supplied
(`S0L009/COMIC-IFY_OneAPI`) is worth borrowing the **pedagogy** from — its three depth tiers,
*Get Your Feet Wet / Splash and Submerge / Deep Dive* — and not the architecture, which is
Streamlit plus a generative model.

**Cheapest honest version:** the concept's question, a worked wrong answer, and the
discriminating case — three static panels per project, sharing the `Panel` component the
`causal-timeline` widget already has. Build it only if the deploy is already green.

*(Two corrections from building it: `causal-timeline` has no `Panel` component to share — it
has `chip` and `row` helpers — and the commit panel turned out to be load-bearing rather than
optional, so it is four panels, not three.)*

</details>

---

## Gap 14 — ~~Only 2 of the catalog's 5 roles are playable~~ ✅ **CLOSED** — and it had closed before anyone noticed

**All five seats have briefs.** Observed 2026-07-26 while porting the deleted tests:
`catalogCoverage()` reports `{roles: 5, domains: 3, projects: 3, seats: 5, playableSeats: 5,
demoableSeats: 3}`. Every seat has a brief, a lesson (four panels) and three acceptance
criteria: `pricing/backend`, `pricing/frontend`, `safety-gear/cv`, `safety-gear/platform`,
`event-ingest/data`.

**How this gap closed is more interesting than that it closed.** Nobody closed it. The seats
were written at some point during the split work and this file was never updated — so the
project was *under*-claiming, in a document whose entire job is to say what is not done. The
old `learn.test.ts` asserted `playableRoles === 2`, and that assertion is what surfaced it:
porting the test made it fail, and the failure was the doc being stale rather than the code
being wrong. **A test that encodes a gap is how you find out the gap is gone.**

**The honest gap moved rather than vanishing.** Five seats are playable; **three are
demoable** — `pricing/backend`, `safety-gear/cv`, `event-ingest/data` — meaning a bundled plan
exists so they run end to end with nothing uploaded. The other two need the student to draw
and export their own design first. `catalogCoverage` reports both numbers separately and
`roleIndex` puts `playable` and `demoable` on *every row*, because a student picks a row and a
footnote does not stop anyone clicking the wrong one. `roster.test.ts` now asserts
`demoable < playable`, which is the claim that is still true.

One consequence worth knowing, found the same way: **bundled plans are keyed by *project*, not
by seat**, so `pricing/frontend` shares the backend's canvas and correctly does not match it.
That is why `demo` is a per-seat flag — and why one project cannot have two demoable seats.

They are all listed because **seeing the rest of the team is the point of role-scoping.** A
student who owns pricing should be able to see that a frontend engineer owns the cart they
are handed — that is what makes `given` mean something.

Each additional seat is roughly an hour: `owns`, `given`, three acceptance criteria, four
lesson panels, and a concept whose answer is a principle rather than code. Who writes the next
three is **Gap 17**.

---

## Gap 15 — ~~Documentation asserted numbers the code owns~~ ✅ **FIXED** (2026-07-25)

**Found by review, not by me, and it would have been found live by a judge.**

`DEPLOY.md`'s pre-flight table asserted two incompatible things side by side: `109/109` tests
(the state *after* the loop was built) next to `tools/list → exactly explain_drift,
withhold_fix, mentor_status` (the state *before* it). Its own §7a demo script, two pages
later, called five tools that the three-tool world does not contain.

The review understated it. There were three defects, not two:

1. the pre-flight table row above;
2. **§2's gotcha box** — *"returns exactly 3 tools… If you see twenty-three, the platform
   modules got re-registered"*. So a reader who saw the **correct** 10 would conclude
   something was broken;
3. that same row said `node dist/index.js`, which I had *already proved* cannot start from
   the repo root (see the `start-mcp.mjs` header).

`TESTING.md` and `MENTOR-CONCEPT.md` §8 carried the same stale count.

### Why it happened, and why it would have happened again

The counts are **facts the code owns and the prose copies.** When the tool surface went 3 →
10 and the suite went 67 → 109, I updated the test counts with a bulk replace across four
files and never swept the tool counts. Nothing anywhere connected the two, so the docs and
the server were free to disagree indefinitely — and the person most likely to notice was a
judge running `tools/list` after reading our own pre-flight.

### The fix, and two mistakes made building it

`scripts/check_docs.mjs` (`npm run check:docs`, in `npm run verify`) starts the built server,
reads the real tool list, and fails on any doc that asserts a different count. It also fails
if a doc claims a measurement while `STUDY.md` has no results.

Both mistakes are worth recording, because both are the kind that make a guard useless:

- **The first version was too broad.** It flagged every mention of an unregistered tool and
  produced 25 findings that were *all correct behaviour* — `ARCHITECTURE.md` documents the
  platform, so of course it names `self_heal`; `DEPLOY.md` §7b is a backup script explicitly
  headed *"not runnable as shipped"*. A guard that fires on a document doing its job gets
  switched off within a week, and then it protects nothing. Narrowed to asserted counts, plus
  retired tool names in the two docs that are purely reader instructions.
- **The second version did not catch the original bug.** I reintroduced the exact defect to
  test it and it passed clean: the bare `→` exemption, meant for *"the surface went 23 → 3"*,
  excused the literal string `tools/list → exactly 3 tools`. It now requires
  digit-arrow-digit. **Breaking the thing a guard exists to catch is the only way that
  surfaces** — asserting the guard works on a clean tree proves nothing.

### The general lesson

Any number in prose that the code also knows is a latent contradiction. Either derive it or
check it. This repo now checks tool counts, fixture state (`fixture:check`), embedded-copy
sync (`embed_learn_fixtures --check`), and the student journey (`walk`) — four different
places where docs and code could previously have drifted apart silently.


---

## Gap 20 — ~~`fixture:check` failed on every Windows clone~~ ✅ **FIXED** (2026-07-26)

**Found by running `npm run verify` on Windows rather than reading that it was green.** It
exited 1, and had been doing so on every Windows machine since the generator was written.

`embed_fixtures.mjs --check` compared the file on disk against freshly generated content with
a raw `===`. Git checks these files out as **CRLF** wherever `core.autocrlf` is on — the
default on Windows — while the generator always writes **LF**. So all five generated modules
reported `STALE` with **zero content drift**, which is provable in three steps:

| Step | Observed |
|---|---|
| `--check` on a clean tree | 5 × `STALE` |
| run the generator, then `git diff` | **empty** — the content was already identical |
| `git checkout -- .`, `--check` again | 5 × `STALE` again — autocrlf put the CRLFs back |

The file that reported stale had **490 CR characters and not one byte of different content.**

**Why this mattered more than a cosmetic annoyance.** This is the guard that stops the embedded
copies drifting from `fixtures/` — the thing that would let a deployed service serve a brief
the repo no longer contains. A guard that fails on every Windows clone for a reason unrelated
to what it checks is a guard the team learns to skip, and then it protects nothing. That is
`GAPS.md` Gap 15's lesson arriving from the opposite direction: Gap 15 was a guard too *broad*,
this was a guard too *literal*.

**The fix compares content and leaves the convention alone** — one `sameContent()` helper that
normalises `\r\n` before the compare. Deliberately *not* a `.gitattributes` `text eol=lf` rule:
that would renormalise the working tree of every clone, which is a large and risky diff to take
right before a demo, to fix what is really a comparison bug.

**Verified both ways, because asserting a guard passes on a clean tree proves nothing:**

- `npm run fixture:check` → exit **0**, all five `ok`
- inject a **one-character** content change into `fixtures.roster.ts` → `STALE`, exit 1
- `npm run verify` end to end → **exit 0**, `ALL CHECKS PASSED`

That last line is the point: **`npm run verify` had never been green on Windows before this.**

---

## Gap 19 — Student work did not survive the conversation ✅ **FIXED** (2026-07-25)

> **Renumbered 2026-07-26. This was originally *also* Gap 16** — two different gaps carried
> the same number for a day, because whoever opened the three-MCP-split gap did not scroll to
> the bottom of this file first. Every reference elsewhere in the repo means the split by
> "Gap 16", so this one moved rather than that one. Noted rather than silently corrected: a
> duplicate identifier in the project's own issue list is exactly the class of drift Gap 15 is
> about, and it survived a day here too.

Every tool was pure and the client held the progress log. Right for a stateless deploy, and
it had one cost nobody had said out loud: **close the chat and the student's afternoon was
gone.** The checkpoint log only ever existed in the transcript.

**REGISTRAR** (`sentinel/src/modules/registrar/`) fixes that — identity, storage, and one
instructor view.

### The three decisions worth defending

**1. Persistence added no verbs.** `record_progress` gained a server side *invisibly*; there
is no `save` tool. Saving is a consequence of working rather than something to remember. The
surface went 10 → 13, and the three are the parts a student must actually ask for: `whoami`
(am I being kept?), `resume` (what was I doing?), `class_progress` (instructors only).

**2. There is deliberately no `query` / `execute_sql`.** A generic database tool hands the
client's model arbitrary access to every student's record, and *"the model only runs safe
queries"* is not a security model. Every operation here is named, with the identity check
compiled in, so there is no path from a prompt to a table.

**3. Anonymous is stateless, and `npm run walk` is why.** The first cut had every caller fall
back to stored progress. The walk immediately failed on *"no log at all → 7 blocking"*, and
the reason was worse than a broken assertion: **every anonymous caller shares one identity**,
so one judge's run would surface in the next judge's session and the demo would stop being
deterministic. Anonymous now never reads or writes storage. Persistence is exactly for the
people it is for.

### Durability is reported, never assumed

The durable backend is **`node:sqlite`** — Node's standard library, so it adds **zero
dependencies**, which matters under a rule that says to use no SDK but NitroStack's. No
driver, no native build, no connection string.

The catch is real: `node:sqlite` needs **Node 22.5+**, and **NitroCloud builds on Node 20**.
So on the deployed service it will almost certainly be missing. That is handled by detection
and honest reporting rather than a crash — `openStore()` falls back to memory, explains why,
and `whoami` surfaces it to the student. An exception at startup would have taken the whole
demo down to protect a feature nobody had relied on yet, and silently pretending progress was
safe would be worse still.

| | |
|---|---|
| `MENTOR_STORE` unset | memory · survives the conversation and reconnecting, not a restart |
| `MENTOR_STORE=sqlite`, Node 22.5+ | durable at `MENTOR_DB_PATH` |
| `MENTOR_STORE=sqlite`, Node 20 | **memory, with the reason stated** — not an error |

### What is still open

- **Nothing durable on the deployed service.** Until NitroCloud offers Node 22 or a managed
  database, live progress is per-restart. `whoami` tells the student that; it is honest, not
  fixed. Adding a Postgres adapter is one file behind the existing `ProgressStore` interface
  if a connection string ever appears — and it would cost the "no secret, no network" line.
- **Auth is wired but no issuer is configured.** The SDK supplies `JWTModule` /
  `ApiKeyModule` / `OAuthModule`; `resolveIdentity` reads `context.auth.subject` and takes the
  instructor role from an `instructor` scope or a `role` claim. Until an issuer is registered
  in `app.module.ts`, every caller is anonymous — so identity and RBAC are **implemented and
  tested but not yet exercised end to end against a real token.** Do not claim otherwise.

> **Verified (2026-07-25, pre-split):** 128/128 (was 109) — 19 new tests covering the store
> contract against both backends, role extraction from scopes *and* claims, an unauthenticated
> caller presenting an instructor scope being refused, and the fallback-not-throw path.
> `npm run walk` and `npm run check:docs` green.
>
> **Re-verified 2026-07-26, after the split moved all of this to MCP-3.** These tests were
> among the 58 deleted by `aab534d` and are now ported to `mcp-profile` — where the store
> contract runs against **both** backends again (`node:sqlite` is available on Node 22.19
> locally, so the SQLite branch really executes rather than skipping). The store API changed
> shape in the move — `ProgressStore` keyed `(student, project, role)` became `ProfileStore`
> keyed `student`, holding one whole `mentor.profile/v1` — so these are ports, not restorations.
> `mcp-profile` is **64/64** on Node 22.5+, **59/59** on Node 20 — the SQLite half of the store
> contract skips where `node:sqlite` is absent rather than failing. Both are green; the total is
> 182 or 177 accordingly.

