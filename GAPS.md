# GAPS — what is not done, in the order it should be done

> Written 2026-07-25, immediately after consolidating `lumina/`, `sentinel-mcp/` and
> `agentic_ai_hackton/` into this monorepo. This is the maintained "what's left" list
> and it supersedes `ARCHITECTURE.md` §16, which describes the *platform* and was
> written before the idea moved to MENTOR.
>
> **Verified vs. inferred** is marked on every gap. Verified = I ran it.

## The one-paragraph summary

The **platform is done** — 32/32 tests green in the new location, full build clean.
The **submission is not started**: MENTOR is 0 lines of code, and MENTOR is the
submission. Two things also turned out to be structurally harder than
`MENTOR-CONCEPT.md` assumes: Lumina cannot currently draw a software architecture
(Gap 2), and the engine's lifecycle cannot terminate without deploying a fix,
which is the one thing MENTOR must never do (Gap 3). Neither is fatal; both change
what "one adapter + one module" costs. Gap 1 is the only true blocker and it needs
a human with the NitroCloud account for about five minutes.

| # | Gap | Severity | Who unblocks it |
|---|---|---|---|
| 1 | NitroCloud may not deploy from a subdirectory | 🔴 **blocker** | you + NitroCloud account |
| 2 | Lumina can't express a software architecture | 🟠 design decision | you (one call, then ~2h) |
| 3 | MENTOR doesn't exist; engine can't "not fix" | 🟠 the actual build | ~1–2 days |
| 4 | `causal-timeline` widget doesn't exist | 🟡 demo-critical | ~half a day |
| 5 | Build history is authored, not derived | 🟡 fine for demo | scope decision |
| 6 | Plan can't reach a deployed MENTOR | 🟡 shapes the tool signature | ~1h once decided |
| 7 | Evidence study (n=5) not run | 🟡 free points, Research track | ~2h with classmates |
| 8 | Open `[[placeholders]]` incl. product name | 🟡 submission hygiene | you |
| 9 | Six official tracks never confirmed | 🟡 submission hygiene | organizers |
| 10 | Lumina hygiene (uncommitted work, no CI) | 🟢 low | ~1h |

---

## Gap 1 — NitroCloud may not deploy from a subdirectory 🔴

**Status: unverified, and it is the only thing that can sink the submission.**

`MENTOR-CONCEPT.md` §8 is right that nothing else matters until the deploy is green.
The reorg introduced a new risk to exactly that: NitroCloud's *Connect Repository*
flow assumes **the repo root is the NitroStack project**. Here the root is
`command-global/` and the project is `sentinel/`.

**What to do — five minutes, do it first:**

1. Open the NitroCloud → Create App → **Connect Repository** dialog.
2. Look for a **Root Directory** / subdirectory / monorepo field.

| Outcome | Action |
|---|---|
| Field exists | Set it to `sentinel`. Nothing else changes. Done. |
| Field does not exist | Use `DEPLOY.md` §3b — already written and wired. |

The §3b fallback mirrors `sentinel/`'s *contents* to the root of a second GitHub repo
via `git subtree`, so NitroCloud sees a normal NitroStack project. One command,
aliased as `npm run push:sentinel`. The monorepo stays the source of truth.

> **Verified:** `sentinel/` builds and passes 32/32 from its new path — the move itself
> broke nothing (`cd sentinel && npm test`). The *only* open question is NitroCloud's
> repo-root handling, which cannot be checked without the account.

---

## Gap 2 — Lumina cannot express a software architecture 🟠

**Verified.** This is the most substantive thing the consolidation turned up, and it
contradicts an assumption in `MENTOR-CONCEPT.md` §3 Layer 3.

Layer 3 says the student "builds the **architecture** in Lumina: components as nodes,
data flow as edges." Lumina's node catalog (`lumina/l/types.ts`, `NODE_CATALOG`) has
**34 node types and not one of them is a generic software component**:

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

**C. Keep `script` nodes as stand-ins.** Zero work — this is what
`fixtures/pricing/plan.lumina.json` does today. But the student sees four boxes labelled
"Script", and a judge sees a canvas that clearly wasn't built for this.

> Today's state is **C**. The fixture is honest about it — `data.label` carries
> `validate`/`discount`/`tax`/`total` and `export_plan.py` prefers the student's label
> over the node type, so **switching to A requires no change to the plan artifact.**

---

## Gap 3 — MENTOR doesn't exist, and the engine can't terminate without fixing 🟠

**Verified.** Two parts. The second is the one that will surprise you.

### 3a — Zero lines of MENTOR

`sentinel/src/modules/` has six modules (sentinel, ledger, verdict, relay, aegis,
command). There is no `mentor/`. Per `ARCHITECTURE.md` §14 the shape is:

```
sentinel/src/modules/mentor/
├── plan.ts             # load + validate a lumina.plan/v1 artifact
├── drift.ts            # align plan.order ↔ build steps; find the earliest divergence
├── mentor.adapter.ts   # DomainAdapter — the one whose submit refuses to patch
├── mentor.module.ts    # @Tool explain_drift + @Widget('causal-timeline')
└── mentor.test.ts      # assert against fixtures/pricing/build.history.json → expectedDrift
```
plus registration in `sentinel/src/app.module.ts` (`imports: [...]`).

The inputs are ready and tested: `fixtures/pricing/plan.lumina.json` (intent, with
`order`) and `fixtures/pricing/build.history.json` (actuals, with `expectedDrift` as the
assertion to test against). `drift.ts` is a small algorithm — compare each component's
index in `plan.order` against its `seq` in `steps`, take the earliest mismatch, report
its `file:line`.

### 3b — The engine has no "explain but don't fix" exit ⚠️

`ARCHITECTURE.md` §14 promises a new commander is "one adapter + one module". **That
claim is weaker for MENTOR than for the other five,** and it's better to know now.

Reading `sentinel/src/core/engine.ts`: the loop blocks `submitTool` unless the last
verify passed (line ~244, `"... blocked — not verified"`), and every successful path
then runs confidence gate → AEGIS → **`adapter.deploy()`** → `awaitRecovery()` →
`RESOLVED`. The only alternative terminal state is `ESCALATED`, which means *failure*.

**There is no path where the engine succeeds without deploying a fix** — and not
deploying a fix is MENTOR's entire product thesis (§2: "the tool that refuses to hand
you the patch").

Two options, and the trade is not cosmetic:

**Reframe MENTOR onto the engine** (recommended). Map the lifecycle onto explanation
rather than repair:

| Engine concept | MENTOR's meaning |
|---|---|
| `verifyTool` | the drift claim is *grounded* — the origin component exists in both plan and build |
| `mutationTools` | re-reading the plan / re-parsing the build |
| `submitTool` | emit the causal timeline |
| `deploy(ctx)` | **hand the explanation to the student** — returns the timeline, changes no code |
| `awaitRecovery` | trivially true (nothing was deployed, so nothing can regress) |
| `blastRadius` | inverted — how *confident* the origin claim is |

Slightly contorted, and it **preserves the Research claim in §6** ("the engine
generalizes… one lifecycle, five skins"). A sixth skin on a genuinely unrelated domain
is what makes that a systems result instead of an assertion. That claim is one of only
two research claims in the submission.

**Or bypass the engine** — make `explain_drift` a plain `@Tool` with no `Engine`.
Half the work, honest, and **forfeits the §6 generalization claim** for the commander
where it would count most.

> Whichever you pick, AEGIS should still gate the explanation text — MENTOR's output
> goes to a student, so it is exactly the sort of thing the trust layer exists for.

---

## Gap 4 — The `causal-timeline` widget doesn't exist 🟡

**Verified.** `sentinel/src/widgets/` has one widget, `mission-trace`, registered in
`widget-manifest.json`. It renders status badge / confidence bars / trace / diff.

MENTOR needs the four-panel artwork from `MENTOR-CONCEPT.md` §3 Layer 4: a **plan row**,
a **build row**, a **labelled drift arrow** between them, and a **confidence badge**.
`mission-trace` has the confidence-bar component worth reusing, but no two-row layout
and no concept of an arrow between rows.

This is **demo-critical**: §5 lists "a causal graph you can point at" (vs Copilot's
"prose in a chat panel") as the differentiator, and §8 lists the widget as shipping
scope. A judge watching the video sees this widget or they see nothing.

Add `src/widgets/app/causal-timeline/page.tsx`, add the entry to
`widget-manifest.json` (with an example — the manifest's existing `examples` block is a
good template), decorate `explain_drift` with `@Widget('causal-timeline')`.

---

## Gap 5 — The build history is authored, not derived 🟡

**Verified — and deliberate.** `fixtures/pricing/build.history.json` is hand-written.
Nothing derives it from real activity.

For the demo this is fine and it is what makes MENTOR runnable today. It stops being
fine the moment there is a second project or a real student, because MENTOR's claim to
have "a time axis" (§5) rests on a history it did not observe.

`MENTOR-CONCEPT.md` §10 already recommends the scope: **one file with a git history.**
Deriving `mentor.build/v1` from `git log -p` on a single file is tractable — walk the
commits, attribute each hunk to a component by line range, take first-touch as `seq`.

**Recommendation: don't build this for the submission.** Ship the authored fixture, and
say plainly on the roadmap slide that history derivation is next. An honest authored
fixture reads better than a half-working deriver that mis-attributes a line — and §10
already argues that a tool which confidently points at the wrong line is worse than
useless in education.

---

## Gap 6 — A deployed MENTOR cannot read the student's plan file 🟡

**Inferred from the deployment model; not yet a bug because MENTOR doesn't exist.**

I added the export (Gap-2 note): Lumina's **Plan** button downloads `plan.lumina.json`
to the student's machine. But MENTOR runs as an MCP server **on NitroCloud**, so it has
no access to their filesystem. Same constraint `ARCHITECTURE.md` §15 already documents
for the broken service ("bundled inside the app because NitroCloud can't run a separate
live service for us to patch").

So decide the tool signature before writing `mentor.module.ts`:

- **Bundled** — the fixture's plan is compiled into the app, `explain_drift` takes no
  plan argument. Simplest, reliable on stage, one project only.
- **Argument** — `explain_drift(plan, build)` takes the JSON as a Zod-validated tool
  input; the student pastes or uploads their export. Generalizes to any project, and
  the demo just passes the fixture. **Recommended** — it costs nothing extra now and
  is the difference between a demo and a product.
- **Fetched** — MENTOR pulls from a URL. Most flexible, most to go wrong live.

`export_plan.py`'s artifact is plain JSON with no Lumina types precisely so the
argument route stays open.

---

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
  "military-enterprise vocabulary… wrong for a student-facing education product." Note
  the deployable is still literally named `command-platform` in
  `sentinel/src/app.module.ts`, and this repo is `command-global`. **If the submission
  is an education product, its name is a judged surface.**
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
| `cd sentinel && npm install && npm test` | ✅ **32/32 pass** in the new location |
| `sentinel` widget bundle | ✅ `src/widgets/out/mission-trace.html` regenerates |
| `cd lumina && npx tsc --noEmit` | ✅ **clean**, including the new export |
| `cd lumina && python -m pytest test_export_plan.py` | ✅ **15/15 pass** |
| `npm run fixture:plan` twice → `git diff` | ✅ byte-identical (deterministic) |
| `cd fixtures/pricing/build && node --test` | ✅ **2 pass, 1 fail** — the intended state |
| Failing test location | ✅ `pricing.test.js:40`, `80 !== 72` |
| Drift origin location | ✅ `pricing.js:12`, `const tax = subtotal * taxRate;` |

The line numbers in `MENTOR-CONCEPT.md` §3 ("broke on line 40… went wrong on line 12")
are now literally true of `fixtures/pricing/`, not illustrative.

**Not verified:** Gap 1 (needs the NitroCloud account) and Gap 6 (follows from the
deployment model rather than from something I ran).
