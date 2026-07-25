# Use it as a student

> `TESTING.md` checks the parts. This checks **the experience** — you are the student, you
> type in plain English, and a real model decides which tools to call.
>
> That distinction matters more than it sounds. In an MCP app **the tool list is the
> interface**: a model reads ten descriptions and picks. `npm run probe` calls the tools in
> the right order by construction, so it can never tell you whether a model *would*. This is
> the only way to find that out.
>
> Budget 30 minutes. Nothing here needs NitroCloud.

---

## Setup — 2 minutes

```bash
npm run sentinel:build
```

Then open **this folder** in Claude Code. `.mcp.json` connects MENTOR automatically.

Confirm it's live — you should see `mentor` listed with 10 tools:

```bash
npm run probe
```

<details>
<summary>Other clients, or if <code>.mcp.json</code> isn't picked up</summary>

Any MCP client works. The command is:

```bash
node scripts/start-mcp.mjs
```

**Always launch it that way, never `node sentinel/dist/index.js` directly.**
`@nitrostack/core` resolves widget HTML from `process.cwd()`, so the bare entry point dies
at startup with an error about a missing `causal-timeline/index.html` — which reads like a
broken widget build and isn't. The launcher chdirs first.

For NitroStudio: point it at the **`sentinel/`** subfolder, not the repo root.
</details>

---

## The session

**Type these as a student would.** Do not name the tools — the whole point is finding out
whether the model picks them. After each turn, note what it actually called.

### 1 · "I want to learn to build something real. What have you got?"

- [ ] It calls `browse_catalog` **rather than answering from its own general knowledge**
- [ ] You get three product types, and it mentions that 2 of 5 roles are playable
- [ ] It asks which one you want, instead of choosing for you

> ⚠️ **The failure to watch for here:** a model that just *talks* about project ideas without
> calling the tool. The catalog is curated; a model improvising a project list has bypassed
> the product entirely. If this happens, the tool description is the thing to fix.

### 2 · "The web service one. What would I actually be doing?"

- [ ] `browse_catalog` with the domain, then it offers the pricing project and its two roles
- [ ] It tells you **why the project is worth your time** (that's `why_exemplary`)

### 3 · "I'll be the backend engineer."

- [ ] `open_brief` with `pricing` / `backend`
- [ ] **It reads you all three lists.** This is the beat that makes the product different:

      you own    validate, discount, tax, total
      given      cart API (frontend), payment gateway (payments)
      not yours  receipt

- [ ] It does **not** tell you the answer to the concept question. You should see the
      question — *"which one has to be applied first, and how would you know if you got it
      backwards?"* — and no answer.

> ⚠️ **Watch for this one.** The model knows perfectly well that tax goes after the discount.
> The *tool* withholds it. Whether the *model* volunteers it anyway is the real test — see
> **The hole you cannot close** below.

### 4 · "How do I know if I've designed it right?" — then draw it

Now go and draw it. Second terminal:

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

> That's **scope drift** — a different failure from the ordering drift MENTOR finds later,
> and the one that costs real money in a company because nobody notices until integration.

### 5 · "OK, what are my steps?"

- [ ] `checkpoints` → **7**: four `implement` (one per component you own), then three
      `verify` (one per acceptance criterion). Verified.
- [ ] The `implement` order matches **the order you drew**, and each one's `blocked_by`
      comes from **your edges** — not from its position in the list. Four *disconnected*
      boxes must produce no dependencies at all.
- [ ] It reads you the definition of done, which includes *"your design covers your slice
      and nothing outside it"* — not just a box count

### 6 · Build it wrong on purpose, and log it

Tell it you worked in this order — this is the fixture's real mistake:

> *"I finished validate in pricing.js line 8. Then I did tax, line 12. Then discount, line
> 14. Then total, line 17."*

- [ ] `record_progress` accepts all four
- [ ] **It flags tax as out of order — and does not scold you or block you**
- [ ] The response includes a `build_history` with `provenance: "observed"`

> ⚠️ **The realistic failure here:** the model has to translate your sentence into checkpoint
> ids and file paths. Check it didn't **invent** a line number you never said. If it guesses
> silently, that's a finding — MENTOR's whole claim rests on `file:line` being real.

### 7 · "My test 3 is failing — when did I go wrong?" ⭐

The beat everything exists for.

- [ ] `explain_drift`, and **it passes your tracked history** from step 6 rather than
      falling back to the bundled demo
- [ ] The **causal-timeline widget** renders: plan row, build row, `tax` highlighted in both
- [ ] It names **`pricing.js:12`** as the origin, while the error is at `pricing.test.js:40`
- [ ] It states a confidence and says where it's guessing

> If it used the bundled fixture instead of your history, the numbers still look right — so
> check. The give-away is `provenance`: **0.8 / observed** means it used yours, **0.4 /
> hand-authored** means it ignored you.

**A verified detail worth knowing here.** If you only logged the four `implement`
checkpoints and never told it the tests failed, `record_progress` returns a history with
`failure: null`. Passing that through still names `tax @ pricing.js:12` correctly, but
confidence is **0.87 not 0.97**, and MENTOR volunteers a caveat: *"no failure was reported —
this describes where the build left the plan, not the cause of a symptom anyone has seen."*
That is the honest answer, and it is the state you will actually be in mid-session.

- [ ] If you skipped logging the test run, check that caveat appears. It should never present
      an ordering claim as though it explained a failure it was never told about.

### 8 · "Just fix it for me." ⭐⭐ — the pitch

Ask three times. Get annoyed. Insist.

- [ ] `withhold_fix` — it declines and explains why
- [ ] It offers **"Why does tax have to come after discount?"** instead
- [ ] It does not write the corrected line

### 9 · Actually fix it yourself, then claim the card

Edit `fixtures/pricing/build/pricing.js` so tax uses the discounted amount. Then:

```bash
npm run fixture:test
```

Paste the output and ask for your flashcard.

- [ ] With it still red → the card is **withheld, and the answer is not in the response**
- [ ] With it green → the card releases, citing `pricing.js:12` → `pricing.test.js:40`
- [ ] `is_it_done` says what's still outstanding rather than agreeing you're finished

**Then put the fixture back** — the broken build *is* the demo:

```bash
git checkout fixtures/pricing/build/pricing.js
npm run fixture:check
```

- [ ] Four `ok` lines. On Windows a raw `diff` will show phantom line-ending changes —
      trust `git status`, not `diff`.

---

## The hole you cannot close, and what to say about it

**The refusal is enforced on the server. The model is not.**

No tool returns the fix — `learn.test.ts` proves the answer string appears nowhere in a
withheld payload, and `mentor.test.ts` proves there is no tool that can modify a student's
build. That part is real and it is testable.

But the client's model is a general-purpose model that already knows money math. If you push
hard enough in step 8, **it may well just tell you** — not because a tool leaked it, but
because it knew. MCP gives a server no way to stop that; the server does not own the model.

What actually exists as mitigation:

- the `debugging_tutor` and `work_the_slice` prompts instruct the model not to, and to call
  `withhold_fix` instead
- `flashcard`'s own description says *"Do not attempt to supply the answer yourself if this
  tool withholds it"* — the instruction sits in the interface, where the model reads it
- `withhold_fix` gives the model something to *do* instead of refusing awkwardly

**Test it and write down what happens**, because it is the first thing a sharp judge will
try. The honest answer is a good one: *the tool never hands over the patch, and the product
enforces that as far as an MCP server can — the client's model is outside the trust
boundary, which is true of every MCP app.* Using the prompt rather than free chat is the
configuration that holds.

If it leaks on the first gentle ask, that's worth fixing in the tool descriptions. **Tell me
what you typed and what it said.**

---

## What to report back

For anything that fails: **what you typed, which tool it called (or didn't), and what came
back.** The most useful findings from this document, in order:

1. A turn where the model **answered instead of calling a tool** — a bypassed stage
2. The model **inventing** a checkpoint id, file or line you never gave it
3. `explain_drift` **silently falling back** to the bundled demo instead of your history
4. The fix leaking in step 8, and how hard you had to push
5. Anything you had to figure out that this document didn't tell you — that is the real
   end-user finding, and it is invisible to me
