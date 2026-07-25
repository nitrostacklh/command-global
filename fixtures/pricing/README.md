# Project 01 — Pricing

> **This is the project the submission executes completely** (`../../MENTOR-CONCEPT.md` §8).
> Every stage of the loop runs against these files. If something in the loop doesn't work
> here, it doesn't work.
>
> [`../safety-gear/`](../safety-gear/README.md) is the second instance, and it exists to
> prove the loop is not *about pricing* — different component count, different bug shape,
> better provenance.

---

## Stage ① + ② — Your role → [`brief.backend.json`](brief.backend.json)

> **This section used to be the gap.** Everything below was prose a human read, and no
> code could act on it — so nothing could check whether what a student drew was actually
> their job. It is now backed by `mentor.brief/v1`, which `check_scope` compares against
> the Lumina canvas. See `../../GAPS.md` Gap 12.

| | components |
|---|---|
| **You own** | `validate`, `discount`, `tax`, `total` |
| **Given to you** | `cart API` (frontend), `payment gateway` (payments) |
| **Not yours** | `receipt` |

Draw the receipt and `check_scope` reports it `out_of_scope` — in a company you would not
have built it. The other demo project, [`../safety-gear/`](../safety-gear/README.md), runs
the same loop with three owned components and a different bug, which is how we know none of
this is hardcoded to pricing.

**You are the backend engineer who owns pricing.**

Finance reports off your numbers. Support answers tickets about your numbers. When
a customer says "you charged me wrong," it is your function they are talking about.

You are not doing an exercise. You own a thing other people depend on.

### Deliverable

`computeTotal(items, discountRate, taxRate)` → the order total, rounded to 2dp.

### Acceptance criteria

| # | Cart | Discount | Tax | Must return |
|---|---|---|---|---|
| 1 | $100 | 0% | 20% | `120.00` |
| 2 | $100 | 0% | 0% | `100.00` |
| 3 | $100 | **40%** | 20% | **`72.00`** |

Finance signed off on these three numbers. They are in `build/pricing.test.js`.

```bash
cd fixtures/pricing/build && node --test
```

### The hidden failure

Deliberate, and the point of the whole exercise: **tests 1 and 2 pass, test 3 fails.**

Tests 1 and 2 both pass `discountRate = 0`, and with no discount, taxing the
subtotal and taxing the discounted amount are the *same number*. Test 3 is the
first case where those two differ. So the mistake sat there being invisible while
the student built three more things on top of it.

That gap — between where the error surfaces and where it was made — is the thing
MENTOR exists to close.

---

## Layer 2 — The lesson (stage still unbuilt)

⬜ **Not built, and now the only stage of the loop that isn't** — `../../GAPS.md` Gap 13.

Panels teaching order-of-operations in money math (why tax on the discounted amount, not
the sticker price). The concept itself *is* authored — question, answer and what it
transfers to, in [`brief.backend.json`](brief.backend.json) — and it is released as a
flashcard once the student's tests go green. What's missing is the middle: the part that
would teach it to a student who doesn't already know it.

---

## Stage ③ — The plan → [`plan.lumina.json`](plan.lumina.json)

What the student drew in Lumina before writing any code:

```
validate ──▶ discount ──▶ tax ──▶ total
```

Four **Component** nodes (Lumina's `design` palette group), wired left to right.

`plan.lumina.json` was produced by the real exporter (`lumina/export_plan.py`),
not hand-written, so it is exactly the shape a student's export produces — and
since 2026-07-25 that is literally true rather than approximately: dragging four
`component` nodes onto the canvas, naming them, wiring them and hitting **Plan**
produces a file **byte-identical to this one**, edge handle names included. The
field MENTOR actually needs is **`order`**:

```json
"order": ["n-validate", "n-discount", "n-tax", "n-total"]
```

**tax is third. After discount.** That is the student's own stated intent, and
it is what makes the drift claim theirs rather than the tool's opinion.

To regenerate it from a live canvas: open Lumina, draw the four components, click
**Plan** in the toolbar, drop the download here.

---

## Stage ④ + ⑤ — The build → [`build.history.json`](build.history.json)

What actually happened, in order:

| seq | component | file:line | |
|---|---|---|---|
| 1 | validate | `pricing.js:8` | matches the plan |
| 2 | **tax** | **`pricing.js:12`** | ⚠ **plan says third, built second** |
| 3 | discount | `pricing.js:14` | too late — tax was already fixed |
| 4 | total | `pricing.js:17` | matches the plan |
| 5 | tests | `pricing.test.js:40` | ✗ 80.00, expected 72.00 |

So:

```
error surfaces at  pricing.test.js:40
origin             pricing.js:12          ← 4 steps and ~27 minutes earlier
drift              tax planned 3rd, built 2nd
confidence         0.91
```

**And then MENTOR stops.** It names the origin and declines to write the fix.
That refusal is the product (`../../MENTOR-CONCEPT.md` §2), not a limitation.

**This all runs today.** `explain_drift` in `../../sentinel/src/modules/mentor/` produces
exactly the numbers above, and `mentor.test.ts` asserts them — `cd ../../sentinel && npm test`.

`build.history.json` also carries an **`expectedDrift`** block — the assertion a correct
MENTOR run must reproduce. `drift.test.ts` asserts every field of it, so the demo is
regression-tested rather than eyeballed.

Its `provenance: "authored"` is why confidence is **0.91**: MENTOR discounts a hand-written
history, because a timeline nobody observed is a claim about the past. The demo's weakest
link is priced into the number it shows the student, rather than hidden in a footnote.

**A student does not have to author one.** `record_progress` accumulates a checkpoint log as
the work happens, and that log *is* a `mentor.build/v1` — `provenance: "observed"`, scored
0.8 instead of 0.4. `../safety-gear/build.history.json` is one, and it scores **0.97**. This
file stays `authored` because it is the fixture the whole test suite asserts against, and
because having both on the same formula is the clearest way to show the score is real.

---

## Verified state of these files

```
$ npm run fixture:check          # from the monorepo root
ok  fixture is correctly broken:
ok    2/3 pass, 1 fails as designed
ok    surfaces at pricing.test.js:40 ("80 !== 72")
ok    origin is pricing.js:12 — tax computed before discount exists
```

That is the intended state. **Do not fix `pricing.js`.** The broken build *is*
the fixture — MENTOR has nothing to explain if it's green.

A red test is an irresistible target and a prose warning doesn't stop anyone, so
the intended state is asserted rather than requested: `scripts/check_fixture.mjs`
fails if the test goes green, if the failure moves off line 40, or if the
assertion message changes. It runs as part of `npm run verify`.

---

## Related implementations of this same bug

The tax-before-discount regression exists in three places. Keep them in sync:

| Where | What it is |
|---|---|
| **`build/pricing.js`** (here) | The *student's* build. MENTOR's subject. Has a history and a plan. |
| `../../sentinel/src/modules/sentinel/fixtures.ts` | The *SENTINEL* fixture — same bug as an in-process string patched by the self-heal loop. |
| `../../reference/python/service/app/pricing.py` | The *live-service* version, with `.pricing.pristine.py` for bug injection. |

They differ on purpose: SENTINEL's exists to be **fixed automatically**, and this
one exists to **not be**. Same bug, opposite lesson.
