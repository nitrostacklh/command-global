# SENTINEL → NitroStack — Build Plan

**Goal:** ship SENTINEL as a compliant NitroStack TypeScript **MCP app** on NitroCloud, connected to ChatGPT — composed of several individually-winning sub-ideas that form one coherent product.

Runway: ~4 days. Strategy: **compliant skeleton + deploy on day 1**, then layer capability, testing and deploying at every milestone (their #1 Do).

---

## 0. Non-negotiables (the gates — from the official rules)

- Built **only** with the official **NitroStack TypeScript SDK** (`@nitrostack/core`, scaffolded by `@nitrostack/cli`). No other SDK/framework in the deployable.
- It is an **MCP server**: Tools · Prompts · Resources · Tasks · React widgets.
- Deployed to **NitroCloud**, **auto-deploy from GitHub** (link repo once → push = redeploy).
- Connects to **ChatGPT** via `{serviceUrl}/sse`.
- **Deploy early, test every deploy.** Never wait for the last hour.
- No secrets in git (no `.env`, keys, tokens). Good README. ≤3-min demo video. Submit via organizer account to the official Sample Apps repo.
- Node **20.x**, npm; NitroStudio desktop app; NitroCloud key format `nsk_live_…`.

> **OPEN ITEM — needed before locking scope:** the **six official tracks**. The idea must align to one. Best guess for primary alignment: *Developer Tools / Autonomous Agents*; FinOps as the breadth proof. Confirm against the real list.

---

## 1. The composition — 5 winning ideas → 1 product

SENTINEL is the umbrella. Each layer is independently a recognised winning pattern; together they are architecturally one MCP app.

| # | Sub-idea (winning alone) | Judge signal | NitroStack primitive |
|---|---|---|---|
| 1 | **Self-healing engine** — detect → fix → verify-loop → deploy | true autonomy, long-horizon | a **Task** (`self_heal`) + granular **Tools** |
| 2 | **Explainable confidence gate + dynamic HITL** | safety, alignment | **Tool** returning a **Widget** + native tool-approval |
| 3 | **Pluggable platform** — DevOps *and* FinOps, one engine | not a one-off; breadth | two **modules** behind one core interface |
| 4 | **Glass-box explainability** — live mission trace, diffs, savings | trust (the Kraken differentiator) | React **Widgets** |
| 5 | **MCP-native, ships to ChatGPT** | the sponsor's whole thesis | the app itself on NitroCloud |

---

## 2. How SENTINEL maps onto MCP (the key insight)

In MCP, **the connecting client model (ChatGPT / Studio AI Chat) is the agent.** We don't ship an agent loop — we ship capabilities the model orchestrates, plus one Task that encapsulates the autonomous loop for a one-click demo.

| SENTINEL (Python) | NitroStack MCP |
|---|---|
| actuators (`read_logs`, `propose_patch`, `run_tests`, `stage_change`, `simulate_savings`, `approve`) | **Tools** |
| self-heal loop (async, live status) | a **Task** with real-time status |
| incident-commander system prompt (per domain) | **Prompts** |
| audit trail, incident state, cost report, bundled source | **Resources** (JSON/CSV) |
| glass-box trace + confidence gate + HITL | React **Widgets** |
| the agent doing reasoning | the ChatGPT/Studio model |

### Critical design constraint — everything self-contained
The hosted MCP server **cannot** patch/test a separate live FastAPI service (there's no second process on NitroCloud). So:
- **Bundle the "broken service" inside the MCP app** as data/code the server can read, patch, and test **in-process** (a small TS module + a bundled test the server runs via an in-process runner or a deterministic checker). This keeps the whole self-heal demo inside one deployable.
- FinOps is already self-contained (mock cost model) — port it near-verbatim.
- Keep the loop **deterministic + fast** (seconds) so it demos cleanly inside ChatGPT.

---

## 3. Target repo structure

```
sentinel-mcp/                        # new repo → GitHub → NitroCloud auto-deploy
├── src/
│   ├── index.ts                     # bootstrap
│   ├── app.module.ts                # root module (registers all below)
│   ├── core/                        # domain-agnostic engine (ports from Python)
│   │   ├── adapter.ts               # DomainAdapter interface
│   │   ├── confidence.ts            # explainable gate (verify·agent·iters·blast)
│   │   └── engine.ts                # detect→verify→gate→deploy→report lifecycle
│   ├── modules/
│   │   ├── incidents/               # incidents.tools.ts · .tasks.ts · .resources.ts · .prompts.ts
│   │   ├── devops/                  # devops.tools.ts (read_logs/search/patch/run_tests/deploy) · .resources.ts
│   │   ├── finops/                  # finops.tools.ts (report/list/stage/simulate/apply) · .resources.ts
│   │   └── gate/                    # gate.tools.ts (assess_confidence → widget)
│   ├── fixtures/                    # BUNDLED broken sample + tests (self-contained)
│   ├── health/
│   └── widgets/                     # MissionTrace.tsx · ConfidenceGate.tsx · SavingsReport.tsx
├── package.json                     # @nitrostack/core + cli scripts
├── tsconfig.json
├── .gitignore                       # excludes .env, node_modules, secrets
└── README.md                        # overview · setup · architecture · usage
```

---

## 4. Four-day roadmap (essentials first)

### Day 1 — Compliant skeleton + first deploy (MUST)
- `nitrostack-cli init sentinel-mcp --template typescript-starter`; run in Studio App Canvas; `npm run build` clean.
- Push to GitHub; NitroCloud → connect repo → **auto-deploy live**; connect to ChatGPT; verify one tool round-trips end-to-end.
- Port `core/` (adapter interface + confidence gate) from Python — pure logic, unit-tested.
- **Exit:** a trivial tool is live on NitroCloud and callable from ChatGPT. *The riskiest thing (deploy path) is proven on day 1.*

### Day 2 — DevOps vertical, self-contained (MUST)
- `fixtures/` bundled broken module + test. `devops.tools.ts`: read_logs, search_code, propose_patch, run_tests (in-process), deploy.
- `incidents.tasks.ts`: `self_heal` Task = the loop with live status; `submit_resolution` hard-blocked until verify passes.
- `MissionTrace.tsx` widget streams the trace.
- **Exit:** in ChatGPT, "the pricing service is broken" → SENTINEL diagnoses, patches, verifies, resolves — visible in the widget. Deploy + test.

### Day 3 — Confidence gate + HITL + FinOps breadth (SHOULD)
- `gate.tools.ts` → `ConfidenceGate.tsx` (verdict breakdown); low score → native tool-approval before deploy.
- Port `finops/` (mock model + stage/simulate/apply) → `SavingsReport.tsx`.
- **Exit:** both domains resolve through the same engine; HITL modal fires on low confidence. Deploy + test.

### Day 4 — Polish, harden, submit (MUST)
- Audit-trail Resource; Prompts per domain; error paths; README; `.gitignore` clean.
- Record ≤3-min demo (problem → solution → live run in ChatGPT, both domains + a HITL pause).
- Final deploy, end-to-end test, submit via organizer account.

---

## 5. Essential vs. nice-to-have (MoSCoW)

- **Must:** compliant NitroStack MCP app · live on NitroCloud · ChatGPT connection · DevOps self-heal Task with in-process verify · one widget · README · demo video · GitHub auto-deploy.
- **Should:** confidence gate + HITL approval · FinOps 2nd domain · audit-trail Resource · per-domain Prompts.
- **Could:** WeKan card + Slack post tools (sponsor fit) · replay mode · a 3rd domain teaser.
- **Won't (this event):** the Python/FastAPI service, the vanilla-JS dashboard, the Anthropic-Python agent loop — superseded by the MCP equivalents.

---

## 6. NitroStack-specific risks / gotchas

- **`npm run build` must pass** — Compose/cloud build fails hard on TS errors. Build locally before every push.
- **Widget dev server (port 3001)** can time out (45s) — retry connection; keep widgets lean.
- **No separate live service on NitroCloud** → self-contained fixtures (see §2).
- **Node 20.x only.** Don't rely on newer APIs.
- **Secrets:** organizer AI tokens / `nsk_live_` keys go in NitroCloud env / Studio — **never** in git.
- **AI-usage rule:** we must understand every line — code is authored to be readable and reviewed, not black-box generated.
- **Deploy expiry:** presigned upload URL ~15 min, unconfirmed deploy ~30 min — confirm promptly.

---

## 7. Open items (need from you)
1. **The six official tracks** (to lock primary alignment).
2. Confirm the **organizer-provided NitroCloud account / AI tokens** and how we receive them.
3. Node 20.x + NitroStudio installed on the build machine? (env check).
