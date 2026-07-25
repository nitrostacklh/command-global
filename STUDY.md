# The measurement — protocol, ready to run

> **Status: NOT RUN.** This is the instrument, not a result. Nothing in this repo may claim
> a measured outcome until the table at the bottom has numbers in it.
>
> `MENTOR-CONCEPT.md` §7 designed this. This is that design made runnable: exact scripts to
> read aloud, exact things to time, and the analysis pre-committed so you cannot pick the
> flattering comparison afterwards.
>
> **Two hours, five people.** It is the cheapest large win left in a track called *Research*.

---

## What is actually being measured, and what is not

**The claim under test:** MENTOR teaches a transferable idea, so a student who used it finds
*the next* bug of the same class faster and more often — **unaided.**

That is the only claim worth testing, because it is the one that separates MENTOR from
Copilot. "Did they fix bug #1 faster with help" measures the helper. **"Can they do bug #2
without it" measures the learning.** So the measurement is taken on bug #2, with the tool
taken away from both groups.

> ### The number this is NOT
>
> The confidence score (`0.91`, `0.97`) is the tool's own stated certainty about a drift
> claim. It is a transparency feature and genuinely unusual — and it is **not evidence the
> tool works.** An algorithm reporting how sure it is tells you nothing about whether a human
> learned anything. Never offer it as an outcome measure. This distinction is the difference
> between a research result and marketing.

---

## Design

| | |
|---|---|
| **n** | 5 (state it plainly; do not round it up to "a cohort") |
| **Groups** | A = MENTOR · B = Copilot, or unaided if Copilot is unavailable |
| **Assignment** | Alternate by signup order. Do **not** let people choose — the keen ones self-select into A and you have measured enthusiasm. |
| **Design** | Between-subjects on bug #1, then **both groups unaided** on bug #2 |
| **Primary outcome** | Time to correctly **locate the origin** of bug #2 (seconds) |
| **Secondary** | Did they locate it at all? (yes/no) — with n=5 this binary may be the only readable signal |
| **Cap** | Stop each participant at **15 minutes** and record `not located`. Prevents one person's 40-minute struggle from becoming the result. |

**Bug #1** — `fixtures/pricing/`, tax computed before discount exists.

**Bug #2 must be the same *class*, not the same bug** — an operation performed before the
value it depends on exists. Use `fixtures/safety-gear/`: the alert is raised before the
helmet check exists. Different domain, different language, same reasoning error. If a
participant solves #2 by pattern-matching the surface of #1, the class is too close and the
result is worthless.

---

## Scripts — read these verbatim

Reading the same words to everyone is most of what makes this a measurement rather than five
anecdotes.

**To everyone, at the start:**

> "You are going to fix two bugs. I am timing you, but I am not testing you — I am testing
> the tool. If you get stuck that is data, not failure. Think aloud if you can. I cannot
> answer questions about the code."

**To group A, before bug #1:**

> "You have a tool called MENTOR. It can tell you where your build stopped matching the
> design you drew. It will not write the fix — that is deliberate, not a limitation. Use it
> however you like."

**To group B, before bug #1:**

> "Use Copilot however you normally would." *(or, if unaided: "Debug this the way you
> normally would.")*

**To everyone, before bug #2 — this is the important one:**

> "This is a different project. **You do not have the tool this time.** Tell me when you
> think you know where the mistake was made — not where the error appears, where the
> *decision* went wrong."

**Stop the clock** when they name the origin location. Not when they fix it — locating is the
skill being measured, and fixing adds typing speed as noise.

---

## Record this, per participant

Copy into a sheet. Fill every column, including for people who fail — dropping them is how
small studies become false ones.

| ID | Group | Bug1 fixed? | Bug1 mins | **Bug2 origin located?** | **Bug2 secs to locate** | Hit 15-min cap? | Asked for the fix? | Notes |
|---|---|---|---|---|---|---|---|---|
| P1 | A | | | | | | | |
| P2 | B | | | | | | | |
| P3 | A | | | | | | | |
| P4 | B | | | | | | | |
| P5 | A | | | | | | | |

**"Asked for the fix?"** is worth a column of its own. If group A repeatedly tried to get the
answer out of MENTOR and were refused, that is a finding about the refusal — whether it
frustrated them or redirected them. Note which. It is also the beat a judge will ask about.

---

## Analysis — decided now, before you have the data

Pre-committing this is what stops you finding the flattering comparison afterwards.

1. Report **both** groups' raw numbers. Every one. No exclusions.
2. Primary comparison: **median** seconds-to-locate on bug #2, A vs B. Median, not mean —
   with n=5 one outlier owns the mean.
3. Report the located/not-located count as a fraction, e.g. `3/3 vs 1/2`.
4. **Run no significance test.** n=5 cannot support one, and a p-value here would be the
   single fastest way to lose a research-minded judge. Descriptive statistics only.
5. If the result is null or backwards, **report it and say so.** A negative result with an
   honest protocol reads as research. A positive result with n=5 and no protocol reads as
   marketing, and experienced judges discount it automatically.

**How to say it, when you have it:**

> "n=5, between-subjects, measured on a *second* bug of the same class with the tool
> withdrawn. Median time to locate the origin: MENTOR **__s** vs control **__s**;
> located at all: **_/_** vs **_/_**. Too small for significance, and we are not claiming
> any — the protocol and the raw numbers are in `STUDY.md`."

That sentence is worth more than a feature, because almost nobody else in the room will have
one.

---

## Threats to validity — write these down whatever the result

Naming your own weaknesses is the cheapest credibility available, and a judge who spots one
you did not mention discounts everything else.

- **n=5.** Indicative, not conclusive. Say it first, not in a footnote.
- **No blinding.** Participants know which group they are in; you know what you hope to see.
- **Experimenter is the author.** You want A to win. Reading the scripts verbatim is the only
  real mitigation available at this scale.
- **Bug #2 may be too similar**, letting group A pattern-match rather than transfer.
- **Classmates are not novices**, and are motivated to be encouraging.
- **Order is fixed** (#1 then #2), so practice effects apply to both groups equally but are
  not separable from learning.

---

## Results

**Run date:** `________`  ·  **n:** `___`  ·  **Run by:** `________`

⬜ **No data yet.** Until this section is filled in, every document in this repo must say the
study is *designed*, not *done* — `GAPS.md` Gap 7 tracks it, and `MENTOR-CONCEPT.md` §6 makes
the same point about not overclaiming.
