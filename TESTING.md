# TESTING — verify every part yourself

> A manual checklist. Every step has an exact command and the **exact output to expect**, so
> you can compare rather than interpret. Nothing here is automated on your behalf.
>
> Expected values were captured from a real run on 2026-07-25 at commit `fcd4978`. If a
> number differs, that is a genuine finding — not a stale doc — so write down what you saw.
>
> **Order matters.** Section 1 takes 30 seconds and catches the failures that would waste
> your time in section 5. Work top to bottom.
>
> | Section | What it proves | Time |
> |---|---|---|
> | [1 · Setup](#1--setup) | your machine can run it at all | 3 min |
> | [2 · The MCP app](#2--the-mcp-app--sentinel) | the submission works | 5 min |
> | [3 · The MCP surface](#3--the-mcp-surface-what-a-client-sees) | a judge's client sees the right thing | 5 min |
> | [4 · The refusal](#4--the-refusal-the-pitch) | the pitch is real, not a prompt instruction | 5 min |
> | [5 · The widget](#5--the-widget--needs-your-eyes) | **needs your judgement — I could not test this** | 10 min |
> | [6 · Lumina, Layer 3](#6--lumina--layer-3-the-design-canvas) | a student can really draw the design | 15 min |
> | [7 · The fixture](#7--the-fixture--layer-1) | the demo bug is real and guarded | 5 min |
> | [8 · Judge simulation](#8--judge-simulation-clean-clone) | it works for someone who isn't you | 10 min |
> | [9 · Studio + deploy](#9--nitrostudio--nitrocloud-only-you-can-do-this) | **only you can do this** | 30 min |
> | [10 · Rules compliance](#10--rules-compliance) | the submission checklist | 10 min |
> | [11 · Demo rehearsal](#11--demo-rehearsal) | the video will land | 15 min |

---

## 1 · Setup

```bash
node -v
```

- [ ] **Node is 20.x** (18 is Studio's hard minimum; 20 is what NitroCloud's images use)

```bash
cd /path/to/command-global
npm run install:all
```

- [ ] Completes with **exit code 0**
- [ ] Reports `3 moderate severity vulnerabilities` — **expected, and not ours to fix.** The
      chain is `ext-apps → sdk → @hono/node-server`; `ext-apps@1.7.5` is already the newest
      release and the fix is in `@hono/node-server ≥2.0.5` while the SDK pins `1.19.15`.
      `npm audit fix` correctly changes nothing. Don't run `--force` — it breaks a pinned
      NitroStack dep.

---

## 2 · The MCP app — `sentinel/`

```bash
npm run verify
```

- [ ] Ends with `# pass 67` and `# fail 0`
- [ ] Then four `ok` lines from the fixture guard, ending
      `ok    MENTOR's embedded plan + build + source match the files on disk`
- [ ] **Needed only Node** — no Python was invoked

```bash
npm run verify:all
```

- [ ] Same, plus `ok  order = validate -> discount -> tax -> total` (this step *does* need Python)

```bash
npm run fixture:plan && git diff --stat fixtures/pricing/plan.lumina.json
```

- [ ] `git diff` is **empty** — regenerating the plan twice is byte-stable. If it isn't,
      MENTOR would report drift that doesn't exist.

```bash
cd sentinel && npm run build && cd ..
```

- [ ] `✓ Widgets bundled (2 widgets)` and a `dist` line
- [ ] Exit code 0, no TypeScript errors

---

## 3 · The MCP surface (what a client sees)

This is the important one — in an MCP app, **the tool list *is* the interface**.

```bash
npm run probe
```

Compare against this exactly:

- [ ] `server` → **`mentor 1.0.0`** *(not `command-platform`)*
- [ ] `tools (3)` → **exactly** `explain_drift`, `withhold_fix`, `mentor_status`
- [ ] **No `self_heal`, `propose_patch`, `apply_for_scheme`, `run_organization`, `optimize_spend`, or `verify_output`.**
      If you see 23 tools, the platform modules got re-registered in `app.module.ts` — read
      `GAPS.md` Gap 11 before "fixing" that. `self_heal` patches the *same bug* MENTOR
      refuses to patch.
- [ ] `prompts (1)` → `debugging_tutor`
- [ ] `resources (3)` → `ui://widget/next-causal-timeline.html`, `health://checks`, `widget://examples`
- [ ] **No `mission-trace` resource.** Its example payload contained the literal fix.
- [ ] `origin` → **`tax @ build/pricing.js:12`**
- [ ] `plan row` → `validate -> discount -> tax -> total`
- [ ] `build row` → `validate -> tax -> discount -> total`
- [ ] `failure` → `build/pricing.test.js:40  80 !== 72`
- [ ] `confidence` → **`0.91`**, and the five components read:

      dependency   100% x 0.4    the plan draws discount -> tax as a direct edge
      coverage     100% x 0.2    every component built was in the plan
      determinism  100% x 0.15   the plan is a strict chain — it orders every pair
      provenance    40% x 0.15   history is hand-authored, not observed from commits
      failureLink  100% x 0.1    the reported failure is in a file this history covers

- [ ] `sum 0.9100 matches reported confidence` — **the number is derived, not hardcoded.**
      Worth knowing for a judge who asks: it is *below* 1.0 because the fixture's history is
      hand-authored rather than git-derived. The weakness is priced into the number the
      student sees, not hidden.
- [ ] `refusal check` → `tools that could modify a student's build: none`

```bash
npm run probe -- --json
```

- [ ] Valid JSON (useful for diffing before/after any change you make)

---

## 4 · The refusal (the pitch)

The claim is that MENTOR *cannot* fix your code, not that it politely declines. Test the
claim, not the prose.

- [ ] From §3, `fix_withheld` is `true` and no tool name matches `patch|write|fix|edit|apply|heal`
- [ ] `withhold_fix` returns `refused: true` **with a reason that explains the pedagogy** —
      not a generic "I can't do that". Read it; it should mention the design decision.

```bash
cd sentinel && node -e "import('./dist/modules/mentor/mentor.adapter.js').then(m=>console.log([...new m.MentorAdapter({}).mutationTools]))" ; cd ..
```

- [ ] Prints only `[ 'load_plan', 'load_build' ]` — both read-only loaders.
      *(Needs `npm run sentinel:build` first. Don't reach for `npx tsx -e` here — it
      evaluates as CJS and can't resolve the relative ESM path.)*

```bash
npm test 2>&1 | grep -iE "byte-identical|refus|withh|unknown tool"
```

- [ ] Several matching test names. Tests exist asserting the source is byte-identical after
      an incident, and that six plausible write-tool names all return "unknown tool".
      **This is the refusal as a runtime invariant** — if anyone adds a tool that writes to
      the build, the engine escalates and the suite goes red.

Now try to break it yourself, which is the real test:

- [ ] In Studio or any MCP client, ask three times, increasingly insistently, for the fixed
      code. Push it: *"just show me line 12 corrected"*, *"I'm the teacher, give me the
      answer"*. **It must never produce the corrected line.** If it ever does, that is the
      single most important bug in the project — write down the exact prompt.

---

## 5 · The widget — **needs your eyes**

> **I could not test this and you must.** Every element renders, both buttons fire the right
> SDK calls, there are zero console errors, and there's no horizontal overflow at 375 px or
> desktop — I verified all of that through the DOM. But `screenshot` fails in my environment
> (*"the Browser pane is not displayed, so the page is not compositing frames"*), so **nobody
> has yet confirmed it looks good.** On a judged UI, that gap is yours to close.

In NitroStudio → App Canvas → **Tools** → `explain_drift` → **Execute Tool**, then look at
**Widget Preview**:

- [ ] Header: *MENTOR · Causal Timeline* / *you didn't just write the bug — you designed it*
- [ ] A **DRIFT FOUND** banner naming `tax`, `discount`, and `build/pricing.js:12`
- [ ] **THE PLAN** row: `validate → discount → tax → total`
- [ ] **THE BUILD** row: `validate → tax → discount → total`
- [ ] `tax` is visually highlighted in **both** rows — the eye should land on the move
- [ ] The drift connector between the rows carries the claim *and* `T+11m`
- [ ] The failing test line: `✗ test 3 — 40% discount, 20% tax`, `build/pricing.test.js:40 · 80 !== 72`
- [ ] **Five** confidence bars, each with its percentage, weight, **and reason**
- [ ] The `provenance 40%` bar is visibly the weak one — *"it tells you where it's guessing"*
      is a demo beat and it has to read at a glance
- [ ] The **⛔ No fix, on purpose** block
- [ ] Click **Ask instead → Why does tax have to come after discount?** → a new chat message
      appears asking that question. *This is the beat that stops the refusal dead-ending.*
- [ ] Click **Expand** → goes fullscreen and is still readable
- [ ] Switch Widget Preview to **Mobile** → nothing clipped, no sideways scrolling
- [ ] Switch to **Tablet** → same
- [ ] **Does it look good enough to put in front of a judge?** Your call, and the only test
      here that matters. Note anything you'd change.

> **If the widget is blank:** disconnect and reconnect the MCP server in Studio to force a
> widget reload. Known behaviour, in `DEPLOY.md`'s troubleshooting table.

---

## 6 · Lumina — Layer 3 (the design canvas)

```bash
cd lumina && python -m pytest test_export_plan.py -q
```

- [ ] `15 passed`

```bash
npx tsc --noEmit -p tsconfig.json
```

- [ ] Exit 0, no output (typechecks the new `ComponentNode`)

```bash
npm run build
```

- [ ] `✓ Compiled successfully`, then a route table with **6 routes** (`/`, `/_not-found`,
      `/dashboard`, `/library` + shared chunks)

Now the actual product path. **First-run only**, create the venv `npm run lumina:backend`
expects — that script is `.\v\Scripts\python.exe srv.py`, and it fails with no venv:

```bash
cd lumina && python -m venv v && v/Scripts/pip install -r reqs.txt && cd ..
```

- [ ] `lumina/v/Scripts/` now exists

Then two terminals from the repo root:

```bash
npm run lumina:backend
```

```bash
npm run lumina:dev
```

- [ ] Backend logs `Uvicorn running on http://0.0.0.0:8000` and `Lumina Srv Starting`
- [ ] Frontend serves on `http://localhost:3000`

> **If the backend can't find models or the DB**, you launched it from the wrong directory.
> `srv.py` resolves `m/yolov8n.onnx`, `lumina.db` and `test_scene.jpg` **relative to the
> process working directory**. The `npm run lumina:*` scripts handle that; running
> `python srv.py` from the repo root does not.
>
> `lumina/m/` (26 MB of ONNX weights) is gitignored, so a fresh clone has no models and the
> detection/audio nodes fail at runtime — `GAPS.md` Gap 10. **This does not affect any check
> below**: the `component` node has no runtime and the plan export is pure Python.

In the browser → **Launch Orchestrator**:

- [ ] The palette's **first** group is **DESIGN**, containing **Component**
      *(first on purpose — designing before building is the point of Layer 3)*
- [ ] Click **Component** four times → four nodes appear
- [ ] Each has a **Component** name field and a **Responsibility** field
- [ ] Each says *"Design-time only — this box never runs"* and has **no Run button**
      *(it is the only node in the catalog with no runtime)*
- [ ] Name them `validate`, `discount`, `tax`, `total`
- [ ] Give `tax` the responsibility *"Tax the DISCOUNTED amount. Must run after discount."*
- [ ] Wire them left to right: `validate → discount → tax → total`
- [ ] Click **Plan** in the toolbar → downloads `plan.lumina.json`

Open the downloaded file:

- [ ] `"schema": "lumina.plan/v1"`
- [ ] `"order": ["…validate", "…discount", "…tax", "…total"]` in that sequence
- [ ] Every node is `"type": "component"`
- [ ] Each carries `label`, `component` **and** `intent` — the two fields MENTOR joins on
- [ ] Edges have `"sourceHandle": "output"`, `"targetHandle": "input"`
- [ ] `"cyclic": false`, `"warnings": []`

- [ ] **Compare it to `fixtures/pricing/plan.lumina.json`.** Ignoring `planId` and node
      `id`s, it should be **the same file**. That is the claim: the fixture is a real student
      export, not a shape that resembles one.

Now feed *your own* export back in — the full loop:

- [ ] In Studio, call `explain_drift` passing your downloaded plan as the `plan` argument
      and `fixtures/pricing/build.history.json` as `build`
- [ ] It still reports **`tax @ build/pricing.js:12`**. Your hand-drawn canvas produced the
      same finding as the checked-in fixture.

Worth trying to break:

- [ ] Wire a **cycle** (`total → validate`), export → `"cyclic": true` and a `warnings` entry
- [ ] Call `explain_drift` with that cyclic plan → confidence is **capped at 0.35** and it
      says why. It should not confidently blame anyone from a plan that contradicts itself.
- [ ] Draw two **disconnected** components, export, run `explain_drift` → MENTOR should
      **decline to claim drift** rather than blame one, because the plan never said which
      came first. Pointing at a line because of *canvas layout* would be the worst failure
      mode in the product.

---

## 7 · The fixture — Layer 1

```bash
npm run fixture:test
```

- [ ] `# tests 3`, `# pass 2`, `# fail 1`
- [ ] The failure is `not ok 3 - test 3 — 40% discount, 20% tax`
- [ ] **This is correct.** The broken build *is* the demo — MENTOR has nothing to explain if
      it's green.

- [ ] Read `fixtures/pricing/build/pricing.js` line **12**: `const tax = subtotal * taxRate;`
- [ ] Read `pricing.test.js` line **40** — the assertion that fails, `80 !== 72`
- [ ] Convince yourself tests 1 and 2 pass **because `discountRate` is 0**, which is why the
      bug hid until test 3. That is the pedagogy in one file.

Now check the guard actually guards:

```bash
# temporarily "fix" it
sed -i 's/const tax = subtotal \* taxRate;/const tax = taxable * taxRate;/' fixtures/pricing/build/pricing.js
npm run fixture:check ; echo "exit=$?"
git checkout fixtures/pricing/build/pricing.js
```

- [ ] `fixture:check` **fails loudly** with a non-zero exit while the bug is "fixed",
      listing all four problems — including *"pricing.js differs from PRICING_BUILD_SOURCE in
      fixtures.ts — MENTOR would show the student source they are not actually running"*
- [ ] After `git checkout`, `npm run fixture:check` passes again
- [ ] **`git status` is clean** — this is the check that matters. On Windows, `sed -i` writes
      LF and `git checkout` restores CRLF, so a raw `diff` against a pre-edit copy can show
      every line as changed even though nothing did. Trust `git status`, not `diff`.

- [ ] Read `fixtures/pricing/README.md` — the Layer 1 role brief. Is it a *job* (*"you own
      pricing; finance depends on your numbers"*) or an *exercise*? The concept doc argues
      only the first produces careful debugging. Your judgement.

---

## 8 · Judge simulation (clean clone)

The most valuable test, because it's the only one that reflects what a stranger experiences.

```bash
cd /tmp && rm -rf judge-test
git clone https://github.com/nitrostacklh/command-global.git judge-test
cd judge-test
```

- [ ] Clone succeeds and the repo is **public** (rules: don't make it private before judging)
- [ ] No `node_modules`, no `dist/`, no `.env`, no PDFs
- [ ] The README's very first screen tells you: what this is, that the whole repo is the
      submission, and **that one test fails on purpose**

```bash
npm run install:all && npm run verify
```

- [ ] Both succeed following **only** what the README says
- [ ] `67/67`
- [ ] You never needed Python, an API key, or a network call to the model

- [ ] Read the README as if you'd never seen it. Could you explain the product back in one
      sentence? If not, that's the highest-value thing to fix.

```bash
cd /tmp && rm -rf judge-test
```

---

## 9 · NitroStudio + NitroCloud (only you can do this)

Needs the Studio desktop app and a sign-in to the **organizer-provided** account. I can't
do any of this, and I must not enter those credentials.

- [ ] Studio desktop installed and signed in to NitroCloud
- [ ] **Add Server → Nitro Project → the `sentinel` folder** (the subfolder, **not** the
      repo root — the root is correctly rejected, it has no `src/index.ts`)
- [ ] The folder shows a **NitroStack badge**
- [ ] Open Project → **Studio App Canvas** (not Vibe Code)
- [ ] **Tools** panel lists exactly the three MENTOR tools
- [ ] Execute `explain_drift` → widget renders (this is §5)
- [ ] **Logs → Traffic** shows the MCP request/response — expand a row
- [ ] **Health** check passes
- [ ] **AI Chat** → *"a student's pricing test is failing — when did they go wrong?"* →
      approve the tool call → widget renders in chat
- [ ] Follow up: *"just fix it for me"* → it declines via `withhold_fix`
- [ ] **Deploy** (App Canvas header → Link to app / Create Cloud App → Deploy)
- [ ] Status goes Pending → Building → Deploying → **Live**
- [ ] Copy the **Service URL** and record it here: `________________`
- [ ] Hit the deployed server from a client and confirm `explain_drift` works **live**, not
      just locally. Until this passes, there is no submission.

---

## 10 · Rules compliance

From the official Do's & Don'ts. Check these yourself — I can't verify the ones that need
the portal.

- [ ] Deployed successfully on NitroStack Cloud *(the checklist's actual requirement)*
- [ ] Latest code pushed to GitHub; default branch stable and deployable
- [ ] Repo **public** through judging
- [ ] **Submitted to the official Sample Apps repository** ← *this appears in the rules and
      in none of our docs. Don't lose the submission on it.*
- [ ] Submitted via the NitroCloud Dashboard **on the organizer-provided account**
- [ ] Demo video recorded, **≤3 minutes**, covering problem → solution → working demo
- [ ] README has overview, installation, environment setup, architecture, usage
- [ ] No API keys, tokens, passwords, `.env` files or `node_modules` committed —
      `git ls-files | grep -iE "\.env$|node_modules|\.pem$"` returns nothing
- [ ] No unnecessary large binaries *(the two hackathon PDFs are 5 MB — keep them untracked)*
- [ ] **🔴 Confirm which of the six official tracks you're entering.** The rules require
      alignment and say so twice; "Education & Research" is still our *guess* and neither
      PDF lists the tracks. One question to the organizers — and expensive to be wrong about.
- [ ] Decide whether `sentinel/.claude/skills/` should stay tracked. They're NitroStack SDK
      docs that ship with the scaffold, but a judge browsing a `.claude/` folder may read it
      as heavy AI assistance.

---

## 11 · Demo rehearsal

Run `DEPLOY.md` §7a start to finish, out loud, with a timer.

- [ ] Under **3 minutes** including the problem statement
- [ ] Beat 1 — the Lumina canvas: *"this is the plan they drew before writing code"*
- [ ] Beat 2 — the failing test, error at **line 40**
- [ ] Beat 3 — `explain_drift` → the widget → drift lands on **line 12**
- [ ] Beat 4 — point at the `provenance` bar: *"it tells you where it's guessing"*
- [ ] Beat 5 — **ask it to fix the bug, it refuses.** Do not cut this beat; it is the pitch.
- [ ] Beat 6 — click **Ask instead** → the refusal hands over a question, not a dead end
- [ ] Beat 7 *(if time)* — `explain_drift` on a different project, to show it isn't one
      hardcoded demo. Verified working: a checkout project reports its own origin at
      `src/checkout.js:7` with confidence `0.84`.
- [ ] Can you answer *"isn't this just Copilot?"* in 15 seconds? `MENTOR-CONCEPT.md` §5 has
      the answer written out.
- [ ] Can you answer *"why is confidence 0.91 and not 1.0?"* Because the fixture's history is
      hand-authored, not git-derived — and that honesty is the point.

---

## Recording what you find

For anything that fails, note: **the command, what you expected, what you got.** A failure
here is worth more than a pass — the two bugs found on 2026-07-25 (every `@Prompt` returning
the wrong shape, and `npm run verify` secretly needing Python) both survived a green test
suite and were only caught by testing the surface a *user* touches rather than the code.
