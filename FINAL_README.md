# FINAL_README — MENTOR, explained in full

> **Reconciled with the three-way split on 2026-07-26.** MENTOR was written here as one
> deployable MCP app at `sentinel/`. It is now **three**, each deployed from its own mirror
> repo:
>
> | | Folder | Owns | Tools | Tests |
> |---|---|---|---|---|
> | **MCP-1** | `mcp-roster/` | catalog, role-scoped briefs, lessons, the checkpoint spec | 8 | **46** |
> | **MCP-2** | `sentinel/` | verification, drift, the build verdict | 6 | **72** |
> | **MCP-3** | `mcp-profile/` | the student record, and the flashcards | 9 | **59** |
> | | | | **23** | **177** |
>
> **177 tests, all green, every number watched printing on 2026-07-26.** Where a path below
> still says `sentinel/src/modules/learn/` or `…/registrar/`, the code moved: `learn/` became
> `mcp-roster/src/catalog/`, and `registrar/` became `mcp-profile/src/profile/`. Section 12
> carries the current map. Where this document and the code disagree, **the code and
> `GAPS.md` win.**
>
> One structural rule the split exists to enforce, and it is worth reading before anything
> else: **MCP-3 is the only process that ever holds a flashcard answer.** MCP-1 hands out the
> question, MCP-2's verdict carries only the concept *key*. A bug anywhere else — a tool
> echoing its input, a log line, a widget rendering a raw artifact — cannot leak what the
> student is meant to earn, because the string is not in that process.

> **One line:** *"You didn't just write the bug. You designed it."*
> MENTOR shows a student the exact moment their build stopped matching the plan they drew —
> then **refuses to write the fix**, so they learn the lesson instead of copying a patch.

This is the **complete, detailed** explanation of the project: the idea, the full technology
stack, and exactly how every piece works under the hood — down to the actual algorithm and the
math behind the confidence score. It assumes **you know nothing** to start, and takes you all
the way to "I could explain the internals to a judge." Jargon is defined the first time it
appears; there's a full [glossary](#15-glossary) at the end.

---

## Table of contents

1. [The 60-second version](#1-the-60-second-version)
2. [Background: MCP and NitroStack](#2-background-mcp-and-nitrostack)
3. [The problem — stated precisely](#3-the-problem--stated-precisely)
4. [The idea, in depth](#4-the-idea-in-depth)
5. [The learning loop — the 6 stages](#5-the-learning-loop--the-6-stages)
6. [The seven artifacts — the real contract](#6-the-seven-artifacts--the-real-contract)
7. [The technology stack — every layer, and why](#7-the-technology-stack--every-layer-and-why)
8. [Under the hood #1: the engine and the DomainAdapter](#8-under-the-hood-1-the-engine-and-the-domainadapter)
9. [Under the hood #2: the drift algorithm, traced on the real bug](#9-under-the-hood-2-the-drift-algorithm-traced-on-the-real-bug)
10. [Under the hood #3: the two confidence systems](#10-under-the-hood-3-the-two-confidence-systems)
11. [Under the hood #4: the flashcard gate](#11-under-the-hood-4-the-flashcard-gate)
12. [The 23 tools and the code map](#12-the-23-tools-and-the-code-map)
13. [The three demo projects](#13-the-three-demo-projects)
14. [Install, run, deploy](#14-install-run-deploy)
15. [Glossary](#15-glossary)

---

## 1. The 60-second version

Students learn by building projects. Projects break. When they break, the student sees an error
on **line 40** — but the *actual* mistake was a decision made on **line 12**, forty minutes
earlier, which itself came from a design choice made *before any code was written*. Finding that
chain by hand takes hours. Most students never do it. They patch the symptom, the tests go
green, and they learn nothing except "the error went away."

Tools like GitHub Copilot make this *worse*: their job is to make the code work, so they hand
over the patch. **The bug disappears and so does the lesson.**

**MENTOR is the tool that refuses to hand over the patch.** It:

1. Takes the **design** the student drew *before* coding — a graph of components and the order
   they intended to build them.
2. Takes the **history** of what they *actually* built, in order.
3. Runs one deterministic algorithm to find the single point where the build diverged from the
   plan — the **"drift"** — and reports it with a file, a line, and an **honestly computed**
   confidence score.
4. Explains *why* that decision caused a failure that surfaced somewhere else.
5. **Stops.** The student writes the fix.
6. Once the student's *real test output* shows green, MENTOR issues a **flashcard**: the reusable
   concept behind the bug. Before that, the answer literally isn't in the response.

It's an **MCP app** built on **NitroStack**, written in **TypeScript**, and it runs with **no AI
model, no API key, and no internet** — because its whole job is comparison, arithmetic, and a
refusal, none of which require generating text.

---

## 2. Background: MCP and NitroStack

Two concepts unlock everything else.

### MCP (Model Context Protocol)

MCP is a standard that lets an AI chat app (the **client**) call **tools** exposed by an external
program (the **server**).

- The **AI model** is the *brain* — good at language and deciding what to do next.
- An **MCP server** is a set of *hands* — it advertises named **tools** with typed inputs (e.g.
  `explain_drift`). The model decides *which* tool to call and *with what arguments*; the server
  runs the real logic and returns structured data.

**The single most important consequence, and the one MENTOR is designed around:** in MCP, the AI
model belongs to the **client**, not the server. The student's chat app brings the brain. So a
server doesn't need its own model to be useful — it needs well-designed tools. That is *why*
MENTOR needs no API key: its work is pure logic, and the "conversation" is handled by whatever
model the student is already using.

> **Analogy:** MCP is a USB port for AI. The chatbot is the laptop; MENTOR is a device you plug
> in. The laptop already has the intelligence; the device grants new abilities.

### NitroStack

**NitroStack** is the platform this hackathon runs on. It gives you three things:

- **A TypeScript SDK** (`@nitrostack/core`) for writing MCP servers with clean, decorator-based
  code. If you've used NestJS or Angular, the `@Tool`, `@Module`, `@Widget` style is familiar:
  you *annotate* classes and methods and the SDK wires them into a running MCP server.
- **NitroStack Studio** — a desktop app that is itself an MCP *client* with a built-in model
  picker, so you can talk to your server in plain English while developing.
- **NitroStack Cloud** — where you deploy the server so anyone can connect.

The hackathon rule is strict: the project **must** be built with the official NitroStack
TypeScript SDK and **must** deploy to NitroStack Cloud. MENTOR's deployable half (`sentinel/`)
is built entirely on that SDK and nothing else.

---

## 3. The problem — stated precisely

> When a student's project breaks, the error message points at the **symptom**, never the
> **cause** — and the cause is usually a decision made much earlier, often at *design* time,
> before a single line was written.

There are actually **two** distinct failures hiding in "my project broke," and MENTOR is one of
the very few tools that separates them:

1. **Wrong *set* of components** — you built someone else's job, or forgot part of your own.
   This is a *scope* mistake, and it's the more expensive one in a real team because nobody
   notices until integration.
2. **Right components, wrong *order*** — you built *your* pieces in a sequence that contradicts
   your own design, and the consequence surfaces far from the cause.

Existing AI tools address neither, because they have the **opposite incentive**:

> Copilot's job is to make the code work — so it hands you the patch. The bug disappears and so
> does the lesson.

And this is the strategic core of the whole product:

> A large company **cannot** ship a product whose stated purpose is to make you need it *less*.
> That's commercially incoherent for them. MENTOR can, because it's built for **learning
> outcomes**, not engagement.
>
> The pitch isn't "we do something nobody has done." It's **"we do something nobody is willing to
> do."**

That is the moat — not a clever algorithm someone could copy in a weekend, but a deliberately
*less* helpful short-term product that makes the student *more* capable long-term.

---

## 4. The idea, in depth

MENTOR answers a question no snapshot-based tool can: **"When did I go wrong?"** — not "what's
wrong with this code?" It can do that because it holds three things Copilot never has:

| | Copilot sees | MENTOR sees |
|---|---|---|
| **A time axis** | your code as a snapshot, right now | the *sequence* of your decisions, in order |
| **Your intent** | only the code | the architecture you **drew before you started** |
| **Its own uncertainty** | never stated | "91% sure the origin is here; guessing about the discount branch" |

Combine them and MENTOR produces a **causal timeline**: two rows — what you *planned* vs what you
*built* — with a labelled arrow at the one component that moved out of order, the line it
happened on, and a confidence bar per claim. Then it **refuses to write the fix**. That refusal
is not a missing feature; it is *the* feature, and (see §8) it's enforced as a runtime invariant,
not just promised in a prompt.

### Why "no model" is a feature, not a limitation

MENTOR's own work is exactly three things:

1. **Compare** the planned order against the built order (a graph + ordering computation).
2. **Compute** a weighted confidence score from real properties of the two inputs.
3. **Decline** to write the fix.

None of that is text generation. So MENTOR runs **offline, deterministically, at zero
per-student cost**, and its test suite passes on a fresh clone with the network switched off. The
*talking* — turning MENTOR's structured output into a friendly explanation — is done by the
model the student's client already provides. This is the property the entire architecture is
built to protect.

---

## 5. The learning loop — the 6 stages

MENTOR is not a single tool; it's a **loop** a student walks on every project. Each arrow hands
the next stage a small JSON file (see §6).

```
①  PICK A PATH & ROLE   →  ②  LEARN THE CONCEPT  →  ③  DESIGN IT (in Lumina)
        │                                                      │
        │                                                      ▼
   ⑥  FLASHCARD        ←   ⑤  IT BREAKS (drift)   ←   ④  BUILD IT (checkpoints)
   (earned once YOU                                    (from YOUR own design)
    fix it yourself)
```

**① Pick a path, then a role.** The student picks a *product type* (web service, vision
system…), then a *project*, then a **role** on it. This turns an exercise ("build a pricing
service") into a job ("**you own** pricing; finance depends on your numbers"). The role's brief
names three sets: `owns` (your slice), `given` (built by another role — you build *against* it),
and `not_yours` (explicitly not your concern). *Knowing what you're not building is half of
knowing what you are.*

**② Learn the concept.** Delivered as short interactive panels, not documentation. *(The one
stage still on the roadmap — see §14.)*

**③ Design it before you code.** In **Lumina** (the visual canvas), the student drags
**component** nodes and wires them in the order they intend to build, then hits **Plan**, which
exports `lumina.plan/v1`. Its key field is `order` — the intended sequence, topologically sorted.
This is the artifact no other tool has: a machine-readable record of *what the student meant to
do*.

**④ Build against checkpoints.** COACH first runs `check_scope` to confirm the design covers the
student's slice (catching failure #1 from §3), then turns the plan into ordered checkpoints and
records progress. That progress log *is* the build history (`mentor.build/v1`).

**⑤ It breaks — MENTOR names the drift.** `explain_drift` runs the algorithm in §9, renders the
causal timeline, and `withhold_fix` declines to write code (catching failure #2).

**⑥ Flashcard.** Once the student's real test output is green, `flashcard` issues the transferable
concept. Until then, the answer field is *absent from the response entirely* (see §11).

---

## 6. The seven artifacts — the real contract

**The architecture is: "every arrow is a file."** No database, no shared code between the
services, no RPC beyond passing these documents. Every stage hands the next a plain JSON file
with a version in its name. That decoupling is why the Python/React canvas and three separately
deployed TypeScript servers can be rebuilt independently and agree on exactly one thing.

It is also what made the three-way split *possible* rather than merely tidy: the artifacts
already carried everything the next stage needed, so cutting the monolith along those seams cost
no new plumbing. `mentor.checkpoints/v1` is deliberately **self-sufficient** — MCP-2 is a
different deployment and cannot call back to ask what the brief said.

| Handoff | Artifact | Produced by |
|---|---|---|
| ① → ② | `mentor.catalog/v1` | curated menu (`fixtures/catalog.json`) · MCP-1 |
| ② → ③ | `mentor.brief/v1` | the role's assignment (`owns` / `given` / `not_yours`) · MCP-1 |
| ② → ③ | `mentor.lesson/v1` | the four teaching panels · MCP-1 (the reveal withheld server-side) |
| ③ → ④ | `lumina.plan/v1` | **the student**, drawing it in Lumina |
| ④ → ⑤ | `mentor.checkpoints/v1` | MCP-1, derived from the student's *own* plan order |
| ⑤ → ⑥ | `mentor.verdict/v1` | MCP-2 — drift, stuck, and whether the gates passed |
| ⑥ | `mentor.profile/v1` · `mentor.card/v1` | MCP-3, gated on real test output **and** the verdict |

> `mentor.build/v1` still exists and is still what `explain_drift` compares against; it is now
> assembled from the checkpoint log rather than being a separate hand-authored hand-off.

### `lumina.plan/v1` — "what I intended"

The parser (`sentinel/src/modules/mentor/plan.ts`) is **strict about the envelope, forgiving about
content**: a half-drawn canvas still yields a usable plan (damage listed in `warnings`), because
refusing to run is worse than running with stated uncertainty — but a wrong `schema`, missing
`nodes`, or an `order` that doesn't cover every node **throws**, because silently treating junk as
a plan would make MENTOR point at a line for no reason.

```json
{
  "schema": "lumina.plan/v1",
  "name":   "Pricing service",
  "nodes":  [{ "id": "n-tax", "type": "component", "label": "tax",
               "position": { "x": 400, "y": 0 }, "data": { "intent": "…" } }],
  "edges":  [{ "id": "e1", "source": "n-discount", "target": "n-tax" }],
  "order":  ["n-validate", "n-discount", "n-tax", "n-total"],
  "entry":  ["n-validate"], "terminal": ["n-total"],
  "cyclic": false, "warnings": []
}
```

- **`order`** is the whole point: the topologically-sorted sequence the student intended. Ties
  break on canvas position, so two exports of an unchanged canvas are **byte-identical** and
  MENTOR can't report drift that isn't there.
- **`edges`** encode *stated dependencies*. This is what lets MENTOR tell a real violated
  dependency (`discount → tax` drawn as an edge) from a coincidence of layout (two boxes that
  happen to sit left-to-right but were never connected). See `dependencyPath` in §9.
- **`cyclic: true`** means the plan states no single sequence, and confidence is capped hard (§10).

### `mentor.build/v1` — "what I actually did"

An ordered list of steps, each with a `component`, a `kind` (`implement` / `verify` / …), a
`file`, a `line`, and a `summary`, plus a `failure` (`{ file, line, message }`) and a
**`provenance`**: `git` (derived from real commits — trusted most), `observed` (recorded live by
the checkpoint tracker — trusted next), or `authored` (hand-written — discounted). Provenance
feeds the confidence score directly (§10), which is how the demo *volunteers* its own weakest
point instead of hiding it.

### `mentor.card/v1` — "the concept I earned"

A **union type** with two branches: an *earned* card that has a `back` (the answer), and an
*unearned* card that has **no `back` field at all** — the absence is the security mechanism (§11).

---

## 7. The technology stack — every layer, and why

The project is **two independently-built halves** that meet at one JSON file.

```
┌─────────────────────────────┐        lumina.plan/v1        ┌────────────────────────────────┐
│  lumina/  (the design canvas)│ ───────────(a file)────────▶ │  sentinel/  (the MCP server)   │
│  Next.js + React + Electron  │                              │  TypeScript + NitroStack SDK   │
│  + Python backend            │ ◀──── mentor.build/v1 ────── │  runs OFFLINE, no model, no key│
└─────────────────────────────┘                              └────────────────────────────────┘
   run locally by the student                                  the ONLY thing deployed to cloud
```

### Half A — `sentinel/` — the deployable MCP server (the submission)

This is the only part that goes to NitroStack Cloud. It is pure TypeScript on the NitroStack SDK.

| Layer | Technology | Why it's here |
|---|---|---|
| **Language** | **TypeScript 5.3**, ESM (`"type": "module"`) | Hackathon mandates the NitroStack **TypeScript** SDK. ESM because the SDK and modern Node are ESM-first. |
| **MCP framework** | **`@nitrostack/core` ^1.0.14** | The required SDK. Provides the `@McpApp`, `@Module`, `@Tool`, `@Prompt`, `@Widget` decorators and `McpApplicationFactory` that turn annotated classes into a running MCP server. |
| **CLI / build / deploy** | **`@nitrostack/cli` ^1.0.15** (`nitrostack-cli dev / build / start`) | Compiles, runs a local dev server, and packs for Cloud. `npm run pack` produces the deploy zip. |
| **Input validation** | **Zod ^3.22** | Every tool's `inputSchema` is a Zod schema. It validates and *describes* arguments at the MCP boundary (e.g. `explain_drift` accepts a plan as a JSON string *or* an object, both optional). Validating at the boundary is a project rule. |
| **MCP app-extension** | **`@modelcontextprotocol/ext-apps`** | Supports the interactive widget surface (the causal-timeline UI the tool renders in the client). |
| **Tests** | **Node's built-in test runner** (`node --test`), 177 tests across the three apps | No Jest, no Vitest — zero extra runtime deps, runs offline. Tests run against the *compiled* `dist/**/*.test.js`. |
| **Config** | **dotenv** | Only for the *optional* wider repo; MENTOR itself needs no env vars. |
| **The widget** | **React / Next.js** (in `sentinel/src/widgets/`) | The `causal-timeline` page: plan row, build row, the labelled drift arrow, five confidence bars each with its reason, and an *"Ask instead →"* button wired to `sendFollowUpMessage` so the refusal doesn't dead-end. |

**Key property:** the server's runtime dependency list is essentially just `@nitrostack/core`,
`zod`, `dotenv`, and the MCP ext-apps package. No AI SDK. No network client. That minimalism is
what makes "runs offline with no API key" *true* rather than aspirational.

### Half B — `lumina/` — the design canvas (run locally, optional)

Lumina is where stage ③ happens. It is **not** deployed; the student runs it locally to *produce*
a `lumina.plan/v1` file. MENTOR falls back to a bundled plan when none is supplied (the cloud
server can't see a student's laptop).

| Layer | Technology | Why it's here |
|---|---|---|
| **UI framework** | **Next.js 14 + React 18** | The canvas app shell and rendering. |
| **Node graph editor** | **ReactFlow 11** | The drag-and-wire canvas itself — components as nodes, data flow as edges. The `design → component` node (`c/nodes/ComponentNode.tsx`) is the box a student draws. |
| **State** | **Zustand 4** | Lightweight client state for the canvas, telemetry, history, node outputs. |
| **Styling** | **TailwindCSS 3** | Utility styling for the canvas UI. |
| **Desktop shell** | **Electron 30** | Packages the canvas as a desktop app (`npm run full-dev` runs Next + backend + Electron together via `concurrently` + `wait-on`). |
| **Backend** | **Python** (`srv.py`) + **ONNX / YOLOv8** weights | Lumina began as a vision/audio pipeline builder; the Python backend runs detection/audio nodes. **Path-sensitive:** it resolves `m/yolov8n.onnx`, `lumina.db`, `test_scene.jpg` relative to the working directory, so it must launch from inside `lumina/`. The 26 MB of ONNX weights are gitignored. |
| **Plan export** | **`export_plan.py`** | The **Plan** button's logic: reads the canvas graph, topologically sorts it, and writes `lumina.plan/v1`. 15 tests. |
| **E2E** | **Playwright** | Browser tests that verified a real four-node design exports to a plan **byte-identical** to the checked-in fixture. |

**Why two stacks?** Because the artifact contract (§6) lets them stay completely decoupled. The
TypeScript half and the Python/React half share **zero** code — only the *shape* of one JSON file.
That's a deliberate architectural choice, and it's also why MENTOR can be demoed standalone.

### `reference/python/` — the frozen prototype

The original Python implementation (control plane + dashboard + a live pricing service with a
bug-injection mechanism). Kept because two parts are still live assets: a genuinely running
service and a working human-approval UI. The confidence engine and lifecycle in `sentinel/core/`
were **ported from this** (the comments say so), which is why the behavior is described as
"unchanged from the verified Python reference."

---

## 8. Under the hood #1: the engine and the DomainAdapter

All of MENTOR's logic runs on one small internal engine (`sentinel/src/core/engine.ts`) built
around a pattern called a **DomainAdapter**. Understanding this is the difference between "nice
demo" and "I understand the architecture."

### The lifecycle

The engine runs a fixed state machine for any "incident":

```
DETECTED → DIAGNOSING → VERIFYING ──(self-heal loop until verified)
         → AWAITING_APPROVAL  (only if confidence < threshold)
         → DEPLOYING → REPORTING → RESOLVED
                                 → ESCALATED   (rejected / failed / gave up)
```

The engine is **framework-free and never calls an LLM itself.** It stays generic through two
"seams":

- **`planner`** — decides the next action (call a tool, or submit the final resolution). In a real
  MCP session this is backed by the client's model; in tests it's a scripted array. *The engine
  never generates anything — it just asks the planner "what next?" and runs it.*
- **`approvalGate`** — resolves a below-threshold pause. In MCP this maps to native tool-approval
  (a human in the loop); in tests it's a boolean.

There's also a **mandatory guard** (`AEGIS`) that runs before *every* deploy, so an unsafe action
is blocked even if the confidence gate would have auto-approved it.

Crucially, the engine **won't let a resolution be submitted unless the verify tool has passed
since the last change** (`state.lastVerified`). Try to submit early and the engine blocks it and
tells the planner to verify first. This is what makes the pipeline honest regardless of what the
model tries to do.

### Everything domain-specific lives behind the adapter

A `DomainAdapter` declares a handful of things: a `verifyTool`, a `submitTool`, a set of
`mutationTools`, and methods like `executeTool`, `blastRadius`, `diff`, `deploy`, `awaitRecovery`,
and `report`. Swap the adapter and the same engine runs DevOps, FinOps, Legal, Civic — or
Education.

### How MENTOR *inverts* the engine

The other five commanders resolve an incident by **changing something** (patching source,
rightsizing a cluster, rewriting a clause). MENTOR's thesis is that it must **not**. Running a
"don't change anything" product on a "fix it" engine takes re-reading each concept, not rewriting
the engine:

| Engine concept | MENTOR's meaning |
|---|---|
| the "fix" | the **causal explanation**, not a code change |
| `verifyTool` = `check_grounding` | is the drift claim supported by **both** artifacts? (not "do the tests pass" — MENTOR never runs them) |
| `mutationTools` = `load_plan` / `load_build` | new inputs invalidate the grounding |
| `deploy()` | hand the explanation to the student — **touches no code** |
| `awaitRecovery()` | assert the student's source is **byte-for-byte identical** to when the incident opened |
| `blastRadius` | **inverted** — normally "how much changed"; here "how *uncertain* is the claim" |

Two of those are worth reading twice:

- **`awaitRecovery` is the refusal, enforced.** In every other commander it asks "did the system
  recover?" Here it asks "is the student's code *exactly* as they left it?" If MENTOR ever modified
  the build, this check fails and the incident **escalates** instead of quietly shipping a fix. The
  refusal is a runtime invariant, and there is deliberately **no tool anywhere on the adapter that
  can write to the build** — the refusal is structural, not a promise in a prompt.
- **`blastRadius` is inverted.** For a fix-it commander, risk = how much code changed. MENTOR
  changes none — but it's about to point a student at a line, and a *confidently wrong* line is
  worse than no answer in education. So the risk *is* the claim's uncertainty: a shaky claim drives
  the gate below threshold and pauses for a human instead of misleading a student.

> **Historical note.** The repo began as **COMMAND**, an "enterprise OS" of five commanders
> (DevOps/SENTINEL, FinOps/LEDGER, Legal/VERDICT, Civic/RELAY, Trust/AEGIS) on this one engine.
> MENTOR was a deliberate **pivot**. The other five are still in the code, still tested, but
> **deliberately not registered** — because one of them (`self_heal`) would offer to auto-fix the
> exact `tax-before-discount` bug MENTOR refuses to fix, contradicting the pitch live. Keeping
> them off and saying why is the honest trade. `app.module.ts` registers only ROSTER + COACH +
> MENTOR.

---

## 9. Under the hood #2: the drift algorithm, traced on the real bug

This is MENTOR's one real algorithm (`sentinel/src/modules/mentor/drift.ts`). It is **pure and
deterministic** — no clock, no randomness, no model — so the same two artifacts always yield the
same report.

### The hard part: which component is the origin?

In the pricing demo the plan is `validate → discount → tax → total`, but the build order was
`validate → tax → discount → total`. **Two** components are in the wrong place, so "find a
mismatch" isn't enough — it would report both and leave the student guessing.

The asymmetry that resolves it: **one component jumped the queue; the other was merely displaced
by it.** `tax` was built before `discount`, which the plan says must precede it. `discount` broke
no stated dependency — it just ended up later. So:

> **The origin is the earliest component, in *build* order, that was implemented before something
> the *plan* says should have come first.**

### The algorithm, step by step

1. **Join** the two artifacts on a *normalized* component name (so "Tax" and "tax" match).
2. Compute `shared` (in both), `unbuilt` (planned, never built), `unplanned` (built, never
   planned) — the latter two become **caveats**.
3. Build position lookups restricted to `shared`: `plannedIndex` and `actualIndex`.
4. **The violation scan** — for each component in *build* order, check every other shared
   component: did the plan put `other` first (`otherPlanned < myPlanned`) while the build put
   `me` first (`otherActual > myActual`)? If so, `me` jumped the queue.
5. **Guard against layout coincidence:** before recording it, call `dependencyPath(plan, other,
   me)`. If the plan never actually connected them (`'none'`), it's *not* drift — it's just two
   boxes' screen positions — so it's demoted to a caveat, not a violation. Only `'direct'` (an
   explicit edge) or `'transitive'` (a longer path) count.
6. The **first** violation in build order is the `origin`.

### Traced on the pricing bug

- `shared = [validate, discount, tax, total]`; `plannedIndex = {validate:0, discount:1, tax:2,
  total:3}`; build order gives `actualIndex = {validate:0, tax:1, discount:2, total:3}`.
- Scan in build order: `validate` (fine) → **`tax`**: planned index 2, actual index 1. Compare
  `discount`: planned 1 < 2 **and** actual 2 > 1 → tax jumped ahead of discount. `dependencyPath(
  plan, discount, tax)` = **`direct`** (the canvas has a `discount → tax` edge). **Violation
  recorded, scan stops.**
- **Origin = `tax`**, `shouldFollow = discount`, `file = pricing.js`, `line = 12`.
- The sentence MENTOR leads with: *"You designed tax to come after discount. You implemented it
  before (pricing.js:12)."*

That's the entire "intelligence." No model — just a graph, two orderings, and one carefully
chosen rule for which mismatch is the cause.

---

## 10. Under the hood #3: the two confidence systems

There are **two different** confidence numbers in this codebase and a research-minded judge will
respect you for not conflating them.

### (a) The drift-claim confidence — "how sure am I this is the origin?"

Computed in `drift.ts` from **five real properties** of the two artifacts (weights sum to 1):

| Signal | Weight | What it measures |
|---|---|---|
| `dependency` | **0.40** | Did the plan *explicitly* order the violated pair? `direct` edge = 1.0, `transitive` = 0.6. The strongest signal. |
| `coverage` | **0.20** | Fraction of built components that were actually in the plan. |
| `determinism` | **0.15** | Does the plan commit to an order at all? A strict chain (orders every pair) = 1.0; four disconnected boxes = 0.0. |
| `provenance` | **0.15** | `git` = 1.0, `observed` = 0.8, `authored` = 0.4. |
| `failureLink` | **0.10** | Does the reported failure sit in a file this history has steps for? |

A **cyclic plan caps the whole score at 0.35** — no combination of other signals should let an
ordering claim out the door when the plan states no order.

**The demo's 0.91 is not hardcoded — it's this sum:**

```
dependency  1.0 × 0.40 = 0.40   (direct discount → tax edge)
coverage    1.0 × 0.20 = 0.20   (all four built components were planned)
determinism 1.0 × 0.15 = 0.15   (strict chain — every pair ordered)
provenance  0.4 × 0.15 = 0.06   (history is hand-AUTHORED — discounted)
failureLink 1.0 × 0.10 = 0.10   (failure is in pricing.test.js, which has steps)
                         ─────
                          0.91
```

And the **safety-gear** demo scores **0.97** for one reason: its history is `observed`, not
`authored`, so provenance goes `0.4 → 0.8`, adding `(0.8−0.4) × 0.15 = 0.06` → `0.91 → 0.97`. The
number rose because *the evidence genuinely improved*, not because anything was tuned. That is the
project's honesty made literal: the demo **surfaces its own weakest link** (a hand-authored
history) in the score instead of hiding it in a footnote.

### (b) The engine's autonomy gate — "is this safe to act on without a human?"

A *separate* score in `confidence.ts` that decides whether the engine deploys autonomously or
pauses for approval (default threshold **0.8**, overridable via env var). Weights: `verification`
0.4, `agent` 0.25, `iterations` 0.2, `blastRadius` 0.15. For MENTOR, `blastRadius` is fed the
*inverted* value (claim uncertainty), so an ambiguous plan drops the gate below threshold and
pauses instead of misleading a student.

> **Do not confuse these with "MENTOR helps students learn."** Both are the *tool's* certainty
> about its own claim — an honesty feature. Neither is evidence that MENTOR improves human
> debugging; that would require the n=5 study (§14). The docs are scrupulous about this
> distinction, and you should be too in front of a judge.

---

## 11. Under the hood #4: the flashcard gate

The flashcard (`mcp-profile/src/cards/card.ts`) is *the sharpest place the product could
betray itself.* A card whose back reads *"compute tax on the discounted subtotal"* **is the fix**
wearing a lesson's clothes — and if it shipped, the client model would just call `flashcard`
instead of `withhold_fix` and read the answer out. Two **structural** defenses:

1. **The back is gated on the student's tests being green.** You earn the card by having already
   fixed it yourself, so before that there's nothing to shortcut *to*.
2. **When unearned, `back` is absent from the payload — not present with a flag.** This is the
   subtle, important part. `{ earned: false, back: "…" }` leaks on the first client that renders
   the whole object. *The only reliable way to keep a string from a language model is to not send
   it.* So the return type is a **TypeScript union**: the earned branch has `back`; the unearned
   branch has **no such field at all**.

And the gate reads **evidence, not trust.** `flashcard` takes the *verbatim output of the
student's test command* and `readTestOutcome` parses it — recognizing `node:test`, `pytest`,
`jest/vitest`, and `go test`. **Unrecognized output is treated as *not* passing.** That asymmetry
is deliberate: wrongly withholding a card annoys a student; wrongly issuing one hands over the
exact reasoning the product exists to withhold. Those costs aren't comparable, so ties don't go to
the student. (Why not a simple `tests_green: boolean` argument? Because that puts the gate *inside
the client's model* — and a model being pressed by a student for the answer is the worst possible
place to keep it.)

---

## 12. The 23 tools and the code map

A client connected to all three services sees **23 tools — 8 + 6 + 9**. They are not one bag of
verbs: each service tells one stage of one story, and in MCP the tool list *is* the interface, so
a model reading MCP-1's eight can tell it is at the *start* of something. That legibility is why
the split is three deployments rather than one server with twenty-three tools.

### MCP-1 · `mcp-roster` — pick your seat, learn the concept, get the spec (stages ①–③) · 8 tools
| Tool | Does |
|---|---|
| `sign_in` | Open or resume the student's record — calls MCP-3, and says so when MCP-3 is absent. Not authentication. |
| `list_roles` | The role menu, with `playable` / `demoable` on **every row** rather than in a footnote. |
| `projects_for_role` | The projects that actually have a job of that shape. Playable ones first. |
| `open_brief` | The assignment: what you **own**, what you're **given**, what's **not yours**. |
| `open_lesson` | **Layer 2.** Four authored panels, rendered by the `lesson-panels` widget. The reveal is withheld until the student commits — the later panels are *absent* from the first response. |
| `roster_status` | "What am I / what do I need" orientation. |
| `check_scope` | Confirm the design you drew covers your slice (catches *scope* drift). |
| `checkpoint_spec` | Turn your own plan into `mentor.checkpoints/v1` — the spec MCP-2 verifies against. |

Prompts: `pick_a_role`, `review_my_design`.

### MCP-2 · `sentinel` — verification, drift and the refusal (stages ④–⑤) · 6 tools
| Tool | Does |
|---|---|
| `open_session` | Takes MCP-1's spec and the design it came from, and starts watching. |
| `build_event` | Records what the student did, as it happens. Never blocks out-of-order work — that divergence is the lesson. |
| `build_verdict` | Every gate marked from what was witnessed, plus the drift — `mentor.verdict/v1`, the document MCP-3 files. |
| `explain_drift` | **The headline.** Runs §9, renders the `causal-timeline` widget with confidence. Args optional → falls back to the bundled demo. |
| `withhold_fix` | Explains *why* it won't write the fix — a visible tool call, not just prose. |
| `mentor_status` | Orientation for the verification stage. |

Prompt: `debugging_tutor`. The four other platform commanders (`ledger`, `verdict`, `relay`,
`aegis`) are still in this package, still tested, and deliberately **unregistered** — `GAPS.md`
Gap 11 for why shipping `self_heal` beside `explain_drift` would contradict the pitch on stage.

### MCP-3 · `mcp-profile` — the record, and the reward (stages ④, ⑥) · 9 tools
| Tool | Does |
|---|---|
| `open_profile` | Create or resume the student record. |
| `read_profile` | The whole `mentor.profile/v1` — mastery, drift ledger, cards. |
| `note_role_choice` | Records the seat they took. Idempotent — re-reading a brief is not a career change. |
| `record_verdict` | Folds one of MCP-2's verdicts in: checkpoints, drift ledger, difficulty, and a card. |
| `class_progress` | Instructor-only. The identity check is compiled in; there is deliberately no `query` tool. |
| `profile_status` | Reports which storage backend it got, and whether it is durable. Never assumes. |
| `flashcard` | **Issues the earned concept**, gated on real test output *and* MCP-2's verdict (§11). |
| `review_flashcard` | Grades a recall and reschedules it. |
| `due_cards` | What to review this sitting. |

Prompts: `quiz_me`, `pick_up_where_i_left_off`.

> **The one invariant that shapes all three lists.** MCP-3 is the only process that ever holds a
> flashcard answer. `open_brief` hands out the *question*; `checkpoint_spec` and the verdict carry
> only the concept *key*. `parseBrief` **throws** if a brief arrives carrying an answer, and
> `scripts/embed_fixtures.mjs` fails the build if one survives into MCP-1. This is not filing —
> it is why a bug in MCP-1 or MCP-2 cannot leak what the student is meant to earn.

### Code map

```
command-global/                 ⭐ the monorepo — the only repo with history anyone authors
│                                  (each app is also mirrored to its own repo, one-way, for
│                                   NitroCloud, whose Connect Repository has no Root Directory)
│
├── mcp-roster/                 MCP-1 — 8 tools, 46 tests
│   └── src/
│       ├── catalog/
│       │   ├── catalog.ts        mentor.catalog/v1 — roles → projects → seats
│       │   ├── brief.ts          mentor.brief/v1 + checkScope (refuses a concept answer)
│       │   ├── lesson.ts         mentor.lesson/v1 — the four panel kinds
│       │   ├── spec.ts           mentor.checkpoints/v1, derived from the student's own plan
│       │   └── fixtures.*.ts     GENERATED by scripts/embed_fixtures.mjs — answers stripped
│       ├── roster.module.ts      sign_in, list_roles, projects_for_role, open_brief,
│       │                         open_lesson (+@Widget), roster_status
│       ├── gates.module.ts       check_scope, checkpoint_spec
│       ├── widgets/              the lesson-panels UI (React, bundled by esbuild)
│       └── shared/               copied from /shared by `npm run sync:shared`
│
├── sentinel/                   MCP-2 — 6 tools, 72 tests
│   └── src/
│       ├── core/                 the engine — engine.ts (§8), adapter.ts, confidence.ts (§10b)
│       ├── modules/verify/       open_session, build_event, build_verdict
│       │   ├── session.ts          the one thing a snapshot cannot hold: attempts over time
│       │   ├── verify.ts           marking each gate from what was actually witnessed
│       │   └── verdict.ts          mentor.verdict/v1, and the `given` reconciliation
│       ├── modules/mentor/       explain_drift, withhold_fix, mentor_status
│       │   ├── drift.ts            the drift algorithm (§9)
│       │   └── build.ts            the artifact parser (§6)
│       ├── modules/aegis/        built, tested, UNREGISTERED
│       └── widgets/              the causal-timeline UI
│
├── mcp-profile/                MCP-3 — 9 tools, 59 tests
│   └── src/
│       ├── profile/
│       │   ├── profile.ts        applyVerdict, mastery, the SM-2 review schedule
│       │   └── store.ts          ProfileStore — memory by default, node:sqlite if available
│       ├── cards/card.ts         the flashcard gate (§11) — readTestOutcome + issueCard
│       ├── concepts/             ⚠️ the ONLY place an answer exists. GENERATED.
│       ├── profile.module.ts     open_profile, read_profile, note_role_choice,
│       │                         record_verdict, class_progress, profile_status
│       └── cards.module.ts       flashcard, review_flashcard, due_cards
│
├── shared/                     copied into all three by `npm run sync:shared`
│   ├── contracts.ts              every artifact schema + parser
│   ├── identity.ts               resolveIdentity, canReadOthers, peerToken
│   └── plan.ts                   lumina.plan/v1
│
├── lumina/                     the design canvas — Next.js + ReactFlow + Electron + Python
│   ├── c/nodes/ComponentNode.tsx   the "component" box a student draws
│   └── export_plan.py              the Plan button → lumina.plan/v1
│
├── fixtures/                   ⭐ authored here, embedded into the apps by a generator
│   ├── catalog.json              the curated menu (mentor.catalog/v1)
│   ├── pricing/                  web service — the only seat with runnable broken source
│   ├── safety-gear/              vision system — proves generalization
│   └── event-ingest/             data pipeline
│
├── scripts/                    embed_fixtures.mjs, push-mirrors.mjs, check_docs.mjs, probe/walk
└── reference/python/           the frozen prototype the engine was ported from
```

---

## 13. The three demo projects

Three projects and five seats ship on purpose — one to prove the loop *runs*, and the others to
prove it isn't secretly hardcoded to the first. Three of the five seats are **demoable**: a plan
is bundled, so they run end to end with nothing uploaded.

### `fixtures/pricing/` — web service, backend role
Should compute `validate → discount → tax → total`; the build applies **tax before discount**, so
the price is wrong. Real, deliberate failing test: `pricing.test.js:40` expects `80`, gets `72`.
Origin: `pricing.js:12`, confidence **0.91** (§10).

> 🟢 **One test fails on purpose.** The broken build *is* the demo — MENTOR has nothing to explain
> if it's green. `npm run fixture:check` asserts the failure is still exactly where it should be
> and **fails loudly if someone "fixes" it.** The project's *own* suite is separate and passing:
> **177 across the three apps.**
>
> This is also the only seat with runnable broken source on disk (`fixtures/pricing/build/`),
> which is why the §1 line numbers — broke on 40, went wrong on 12 — are *literally* true here
> and illustrative elsewhere.

### `fixtures/safety-gear/` — vision system, CV role
The same loop, different shape: **three** owned components (not four), a boundary component the
student draws but does **not** own, a different *class* of bug (acting on a condition that doesn't
exist yet, vs. computing from a stale value), and an **`observed`** history instead of `authored`
— which is why it scores **0.97** (§10).

### `fixtures/event-ingest/` — data pipeline, data role
A third shape again: `deduplicate → normalise → persist`, with `receive` as the boundary the
platform owns. The concept is *deduplicate before you transform* — normalising first changes what
"the same event" means, so two genuinely different events collapse into one. Like the other two,
it stays invisible until one specific input shows up.

### The other two seats
`pricing/frontend` (producer contract before consumer) and `safety-gear/platform` (record before
you notify) have briefs, lessons and concepts, but no bundled plan — the student draws their own
first. `catalogCoverage()` reports `playableSeats: 5, demoableSeats: 3` rather than rounding up.

---

## 14. Install, run, deploy

### Prerequisites
- **Node.js 20.x LTS** (18+ works), **npm**, **Git**.
- **Python 3.10+** *only* for the `lumina/` canvas. The submission (`sentinel/`) needs no Python.

### The one command that proves the repo is healthy
```bash
git clone <this-repo>
cd "AGENTIC AI"
npm run install:all      # deps for all three apps + lumina/
npm run verify           # all 177 tests, then the guards and the journey
```
`npm run verify` runs every app's suite (46 · 72 · 59 = **177**), the shared-contract guard, the
fixture guard, the twelve-turn student journey across all three servers over real MCP, and the
doc check. It needs **only Node** — no Python, no network, no key.

### Run the server and talk to it
```bash
npm run sentinel:build   # compile TypeScript (nitrostack-cli build)
npm run sentinel:dev     # then point NitroStack Studio at the sentinel/ folder
```
> ⚠️ Point Studio at the **`sentinel/` subfolder**, not the repo root — it validates by
> `package.json` + `src/index.ts` + `@nitrostack/core`. (This repo also ships a project-scoped
> `.mcp.json`, so a client that reads it connects MENTOR automatically after a build.)

Then say: *"A student's pricing test is failing — when did they go wrong?"* → `explain_drift`
renders the timeline. Ask for the fix → `withhold_fix` declines.

### Command cheat sheet
| Command | Does |
|---|---|
| `npm test` | Run **sentinel's 47** (offline). Root `npm test` does not reach the other two apps — `GAPS.md` Gap 18. |
| `npm run verify` | Build + tests + fixture guard + doc check. |
| `npm run walk` | Assert the 9 turns a student takes over real MCP; non-zero on regression. |
| `npm run probe` | Print that journey for reading. |
| `npm run fixture:check` | Assert the demo bug is still broken exactly where it should be. |
| `npm run fixture:test` | Raw runner output: 2 pass, 1 fail (correct). |
| `npm run pack` | Produce `mentor-deploy.zip` for Cloud. |
| `npm run lumina:full` | Run the canvas (Next + FastAPI + Electron) — needs Python. |

### Deploy (the single most important remaining action)
The code works; it just needs to be **live on NitroStack Cloud** — Studio's Deploy button bundles
the connected `sentinel/` folder, so the monorepo layout is irrelevant. See `DEPLOY.md` (~30 min),
then record the ≤3-minute demo video (script in `DEPLOY.md`).

### On `npm audit`
It reports 3 moderate advisories that are **not ours to fix** — they come from the MCP SDK's own
pinned dependency chain (`ext-apps` → `sdk` → `@hono/node-server`), and `npm audit fix` correctly
changes nothing. MENTOR serves no static user-supplied paths, so the advisory doesn't apply.

### State of things
| | |
|---|---|
| All 23 tools, all 7 artifacts, three demos | ✅ built + tested |
| Causal-timeline widget · lesson-panels widget · refusal (enforced) · flashcard gate | ✅ built |
| 177 tests (46 · 72 · 59), offline, no key, no model | ✅ |
| Deployed to NitroStack Cloud | ✅ all three live and wired (`DEPLOY.md` §5b–c) |
| ≤3-min demo video | ⬜ (script ready) |
| n=5 evidence study (Research points) | ⬜ protocol ready in `STUDY.md`, not yet run |
| Layer 2 interactive lesson panels | ✅ `lesson-panels` widget |
| Product name — **MENTOR**, resolved 2026-07-26 (`GAPS.md` Gap 8) | ✅ |

> **Honesty policy:** nothing here claims a measured learning result until the study is run. The
> `0.91` / `0.97` scores are the tool's certainty about a *drift claim*, not proof it helps humans
> debug better. Different kinds of number — never conflate them.

---

## 15. Glossary

| Term | Plain meaning |
|---|---|
| **MCP** | Model Context Protocol — a standard letting an AI client call an external server's **tools**. The model comes from the client. |
| **MCP server / client** | Server = provides tools (`sentinel/`). Client = the app with the AI model (Studio, Claude, ChatGPT). |
| **NitroStack** | The hackathon platform: TypeScript SDK + Studio (dev client) + Cloud (hosting). |
| **`@nitrostack/core`** | The SDK. Provides the `@Tool` / `@Module` / `@Widget` decorators that build the MCP server. |
| **Zod** | A TypeScript library for validating & describing tool inputs at the boundary. |
| **Tool** | A named, typed function the AI can call (`explain_drift`). |
| **Widget** | A small UI a tool renders in the client (the `causal-timeline`). |
| **Artifact** | A versioned plain-JSON file carrying data between stages (`lumina.plan/v1`). |
| **Drift** | The gap between what the student *planned* and what they *built*. Two kinds: wrong *set* (`check_scope`) and wrong *order* (`explain_drift`). |
| **DomainAdapter** | The engine pattern. Swapping the adapter runs a different domain. MENTOR is the adapter that *inverts* "fix it" into "explain it and refuse." |
| **Incident lifecycle** | `DETECTED → DIAGNOSING → VERIFYING → (AWAITING_APPROVAL) → DEPLOYING → REPORTING → RESOLVED / ESCALATED`. |
| **Planner** | The seam that decides the engine's next action (client model in MCP; scripted in tests). The engine never calls an LLM. |
| **`dependencyPath`** | Graph check: is there a `direct` / `transitive` / `none` path between two plan nodes? Separates real violated dependencies from layout coincidence. |
| **Determinism (of a plan)** | Fraction of component pairs the plan actually orders. Strict chain = 1.0; disconnected boxes = 0.0. |
| **Provenance** | Where a build history came from: `git` (1.0) > `observed` (0.8) > `authored` (0.4) — feeds the drift confidence. |
| **Drift confidence** | The tool's certainty about *its origin claim* (0.91 for the demo). An honesty feature — *not* proof it helps students. |
| **Autonomy gate** | The engine's *separate* score deciding auto-deploy vs. human approval (threshold 0.8). |
| **`awaitRecovery`** | For MENTOR, the enforced refusal: asserts the student's source is byte-identical; else escalates. |
| **Flashcard gate** | `back` is *absent* (not hidden) until real test output is green — the union-type mechanism in `card.ts`. |
| **Lumina** | The visual design canvas (stage ③) — ReactFlow + Next + Electron + Python — that exports the plan. |
| **Commander** | One domain on the shared engine (DevOps/FinOps/Legal/Civic/Education). Only Education — **MENTOR** — is registered. |
| **Fixture** | A worked demo project (`pricing`, `safety-gear`). |

---

*Deeper reading, in order: `MENTOR-CONCEPT.md` (the "why"), `ARCHITECTURE.md` (the full "how"),
`GAPS.md` (the honest "what's left"). This FINAL_README is the front door; those are the rooms.*
