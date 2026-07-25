# MENTOR — you didn't just write the bug. You designed it.

> **Track:** Education & Research · **Platform:** an MCP app on NitroStack
>
> Copilot finishes your code. This one makes you finish it — it shows you the exact
> moment your build stopped matching your plan, and then it stops.

---

## Read these in this order

| | |
|---|---|
| **[`MENTOR-CONCEPT.md`](MENTOR-CONCEPT.md)** | **Start here.** *Why* — the product, the four-layer learning loop, and why it survives "isn't this Copilot?" |
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | *How* — the one engine all six commanders run on. Long, and worth it. |
| **[`GAPS.md`](GAPS.md)** | *What's left* — prioritized, honest, and the file to open if you're picking this up. |
| [`DEPLOY.md`](DEPLOY.md) | The NitroCloud → ChatGPT runbook. Contains the only true blocker. |
| [`fixtures/pricing/README.md`](fixtures/pricing/README.md) | The one demo project, all four layers. |

**If you have five minutes:** read the pitch above, then `GAPS.md`'s one-paragraph
summary. That tells you the state of things faster than anything else here.

---

## What's in this repo

```
command-global/
├── sentinel/           ⭐ the deliverable — TS NitroStack MCP app, 6 modules, 32/32 tests
├── lumina/                Layer 3 — the canvas the student designs in (Next.js + FastAPI)
├── fixtures/pricing/      the one demo project: the plan, the build, the drift
└── reference/python/      the original Python prototype (frozen, still useful)
```

Three previously separate projects, consolidated 2026-07-25. Originals left in place at
`pranay/sentinel-mcp`, `pranay/agentic_ai_hackton` and `himes/lumina`.

### How the pieces actually connect

```
   lumina/  ──── plan.lumina.json ────▶  sentinel/src/modules/mentor/  ──▶  causal timeline
   the student's                          MENTOR diffs intent vs build        "line 40 broke.
   architecture,                                    ▲                          line 12 went
   drawn before code                                │                          wrong."
                          build.history.json ───────┘
                          what actually happened, in order
```

The joint is one file shape, `lumina.plan/v1` — plain JSON, no Lumina types. Produced by
[`lumina/export_plan.py`](lumina/export_plan.py), consumed by MENTOR. That decoupling is
deliberate: the Python/React half and the TypeScript half agree on exactly one thing.

> ⚠️ **MENTOR is not written yet.** The plan side is built and tested; the consumer is
> the main outstanding work. See `GAPS.md` Gap 3.

---

## Running it

```bash
npm run install:all      # deps for sentinel/ and lumina/
npm run verify           # sentinel build + 32 tests + regenerate the fixture plan
```

### The MCP app — `sentinel/`

```bash
npm run sentinel:dev     # then open the sentinel/ folder in NitroStudio
npm test                 # 32/32, fully offline — no API key, no network, no model
```

Point NitroStudio at the **`sentinel/` subfolder**, not the repo root.

### The design canvas — `lumina/`

```bash
cd lumina
python -m venv v && v\Scripts\pip install -r reqs.txt   # first run only
npm run full-dev         # Next.js :3000 + FastAPI :8000 + Electron
```

> **Path-sensitive.** `srv.py` resolves `m/yolov8n.onnx`, `lumina.db` and
> `test_scene.jpg` relative to the **process working directory** — it must be launched
> from inside `lumina/`. The root `npm run lumina:*` scripts handle that for you.
>
> `lumina/m/` (26 MB of ONNX weights) is gitignored. A fresh clone has no models and the
> detection/audio nodes will fail until they're restored — see `GAPS.md` Gap 10.

To produce a plan artifact: draw your components, then hit **Plan** in the canvas
toolbar. It downloads `plan.lumina.json` — MENTOR's intent input.

### The demo fixture

```bash
npm run fixture:test     # 2 pass, 1 fail — THIS IS CORRECT, do not fix it
npm run fixture:plan     # regenerate plan.lumina.json (deterministic)
```

The failing test *is* the fixture. MENTOR has nothing to explain if it's green.

### The Python reference — `reference/python/`

```bash
cd reference/python && pip install -r requirements.txt
python -m sentinel                 # control plane + dashboard on :8100
scripts/run_demo.ps1               # + the live Atlas pricing service on :8000
```

Kept because two parts are still live assets rather than archaeology: `service/` is a
genuinely running pricing service with a bug-injection mechanism, and `dashboard/` is a
working human-approval UI.

---

## State of things

| | |
|---|---|
| Platform (5 commanders + coordinator + trust layer) | ✅ complete, 32/32 |
| Lumina → MENTOR plan contract | ✅ built + tested (15/15) |
| The demo fixture, all inputs | ✅ complete and verified |
| **MENTOR itself** | ⬜ **not started** — `GAPS.md` Gap 3 |
| `causal-timeline` widget | ⬜ not started — Gap 4 |
| **Deployed to NitroCloud** | ⬜ **the blocker** — Gap 1, ~5 min to de-risk |
| Evidence study (n=5) | ⬜ not run — Gap 7 |

**Next action:** Gap 1. Open the NitroCloud *Connect Repository* dialog and check
whether it has a Root Directory field. Everything else is downstream of a green deploy.
