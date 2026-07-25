# MENTOR — you didn't just write the bug. You designed it.

> **Track:** Education & Research · **Platform:** an MCP app on NitroStack
>
> Copilot finishes your code. This one makes you finish it — it shows you the exact
> moment your build stopped matching your plan, and then it stops.

**The submission is this whole repository — a four-layer learning loop, not a single tool.**
A student is given a role, learns the concept, **designs the architecture in Lumina**, builds
it, and when it breaks **MENTOR shows them the exact decision that broke it — and refuses to
write the fix.** Take any layer away and the pitch collapses: without the design canvas there
is no record of what the student *intended*, and without that, MENTOR is just another AI
explaining a stack trace. The loop is the product.

| Layer | Lives in | Does |
|---|---|---|
| 1 · Role | `fixtures/pricing/` | the brief, the deliverables, and a failure planted on purpose |
| 2 · Lesson | *roadmap* | the concept as interactive panels, not documentation |
| **3 · Design** | **`lumina/`** | the student draws components + data flow, then exports `lumina.plan/v1` — **the machine-readable record of intent, and the thing no comparable tool has** |
| **4 · Drift** | **`sentinel/`** | MENTOR diffs intent against what was built, names the origin, states its confidence, and stops |

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
> The project's own test suite is **67/67 passing** — `npm test`. Those are separate: run
> `npm test` to judge the code, `npm run fixture:test` to see the student's bug.

---

## Read these in this order

| | |
|---|---|
| **[`MENTOR-CONCEPT.md`](MENTOR-CONCEPT.md)** | **Start here.** *Why* — the product, the four-layer learning loop, and why it survives "isn't this Copilot?" |
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | *How* — the one engine all six commanders run on (only MENTOR ships registered). Long, and worth it. |
| **[`GAPS.md`](GAPS.md)** | *What's left* — prioritized, honest, and the file to open if you're picking this up. |
| [`DEPLOY.md`](DEPLOY.md) | The NitroCloud runbook + the demo-video script. ChatGPT is optional — see below. |
| **[`TESTING.md`](TESTING.md)** | **Verify it yourself** — a manual checklist with the exact command and exact expected output for every component. |
| [`fixtures/pricing/README.md`](fixtures/pricing/README.md) | The one demo project, all four layers. |

**If you have five minutes:** read the pitch above, then `GAPS.md`'s one-paragraph
summary. That tells you the state of things faster than anything else here.

---

## What's in this repo

```
command-global/
├── sentinel/           ⭐ the deliverable — TS NitroStack MCP app, 7 modules, 67/67 tests
├── lumina/                Layer 3 — the canvas the student designs in (Next.js + FastAPI)
├── fixtures/pricing/      the one demo project: the plan, the build, the drift
└── reference/python/      the original Python prototype (frozen, still useful)
```

Three previously separate projects, consolidated 2026-07-25. Originals left in place at
`pranay/sentinel-mcp`, `pranay/agentic_ai_hackton` and `himes/lumina`.

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
npm run verify           # sentinel build + 67 tests + the fixture guard
```

`npm run verify` is the one command that tells you the repo is healthy. It should end with
`67/67 pass` and four `ok` lines from the fixture guard. **It needs only Node** — no Python,
no network, no key. Verified from a clean `git clone` on a machine with nothing installed.

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
npm test                 # 67/67, fully offline — no API key, no network, no model
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
| **MENTOR — the submission** | ✅ **built** — 33 tests, verified over real MCP |
| **`causal-timeline` widget** | ✅ **built** — renders the drift, withholds the fix |
| Lumina → MENTOR plan contract | ✅ built + tested |
| The demo fixture, all inputs | ✅ complete, verified, and guarded |
| Whole suite | ✅ **67/67**, offline, no API key, no model |
| Deployed to NitroCloud | ⬜ **next** — `DEPLOY.md` path A, ~30 min |
| Can a student really draw this in Lumina? | ✅ **yes** — real `component` node, verified in-browser end to end |
| Evidence study (n=5) | ⬜ not run — Gap 7 |
| Product name | ❓ still `[[PRODUCT NAME]]` — Gap 8 |

**Next action: deploy it.** The code exists and works; it just isn't live. Follow
`DEPLOY.md` path A — Studio's **Deploy** button bundles the connected `sentinel/` folder, so
the monorepo layout is irrelevant. Then connect a client and record the ≤3-min demo
(script in `DEPLOY.md` §7a).

Two things worth settling while that runs:

- **Gap 7** — the n=5 evidence study. Two hours with five classmates, and it is the cheapest
  unclaimed points in a track called *Research*. Report the number even if it's mixed.
- **Gap 8** — the product is still called `[[PRODUCT NAME]]`. The two surfaces a judge's
  client shows are fixed (server and package are both `mentor` now), but the name in the
  concept doc's own title isn't.

Closed since the last pass: **Gap 2** — Lumina now has a real `design` → `component` node,
and the fixture's plan is a byte-identical export from the canvas rather than a stand-in.
**Gap 11** — the tool surface went 23 → 3, so the deployed server no longer offers to
autonomously patch the bug MENTOR refuses to patch. See `GAPS.md`.

You do **not** need ChatGPT Plus: NitroStudio's own AI Chat is an MCP client with a model
picker, gated on NitroCloud sign-in rather than a ChatGPT plan. Confirm with the organizers
that a Studio demo satisfies the submission rules.
