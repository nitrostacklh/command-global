# MENTOR — you didn't just write the bug. You designed it.

> **Track:** Education & Research · **Platform:** an MCP app on NitroStack
>
> Copilot finishes your code. This one makes you finish it — it shows you the exact
> moment your build stopped matching your plan, and then it stops.

**The submission is this whole repository — a learning loop, not a single tool.**
A student picks a real project and **a role on it**, gets the slice of it they would
actually own in a company, **designs that slice in Lumina**, builds it against
checkpoints derived from their own design, and when it breaks **MENTOR shows them the
exact decision that broke it — and refuses to write the fix.** Take any stage away and
the pitch collapses: without the brief there is no scope to be held to, without the
canvas there is no record of what they *intended*, and without that, MENTOR is just
another AI explaining a stack trace. The loop is the product.

### The loop, and the artifact that carries each step

Every stage hands the next one a **plain-JSON file with a versioned schema**. That is
the whole architecture — no shared types, no RPC, no database. Each arrow below is a
file you can print.

```
①  browse_catalog     pick a product type, then a project
       │  mentor.catalog/v1
②  open_brief         your role's slice: what you OWN, what you're GIVEN
       │  mentor.brief/v1
③  Lumina ▸ Plan      draw the components you own, in the order you'll build them
       │  lumina.plan/v1
④  checkpoints        derived from YOUR design · record_progress · is_it_done
       │  mentor.build/v1        ← provenance: observed
⑤  explain_drift      where your build left your plan — then it refuses to fix it
       │  mentor.card/v1
⑥  flashcard          the concept, released only once YOU made the tests pass
```

| Stage | Lives in | Does |
|---|---|---|
| **⓪ Identity** | **`sentinel/src/modules/registrar/`** — REGISTRAR | who is asking, and whether their progress is being kept. Anonymous is a supported state, so a judge with no account still gets the whole loop |
| **① Path · ② Role** | **`sentinel/src/modules/learn/`** — ROSTER | a curated catalog of exemplary projects, then the **role-scoped brief**: the components you own, the ones another role hands you, and the ones that are explicitly not your job |
| 2 · Lesson | *roadmap* | the concept as interactive panels, not documentation |
| **③ Design** | **`lumina/`** | the student draws components + data flow, then exports `lumina.plan/v1` — **the machine-readable record of intent, and the thing no comparable tool has** |
| **④ Checkpoints** | **`sentinel/src/modules/learn/`** — COACH | checks the design covers your slice, derives checkpoints **from your own plan**, records what you finish, and judges done-ness |
| **⑤ Drift · ⑥ Card** | **`sentinel/src/modules/mentor/`** — MENTOR *(card logic in `learn/card.ts`)* | names the origin, states its confidence, stops — then issues the concept as a flashcard, once you fixed it yourself |

**Two kinds of drift, not one.** `check_scope` catches designing the *wrong set* of
components — someone else's job, or missing your own. `explain_drift` catches building
*your* components in the wrong order. Independent failures needing different
conversations, and in a company the first is the more expensive, because nobody
notices until integration.

**Checkpoints retire the demo's weakest link.** A tracked checkpoint log *is* a
`mentor.build/v1`, so a student who tracked their work never authors a history. That
history is `provenance: "observed"` and scores **0.97**, against the hand-authored
fixture's **0.91**. The confidence rose because the evidence genuinely improved, not
because a number was tuned.

**The flashcard cannot become the fix.** Its answer is gated on the student's real test
output, and while the tests are red the answer field is **absent from the response** —
not present with a flag, because a field a model can read is a field it will read out.
See [`card.ts`](sentinel/src/modules/learn/card.ts).

```bash
npm run walk
```

Asserts the nine turns a student actually takes, over real MCP, and exits non-zero on a
regression. `npm run probe` prints the same journey for reading instead. Both are in
`npm run verify`. Neither can tell you whether *a model* picks the right tool — that is
what [`WALKTHROUGH.md`](WALKTHROUGH.md) is for.

**What deploys to NitroCloud is `sentinel/` — built entirely with the official NitroStack
TypeScript SDK**, and it runs with no network, no API key and no model. `lumina/` is the
Layer 3 half of the same product, run locally by the student; the two halves meet at exactly
one plain-JSON file, which is also why MENTOR can be handed a plan directly and demoed on
its own.

> ### 🟢 One failing test in this repo is deliberate — please read before judging
>
> `fixtures/pricing/build/pricing.test.js` **fails on purpose.** The broken build *is* the
> demo: MENTOR's whole job is explaining why it broke, so it has nothing to explain if the
> fixture is green. `npm run fixture:check` asserts the failure is still exactly where it
> should be (`pricing.test.js:40`, `80 !== 72`) and **fails loudly if someone "fixes" it.**
>
> The project's own test suite is **177 passing across three apps** (46 · 72 · 59). Those are separate: run
> `npm test` to judge the code, `npm run fixture:test` to see the student's bug.

---

## Read these in this order

| | |
|---|---|
| **[`MENTOR-CONCEPT.md`](MENTOR-CONCEPT.md)** | **Start here.** *Why* — the product, the learning loop, and why it survives "isn't this Copilot?" |
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | *How* — the one engine all six commanders run on (only MENTOR ships registered). Long, and worth it. |
| **[`GAPS.md`](GAPS.md)** | *What's left* — prioritized, honest, and the file to open if you're picking this up. |
| [`DEPLOY.md`](DEPLOY.md) | The NitroCloud runbook + the demo-video script. ChatGPT is optional — see below. |
| **[`STUDY.md`](STUDY.md)** | **The measurement** — a ready-to-run protocol for the n=5 evidence study. Designed, **not yet run**; nothing here may claim a result until it is. |
| **[`WALKTHROUGH.md`](WALKTHROUGH.md)** | **Use it as a student** — connect a real MCP client and talk to it in plain English. The only way to find out whether a model picks the right tool. |
| **[`TESTING.md`](TESTING.md)** | **Verify the parts** — a manual checklist with the exact command and exact expected output for every component. |
| [`fixtures/pricing/README.md`](fixtures/pricing/README.md) | Demo project 1 — every stage, end to end. |
| [`fixtures/safety-gear/README.md`](fixtures/safety-gear/README.md) | Demo project 2 — the same loop, different shape. Read this to see it generalize. |

**If you have five minutes:** read the pitch above, then `GAPS.md`'s one-paragraph
summary. That tells you the state of things faster than anything else here.

---

## What's in this repo

```
command-global/
├── mcp-roster/                ⭐ MCP-1 — catalog, briefs, lessons, checkpoint spec · 8 tools, 46 tests
│   ├── src/catalog/              the artifact logic — catalog, brief, lesson, spec
│   └── src/widgets/              the lesson-panels UI
├── sentinel/                  ⭐ MCP-2 — verification, drift, the refusal · 6 tools, 72 tests
│   ├── src/modules/mentor/       explain_drift, withhold_fix, mentor_status
│   └── src/widgets/              the causal-timeline UI
├── mcp-profile/               ⭐ MCP-3 — the student record and the flashcards · 9 tools, 59 tests
│   ├── src/profile/              the record, and every rule for changing it
│   └── src/concepts/             ⚠️ the ONLY place a flashcard answer exists
├── shared/                    copied into all three by `npm run sync:shared`
├── lumina/                    stage ③ — the canvas the student designs in (Next.js + FastAPI)
├── fixtures/
│   ├── catalog.json             the curated menu: 3 domains, 3 projects, 5 seats — all briefed
│   ├── pricing/                 web service — backend + frontend seats
│   ├── safety-gear/             vision — CV + platform seats (proves it generalizes)
│   └── event-ingest/            data pipeline — data seat
└── reference/python/          the original Python prototype (frozen, still useful)
```

**Two demo projects on purpose.** `pricing/` proves the loop runs; `safety-gear/`
proves the loop is not *about pricing*. It differs in three ways that would each
have caught a hardcoded assumption: three owned components instead of four, a
different drift shape (acting on a condition that did not exist yet, rather than
computing from a stale base), and `provenance: observed` instead of `authored`.

Three previously separate projects, consolidated 2026-07-25. Originals left in place at
`pranay/sentinel-mcp`, `pranay/agentic_ai_hackton` and `himes/lumina`.

### Why there is code here for DevOps, FinOps, Legal and Civic

Because **this repo started as a different product, and MENTOR is a deliberate pivot away
from it.** `reference/python/docs/COMMAND_PLATFORM_PLAN.md` is the original plan: COMMAND, an
"Autonomous Enterprise OS" of five MCP apps on one shared engine. You can see the turn in the
history — the platform arrives at `1e4067a` as a consolidation of earlier work, MENTOR at
`b0531b6`.

**Four of those five commanders are still here, still tested, and deliberately unregistered.**
The three deployed servers offer 23 tools between them (8 · 6 · 9) and every one is MENTOR's
loop. The reason for cutting the others
is not tidiness: `self_heal` runs on the *same* pricing service and the *same*
tax-before-discount bug as MENTOR's fixture, and its description offers to patch, prove and
deploy the fix. Ask a model *"the pricing test is failing, help"* next to that tool and it
picks the actionable one — contradicting MENTOR's entire thesis, live, on our own bug.
Full reasoning: `GAPS.md` Gap 11.

**We are not asking you to take the generalization on trust.** The claim that matters is that
the *learning loop* works on more than one kind of student project, and that one is
demonstrable in a single command — `npm run walk`, against `fixtures/safety-gear/`: a vision
project with three owned components instead of four, a boundary component the student draws
but does not own, and a different class of bug. That the engine underneath *also* runs cloud
cost anomalies is a systems footnote, evidenced by a passing test suite and nothing more.
See `MENTOR-CONCEPT.md` §6, which ranks these claims by how well each is actually evidenced.

Deleting the four would buy cleaner optics and cost real, working, tested code. Keeping them
unregistered and saying plainly why is the honest trade.

### How the pieces actually connect

```
   lumina/  ──── plan.lumina.json ────▶  sentinel/src/modules/mentor/  ──▶  causal timeline
   the student's                          MENTOR diffs intent vs build        "line 40 broke.
   architecture,                                    ▲                          line 12 went
   drawn before code                                │                          wrong."
                          build.history.json ───────┘
                          what actually happened, in order
```

The joint is one file shape, `lumina.plan/v1` — plain JSON, no Lumina types. Produced by
[`lumina/export_plan.py`](lumina/export_plan.py), consumed by MENTOR. That decoupling is
deliberate: the Python/React half and the TypeScript half agree on exactly one thing.

Both sides are built and tested. MENTOR does not require Lumina to run — the plan is an
optional tool argument that defaults to the bundled fixture, because on NitroCloud the app
cannot see a student's laptop (`GAPS.md` Gap 6).

---

## Installation

**Prerequisites:** Node.js 20.x LTS (18+ works), npm, Git. Python 3.10+ **only** if you
want the `lumina/` companion tool — the submission itself does not need Python.

```bash
git clone https://github.com/nitrostacklh/command-global.git
cd command-global
npm run install:all      # deps for sentinel/ and lumina/
npm run verify           # ⚠️ sentinel's 47 only — see GAPS.md Gap 18
```

`npm run verify` runs **all three apps** — 46 · 72 · 59 = **177** — then the shared-contract
guard, the fixture guard, the twelve-turn student journey across all three servers over real
MCP, and the doc check. **It needs only Node** — no Python, no network, no key. (It reached
only `sentinel` until 2026-07-26; `GAPS.md` Gap 18.)

Per app, if you want them separately:

```bash
(cd mcp-roster && npm test)   # 46
(cd sentinel   && npm test)   # 72
(cd mcp-profile && npm test)  # 59
```

`npm run verify:all` additionally re-derives the fixture's plan through Lumina's exporter and
proves the output is byte-stable. That one shells out to **Python**, which is why it is a
separate script rather than part of `verify`.

> **`npm audit` reports 3 moderate advisories, and they are not ours to fix.** The chain is
> `@modelcontextprotocol/ext-apps` → `@modelcontextprotocol/sdk` → `@hono/node-server`, and
> `ext-apps@1.7.5` is already the newest release. The advisory (a Windows path-traversal in
> `serve-static`) is fixed in `@hono/node-server ≥2.0.5`, but the MCP SDK still pins
> `1.19.15`. `npm audit fix` correctly changes nothing. Nothing in our `package.json`
> controls it, and MENTOR serves no static user-supplied paths.

## Environment setup

**Nothing is required to run MENTOR.** No API key, no `.env`, no network, no model — this
is a design property, not an oversight (see *Why it needs no model* below), and it is why
`npm test` passes on a fresh clone with the network off.

[`.env.example`](.env.example) documents every variable the wider repo can *optionally*
use — copy it to `.env` only if you want the `lumina/` companion's cloud-model fallbacks or
the Python reference's connectors. `.env` is gitignored and no secrets are committed.

| Variable | Needed for | Required? |
|---|---|---|
| *(none)* | `sentinel/` — the submission | ✅ runs with zero config |
| `GEMINI_API_KEY` etc. | `lumina/` optional cloud fallback; it prefers local Ollama | optional |

## Usage

### The MCP app — `sentinel/` (the submission)

```bash
npm run sentinel:dev     # then open the sentinel/ folder in NitroStudio
npm test                 # sentinel's 47, fully offline — no API key, no network, no model
```

Point NitroStudio at the **`sentinel/` subfolder**, not the repo root — Studio validates a
folder by `package.json` + `src/index.ts` + `@nitrostack/core`.

Then ask a connected MCP client *"a student's pricing test is failing — when did they go
wrong?"*. It calls `explain_drift`, which needs no arguments, and renders the
**causal-timeline** widget. Ask it to fix the bug and `withhold_fix` will decline — that is
the product, not a missing feature.

**Why it needs no model:** in MCP the *client* supplies the model. MENTOR's own work is an
ordering comparison, a weighted formula, and a refusal — there is nothing to generate. So
it runs offline, with no API key and no per-student cost.

### The design canvas — `lumina/` *(Layer 3 — where the student designs)*

Next.js + FastAPI, run locally by the student. It sits outside the deployed MCP app on
purpose: the two halves agree on one plain-JSON file and nothing else, which is what lets
MENTOR be demoed standalone *and* lets the canvas evolve without touching the server.

Drag **Component** nodes from the `design` palette group, wire them in the order you intend
to build, then hit **Plan**.

```bash
cd lumina
python -m venv v && v\Scripts\pip install -r reqs.txt   # first run only
npm run full-dev         # Next.js :3000 + FastAPI :8000 + Electron
```

> **Path-sensitive.** `srv.py` resolves `m/yolov8n.onnx`, `lumina.db` and
> `test_scene.jpg` relative to the **process working directory** — it must be launched
> from inside `lumina/`. The root `npm run lumina:*` scripts handle that for you.
>
> `lumina/m/` (26 MB of ONNX weights) is gitignored. A fresh clone has no models and the
> detection/audio nodes will fail until they're restored — see `GAPS.md` Gap 10.

To produce a plan artifact: draw your components, then hit **Plan** in the canvas
toolbar. It downloads `plan.lumina.json` — MENTOR's intent input.

### The demo fixture

```bash
npm run fixture:check    # ✅ asserts the fixture is correctly BROKEN
npm run fixture:test     # raw runner output: 2 pass, 1 fail — this is correct
npm run fixture:plan     # regenerate plan.lumina.json (deterministic)
```

The failing test *is* the fixture. MENTOR has nothing to explain if it's green — so
`fixture:check` fails loudly if someone "fixes" `pricing.js`, and it's part of
`npm run verify`.

### The Python reference — `reference/python/`

```bash
cd reference/python && pip install -r requirements.txt
python -m sentinel                 # control plane + dashboard on :8100
scripts/run_demo.ps1               # + the live Atlas pricing service on :8000
```

Kept because two parts are still live assets rather than archaeology: `service/` is a
genuinely running pricing service with a bug-injection mechanism, and `dashboard/` is a
working human-approval UI.

---

## State of things

| | |
|---|---|
| Platform (5 commanders + coordinator + trust layer) | ✅ complete, ⚪ **unregistered on purpose** — `GAPS.md` Gap 11 |
| **The loop, all six stages** | ✅ **built and bridged** — `npm run probe` walks it over real MCP |
| ① catalog → ② role-scoped brief | ✅ built + tested — `mentor.catalog/v1`, `mentor.brief/v1` |
| ② brief → ③ design (scope drift) | ✅ built + tested — `check_scope` |
| ③ design → ④ checkpoints | ✅ built + tested — derived from the student's own plan |
| ④ checkpoints → build history | ✅ built + tested — `provenance: observed`, **0.97** vs 0.91 |
| ⑤ drift → ⑥ flashcard | ✅ built + tested — answer absent from the payload until earned |
| **`causal-timeline` widget** | ✅ **built** — renders the drift, withholds the fix |
| Three demo projects, five seats, all inputs | ✅ complete, verified, and guarded |
| Whole suite | ✅ **177** (46 · 72 · 59), offline, no API key, no model |
| Docs agree with the code | ⚠️ `npm run check:docs` reads only **sentinel's** tool list, so post-split it measures one of three services — Gap 18 |
| Student work survives the chat | ✅ REGISTRAR, now MCP-3 — identity + storage, **no `save` verb added** — Gap 19 |
| Durable storage on the deployed service | ⬜ NitroCloud is Node 20; `node:sqlite` needs 22.5, so live progress is per-restart **and says so** |
| Auth exercised against a real token | ⬜ implemented + tested, no issuer configured yet — Gap 19 |
| **Deployed to NitroCloud** | ✅ **LIVE and verified** — 16/16 over the wire, `npm run verify:live` |
| Can a student really draw this in Lumina? | ✅ **yes** — real `component` node, verified in-browser end to end |
| Layer 2 · the lesson panels | ✅ **built** — `mentor.lesson/v1`, four panels × five seats, plus the `lesson-panels` widget — Gap 13 |
| Evidence study (n=5) | ⬜ **not run** — protocol ready in [`STUDY.md`](STUDY.md), Gap 7 |
| Product name | ✅ **MENTOR** — resolved, Gap 8 |

**It is live**, deployed by GitHub auto-deploy from the `nitrostacklh/mentor-mcp` mirror —
`sentinel/` at a repo root, because NitroCloud's Connect Repository dialog has no root-directory
field. `npm run verify:live -- <url>` re-checks the deployed service (16 assertions, including
that the flashcard's answer appears nowhere in a live withheld payload). Deploys are now one
command: `npm run push:sentinel`.

**Next action: record the ≤3-min demo** — script with timings in `DEPLOY.md` §7a.

Two things worth settling while that runs:

- **Gap 7** — the n=5 evidence study. Two hours with five classmates, and it is the cheapest
  unclaimed points in a track called *Research*. Report the number even if it's mixed.
- **Gap 9 and Gap 17** — the only two open items nothing in this repo can close: confirm the
  official printed track name with the organizers, and get a name against "who authors the next
  three projects" before promising a curriculum on the roadmap slide.

Closed since the last pass: **the bridges between the stages**, which were the real
gap — four of the five handoffs did not exist in code, and the fifth was
hand-authored. Every one is now a versioned JSON artifact with tests.
Also **Gap 2** — Lumina has a real `design` → `component` node and the fixture's plan
is a byte-identical export from the canvas. **Gap 11** — the tool surface went 23 → 3,
and back up to 10, but all 10 are now stages of one loop rather than six unrelated
products; the refusal check in `npm run probe` still reports no tool that can modify a
student's build.

You do **not** need ChatGPT Plus: NitroStudio's own AI Chat is an MCP client with a model
picker, gated on NitroCloud sign-in rather than a ChatGPT plan. Confirm with the organizers
that a Studio demo satisfies the submission rules.
