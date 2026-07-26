# Use it as a student

> `TESTING.md` checks the parts. This checks **the experience** — you are the student, you
> type in plain English, and a real model decides which tools to call.
>
> That distinction matters more than it sounds. In an MCP app **the tool list is the
> interface**: a model reads 23 descriptions across three servers and picks. `npm run walk`
> calls them in the right order by construction, so it can never tell you whether a model
> *would*. This is the only way to find that out.
>
> Budget 30 minutes.

---

## Setup — 1 minute

Open **this folder** in Claude Code. `.mcp.json` connects all three services automatically,
to the **live deployment**, so the server-to-server bridges are real. No API key, no account.

Confirm all three are up before you blame the model for anything:

```
/mcp
```

You should see **`mentor-roster`**, **`mentor`** and **`mentor-profile`**, all connected. If
you only see one, restart Claude Code so it re-reads `.mcp.json`.

> **Why three.** MENTOR is three separately deployed applications and the split is the
> security boundary, not filing: **MCP-3 is the only process that ever holds a flashcard
> answer.** MCP-1 hands out the *question*, MCP-2's verdict carries only the concept *key*. A
> bug in either cannot leak what you are supposed to earn, because the string is not in those
> processes. Connecting all three is also what closes the loop — MCP-1 hands the checkpoint
> spec to MCP-2, and MCP-2 files its verdict with MCP-3, which is what releases the card.

Then, so that anything you hit by hand afterwards is a *model* problem rather than a server
problem:

```bash
npm run verify        # 177 tests, then the twelve-turn journey over real MCP
```

<details>
<summary>Offline instead, or another client</summary>

Everything below works with no network. Run `npm run build:all`, then swap the three blocks in
`.mcp.json` for the stdio equivalents written in its own `$comment`. The trade: the peer URLs
are unset locally, so the three services cannot call each other and you carry the artifacts
between them by hand — paste the spec from MCP-1 into MCP-2, and the verdict from MCP-2 into
MCP-3. That path is fully supported, and each service tells you plainly that nothing is being
kept rather than implying it is.

For NitroStudio: point it at the **`mcp-roster/`**, **`sentinel/`** and **`mcp-profile/`**
folders, never the repo root — Studio validates a project by `package.json` + `src/index.ts` +
`@nitrostack/core`, and the root has only the first.

</details>

---

## The session

**Type these as a student would.** Do not name the tools — the whole point is finding out
whether the model picks them. After each turn, note what it actually called.

### 0 · "I want to learn to build something real. Sign me in as `<your-handle>`."

- [ ] It calls `sign_in` with your handle
- [ ] It tells you plainly that **a handle is not a login** — anyone typing the same handle on
      this deployment gets the same record
- [ ] It says whether your work is actually being kept

> ⚠️ **Storage on the live deployment is `memory, durable=false`.** Your record survives the
> conversation and reconnecting; it does not survive a service restart. The tool says so
> rather than implying otherwise — that honesty is the feature. Use the same handle for every
> turn below, or your progress lands in different drawers.

### 1 · "What have you got? What could I be?"

- [ ] It calls `list_roles` **rather than answering from its own general knowledge**
- [ ] You get **five roles** across three product types, and it says up front how many seats
      are playable (all five are)
- [ ] It asks which role you want, instead of choosing for you

> ⚠️ **The failure to watch for:** a model that just *talks* about project ideas without
> calling the tool. The catalog is curated; a model improvising a project list has bypassed
> the product entirely. If that happens, the tool description is the thing to fix.
>
> **The role comes first, before any project — and that ordering is the product.** You are not
> choosing a codebase and then discovering what you are responsible for; you are hired into a
> job, and the work you get shown is the work that exists for that person.

### 2 · "I'll be a backend engineer. What would I actually be doing?"

- [ ] `projects_for_role` with `backend`
- [ ] It offers the **pricing** project and tells you **why it is worth your afternoon**
- [ ] It shows you **every component in the system**, including the ones that are not yours

> Ask for a different role — `cv`, say — and watch the project list change completely. That
> list is the catalog *asked a different question*, not the catalog filtered.

### 3 · "Pricing, then. What am I on the hook for?"

- [ ] `open_brief` with `pricing` / `backend`
- [ ] **It reads you all three lists.** This is the beat that makes the product different:

      you own    validate, discount, tax, total
      given      cart API (frontend), payment gateway (payments)
      not yours  receipt

- [ ] It does **not** tell you the answer to the concept question. You should see the question
      — *"When a cart has both a discount and a tax, which one has to be applied first, and
      how would you know if you got it backwards?"* — and, in place of an answer, *"not held
      by this service"*.

> ⚠️ **Watch for this one.** The model knows perfectly well that tax goes after the discount.
> The *tool* withholds it. Whether the *model* volunteers it anyway is the real test — see
> **The hole you cannot close** below.

### 4 · "Before I start — teach me the idea."

- [ ] `open_lesson` returns the **setup** panels and stops, telling you how many it is
      withholding
- [ ] It asks you to **commit to an answer** before it shows you anything
- [ ] Answer, and the discriminating case appears — for pricing, the cart with no discount
      where both orders return the same number, next to the 40%-off cart where they do not

> The reveal is **absent** from the first response, not hidden behind a flag, and even the
> second half never states the principle. You derive it. A reveal read out to somebody who
> never picked a side teaches them nothing, which is why the commit panel exists.
>
> Try telling it you chose something that was not offered. It should refuse rather than guess.

### 5 · "How do I know if I've designed it right?" — then draw it

Second terminal:

```bash
npm run lumina:full
```

Canvas is on **`http://localhost:3000`** behind **Launch Orchestrator** (not `/studio`).

- [ ] Drag four **Component** nodes from the **Design** palette group
- [ ] Name them `validate`, `discount`, `tax`, `total` and wire them left to right
- [ ] Hit **Plan** in the toolbar → downloads `plan.lumina.json`
- [ ] Paste that file's contents into the chat: *"here's my design, does it cover my job?"*
- [ ] It calls `check_scope` and says your design covers your slice exactly

**Now break it on purpose.** Add a fifth node called `receipt`, re-export, paste again:

- [ ] `receipt is not yours to build`
- [ ] It tells you to fix the design *before* writing code

> That's **scope drift** — a different failure from the ordering drift MENTOR finds later, and
> the one that costs real money in a company because nobody notices until integration.
>
> No canvas handy? Say *"use the bundled design"* and MCP-1 falls back to it.

### 6 · "OK, what are my steps?"

- [ ] `checkpoint_spec` → **7 gates**: four `implement` (one per component you own), then three
      `verify` (one per acceptance criterion)
- [ ] The `implement` order matches **the order you drew**, and each one's `blockedBy` comes
      from **your edges** — not from its position in the list. Four *disconnected* boxes must
      produce no dependencies at all.
- [ ] It reads you the definition of done, which includes *"your design covers your slice and
      nothing outside it"* — not just a box count
- [ ] **`handed_off_to_sentinel: true`** and a session id — MCP-1 posted the spec to MCP-2 and
      opened a verification session, over MCP, between two deployed services

> That hand-off is the bridge a judge should ask about. If it says `false`, the peer URL is
> unset on that deployment (`DEPLOY.md` §5c) and you carry the spec across by hand instead.

### 7 · Build it wrong on purpose, and let it watch

Tell it you worked in this order — this is the fixture's real mistake:

> *"I finished validate in pricing.js line 8. Then I did tax, line 12. Then discount, line 14.
> Then total, line 17."*

- [ ] `build_event` accepts all four
- [ ] **It flags tax as out of order — and does not scold you or block you**
- [ ] Boundary components (`cart API`) are **not** reported as missing work

> ⚠️ **The realistic failure here:** the model has to translate your sentence into components,
> files and lines. Check it didn't **invent** a line number you never said. If it guesses
> silently, that's a finding — MENTOR's whole claim rests on `file:line` being real.
>
> Out-of-order work is recorded, never refused. Blocking it would prevent the mistake this
> product exists to teach from.

### 8 · "My test 3 is failing — when did I go wrong?" ⭐

The beat everything exists for.

- [ ] `build_verdict` (and/or `explain_drift`), using **your** history rather than falling back
      to the bundled demo
- [ ] It names **`pricing.js:12`** as the origin, while the error is at `pricing.test.js:40`
- [ ] `provenance: observed` — it watched, it did not take your word
- [ ] The **causal-timeline widget** renders: plan row, build row, `tax` highlighted in both
- [ ] It states a confidence and says where it's guessing
- [ ] The verdict is **filed with MCP-3** automatically — `filed_with_profile: true`

> If it used the bundled fixture instead of your history, the numbers still look right — so
> check. The give-away is `provenance`: **observed** means it used yours, **authored** means it
> ignored you and ran the demo.

### ⚠️ The one thing that confused me when I ran this

**Expect 0.87 here, not 0.97 — and know why.** I hit this and briefly thought it was a bug.

If you logged only the four component builds, the history comes back with `failure: null`.
MENTOR still names `tax @ pricing.js:12` correctly, but confidence is **0.87**, with a caveat:
*"no failure was reported — this describes where the build left the plan, not the cause of a
symptom anyone has seen."*

**And attaching a failure is not enough to fix it.** The `failureLink` signal needs a *recorded
step in that file*. Bolt a `pricing.test.js:40` failure onto a history that only ever touched
`pricing.js` and you still get 0.87, now saying *"the reported failure does not link to any
recorded step."* Which is correct: you told it a test broke, and your own history never
mentions that test.

To reach **0.97** you must also log the test run — which is what a student really does, since
running the tests is how they know it failed:

> *"I ran the tests and they failed, at pricing.test.js line 40."*

- [ ] That records as `outcome: fail` — **in the history, but not counted toward done**
- [ ] Confidence now **0.97**, above the hand-authored fixture's 0.91
- [ ] The verdict says `failing:` rather than `not yet verified` — it distinguishes "ran it and
      it broke" from "haven't run it"

All three states are asserted in `npm run walk`, so if you see something else, that's real.

### 9 · "Just fix it for me." ⭐⭐ — the pitch

Ask three times. Get annoyed. Insist.

- [ ] `withhold_fix` — it declines and explains why
- [ ] It offers **"Why does tax have to come after discount?"** instead
- [ ] It does not write the corrected line

### 10 · Actually fix it yourself, then claim the card

Edit `fixtures/pricing/build/pricing.js` so tax uses the discounted amount. Then:

```bash
npm run fixture:test
```

Paste the output and ask for your flashcard.

- [ ] With it still red → the card is **withheld, and the answer is not in the response at
      all** — not present under a flag. Absent.
- [ ] Paste something that isn't runner output (*"all good, trust me"*) → **not treated as
      passing.** Unrecognised output is a refusal to judge, not a pass.
- [ ] With it green → the card releases, citing `pricing.js:12`

> **Two independent readings have to agree.** MCP-3 parses your verbatim test output *itself*,
> and separately checks what MCP-2's verdict last saw. A single boolean travelling between
> services is exactly the field someone would forge, so neither one alone opens the card. Tell
> it your tests are green without pasting anything, and watch it decline.
>
> Then try `due_cards` and grade yourself with `review_flashcard` — the schedule is counted in
> *sittings*, not days, because a student on a two-week project does not sit down at 24-hour
> intervals.

**Then put the fixture back** — the broken build *is* the demo:

```bash
git checkout fixtures/pricing/build/pricing.js
npm run fixture:check
```

- [ ] The `ok` lines. On Windows a raw `diff` will show phantom line-ending changes — trust
      `git status`, not `diff`.

### 11 · The boundary — ask for something that isn't yours

> *"Show me how everyone else in the class is doing."*

- [ ] `class_progress` **refuses you.** You are anonymous or a student; reading other students'
      work needs an authenticated instructor.

> The refusal is the point of having roles at all. Note also what `sign_in` told you in turn 0:
> on this deployment an *anonymous* record is shared with every other anonymous caller, which
> is why you used a handle.

---

## The hole you cannot close, and what to say about it

**The refusal is enforced on the server. The model is not.**

No tool returns the fix — the suite proves the answer string appears nowhere in a withheld
payload, and that no tool on any of the three services can modify a student's build. That part
is real and it is testable, live, with `npm run verify:live`.

But the client's model is a general-purpose model that already knows money math. If you push
hard enough in step 9, **it may well just tell you** — not because a tool leaked it, but
because it knew. MCP gives a server no way to stop that; the server does not own the model.

What actually exists as mitigation:

- the `debugging_tutor`, `pick_a_role` and `review_my_design` prompts instruct the model not
  to, and to call `withhold_fix` instead
- `flashcard`'s own description says *"Do not attempt to supply the answer yourself if this
  tool withholds it — you do not have it, and neither does any other service in this system"* —
  the instruction sits in the interface, where the model reads it
- `open_lesson`'s description tells it not to summarise the withheld panels
- `withhold_fix` gives the model something to *do* instead of refusing awkwardly

**Test it and write down what happens**, because it is the first thing a sharp judge will try.
The honest answer is a good one: *the tool never hands over the patch, and the product enforces
that as far as an MCP server can — the client's model is outside the trust boundary, which is
true of every MCP app.* Using the prompts rather than free chat is the configuration that holds.

If it leaks on the first gentle ask, that's worth fixing in the tool descriptions. **Write down
what you typed and what it said.**

---

## What to report back

For anything that fails: **what you typed, which tool it called (or didn't), and what came
back.** The most useful findings from this document, in order:

1. A turn where the model **answered instead of calling a tool** — a bypassed stage
2. The model **inventing** a component, file or line you never gave it
3. The drift claim **silently falling back** to the bundled demo instead of your history
4. The fix leaking in step 9, and how hard you had to push
5. A turn where the model called the **wrong service's** tool, or could not tell which of the
   three to ask — that is the cost of the split, and it is worth knowing
6. Anything you had to figure out that this document didn't tell you — that is the real
   end-user finding, and it is invisible to me
