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

## 3. The four layers

The product is one learning loop with four stages. A student passes through all four on
every project.

### Layer 1 — Roles *(`[[CONFIRM: "role-based" or "project-based"?]]`)*

> **Assumption I've written to:** the student is assigned a *role* on a simulated team —
> backend engineer, data engineer, `[[ROLE 3]]` — and receives the project as a brief from
> that role's perspective, not as an exercise. If you meant plain project-based learning,
> cut this section and the "team" framing throughout.

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

> ⚠️ **But see `GAPS.md` Gap 2.** Lumina's 34 node types are all *vision/audio pipeline*
> primitives — camera, detection, whisper, pose. There is **no generic software-component
> node**, so a student cannot really draw `validate → discount → tax → total` today; the
> fixture uses `script` nodes as stand-ins. That is a ~2-hour fix, *or* a reason to move
> the demo project to an AI pipeline Lumina already expresses. It needs a decision.

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
  Layer 1          Layer 2            Layer 3           Layer 4
  ROLE      ──▶    LESSON      ──▶    LUMINA     ──▶    BUILD ──▶ IT BREAKS
  you own          learn the          design it,        MENTOR shows the drift
  pricing          concept in         stress-test it    between plan and build
                   panels             before coding              │
                                          ▲                      │
                                          └──────────────────────┘
                                     revise the design, not just the line
```

The loop's payoff: the student doesn't just fix the bug, they see that the bug was **a
design decision**, and they go back and change the design. That's the learning outcome, and
it's the thing the whole four-layer structure exists to produce.

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

**Education:** the four-layer loop, and specifically the refusal to give answers, which
directly addresses the anxiety every education judge has about AI in the classroom.

**Research:** two claims worth making here.

1. **The engine generalizes.** MENTOR is one `DomainAdapter` on an explainability engine
   that already runs four unrelated domains — DevOps, FinOps, Legal, Civic
   (`ARCHITECTURE.md` §7). One lifecycle, five skins. That's a systems result, not a demo.
2. **We measured it.** See §7. Almost no hackathon submission contains a real measurement.
   In a track called *Research*, that scarcity is worth more than another feature.

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
- [ ] MENTOR as the sixth commander — one `DomainAdapter`, one module (`ARCHITECTURE.md` §14)
      ⚠️ costs more than §14 implies: the engine has no successful path that skips
      `deploy()`, and not deploying is the point. `GAPS.md` Gap 3b, with two options.
- [x] **One** project, executed completely: the pricing / tax-discount fixture →
      `fixtures/pricing/`. Plan, build, history and failing test all present; the
      §3 line numbers (40 and 12) are now literally true of it.
- [ ] The causal timeline widget — plan row, build row, labelled drift arrow, confidence badge
      *(only `mission-trace` exists today — `GAPS.md` Gap 4)*
- [x] Lumina graph as the plan input — **integration cost was small**, and it's done:
      `lumina.plan/v1` + the **Plan** button. See §3 Layer 3.
- [ ] The refusal: MENTOR names the origin and declines to write the fix
- [ ] ≤3-min demo video *(script drafted — `DEPLOY.md` §6a)*

### Roadmap — say it on the last slide, don't build it
- Comic-styled panels for Layer 2 *(build only if the deploy is already green)*
- More than one project / a curriculum
- Roles beyond the first one
- Live connectors, per-domain widgets (`ARCHITECTURE.md` §16.3)

> **A note I'd keep in the doc:** the vision is four layers, and the demo is one project
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

- `[[Layer 1: role-based or project-based? This changes §3.]]` — *`fixtures/pricing/README.md`
  is written **role-based**, per §3's stated assumption. If that's wrong, that file changes.*
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
