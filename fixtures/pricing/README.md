# Project 01 — Pricing

> **This is the one project the submission executes completely** (`../../MENTOR-CONCEPT.md` §8).
> All four layers run against these files. If something in the loop doesn't work
> here, it doesn't work.

---

## Layer 1 — Your role

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

## Layer 2 — The lesson

⬜ **Not built.** Panels teaching order-of-operations in money math (why tax on
the discounted amount, not the sticker price). See `../../GAPS.md` Gap 6 — this is
roadmap, not submission scope.

---

## Layer 3 — The plan → [`plan.lumina.json`](plan.lumina.json)

What the student drew in Lumina before writing any code:

```
validate ──▶ discount ──▶ tax ──▶ total
```

`plan.lumina.json` was produced by the real exporter (`lumina/export_plan.py`),
not hand-written, so it is exactly the shape a student's export produces. The
field MENTOR actually needs is **`order`**:

```json
"order": ["n-validate", "n-discount", "n-tax", "n-total"]
```

**tax is third. After discount.** That is the student's own stated intent, and
it is what makes the drift claim theirs rather than the tool's opinion.

To regenerate it from a live canvas: open Lumina, draw the four components, click
**Plan** in the toolbar, drop the download here.

---

## Layer 4 — The build → [`build.history.json`](build.history.json)

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

`build.history.json` also carries an **`expectedDrift`** block — the assertion a
correct MENTOR run must reproduce. Wire `mentor.test.ts` to it so the demo is
regression-tested rather than eyeballed.

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
