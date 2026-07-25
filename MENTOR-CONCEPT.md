# [[PRODUCT NAME]] — Concept Document

> **Track:** Education & Research
> **Platform:** Built on COMMAND (MCP app on NitroStack). MENTOR is the sixth commander.
> **Status:** Concept locked. See §8 for what ships vs. what's roadmap.
>
> Placeholders are marked `[[LIKE THIS]]` — fill or delete.

---

## 1. The problem

Students learn by building projects. Projects break. And when they break, the student sees
the error — but never sees the *decision* that caused it.

The error message points at line 40. The mistake was on line 12, made forty minutes ago,
and it only surfaced because of a design choice made before any code was written. Finding
that chain by hand takes hours. Most students don't find it at all. They patch the symptom,
the tests go green, and they learn nothing except that the error went away.

The tools that could close this gap have the opposite incentive. Copilot's job is to make
the code work — it hands you the patch. The bug disappears and so does the lesson.

**We are building the tool that refuses to hand you the patch.**

---

## 2. The one-line pitch

> **You didn't just write the bug. You designed it.**

Longer form:

> Copilot finishes your code. This one makes you finish it — it shows you the exact moment
> your build stopped matching your plan, and then it stops.

Alternates, depending on which room you're in:

| Line | Best for |
|---|---|
| "Your code broke on line 40. It went wrong on line 12." | Non-technical judges — most concrete |
| "The opposite of autocomplete." | Positioning against the category |
| "Errors tell you where. We tell you when." | Slide titles |
| "Your bug, as a four-panel comic." | If the comic layer is built |

---

## 3. The layers

The product is one learning loop. A student passes through every stage on every project,
and each stage hands the next one a versioned JSON artifact — see §4 for the table of them.

### Layer 1 — Path, then role ✅ **RESOLVED and BUILT** (2026-07-25)

> ~~`[[CONFIRM: "role-based" or "project-based"?]]`~~ → **both, in that order.** The student
> first picks a **product type** (a web service, a vision system, a data pipeline), then a
> **role inside it**. Product type is what a student can actually have an opinion about
> before they know anything; role is what makes it a job instead of an exercise. Asking for
> the role first would be asking them to choose a career before choosing a project.

The student picks a product type, then a project from a **curated** list, then a role on that
project — and receives the project as a brief from that role's perspective, not as an
exercise. Two artifacts carry it, and both are built:

| | |
|---|---|
| `mentor.catalog/v1` | the menu: product type → project → roles. Every project must justify its place in one sentence (`why_exemplary` is required), because a list nobody can say anything specific about is a list of homework. |
| `mentor.brief/v1` | the assignment: `owns` (your slice), `given` (what another role hands you and you build *against*), acceptance criteria, and the concept. |

**`owns` vs `given` is the load-bearing distinction**, and it is what makes this more than
framing. A real engineer joining a real team does not build the system; they build a slice of
it against interfaces other people own. So the brief names both — plus, implicitly, the
components that are *neither*, which `open_brief` returns as `not_yours`.

Knowing what you are not building is half of knowing what you are. And because it is
machine-readable, `check_scope` can hold the student to it: draw the receipt when you own
pricing and it says so. Before this, role-scoping was a paragraph in a README that no code
could read — see `GAPS.md` Gap 12.

Why it matters pedagogically: a role gives the student *constraints and a stake*. "Build a
pricing service" is an exercise. "You own pricing; finance depends on your numbers being
right" is a job. The second one produces the emotional conditions under which people
actually debug carefully.

Each project ships with:
- A role and a one-paragraph brief
- `[[N]]` deliverables with acceptance criteria
- A hidden failure the student will hit (see Layer 4)

### Layer 2 — Interactive lessons ("the comic layer")

Reading documentation is slow and students skim it. The concept behind a project is
delivered instead as a **short interactive sequence** — panels, each one a single idea, with
the student clicking through and answering as they go.

Two important constraints:

- **Deterministic, not generated.** Panels are authored SVG + text, not image-model output.
  This keeps the whole app testable offline with no API key — which is the property the rest
  of the platform is built on (`ARCHITECTURE.md` §13). It also means nothing fails on stage.
- **Panels, not prose.** The same panel format is reused in Layer 4 to explain the student's
  own bug. One rendering component, two uses.

`[[DECIDE: how many panels per lesson? I'd suggest 4–6.]]`

### Layer 3 — Lumina: design before you code

Before writing a line, the student builds the **architecture** in Lumina: components as
nodes, data flow as edges. Then they **stress-test it** — walk the failure cases, find the
drawbacks in the design while a design is still cheap to change.

This layer is doing two jobs at once:

1. **Pedagogical.** Making students plan before coding is a goal in its own right. Most
   never do it because nothing ever forced them to.
2. **Technical, and this is the important one.** The Lumina graph is a machine-readable
   record of **what the student intended to build.** That artifact is what makes Layer 4
   possible, and it is the thing no other tool in this space has.

**ANSWERED (2026-07-25).** Lumina previously exported only *runnable* formats — n8n and
Node-RED JSON — and kept the raw graph in `localStorage`, never on disk. It now also
exports a **plan artifact**, `lumina.plan/v1`, built for this layer:

```json
{
  "schema": "lumina.plan/v1",
  "name":   "Pricing service",
  "nodes":  [{ "id", "type", "label", "position", "data" }],
  "edges":  [{ "id", "source", "target", "sourceHandle", "targetHandle" }],
  "order":  ["n-validate", "n-discount", "n-tax", "n-total"],
  "entry":  ["n-validate"], "terminal": ["n-total"],
  "cyclic": false, "warnings": []
}
```

`order` is the field that matters: a **topological sort** — the sequence the student
intended. Layer 4's whole claim ("you designed tax last, you built it second") is a
comparison against it, so it is part of the artifact rather than re-derived downstream.
Ties break on canvas position, so two exports of an unchanged canvas are byte-identical
and MENTOR cannot report drift that isn't there.

Plain JSON, no Lumina types — MENTOR (TypeScript) and Lumina (Python + React) agree on
this one file shape and nothing else. **Integration cost for §8: small.** Built and tested
(`lumina/export_plan.py`, 15 tests); the student produces one with the **Plan** button.

> ✅ **RESOLVED (2026-07-25) — `GAPS.md` Gap 2 is closed.** Lumina's 34 node types were all
> *vision/audio pipeline* primitives — camera, detection, whisper, pose — with no generic
> software-component node, so a student could not actually draw
> `validate → discount → tax → total`; the fixture used `script` nodes as stand-ins.
>
> Lumina now has a **`design`** palette category whose first member is a `component` node
> (`lumina/c/nodes/ComponentNode.tsx`): a named box with a responsibility, no runtime, and
> the two fields MENTOR joins on. Verified in a browser against the real backend — four of
> them wired left-to-right export to a `lumina.plan/v1` that is **byte-identical to the
> checked-in fixture.** The fixture is now a real student export rather than a shape that
> resembles one, and MENTOR's finding did not change (still `tax @ pricing.js:12`, still
> 0.91).

### Layer 4 — MENTOR: debugging as the lesson

The student codes. It breaks. MENTOR does *not* fix it. MENTOR produces a **causal
timeline**:

```
   THE PLAN (from Lumina)
   ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐
   │ validate │──▶│ discount │──▶│   tax    │──▶│  total   │
   └──────────┘   └──────────┘   └───▲──────┘   └──────────┘
                                     │
                        ⚠ DRIFT ── you designed tax as the last
                        │            step. You implemented it
                        │            before discount. (line 12)
                        │            confidence: 91%
                        ▼
   ┌──────────┐   ┌──────────┐   ┌──────────┐
   │ test 1 ✓ │   │ test 2 ✓ │   │ test 3 ✗ │  ← the error you saw (line 40)
   └──────────┘   └──────────┘   └──────────┘
     discount=0     discount=0     discount=15%
   THE BUILD (what actually happened)
```

Three things make this different from an AI explaining a stack trace:

- **It has a time axis.** Copilot sees a snapshot of your code. This reasons over the
  sequence of your decisions.
- **It has your intent.** The origin isn't "a wrong line." It's the point where the build
  diverged from the plan the student themselves drew.
- **It shows its uncertainty.** "91% sure the origin is here; I'm guessing about the
  discount branch." A student who learns to check where the AI is guessing has learned
  something durable.

And then it stops. The student writes the fix.

---

## 4. The loop

```
  Layer 1            Layer 2       Layer 3        Layer 4
  PATH + ROLE   ──▶  LESSON   ──▶  LUMINA   ──▶   BUILD ──▶ IT BREAKS ──▶ CARD
  pick what to       learn the     design your     checkpoints from        the concept,
  build, then        concept in    slice, before    YOUR design, then      earned once
  which slice        panels        any code        MENTOR names the        YOU fixed it
  you own                          │              decision that broke it       │
                                   ▲                       │                   │
                                   └───────────────────────┘                   │
                              revise the design, not just the line             │
                                   ▲                                           │
                                   └───────── next project ────────────────────┘
```

**Each arrow is a file.** That is the architecture, and it is why the loop is a loop rather
than four features that happen to sit in one repo:

| | artifact | produced by |
|---|---|---|
| ① → ② | `mentor.catalog/v1` | curated, in `fixtures/catalog.json` |
| ② → ③ | `mentor.brief/v1` | curated, one per project×role |
| ③ → ④ | `lumina.plan/v1` | **the student**, drawing it |
| ④ → ⑤ | `mentor.build/v1` | **the student**, working — `provenance: observed` |
| ⑤ → ⑥ | `mentor.card/v1` | MENTOR, gated on the student's real test output |

Rows 3 and 4 are the ones no comparable tool has, and they are the reason MENTOR can answer
*when did I go wrong* rather than *what is wrong with this code*.

The loop's payoff: the student doesn't just fix the bug, they see that the bug was **a
design decision**, and they go back and change the design. That's the learning outcome, and
it's the thing the whole structure exists to produce. The card is what carries it to the
next project — a fix stays with the file, a concept doesn't.

---

## 5. Why this survives comparison to Copilot

Say this before a judge says it to you.

| | Copilot | [[PRODUCT NAME]] |
|---|---|---|
| Sees | your code, now | your plan, your history, your code |
| Answers | "what's wrong with this?" | "when did I go wrong?" |
| Output | prose in a chat panel | a causal graph you can point at |
| Uncertainty | never stated | stated per-claim |
| Goal | make the code work | make you not need it next time |

**The real moat is not technical — it's incentive.** Microsoft cannot ship a product whose
stated purpose is to reduce how much you need it. That's commercially incoherent for them.
We can, because we're building for learning outcomes rather than engagement.

> The pitch is not "we do something nobody has done." It's **"we do something nobody is
> willing to do."**

### The 15-second answer to "isn't this Copilot?"

> Copilot answers "what's wrong with this code." We answer "when did I go wrong." Copilot
> has no time axis and no idea what you *intended* to build — we have the architecture the
> student drew before they started, so we can show them the exact point the build stopped
> matching the plan. And Copilot's incentive is to hand you the patch. Ours is to make sure
> you don't need us next time. It won't write the fix.

---

## 6. Track fit — Education & Research

**Education:** the loop, and specifically the refusal to give answers, which
directly addresses the anxiety every education judge has about AI in the classroom.

**Research:** three claims, in descending order of how well they are evidenced. Make them
in this order, and do not lead with the third.

1. **The loop generalizes across project kinds — demonstrated, one command.**
   `fixtures/safety-gear/` runs every stage against a vision project: **three** owned
   components instead of four, a boundary component the student draws but does not own, a
   different class of bug (acting on a condition that does not exist yet, rather than
   computing from a stale base), and a tracked rather than hand-authored history.
   `npm run walk` and `npm run probe` execute it in front of the judge.

   This is the generalization claim that matters here, because it is the one an education
   judge actually cares about: *does this work on more than one kind of student project?*
   Yes, and you can watch it.

2. **The artifacts are the contribution.** Five versioned plain-JSON schemas — a role-scoped
   brief with `owns`/`given`, a design-as-intent export, a checkpoint log that doubles as an
   observed build history — with no shared types and no RPC between the halves. That is a
   reusable interface for "compare what a student intended against what they did", and it is
   independent of our implementation of it.

3. **The engine also runs four unrelated domains** — DevOps, FinOps, Legal, Civic
   (`ARCHITECTURE.md` §7). One lifecycle, six skins.

   > ⚠️ **Be honest about the strength of claim 3, and consider not making it.** The
   > submission deploys **10 tools, all of them MENTOR's loop**. The other four adapters ship
   > unregistered, because one of them (`self_heal`) offers to autonomously patch the exact
   > bug MENTOR refuses to patch (`GAPS.md` Gap 11). So the evidence a judge can *see* is a
   > passing test suite and an adapter table on a slide — not a running system.
   >
   > A skeptical judge is trained to discount "we built more than we are showing you," and
   > they are right to: it is the same shape as an unfalsifiable feature claim. It also
   > invites a worse question — *"why build a FinOps platform for an education submission
   > instead of hardening the thing I can see?"*
   >
   > The truthful answer is that **COMMAND came first and MENTOR is a deliberate pivot away
   > from it** (see the repo history: the platform arrives at `1e4067a` as a consolidation of
   > earlier work, MENTOR at `b0531b6`). Killing four working commanders because one of them
   > contradicted the pitch is a judgment call worth more than the code was — so if the
   > subject comes up, **tell that story rather than defending the platform.** Claim 1 is
   > where the generalization argument should live.

4. **A measurement, if you run one.** §7 is a *plan*, and as of now it has **not been run** —
   `STUDY.md` is the ready-to-run instrument. Almost no hackathon submission contains a real
   measurement, so in a track called *Research* this is the cheapest large win available. But
   until the data exists, say "we designed a study and here is the protocol," never "we
   measured it."

   > **The confidence score is not this.** `0.91` / `0.97` is the tool's own stated certainty
   > about a drift claim — an honesty feature, and genuinely unusual. It is **not** evidence
   > that MENTOR helps a human debug better, and it must never be offered as though it were.
   > Those are different kinds of number and conflating them is the fastest way to lose a
   > research-minded judge.

`[[CONFIRM which official track name to print on the slide — "Education & Research".]]`

---

## 7. Evidence plan

Small, real, and reportable beats large and hypothetical.

- **n = `[[5]]`** classmates, split into two groups.
- Group A uses [[PRODUCT NAME]]. Group B uses Copilot.
- Both fix bug #1 with their tool. Then both fix **bug #2, of the same class, unaided.**
- **Measure:** time to locate the origin of bug #2, and whether they located it at all.
- Report the number even if n is tiny and even if the result is mixed. State the sample size
  plainly. An honest small result reads as research; a confident unsupported claim reads as
  marketing.

`[[RUN THIS. One number changes how the submission is read.]]`

---

## 8. Scope — what ships, what's roadmap

This document describes the full vision. The submission is a subset, deliberately.

### Blocker — do this before anything else
- [ ] **Deploy to NitroCloud, connect `{serviceUrl}/sse` to ChatGPT** (`DEPLOY.md`).
      Until this works there is no submission, regardless of how good the idea is.

### Ships for the hackathon
- [x] MENTOR as the sixth commander — **built**, `sentinel/src/modules/mentor/`, 33 tests.
      §14's "one adapter + one module" did cost more than advertised: the engine has no
      successful path that skips `deploy()`. Resolved by re-reading the lifecycle rather
      than bypassing it — `deploy()` delivers the explanation, and `awaitRecovery()` now
      asserts the student's source is byte-identical, which makes the refusal a runtime
      invariant. Full mapping in `ARCHITECTURE.md` §7.6.
- [x] **One** project, executed completely: the pricing / tax-discount fixture →
      `fixtures/pricing/`. Plan, build, history and failing test all present; the
      §3 line numbers (40 and 12) are now literally true of it.
- [x] The causal timeline widget — **built**. Plan row, build row, labelled drift arrow,
      five confidence bars each with its reason, and an *"Ask instead →"* button wired to
      `sendFollowUpMessage` so the refusal doesn't dead-end the student.
- [x] Lumina graph as the plan input — **integration cost was small**, and it's done:
      `lumina.plan/v1` + the **Plan** button. See §3 Layer 3.
- [x] **A student can actually draw the design** — Lumina's `design` → `component` node,
      verified in-browser end to end. The fixture's plan is now a byte-identical real
      export, not a stand-in. Closes `GAPS.md` Gap 2.
- [x] **Only MENTOR is exposed.** The tool surface went 23 → 3. The five platform
      commanders stay in the repo, tests green, unregistered — `GAPS.md` Gap 11 for why
      shipping `self_heal` next to `explain_drift` would have contradicted §2's pitch on
      stage. The server now identifies itself as `mentor`, not `command-platform`.
- [x] The refusal: **built and enforced.** `withhold_fix` and `request_fix` exist only to
      decline; no tool on the adapter can write to the build; and `awaitRecovery` fails the
      incident if the source ever changes. Tested by trying six plausible write-tool names.
- [ ] ≤3-min demo video *(script drafted — `DEPLOY.md` §7a; needs the deploy first)*

### Roadmap — say it on the last slide, don't build it
- Comic-styled panels for Layer 2 *(build only if the deploy is already green)*
- More than one project / a curriculum
- Roles beyond the first one
- Live connectors, per-domain widgets (`ARCHITECTURE.md` §16.3)

> **A note I'd keep in the doc:** the vision is the whole loop, and the demo is one project
> through all four. One project executed completely is a stronger submission than four
> layers half-built. Judges score what runs.

---

## 9. Naming

- **COMMAND / SENTINEL / AEGIS** — military-enterprise vocabulary. Correct for the platform,
  wrong for a student-facing education product.
- **MENTOR** — the sixth commander, keeps the all-caps convention, right connotation.
- `[[DECIDE: does the student-facing product need its own name separate from MENTOR?
  Candidates: ...]]`

---

## 10. Open questions

- ~~`[[Layer 1: role-based or project-based? This changes §3.]]`~~ → **answered: both, in
  that order** — product type, then a project, then a role on it. §3 Layer 1 is rewritten and
  the whole path is built: `mentor.catalog/v1` + `mentor.brief/v1`, with `owns` / `given` /
  `not_yours` and a `check_scope` tool that enforces the slice.
- ~~`[[Lumina export format — what does the graph look like on disk?]]`~~ → **answered in
  §3 Layer 3**: `lumina.plan/v1`, and it did not exist before — Lumina only wrote compiled
  n8n / Node-RED output. Now built and tested.
- `[[Can MENTOR trace causality on a multi-file project, or is the demo scoped to one file
  with a git history? Recommendation: one file. A tool that confidently points at the wrong
  line is worse than useless in education.]]` — *the fixture takes the recommendation: one
  file (`build/pricing.js`). Its history is **authored**, not derived from git — `GAPS.md`
  Gap 5 argues for shipping it that way and putting derivation on the roadmap.*
- `[[Who authors project #2, and when?]]` — *out of submission scope (§8 ships one project);
  answer it before promising a curriculum on the roadmap slide.*

**New question this reorganization raised:** how does a student's `plan.lumina.json` reach
MENTOR when MENTOR runs on NitroCloud and the file is on their laptop? Same constraint
`ARCHITECTURE.md` §15 already documents for the bundled broken service. It decides
`explain_drift`'s signature, so settle it before writing `mentor.module.ts` —
`GAPS.md` Gap 6 (recommendation: take the plan as a tool argument).

---

*Sources in the existing repo: `ARCHITECTURE.md` §7 (the commanders), §11 (the widget), §14
(adding a commander), §16 (what's left). `DEPLOY.md` for the blocker in §8.*
