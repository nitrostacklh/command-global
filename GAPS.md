# GAPS — what is not done, in the order it should be done

> Written 2026-07-25, immediately after consolidating `lumina/`, `sentinel-mcp/` and
> `agentic_ai_hackton/` into this monorepo. This is the maintained "what's left" list
> and it supersedes `ARCHITECTURE.md` §16, which describes the *platform* and was
> written before the idea moved to MENTOR.
>
> **Verified vs. inferred** is marked on every gap. Verified = I ran it.

## The one-paragraph summary

**MENTOR is built** (Gap 3) **and so is its widget** (Gap 4). 107/107 tests green, verified
end-to-end over real MCP: `explain_drift` returns the exact claim the concept doc promises —
origin `pricing.js:12`, error surfaced at `pricing.test.js:40`, confidence 0.91 computed
rather than hardcoded — and the causal-timeline widget renders it with the fix withheld and
a follow-up question wired to chat. The engine reframe worked, so the §6 Research claim
holds: **one engine, six unrelated domains, the sixth of which inverts it.**

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

What's left is no longer engineering. It is: **deploy it** (a solved procedure — Gap 1),
**run the n=5 study** (Gap 7, the cheapest unclaimed points in a Research track), and
**name the product** (Gap 8 — still `[[PRODUCT NAME]]`). Plus one genuine hole: **Layer 2,
the lesson panels, is now the only stage of the loop with nothing behind it** (Gap 13).

| # | Gap | Severity | Who unblocks it |
|---|---|---|---|
| 1 | Deploy to NitroCloud + connect a client | 🟠 **do this next** | you, ~30 min |
| 13 | Layer 2 (lesson panels) is the only unbuilt stage | 🟡 the loop's one visible hole | scope decision |
| 7 | Evidence study (n=5) not run | 🟡 free points, Research track | ~2h with classmates |
| 8 | Open `[[placeholders]]` incl. product name | 🟡 submission hygiene | you |
| 9 | Six official tracks never confirmed | 🟡 submission hygiene | organizers |
| 14 | Only 2 of 5 catalog roles are playable | 🟢 honest, and reported as such | ~1h per brief |
| 10 | Lumina hygiene (uncommitted work, no CI) | 🟢 low | ~1h |
| 12 | ~~The bridges between the layers~~ | ✅ **closed** — 5 versioned artifacts | done |
| 5 | ~~Build history is authored, not derived~~ | ✅ **resolved** — `provenance: observed` | done |
| 2 | ~~Lumina can't express a software architecture~~ | ✅ **closed** — `component` node | done |
| 6 | ~~Plan can't reach a deployed MENTOR~~ | ✅ **resolved** — tool argument | done |
| 3 | ~~MENTOR doesn't exist~~ | ✅ **built** | done |
| 4 | ~~`causal-timeline` widget~~ | ✅ **built** | done |
| 11 | ~~Tool surface contradicted the thesis~~ | ✅ **fixed** — 23 → 3, now 10 on one story | done |

*Reordered 2026-07-25 (four times): after the Studio handbook downgraded Gap 1, after MENTOR
shipped, after Gaps 2 and 11 closed, and after Gap 12 closed the bridges. **Gap 1 is still
the critical path** — the code exists and isn't live yet.*

---

## Gap 1 — ~~🔴~~ 🟡 **DOWNGRADED** — deploy no longer depends on the repo layout

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
  `dotenv`, `zod`), and 107/107 tests pass with no key and no network. In MCP the *client* model
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

> **Verified:** `sentinel/` builds and passes 107/107 from its new path, and
> `npx tsx src/index.ts` — Studio's actual launch command — serves `initialize` +
> `tools/list` over stdio with every tool registered. Also fixed along the way: **`tsx`
> was not a declared dependency**, so Studio's launch relied on `npx` fetching it and
> failed here with an `EPERM` npm-cache error, server never starting. It's a
> `devDependency` now. That would have presented on the day as Studio's
> *"Dependencies not installed / tsx is not available"* and cost real debugging time.

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
it held: 107/107 tests pass untouched, and `fixture:check` confirms the embedded copies
still match disk.

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
time-to-locate on a second bug of the same class, unaided) and annotates it
`[[RUN THIS. One number changes how the submission is read.]]`.

That annotation is correct and this is the cheapest unclaimed points in the whole
submission. The track is **Education & Research**; almost no hackathon entry contains a
measurement. Two hours with five classmates produces a number, and reporting it honestly
— stated sample size, mixed result if that's the result — reads as research where a
confident unsupported claim reads as marketing.

It does need Gap 3 finished first, since group A needs a working MENTOR.

---

## Gap 8 — Unresolved `[[placeholders]]` 🟡

Still open in `MENTOR-CONCEPT.md`:

- **`[[PRODUCT NAME]]`** — the doc's own title. §9 says the student-facing product may
  need a name separate from MENTOR, and that COMMAND/SENTINEL/AEGIS is
  "military-enterprise vocabulary… wrong for a student-facing education product."
  **Partly done (Gap 11):** the MCP server now identifies itself as `mentor` and the
  package is `mentor`, so the two surfaces a judge's client actually shows are no longer
  `command-platform` / `sentinel-mcp`. Still open: the *product* name in this doc's title,
  and this repo is still `command-global`.
- **§3 Layer 1: role-based or project-based?** Changes §3. `fixtures/pricing/README.md`
  is written role-based (§3's stated assumption) — if that's wrong, that file changes.
- **§3 Layer 2: how many panels per lesson?** Doc suggests 4–6. Roadmap anyway (§8).
- **§7: `n = [[5]]`** — confirm the number.
- **§10: who authors project #2, and when?** Out of submission scope; answer it before
  promising a curriculum on the roadmap slide.

## Gap 9 — The six official tracks were never confirmed 🟡

Carried over from `ARCHITECTURE.md` §16.2 and still open. The commanders were mapped to
*guessed* tracks (SENTINEL→Developer Tools, LEDGER→Cloud, AEGIS→Security, VERDICT→Legal,
RELAY→Civic) and `MENTOR-CONCEPT.md` §6 asks to confirm "Education & Research" is the
real printed track name. Get the list from the organizers; it affects the slide, the
README, and each commander's framing text.

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
| `cd sentinel && npm test` | ✅ **107/107 pass** (32 platform + 33 MENTOR) |
| `explain_drift` over real MCP (`node dist/index.js`, stdio) | ✅ origin `tax @ build/pricing.js:12`, planned 3rd / built 2nd |
| … its confidence | ✅ **0.91**, computed from 5 signals; engine gate **0.964 autonomous** |
| … its refusal | ✅ `fix_withheld: true` + a follow-up question, not a patch |
| `tools/list` | ✅ **10 tools, all one loop** — was 3 after Gap 11; +7 for the bridges (Gap 12) |
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

> **Verified:** 107/107 tests (was 67). `npm run probe` walks all six stages over real MCP
> against `safety-gear` and prints each artifact. `npm run fixture:check` now also asserts
> the generated `fixtures.learn.ts` matches `fixtures/*.json`.
>
> **One self-correction worth recording:** the `safety-gear` fixture's own `expectedDrift`
> asserted `plannedPosition: 4`, and the code said 3. The code was right — positions are
> counted over components present in *both* artifacts, and `camera feed` is a boundary this
> role correctly never implements. The fixture assertion was wrong and the test caught it,
> which is the entire reason `expectedDrift` blocks exist.

---

## Gap 13 — Layer 2, the lesson panels, is the only unbuilt stage 🟡

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

---

## Gap 14 — Only 2 of the catalog's 5 roles are playable 🟢

`fixtures/catalog.json` advertises 3 domains, 3 projects and 5 roles. Two roles have briefs:
`pricing/backend` and `safety-gear/cv`. The other three (`pricing/frontend`,
`safety-gear/platform`, `event-ingest/data`) are listed with `briefed: false`.

**This is deliberate and it is reported rather than hidden.** `browse_catalog` says
*"2 of 5 roles have a brief written and are playable today"* in its first response, before a
student invests a click, and `open_brief` on an unbriefed role returns the playable list
instead of an empty screen. `learn.test.ts` asserts the `briefed` flag matches whether a
brief actually exists in both directions, so the catalog cannot lie by drifting.

They are listed because **seeing the rest of the team is the point of role-scoping.** A
student who owns pricing should be able to see that a frontend engineer owns the cart they
are handed — that is what makes `given` mean something. Removing the unplayable roles would
make the catalog honest in a way that was less useful.

Each additional brief is roughly an hour: `owns`, `given`, three acceptance criteria, and a
concept whose answer is a principle rather than code (`assertNoFix` enforces the last part).
