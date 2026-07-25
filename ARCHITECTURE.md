# COMMAND Platform — Complete Architecture & Onboarding Guide

> Read this once, top to bottom, and you'll understand the entire project: what
> every file is for, how the pieces fit, how they work together at runtime, and
> exactly what's left to finish. No prior context needed.
>
> **Repo layout note.** This file lives at the root of the `command-global`
> monorepo. Four things live side by side here:
>
> | Path | What it is | Status |
> |---|---|---|
> | `sentinel/` | The TypeScript NitroStack MCP app | **the deliverable** |
> | `lumina/` | The Next.js + FastAPI design canvas (Layer 3) | integrating |
> | `fixtures/pricing/` | The one demo project, end to end | the demo |
> | `reference/python/` | The original Python prototype | frozen reference |
>
> Read **`MENTOR-CONCEPT.md`** first for *why* — the student-facing four-layer
> learning product. Read this file for *how* — the engine every layer is built
> on. Read **`GAPS.md`** for what is not done yet and in what order to do it.
>
> ⚠️ **This file describes all six commanders. The submission deploys one.**
> `app.module.ts` registers only `MentorModule`; SENTINEL, LEDGER, VERDICT, RELAY,
> AEGIS and the COMMAND coordinator are present and tested but **unregistered**, so
> none of their tools appear over MCP. That is deliberate — `self_heal` runs on the
> same pricing service and the same `tax-before-discount` bug as MENTOR's fixture and
> offers to *patch* it, which is the opposite of what the product claims to do. Read
> `GAPS.md` Gap 11 before re-enabling them. Everything below is still accurate about
> the code; treat "the platform" as the engine's evidence base, not as what ships.

---

## Table of contents

1. [What this project is (in one minute)](#1-what-this-project-is-in-one-minute)
2. [The three ideas that explain everything](#2-the-three-ideas-that-explain-everything)
3. [A quick word on MCP and NitroStack](#3-a-quick-word-on-mcp-and-nitrostack)
4. [Repository map — every file, what it's for](#4-repository-map--every-file-what-its-for)
5. [The engine core (the heart)](#5-the-engine-core-the-heart)
6. [How one incident flows through the engine](#6-how-one-incident-flows-through-the-engine)
7. [The commanders](#7-the-commanders)
8. [AEGIS — the trust layer that governs everyone](#8-aegis--the-trust-layer-that-governs-everyone)
9. [COMMAND — the coordinator / the organization](#9-command--the-coordinator--the-organization)
10. [Two ways to drive a commander](#10-two-ways-to-drive-a-commander)
11. [The glass-box widget](#11-the-glass-box-widget)
12. [How it all works together (the big picture)](#12-how-it-all-works-together-the-big-picture)
13. [Running, testing, deploying](#13-running-testing-deploying)
14. [How to add a new commander (extend it)](#14-how-to-add-a-new-commander-extend-it)
15. [FAQ — the questions you're about to ask](#15-faq--the-questions-youre-about-to-ask)
16. [What's left and how to finish it](#16-whats-left-and-how-to-finish-it)

---

## 1. What this project is (in one minute)

**COMMAND** is an **autonomous "enterprise operations" platform** built as a single
**MCP app** (Model Context Protocol) on **NitroStack**, deployable to **NitroCloud**
and drivable from any MCP client — NitroStudio AI Chat, ChatGPT, or a local one.

It is made of **independent "commanders"** — each one an autonomous agent for a
different domain — plus a **coordinator** that runs them together as a governed
organization:

| Commander | Domain | What it does on its own | Built? |
|---|---|---|---|
| **SENTINEL** (the leader) | DevOps | Detects a broken service, patches it, proves the fix with tests, ships it. | ✅ |
| **LEDGER** | FinOps | Finds cloud waste, simulates savings, rightsizes without breaking SLAs. | ✅ |
| **VERDICT** | Legal | Reviews a contract, generates a cited redlined counter-offer. | ✅ |
| **RELAY** | Civic | Matches a citizen to a government scheme, files & tracks the application. | ✅ |
| **AEGIS** | Trust/Safety | Guardrail: scores & rewrites unsafe AI output; **every** action routes through it. | ✅ |
| **COMMAND** | (coordinator) | Runs the whole fleet; commanders can call each other for help. | ✅ |
| **MENTOR** | Education | Shows a student the moment their build diverged from the plan they drew — and refuses to write the fix. | ✅ |

Each commander is genuinely a standalone "winning" idea; together they form one product.

**MENTOR is the sixth commander and the hackathon submission.** It is the one
commander that inverts the engine: the other five *resolve* an incident by changing
something, MENTOR resolves one by **explaining** it and changing nothing. It is
specified in **`MENTOR-CONCEPT.md`** and built in `sentinel/src/modules/mentor/` —
see §7.6 for how the lifecycle was re-read to make "explain but don't fix" a
first-class outcome rather than a failure.

The TypeScript app at `sentinel/` is the **deliverable**. The Python
implementation at `reference/python/` was the original prototype and IP source —
you don't need it to work on this, but that's where the ideas came from, and it
still holds the live-service version of the pricing demo (`reference/python/service/`).

---

## 2. The three ideas that explain everything

If you understand these three, everything else is detail.

### Idea 1 — One engine, many domains ("core + adapter")
There is **one** generic engine that runs the same lifecycle for every incident:

```
detect → diagnose → verify (loop until the fix proves out) → confidence gate
       → (human approval if unsure) → AEGIS trust check → deploy → report → resolved
```

The engine knows nothing about services, cloud bills, or contracts. Each domain plugs
in a small **adapter** that teaches the engine the domain-specific bits (what tools
exist, how a fix is proven, how risky it is, how to deploy). **Every commander is
`core + one adapter`.** Build the engine once; skin it six times.

### Idea 2 — In MCP, the *client model is the agent*
This is the key mental shift. In a normal agent you write a loop that calls an LLM. In
**MCP**, your server just exposes **capabilities** (Tools, Prompts, Resources, Widgets),
and the **connecting model** (ChatGPT, or NitroStudio's AI Chat) is the "brain" that
decides which tools to call. So our engine **never calls an LLM** — it exposes tools and
either (a) lets the client drive them, or (b) drives them itself with a deterministic
"planner" for a reliable one-click demo. That's why the whole thing is testable with no
API key: the model is pluggable.

### Idea 3 — Nothing acts unchecked (AEGIS) and they help each other (COMMAND)
- **AEGIS** is a trust guardrail wired into *every* commander: before any action is
  "deployed," AEGIS scores it and can block it. This is the safety/governance layer.
- **COMMAND** turns the fleet into an **organization**: a commander that hits a problem
  outside its domain can **pull in a teammate mid-task, wait for them, and continue** —
  real delegation and synchronization, all AEGIS-gated.

---

## 3. A quick word on MCP and NitroStack

**MCP (Model Context Protocol)** is an open standard that lets an AI model connect to
external tools/data through one common interface — "USB for AI." An MCP server exposes:
- **Tools** — functions the model can call (our actuators: `run_tests`, `propose_patch`…).
- **Prompts** — reusable instruction templates.
- **Resources** — data the model can read.
- **Widgets** — React UI that renders a tool's result (our "glass box").

**NitroStack** is the framework + platform we must use (hackathon rule):
- `@nitrostack/core` — the SDK. Decorator-based, NestJS-style: `@McpApp`, `@Module`,
  `@Tool`, `@Prompt`, `@Widget`, plus `ExecutionContext` and `z` (Zod, for input schemas).
- `@nitrostack/cli` — scaffolds, builds, and runs the server (`nitrostack-cli dev/build`).
- **NitroStudio** — desktop IDE to run/test the server visually.
- **NitroCloud** — hosts and deploys it; connects to ChatGPT.

> **Gotcha #1 (important):** the decorators are exported *aliased*. You must import
> `ToolDecorator as Tool`, `PromptDecorator as Prompt`, `ResourceDecorator as Resource`,
> `ControllerDecorator as Controller`. Bare `Prompt`/`Resource` are *types*, not the
> decorators, and using them fails to compile. `Widget` and `Module`/`McpApp` are
> imported by their own names.
>
> **Gotcha #2:** the project is ESM. Relative imports must end in `.js` (e.g.
> `import { Engine } from '../../core/engine.js'`) even though the file is `.ts`.

---

## 4. Repository map — every file, what it's for

### 4.1 — The monorepo, one level down

```
command-global/                      # ← the repo root (this file lives here)
├── ARCHITECTURE.md                  #   how the engine works (this file)
├── MENTOR-CONCEPT.md                #   why the product exists — the four layers
├── DEPLOY.md                        #   NitroCloud + ChatGPT runbook (THE blocker)
├── GAPS.md                          #   what is not done, in priority order
├── README.md                        #   30-second orientation + how to run each part
├── package.json                     #   root scripts that delegate into sentinel/ and lumina/
├── .env.example                     #   every env var any sub-project reads
│
├── sentinel/                        # ⭐ THE DELIVERABLE — TS NitroStack MCP app (see 4.2)
│
├── lumina/                          # Layer 3 — the design canvas the student plans in
│   ├── app/                         #   Next.js App Router pages (canvas, dashboard, library, logs)
│   ├── c/                           #   React components + c/nodes/* (one file per node type)
│   ├── l/                           #   Zustand stores, hooks, types, export adapters
│   ├── srv.py                        #   FastAPI backend — all /api/* node executors + /ws
│   ├── brain.py                      #   The AI graph-builder (prompt → workflow)
│   ├── export_n8n.py / export_nodered.py  # graph → external automation formats
│   ├── m/                            #   ONNX models (yolov8n, yamnet) — gitignored, 26 MB
│   └── app.js / pre.js               #   Electron shell
│
├── fixtures/pricing/                # THE demo project — one project, all four layers
│   ├── plan.lumina.json             #   Layer 3 output: the architecture the student drew
│   ├── build/                        #   Layer 4 input: the student's code + its history
│   └── README.md                      #   the role brief + acceptance criteria (Layer 1)
│
└── reference/python/                # Frozen Python prototype (original IP)
    ├── sentinel/                    #   engine, adapters/{devops,finops}, confidence, audit
    ├── service/                     #   the LIVE Atlas pricing service (FastAPI) + its tests
    ├── dashboard/                   #   the original HTML/JS incident dashboard
    ├── mcp_servers/                 #   first-cut MCP server (pre-NitroStack)
    └── docs/                        #   COMMAND_PLATFORM_PLAN.md, NITROSTACK_PLAN.md
```

> **Why `reference/python/` is kept.** Two things in it are still live assets, not
> archaeology: `service/` is a *real running* pricing service with a
> `.pricing.pristine.py` / `pricing.py` pair (the injected-bug mechanism), and
> `dashboard/` is a working HITL approval UI. Both are candidate reuse for MENTOR.

### 4.2 — Inside `sentinel/` (the deliverable)

```
sentinel/
├── src/
│   ├── index.ts                     # Bootstraps the MCP server (McpApplicationFactory.create → start)
│   ├── app.module.ts                # @McpApp root — registers all 6 feature modules
│   │
│   ├── core/                        # ⭐ THE SHARED ENGINE — framework-free, no NitroStack import
│   │   ├── types.ts                 #   Incident, Verdict, ToolResult, BlastRadius, IncidentStatus
│   │   ├── confidence.ts            #   The explainable autonomy gate (the scoring formula)
│   │   ├── adapter.ts               #   The DomainAdapter interface — what each commander implements
│   │   ├── engine.ts                #   The lifecycle: detect→verify→gate→AEGIS→deploy→report
│   │   ├── coordinator.ts           #   The "organization": commanders delegating to each other
│   │   └── engine.test.ts           #   Offline tests for the engine + guard
│   │
│   ├── modules/
│   │   ├── sentinel/                # SENTINEL · DevOps (the leader)
│   │   │   ├── fixtures.ts          #   The bundled "broken service" (source string + bug + tests + runner)
│   │   │   ├── devops.adapter.ts    #   DevOpsAdapter (implements DomainAdapter) + devopsPlanner
│   │   │   ├── sentinel.tools.ts    #   Tools: sentinel_status, assess_confidence, self_heal (one-click)
│   │   │   ├── sentinel.live.ts     #   Client-driven tools: open_incident/read_source/propose_patch/…
│   │   │   ├── session.ts           #   Per-incident state machine for the client-driven flow
│   │   │   ├── sentinel.prompts.ts  #   The 'incident_commander' MCP prompt
│   │   │   ├── sentinel.module.ts   #   Wires the above into a @Module
│   │   │   ├── devops.test.ts       #   Fixture + full self-heal engine test
│   │   │   └── session.test.ts      #   Client-driven flow tests
│   │   │
│   │   ├── ledger/                  # LEDGER · FinOps
│   │   │   ├── cloud.ts             #   Deterministic cloud-cost model (inventory, stage, simulate, apply)
│   │   │   ├── ledger.adapter.ts    #   FinOpsAdapter + ledgerPlanner + ledgerOrgPlanner (+ delegation)
│   │   │   ├── ledger.module.ts     #   Tools: optimize_spend, cloud_cost_report + prompt
│   │   │   └── ledger.test.ts
│   │   │
│   │   ├── verdict/                 # VERDICT · Legal
│   │   │   ├── verdict.adapter.ts   #   VerdictAdapter (+ inline sample contract) + verdictPlanner
│   │   │   ├── verdict.module.ts    #   Tool: redline_contract + prompt
│   │   │   └── verdict.test.ts
│   │   │
│   │   ├── relay/                   # RELAY · Civic
│   │   │   ├── relay.adapter.ts     #   RelayAdapter (+ scheme catalog) + relayPlanner
│   │   │   ├── relay.module.ts      #   Tool: apply_for_scheme + prompt
│   │   │   └── relay.test.ts
│   │   │
│   │   ├── aegis/                   # AEGIS · Trust (the connective tissue)
│   │   │   ├── trust.ts             #   assessTrust() rule-based detectors + aegisGuard() helper
│   │   │   ├── aegis.module.ts      #   Tools: verify_output, guard + prompt
│   │   │   └── aegis.test.ts
│   │   │
│   │   ├── command/                 # COMMAND · Coordinator
│   │   │   ├── command.module.ts    #   Tools: platform_status, run_operation, run_organization
│   │   │   └── command.test.ts
│   │   │
│   │   └── mentor/                  # MENTOR · Education — ⭐ THE SUBMISSION
│   │       ├── plan.ts              #   parse lumina.plan/v1 + graph queries (dependencyPath)
│   │       ├── build.ts             #   parse mentor.build/v1 + first-touch actual order
│   │       ├── drift.ts             #   ⭐ the algorithm: locate the origin + score confidence
│   │       ├── fixtures.ts          #   the bundled pricing demo (plan + build + source)
│   │       ├── mentor.adapter.ts    #   DomainAdapter whose deploy() explains and never patches
│   │       ├── mentor.module.ts     #   Tools: explain_drift (+widget), withhold_fix, mentor_status
│   │       ├── drift.test.ts        #   18 tests — the origin rule, and refusing to over-claim
│   │       └── mentor.test.ts       #   15 tests — end-to-end + the refusal as an invariant
│   │
│   ├── health/system.health.ts      # NitroStack health check (from the scaffold)
│   └── widgets/                     # React widgets (glass-box UI, Next.js)
│       ├── app/layout.tsx           #   Widget shell
│       ├── app/mission-trace/page.tsx  # ⭐ The MissionTrace widget (renders any run)
│       ├── app/causal-timeline/page.tsx # ⭐ MENTOR's plan-vs-build timeline + the refusal
│       └── widget-manifest.json     #   Registers both widgets + an example each
│
├── README.md                        # Quick overview + status
├── package.json                     # deps + scripts (dev/build/test)
└── .gitignore                       # excludes .env, keys, node_modules
```

> `ARCHITECTURE.md` and `DEPLOY.md` used to live in this folder. They are now at
> the **monorepo root**, one level up, because they describe more than the TS app.

**The single most important line to internalize:** everything under `core/` is
domain-agnostic and has **zero** NitroStack dependency; everything under `modules/*/`
is a thin domain skin that imports the core. That separation is the whole architecture.

---

## 5. The engine core (the heart)

Four small files under `src/core/`. Learn these and you can read anything else.

### `types.ts` — the shared vocabulary
Defines the data everyone passes around:
- **`Incident`** — the record of one problem being solved: `id`, `symptom`, `domain`,
  `status`, `diagnosis`, `fixSummary`, `diff`, `iterations`, `verdict`, `actions`, timing.
- **`Verdict`** — the autonomy gate's output: `score`, `threshold`, `autonomous`, and a
  `components` breakdown.
- **`ToolResult`** — `{ data, isError }`, what a tool returns.
- **`BlastRadius`** — `{ score (0–1), reason }`, how risky a change is (normalized).
- **`IncidentStatus`** — `DETECTED | DIAGNOSING | VERIFYING | AWAITING_APPROVAL | DEPLOYING | REPORTING | RESOLVED | ESCALATED`.

### `confidence.ts` — the autonomy gate
A pure function `assess(...)` that turns four signals into one explainable score:

```
score = 0.40 · verification   (did the fix prove out? tests green / simulation clean → 1 or 0)
      + 0.25 · agentConfidence (the agent's own calibrated 0–1)
      + 0.20 · iterations      (1 attempt → 1.0; each extra attempt −0.25)
      + 0.15 · blastRadius     (adapter-normalized; 1 = smallest/safest change)
```
If `score ≥ threshold` (default **0.80**, override with `SENTINEL_CONFIDENCE_THRESHOLD`),
the fix is **autonomous**; otherwise it **pauses for a human**. Every component ships
with a human-readable `reason`, so the decision is auditable, not a black box.

### `adapter.ts` — the `DomainAdapter` contract
This interface is **what every commander implements**. The engine calls these:

| Member | Purpose |
|---|---|
| `key`, `displayName`, `tagline` | identity |
| `submitTool`, `verifyTool`, `mutationTools` | tool-loop semantics (see below) |
| `systemPrompt()`, `framing(symptom)` | how to brief the agent |
| `openContext(incidentId)` | create per-incident working state (a sandbox, a cost model…) |
| `executeTool(ctx, name, args)` | run one tool call, return a `ToolResult` |
| `verificationPassed(result)` | did the verify step pass? |
| `blastRadius(ctx)` | normalized risk for the gate |
| `diff(ctx)` | human-readable change (for PRs / the widget) |
| `deploy(ctx)` | promote the verified change; return units changed |
| `awaitRecovery(ctx)` | confirm the system actually recovered |
| `report(incident, ctx)` | fan out PR/ticket/chat notifications |
| *(optional)* `probeHealth`, `buildSymptom`, `notifyEscalation` | sensors + alerts |

The three tool-semantics fields let the engine police the loop **generically**:
- `verifyTool` — calling it counts as one "iteration" and sets whether the fix is verified.
- `mutationTools` — calling any of these invalidates a prior verification (must re-verify).
- `submitTool` — ends the loop; **blocked unless the last verify passed**.

### `engine.ts` — the lifecycle driver
`class Engine` takes an adapter + options and runs `runIncident(symptom)`. The options
are the four **seams** that keep it framework-free and testable:

- **`planner`** — decides the next action (`{type:'tool', name, args}` or `{type:'submit', resolution}`). In production the *client model* is the planner; in the one-click Task and in tests, a deterministic function is.
- **`approvalGate(incident) → boolean`** — resolves a below-threshold pause (the HITL slot). In MCP this maps to native tool-approval; in tests it's a boolean.
- **`guard(incident) → {safe, reason, trustScore}`** — the **mandatory AEGIS check** run before *every* deploy. Unsafe → the incident escalates, even at high confidence.
- **`onEvent(event)`** — every step is emitted here (for the widget, logs, the trace).

### `coordinator.ts` — the organization
`class Coordinator` holds a registry of commanders and can `run(domain, symptom)`. Its
trick: it hands each delegating adapter a `delegate(toDomain, reason)` function. When a
commander calls it mid-run, the coordinator **runs that other commander to completion and
returns the result** — with cycle/depth guards and a recorded `orgTrace` (the
collaboration graph). Every sub-run is wired with the same AEGIS `guard`.

---

## 6. How one incident flows through the engine

Follow a SENTINEL self-heal, step by step (this is `engine.ts`'s `runIncident`):

```
1. Incident created (status DETECTED → DIAGNOSING). adapter.openContext() makes a fresh
   sandbox (a copy of the broken source).
2. LOOP (the planner drives):
     planner says "read_logs"      → adapter.executeTool → logs come back
     planner says "run_tests"      → status VERIFYING; tests FAIL (2/3) → not verified
     planner says "propose_patch"  → source patched (mutation → must re-verify)
     planner says "run_tests"      → tests PASS (3/3) → verified = true
     planner says "submit"         → allowed (verified). Loop ends with a resolution.
3. CONFIDENCE GATE: assess(verification, agentConfidence, iterations, blastRadius)
     → e.g. 0.93 ≥ 0.80 → autonomous.  (If below → AWAITING_APPROVAL → approvalGate.)
4. AEGIS GUARD: aegisGuard(incident) scans the fix. Safe → continue. Unsafe → ESCALATE.
5. DEPLOY: adapter.deploy() promotes the patched source live.
6. RECOVERY: adapter.awaitRecovery() re-runs the suite on the live version → green.
7. REPORT: adapter.report() emits mock PR / WeKan card / Slack post.
8. RESOLVED.  (Any failure along the way → ESCALATED, with an alert.)
```

Every arrow emits an event to `onEvent`, which is what the widget and the returned
`trace` are built from. **This exact lifecycle is identical for all five domains** — only
the adapter's tools and checks differ.

---

## 7. The commanders

Each lives in `sentinel/src/modules/<name>/`, implements one `DomainAdapter`, and exposes
MCP tools. They all reuse `core/` + `confidence.ts` + `aegisGuard`.

### SENTINEL · DevOps (`modules/sentinel/`) — the leader
- **The "system":** a bundled pricing function in `fixtures.ts` (source as a string) with a
  tax-before-discount regression and golden test cases. `runChecks()` compiles the
  (patched) source **in-process** and runs the cases — so nothing external is needed.
- **Adapter (`devops.adapter.ts`):** `read_logs`/`read_file`/`search_code`/`propose_patch`
  (string replace in the sandbox source)/`run_tests` (runChecks). `deploy` = promote the
  patched source; `awaitRecovery` = re-run checks; `report` = mock PR/WeKan/Slack.
- **Tools:** `self_heal` (one-click Task), `assess_confidence` (the gate as a tool),
  `sentinel_status`; plus the **client-driven** granular tools in `sentinel.live.ts`.

### LEDGER · FinOps (`modules/ledger/`)
- **The "system":** `cloud.ts` — a deterministic cloud account (over-provisioned node
  pools, idle volumes). `stage`/`simulate`/`apply` model rightsizing. `simulate` is the
  verify step: it must show savings **and no SLA-floor breach**.
- **Adapter:** `read_cost_report`/`list_resources`/`inspect_resource`/`stage_change`
  (mutation)/`simulate_savings` (verify). `deploy` applies the plan; `awaitRecovery`
  checks spend is back within baseline.
- **Tool:** `optimize_spend`. **Also delegation-capable** (see COMMAND).

### VERDICT · Legal (`modules/verdict/`)
- **The "system":** an inline sample contract with 3 risky clauses (data sharing,
  liability cap, auto-renewal), each with a safer rewrite + a real regulation citation.
- **Adapter:** `read_contract`/`flag_risky_clauses`/`apply_redline` (mutation)/
  `check_compliance` (verify = no risky clauses remain). `deploy` = generate the
  counter-offer; `diff` = the cited redlines.
- **Tool:** `redline_contract`.

### RELAY · Civic (`modules/relay/`)
- **The "system":** a scheme catalog + a citizen profile. `match_schemes`/
  `check_eligibility`/`prefill_form` (mutation)/`validate_application` (verify = complete
  + eligible). `deploy` = submit; `awaitRecovery` = status tracking.
- **Tool:** `apply_for_scheme`.

### AEGIS · Trust — see the next section (it's special).

### 7.6 MENTOR · Education (`modules/mentor/`) — the one that inverts the engine

The other five resolve an incident by **changing something**. MENTOR's entire product
thesis is that it must not (`MENTOR-CONCEPT.md` §2 — "the tool that refuses to hand you the
patch"). Running that on an engine whose only successful exit is `deploy()` needed the
lifecycle **re-read**, not rewritten:

| Engine concept | MENTOR's meaning |
|---|---|
| the "system" | two artifacts: `lumina.plan/v1` (intent) + `mentor.build/v1` (what happened) |
| the "fix" | the causal explanation — never a code change |
| `verifyTool` | `check_grounding` — is the claim supported by *both* artifacts? |
| `mutationTools` | `load_plan` / `load_build` — new inputs invalidate the grounding |
| `submitTool` | emit the explanation |
| `deploy(ctx)` | hand the timeline to the student. Touches nothing. |
| `awaitRecovery(ctx)` | assert the student's source is **byte-identical** |
| `blastRadius(ctx)` | **inverted** — confidence in the origin claim |

Two of those are load-bearing and worth reading twice.

**`awaitRecovery` is the refusal, enforced.** Elsewhere it asks "did the system come back
up?" Here nothing was deployed, so it asks the question that matters for this domain: *is
the student's code exactly as they left it?* If MENTOR ever modified the build, recovery
fails and the incident ESCALATES. The refusal is a runtime invariant with a test on it, not
a promise in a prompt. (There is also no tool on the adapter that *can* write — `executeTool`
has no such case to reach.)

**`blastRadius` is inverted.** For SENTINEL risk means "how much code changed". MENTOR
changes none — but it is about to point a student at a specific line, and §10 of the concept
doc is explicit that a confidently wrong line is worse than useless in education. So the
risk *is* the claim's uncertainty. Feeding drift confidence into this slot means an
ambiguous plan drives the gate **below** threshold and pauses for a human instead of
misleading a student. Same gate, same formula, opposite meaning.

**The algorithm (`drift.ts`).** Both artifacts are ordered, so drift is an ordering
comparison — but naively "find a mismatch" reports *two* components in the demo (tax moved
early, discount moved late) and leaves the student guessing. The asymmetry that resolves it:

> The origin is the earliest component, in **build** order, that was implemented before
> something the **plan** says should have come first.

`tax` jumped the queue; `discount` was merely displaced by it. And if the plan never drew a
path between the two, MENTOR **declines to claim drift at all** — otherwise it would be
pointing at a line because of where a box sits on a canvas.

**Confidence is computed, not asserted.** Five real properties of the two artifacts:
`dependency` (0.40 — did the plan order this pair directly, transitively, or never?),
`coverage` (0.20), `determinism` (0.15 — does the plan commit to an order at all?),
`provenance` (0.15 — was the history observed from git or hand-authored?), `failureLink`
(0.10). A cyclic plan caps the whole thing at 0.35. The demo's 0.91 falls out of those
terms — its history is authored rather than git-derived, which is the one genuine weakness
in the demo, surfaced by the product instead of buried in a footnote.

**Why deterministic planners?** Each adapter ships a rule-based planner (`devopsPlanner`,
`ledgerPlanner`, `mentorPlanner`, etc.) so the one-click Task and the tests are 100%
reproducible with no model. In the live client-driven flow, the *model* replaces the planner.
`mentorPlanner` notably never plans `request_fix` — that tool exists for a *client model* to
stumble into, so the refusal shows up as a visible tool call in the trace.

---

## 8. AEGIS — the trust layer that governs everyone

`modules/aegis/trust.ts` is a **framework-free, deterministic** guardrail:

- **`assessTrust(text)`** runs rule-based detectors and returns `{ trustScore, safe,
  issues, rewrite }`:
  - `dangerous_command` (critical) — `rm -rf /`, `DROP TABLE`, `curl | sh`, disabling auth…
  - `prompt_injection` (high) — "ignore previous instructions", "reveal your system prompt"…
  - `pii_leak` (medium) — card numbers, emails, IDs (redacted in the rewrite)
  - `overclaim` (low) — "100% guaranteed", "will never fail"…
  - **`safe` = score ≥ 0.6 AND no high/critical issue.** A `rewrite` (redacted/blocked
    text) is produced whenever anything was flagged.
- **`aegisGuard(incident)`** — the adapter-friendly wrapper the engine's `guard` seam
  uses. It scans `fixSummary + diagnosis + diff` and returns `{ safe, reason, trustScore }`.

**How it's wired in (this is the "governed" part):**
- **Every commander** passes `guard: aegisGuard` to its `Engine`, so AEGIS runs before
  that commander deploys — even when confidence is high. (See the `guard:` line in each
  `*.module.ts` / `sentinel.tools.ts`.)
- **The client-driven flow** (`session.ts`) runs `aegisGuard` inside `resolveIncident`.
- **The coordinator** passes `aegisGuard` as the shared guard for every sub-run.
- AEGIS also exposes its own tools (`verify_output`, `guard`) so a model can audit *any*
  text, and it's the "connective tissue" every other domain relies on.

In short: **no action deploys anywhere in the platform without passing AEGIS.**

---

## 9. COMMAND — the coordinator / the organization

`modules/command/command.module.ts` exposes three tools:

- **`platform_status`** — lists the five commanders + the trust layer.
- **`run_operation`** — runs each of the four heal-domains once, sequentially, and scores
  each with AEGIS. A simple "run the fleet" governed sweep.
- **`run_organization`** — the real thing. Uses `core/coordinator.ts` to run the fleet as
  a collaborating team:
  - LEDGER is the entry point. Its **org planner** (`ledgerOrgPlanner`) investigates the
    cloud bill, realizes the spike is caused by a **code regression**, and calls
    `request_assist('sentinel', …)`.
  - The coordinator **runs SENTINEL to completion** (a full self-heal, AEGIS-gated), then
    hands the result back to LEDGER, which **continues** and rightsizes.
  - VERDICT and RELAY then handle the downstream contract and citizen enrollment.
  - The response includes a **collaboration graph** (`orgTrace`) with `referral` and
    `return` edges — proof the agents actually called each other.

This is the "works like an organization" behavior: **one commander asks another for help,
waits (synchronization), and proceeds with the answer**, with cycle/depth guards so it
can't loop forever.

---

## 10. Two ways to drive a commander

Because "the model is the agent" (Idea 2), SENTINEL supports both:

1. **One-click Task** — `self_heal` runs the whole loop with a deterministic planner and
   returns the full trace. Reliable for a stage demo; works with no model reasoning.
2. **Client-driven** — the granular tools in `sentinel.live.ts` (`open_incident`,
   `read_source`, `run_tests`, `propose_patch`, `resolve_incident`, `approve_incident`)
   let **ChatGPT itself** drive the loop, one call at a time. Because MCP calls are
   independent, `session.ts` keeps per-incident state in a `Map` keyed by `incident_id`.
   `resolve_incident` runs the same gate → AEGIS → deploy-or-pause path; `approve_incident`
   is the HITL step.

Both paths share the exact same adapter, confidence gate, and AEGIS guard — they're just
two different "planners" over the same machine.

---

## 11. The glass-box widget

`src/widgets/app/mission-trace/page.tsx` is a React widget (NitroStack Widget SDK). It
reads a tool's output via `useWidgetSDK().getToolOutput()` and renders:
- the **status** badge (RESOLVED / ESCALATED / AWAITING_APPROVAL),
- the **confidence gate** breakdown (each component as a bar),
- the **live mission trace** (every step with an icon),
- the **diff** (colored +/- lines).

It's registered in `widget-manifest.json` and attached to tools with `@Widget('mission-trace')`
(on `self_heal`, `optimize_spend`, `resolve_incident`, `approve_incident`). When those
tools run in ChatGPT/Studio, this widget renders their result — the "explainability" that
makes the autonomy trustworthy to a judge.

---

## 12. How it all works together (the big picture)

```
                              ┌───────────────────────────┐
   ChatGPT / NitroStudio  ───▶│  MCP app (one deployable)  │
   (the "agent" / brain)      │        app.module.ts       │
                              └─────────────┬──────────────┘
                                            │ registers 6 modules
        ┌───────────────┬───────────────┬───┴───────────┬───────────────┬───────────────┐
        ▼               ▼               ▼               ▼               ▼               ▼
    SENTINEL         LEDGER          VERDICT          RELAY           AEGIS          COMMAND
   (DevOps)         (FinOps)         (Legal)          (Civic)        (Trust)      (coordinator)
        │               │               │               │               ▲               │
        └───────┬───────┴───────┬───────┴───────┬───────┘               │               │
                ▼               ▼               ▼                        │               │
          each builds a  DomainAdapter  and runs it through ────▶  core/engine.ts        │
                                                                   (one lifecycle)        │
                                                                        │  guard: aegisGuard
                                                                        └───────────────┐ │
                                                                                        ▼ ▼
                                                        every deploy is gated by ───▶ AEGIS
                                                                                        │
   COMMAND.run_organization ──▶ core/coordinator.ts ──▶ runs commanders, lets them ─────┘
                                                        delegate to each other (LEDGER→SENTINEL)
```

- **Vertical:** every commander → its adapter → the one engine → AEGIS gate → deploy.
- **Horizontal:** COMMAND + the coordinator let commanders call each other.
- **The model** (ChatGPT) sits on top, calling tools; the **widget** renders results back.

---

## 13. Running, testing, deploying

**The MCP app (`sentinel/`) — the deliverable:**

```bash
cd sentinel
npm install            # install deps (widget deps install on first build)
npm run dev            # run locally → open in NitroStudio (App Canvas / AI Chat)
npm run build          # production bundle → dist/ (compiles TS + bundles the widget)
npm test               # build, then run all offline tests (65/65)
```

From the monorepo root you can use the delegating scripts instead:
`npm run sentinel:dev`, `npm run sentinel:build`, `npm test`.

**The design canvas (`lumina/`) — Layer 3:**

```bash
cd lumina
npm install
python -m venv v && v\Scripts\pip install -r reqs.txt   # first time only
npm run full-dev       # Next.js (3000) + FastAPI (8000) + Electron together
```

> **Gotcha #4 (path-sensitive):** `srv.py` resolves `m/yolov8n.onnx`, `lumina.db`
> and `test_scene.jpg` **relative to the process working directory**. It must be
> launched from inside `lumina/`, never from the monorepo root. The root
> `npm run lumina:*` scripts handle the `cd` for you.

**The Python reference (`reference/python/`) — optional:**

```bash
cd reference/python
pip install -r requirements.txt
python -m sentinel                    # control plane + dashboard on :8100
scripts/run_demo.ps1                  # also starts the live Atlas service on :8000
```

- **Tests are offline** — no API key, no network, no model. They drive the engine with
  scripted planners and assert the lifecycle. `npm test` runs
  `node --test --test-force-exit "dist/**/*.test.js"`.
  > **Gotcha #3:** the `--test-force-exit` flag is required — importing `@nitrostack/core`
  > leaves an open handle so Node won't exit on its own; without the flag the test run hangs.
- **Deploy:** see **`DEPLOY.md`** — push to GitHub → NitroCloud connect repo → auto-deploy
  → connect `{serviceUrl}/sse` to ChatGPT. Do this early.

---

## 14. How to add a new commander (extend it)

Adding a 6th domain (say, Healthcare-triage) is one adapter + one module:

1. **`modules/<domain>/<domain>.adapter.ts`** — implement `DomainAdapter`: define
   `openContext` (your working state), `executeTool` (your tools), `verificationPassed`,
   `blastRadius`, `diff`, `deploy`, `awaitRecovery`, `report`, and the
   `submitTool`/`verifyTool`/`mutationTools` names. Add a deterministic planner.
2. **`modules/<domain>/<domain>.module.ts`** — a `@Module` with a one-click Tool that does
   `new Engine(new YourAdapter(), { planner, approvalGate, guard: aegisGuard, onEvent })`
   and returns the result. Optionally a `@Prompt`.
3. **Register it** in `src/app.module.ts` (`imports: [...]`).
4. **Add a test** (`<domain>.test.ts`) driving the engine with your planner.
5. (Optional) decorate the tool with `@Widget('mission-trace')` to reuse the glass box.

The engine, confidence gate, AEGIS, and widget are all inherited — you only write domain logic.

---

## 15. FAQ — the questions you're about to ask

**Q: Where is the AI/LLM? I don't see a model call.**
By design. In MCP the *connecting client* (ChatGPT / NitroStudio AI Chat) is the model.
Our server exposes tools; the model decides when to call them. For the one-click demos we
use deterministic planners so they're reproducible without a model.

**Q: Then how is it "autonomous"?**
Two ways: (1) the deterministic planner drives the loop automatically (rule-based
autonomy, like a self-healing runbook); (2) in the client-driven flow the model drives it.
Both hit the same confidence gate + AEGIS + deploy pipeline.

**Q: Is the "broken service" real?**
It's a real, self-contained code fixture (`fixtures.ts`) — actual source that gets patched
and actually tested in-process. It's bundled inside the app because NitroCloud can't run a
*separate* live service for us to patch. LEDGER/VERDICT/RELAY are self-contained the same way.

**Q: How is state kept between separate MCP tool calls (client-driven flow)?**
`session.ts` holds a `Map<incident_id, Session>` server-side. `open_incident` creates a
session and returns its id; later tools look it up by id. (Fine for a demo; single-process.)

**Q: Why is everything under `core/` free of NitroStack imports?**
So the engine is reusable across all five commanders and **testable offline**. The
NitroStack-specific glue lives only in the `*.module.ts` / `*.tools.ts` files.

**Q: How does AEGIS actually block something?**
`aegisGuard` runs before deploy. If the fix text contains e.g. `rm -rf /` (critical) or
scores below 0.6, `safe` is false → the engine escalates instead of deploying. Try it
directly with the `verify_output` tool.

**Q: What's the difference between `run_operation` and `run_organization`?**
`run_operation` runs the four domains once each, sequentially (a governed sweep).
`run_organization` runs them as a **collaborating team** where LEDGER pulls in SENTINEL
mid-task and waits — real delegation, with a collaboration graph.

**Q: Why one app with six modules instead of five separate apps?**
It's one deployable (one repo, one NitroCloud app) — the right hackathon scope — yet each
module is standalone and could be split into its own deploy later. The coordinator needs
them in one process to call each other cheaply.

**Q: How does the widget get its data?**
NitroStack pairs a tool with a widget via `@Widget('mission-trace')`. The tool's return
value is delivered to the widget through `useWidgetSDK().getToolOutput()`, which the React
component renders.

**Q: Why do the decorators have weird import names (`ToolDecorator as Tool`)?**
`@nitrostack/core` re-exports the decorators aliased; bare `Prompt`/`Resource` are types.
See Gotcha #1 in §3.

**Q: `npm test` hangs — why?**
Use the provided `npm test` script (it includes `--test-force-exit`). See Gotcha #3 in §13.

**Q: Where did this come from / is there a reference?**
Yes — the Python prototype now at `reference/python/` was the original IP. The TS app in
`sentinel/` is the compliant, deployable rebuild and the thing you work on.

**Q: What is `lumina/` doing in a repo about autonomous agents?**
It is **Layer 3** of the student-facing product (`MENTOR-CONCEPT.md` §3). The student draws
their architecture as a node/edge graph in Lumina *before* coding; that graph is the
machine-readable record of **intent** that MENTOR diffs the actual build against. Without
Lumina, MENTOR has nothing to compare to and degrades into "an AI explaining a stack
trace." It is the load-bearing piece of the differentiation, not a bolt-on.

**Q: Does the monorepo break the NitroCloud deploy?**
**No.** Studio's *Deploy* button bundles and uploads the **connected project folder**
(`sentinel/`), so the repo layout never enters into it — and a `.zip` upload works the same
way (limit 100 MB; `sentinel/` is 0.21 MB). Only *GitHub auto-deploy* cares about the repo
root, and that's a push-to-deploy convenience with a `git subtree` mirror already wired
(`npm run push:sentinel`). See `DEPLOY.md` for all three paths and `GAPS.md` Gap 1.

**Q: How does Studio actually start the app?**
`npx tsx src/index.ts`, from the project folder — **not** `npm run dev`. It auto-runs
`npm install` first if dependencies are missing. Which is why `tsx` is an explicit
`devDependency`: without it `npx` fetches `tsx` at every launch, and that fails on a flaky
network or a locked npm cache (it did here). Studio also validates a folder by looking for
`package.json` + `src/index.ts` + `@nitrostack/core` — so point it at **`sentinel/`**; the
monorepo root has only the first and is correctly rejected.

---

## 16. What's left and how to finish it

> **This section is now superseded by `GAPS.md`,** which is the maintained list. It
> is kept here because it is still correct about the *platform*; what changed is
> that the platform is no longer the submission. Read both, and read `GAPS.md` first.
>
> **What changed:** the five-commander platform below is complete. The idea then
> moved (`MENTOR-CONCEPT.md`) — the submission is now **MENTOR**, a sixth commander
> plus a student-facing four-layer loop, and MENTOR is **not written**. So "the code
> is complete" is true of the platform and false of the submission.

The **platform code is complete and verified** (65/65 tests, full build green, all flows
exercised end-to-end). What remained *for the platform* was mostly **interactive** work
that can't be done headless.

### 16.1 — Deploy to NitroCloud + connect ChatGPT ← the only true blocker
This needs the **organizer-provided NitroCloud account** and the **NitroStudio** desktop app.
Follow **`DEPLOY.md`** exactly:
1. `npm run build` locally (must be green).
2. `git push` the repo to GitHub.
3. NitroCloud → Create App → Connect Repository → enable auto-deploy → Deploy.
4. Copy the Service URL → connect `{serviceUrl}/sse` to ChatGPT (Developer mode).
5. Record the ≤3-minute demo (script is in DEPLOY.md §6) and submit via the organizer account.
Do this **early** — once it's live, every `git push` redeploys automatically.

### 16.2 — Confirm the six official tracks
The idea must align to one of the hackathon's six tracks. We mapped likely tracks
(SENTINEL→Developer Tools, LEDGER→Cloud, AEGIS→Security, VERDICT→Enterprise/Legal,
RELAY→Civic) but the **real six-track list hasn't been provided**. Get it, then tweak each
commander's `displayName`/framing and the README to name the exact track. If there's no
Legal or Civic track, swap VERDICT/RELAY for a domain that fits (the adapter pattern makes
this a small change — see §14).

### 16.3 — Optional polish (nice-to-have, not required)
- **Extend the client-driven flow to LEDGER/VERDICT/RELAY.** Right now only SENTINEL has
  the granular per-call tools (`session.ts` + `sentinel.live.ts`); the others have the
  one-click Task. Generalize the session store to any adapter to let ChatGPT drive them too.
- **Live connectors.** `report()` currently emits *mock* PR/WeKan/Slack records. Wire real
  ones (GitHub API, WeKan API, Slack webhook) behind env vars if you want live side-effects.
- **More AEGIS detectors** or a second-model cross-check for the trust score.
- **Per-widget polish** — a dedicated savings widget for LEDGER, a redline widget for VERDICT.

### 16.4 — Definition of done (for submission)
- [ ] Live on NitroCloud (auto-deploy from GitHub working)
- [ ] Connected to ChatGPT; `self_heal`, `optimize_spend`, `run_organization` demoed live
- [ ] README + this file + DEPLOY.md in the repo; no secrets committed
- [ ] ≤3-min demo video recorded
- [ ] Idea aligned to (and labeled with) one of the six official tracks
- [ ] Submitted via the organizer-provided account

---

*Questions this guide didn't answer? Start from the file in §4 that owns the behavior,
read its top-of-file comment (every file has one), and trace it back to `core/engine.ts` —
that's the spine everything hangs off.*
