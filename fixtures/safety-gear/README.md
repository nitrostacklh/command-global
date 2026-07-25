# Project 02 — Site safety-gear check

> **This project exists to prove the loop is not about pricing.**
> `../pricing/` demonstrates that the six stages run. This one demonstrates that
> they run on something with a different shape, a different failure, and better
> provenance. If a bridge were secretly hardcoded to the pricing demo, it would
> break here rather than in production.

---

## What is deliberately different from `pricing/`

| | `pricing/` | here | what it would have caught |
|---|---|---|---|
| Owned components | 4 | **3** | anything assuming a four-step chain |
| Drawn but not owned | none | **`camera feed`** | code that treats every drawn box as the student's work |
| Drift shape | value computed from a stale base | **acting on a condition that does not exist yet** | a detector that only recognises arithmetic ordering |
| Provenance | `authored` (0.91) | **`observed` (0.97)** | a confidence score that ignores where its evidence came from |
| Role | backend, a web service | CV, a vision system | a catalog whose two-step choice only has one path |

---

## Stage ① + ② — the assignment → [`brief.cv.json`](brief.cv.json)

**You are the CV engineer.** A camera watches a site entrance, and you decide whether
the person walking through it is wearing a helmet — and whether that is worth
interrupting somebody over.

Both directions of being wrong cost something real. Miss a bare head and you have a
safety incident nobody was warned about. Alert on a compliant worker often enough and
the supervisor mutes the system, at which point you have built nothing.

| | components |
|---|---|
| **You own** | `detect person`, `check helmet`, `alert` |
| **Given to you** | `camera feed` (platform), `incident log` (platform) |
| **Not yours** | `dashboard` |

That last row is the point of role-scoping. Draw the dashboard and `check_scope`
reports it `out_of_scope`, because in a company you would not have built it.

### Acceptance criteria

| # | Given | Must |
|---|---|---|
| a1 | a worker **wearing** a helmet walks through frame | **0 alerts** |
| a2 | a worker with no helmet walks through frame | exactly 1 alert |
| a3 | an empty frame | 0 alerts |

---

## Stage ③ — the design → [`plan.lumina.json`](plan.lumina.json)

```
camera feed ──▶ detect person ──▶ check helmet ──▶ alert
  (boundary)      └────────── the three you own ──────────┘
```

Four `component` nodes. The student correctly draws `camera feed` even though they do
not implement it — it is their input boundary, and drawing it is what makes the
contract explicit. `check_scope` reports it as `boundary`, not as a problem.

---

## Stage ④ — what actually happened → [`build.history.json`](build.history.json)

| seq | component | file:line | |
|---|---|---|---|
| 1 | detect person | `detect.py:14` | matches the plan |
| 2 | **alert** | **`alert.py:9`** | ⚠ **plan says last, built second** |
| 3 | check helmet | `detect.py:31` | too late — `alert.py` was already deciding without it |
| 4 | tests | `test_safety.py:22` | ✗ a1: expected 0 alerts, got 1 |

```
error surfaces at  test_safety.py:22
origin             alert.py:9
drift              alert planned after check helmet, built before it
confidence         0.97
```

**Why it hid.** a2 (bare head → alert) and a3 (empty frame → nothing) both pass whether
or not the helmet check is wired in: with no people there is nothing to alert about, and
with a bare head an alert is correct. **a1 is the only criterion where alerting on
*presence* and alerting on *non-compliance* differ** — so the mistake sat there being
invisible while two of three tests went green.

That is the same *structure* as pricing's bug (the discriminating case is the one the
student wrote last) reached through completely different reasoning, which is the point.

### Why 0.97 and not 0.91

`provenance: "observed"`. This history was not written by hand — it came out of
`record_progress` as the work happened, so the sequence was witnessed rather than
remembered. MENTOR scores that 0.8 against a hand-authored history's 0.4, and still
short of 1.0 because the student is the one who declared each checkpoint reached, and a
declaration is not a commit.

### A note on `plannedPosition: 3`

Not 4. Positions are counted over components present in **both** artifacts, and
`camera feed` was correctly never implemented by this role. Comparing a position in the
plan against a position in the build is only meaningful over components that appear in
each. This tripped up the fixture's own assertion before the test caught it.

---

## Stage ⑤ + ⑥ — the concept

> **Q.** Your system alerts on workers without helmets. What has to be true before the
> alert can be raised, and why would building the alert first still look like it works?

The answer is in `brief.cv.json` and **the tool will not read it out until the student's
tests are green.** Transfers to: authorising before checking a permission, retrying
before classifying the error, notifying before confirming the state change described.

---

## Run it

```bash
npm run probe
```

Walks all six stages against this project over real MCP and prints each one. The
`safety-gear` tests in `sentinel/src/modules/learn/learn.test.ts` assert every number
on this page, including `expectedDrift` in `build.history.json`.

> **There is no `build/` directory here, and that is intentional.** `pricing/` ships
> runnable source because `fixture:check` asserts the failure is real. This project's
> job is to exercise the *bridges* with a second shape of artifact, so it consists of
> the four documents the loop passes between stages. Writing the Python would add a
> second thing to keep green without testing anything the pricing fixture does not
> already cover — see `GAPS.md`.
