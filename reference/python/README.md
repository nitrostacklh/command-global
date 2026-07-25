# ◉ SENTINEL — Autonomous Incident Commander

> A production service breaks. **SENTINEL detects it, reads the logs, finds the root
> cause in the source, writes a fix, proves it in a sandboxed test loop, scores its own
> confidence, deploys — or pauses for a human when unsure — then opens the PR, files the
> WeKan card and posts the Slack update. Every thought and action lands in a replayable
> audit trail you can watch live.**

Built for the **Agentic AI Hackathon 2026** (Amrita Vishwa Vidyapeetham × NitroStack).

---

## Why this wins

| Judge signal | How SENTINEL delivers |
|---|---|
| **True autonomy, not advice** | It doesn't suggest a fix — it deploys one, opens the PR, files the card, posts the thread. |
| **Self-healing loop** | Patch → pytest in isolated sandbox → read failures → revise → repeat until green. `submit_resolution` is *hard-blocked* until tests pass. |
| **Explainability (glass box)** | Live mission-trace dashboard streams the agent's reasoning summaries, every tool call, every diff, every test run. Full JSONL audit trail per incident. |
| **Safety: dynamic human-in-the-loop** | An explainable confidence score (tests × self-report × convergence × blast radius) gates autonomy. Below threshold ⇒ the run pauses and a human approves/rejects in the dashboard. |
| **MCP-native** | SENTINEL's capabilities ship as a real MCP server (`mcp_servers/`) — plug the incident commander into Claude Desktop, Claude Code, or any MCP client. |
| **Not a one-off — a platform** | The engine is domain-agnostic. DevOps is the flagship; a second **FinOps** adapter heals a cloud bill with **zero engine changes**. Same loop, same gate, same audit trail. |
| **Sponsor fit** | WeKan card automation (WeKan sponsor) + MCP server (MCP sponsor). |

## Architecture

```
                        ┌──────────────────────────── SENTINEL ────────────────────────────┐
 Atlas Payments         │  Watchdog ──► Incident Commander (Claude Opus 4.8, tool loop)    │
 (FastAPI, :8000) ◄─────┤     │            │ read_logs · read_file · search_code           │
   /health  /charge     │  polls /health   │ propose_patch ──► Verification Sandbox        │
   logs/service.log ────┤  every 2s        │ run_tests ⟳ self-heal until green             │
                        │                  ▼                                               │
                        │        Confidence Gate (explainable score)                       │
                        │        ≥ threshold ─► auto-deploy      < threshold ─► HITL pause │
                        │                  │                            │ dashboard modal  │
                        │                  ▼                            ▼                  │
                        │        Deploy to live service ──► verify recovery               │
                        │        Report: GitHub PR · WeKan card · Slack thread             │
                        │                                                                  │
                        │  Event Bus ──► WebSocket ──► Glass-box dashboard (:8100)         │
                        │            └─► JSONL audit trail (logs/audit/INC-*.jsonl)        │
                        └──────────────────────────────────────────────────────────────────┘
```

## The pluggable core — one engine, any domain

The remediation loop is domain-agnostic. `sentinel/orchestrator.py` runs
`detect → diagnose → verify → gate → deploy → report` without knowing what it's
healing. Everything domain-specific lives behind one interface,
`DomainAdapter` (`sentinel/adapters/base.py`):

| Adapter responsibility | DevOps (flagship) | FinOps (proof) |
|---|---|---|
| **sensors** — what to watch | service `/health` + logs | cloud spend vs. baseline |
| **actuators** — the agent's tools | read/search code, `propose_patch` | inspect resources, `stage_change` |
| **verification** — how a fix is proven | full `pytest` suite green | savings simulation, no SLA breach |
| **blast radius** — how risky | files & lines changed | resources & $/mo changed |
| **deploy** | promote patch, hot-reload | apply rightsizing plan |
| **report** | GitHub PR + WeKan + Slack | WeKan + Slack |

The engine calls the same lifecycle for both; the confidence gate scores both
with the same weights (the adapter just normalises its own blast-radius signal).
**Adding FinOps required no change to the engine, the gate, the event bus, the
audit trail, or the dashboard** — that's the platform claim, demonstrated.

```powershell
# Run the SAME engine on the FinOps domain (standalone, streams to the terminal):
python -m sentinel.adapters.finops.demo
```

It opens a cloud-spend anomaly, and SENTINEL investigates the bill, stages a
rightsizing plan, simulates the savings + SLA impact, gates on confidence,
applies the plan, confirms spend dropped, and reports — writing the same
`logs/audit/INC-*.jsonl` trail as the DevOps commander.

> Writing a third domain (support-ticket triage, IoT maintenance, …) means
> implementing one `DomainAdapter` subclass. Nothing else moves.

## Quick start

```powershell
# 1. install
python -m venv .venv ; .\.venv\Scripts\Activate.ps1
pip install -r requirements.txt

# 2. credentials
copy .env.example .env     # add ANTHROPIC_API_KEY (or use `ant auth login`)

# 3. launch everything
.\scripts\run_demo.ps1     # service :8000, dashboard :8100
```

Open **http://127.0.0.1:8100**, hit a **Chaos Console** button, and watch.

### The 3-minute demo script

1. Dashboard shows *service healthy*. Click **💸 Tax-before-discount bug** — a real
   regression is written into `service/app/pricing.py`; hot-reload picks it up.
2. Within seconds the health canary fails → SENTINEL opens an incident. The mission
   trace streams live: reasoning summaries, log reads, code search, the patch diff,
   the pytest run.
3. If a first patch fails tests, watch the **self-heal loop** revise and re-verify.
4. The **Autonomy Gate** panel shows the scored verdict. High confidence → autonomous
   deploy; low → the **approval modal** pops with the diff and score breakdown —
   approve it live.
5. Health flips back to green; PR / WeKan / Slack actions appear; incident → RESOLVED.
6. Click the incident to replay its full audit trail. `logs/audit/INC-*.jsonl` is the
   auditor-grade record.

### Chaos catalogue

| Bug | What breaks | Failure mode |
|---|---|---|
| `tax-before-discount` | Tax computed on pre-discount subtotal | Silent overcharge — caught by golden canary |
| `flipped-validation` | Quantity check inverted | Every order rejected (422s) |
| `region-keyerror` | Tax lookup skips normalization | Hard crash (500 KeyError) |

`python -m scripts.inject_bug --list` / `--restore` from the CLI, or use the dashboard.

## Human-in-the-loop policy

```
score = 0.40·verification + 0.25·agent_confidence + 0.20·convergence + 0.15·blast_radius
        (tests green /                             (fewer      (adapter-normalised:
         simulation clean)                          attempts)   files·lines | resources·$)
score ≥ SENTINEL_CONFIDENCE_THRESHOLD (default 0.80)  →  autonomous deploy
score <  threshold                                    →  pause, human approves/rejects
```

Every component ships with a human-readable reason — the gate is *explainable*, not a
black box. Tune the threshold in `.env` to slide between "fully autonomous" and
"always ask".

## MCP server

```bash
# expose SENTINEL to any MCP client (stdio transport)
python -m mcp_servers.sentinel_mcp

# or register with Claude Code
claude mcp add sentinel -- python -m mcp_servers.sentinel_mcp
```

Tools: `get_service_health`, `read_service_logs`, `list_incidents`,
`get_incident_trace`, `approve_incident`, `reject_incident` — the HITL gate itself is
callable over MCP.

## Live connectors (all optional — mock mode is demo-safe)

| Connector | Enable with | Mock behaviour |
|---|---|---|
| Slack | `SLACK_WEBHOOK_URL` | Posts recorded to `logs/mock_actions.jsonl` |
| WeKan | `WEKAN_URL` + credentials | Cards recorded to `logs/mock_actions.jsonl` |
| GitHub PR | `SENTINEL_GITHUB_PR=1` + `gh` CLI | Local commit in service repo; PR mocked |

## Repository layout

```
service/          Atlas Payments — the victim microservice (+ pytest suite)
sentinel/         The domain-agnostic engine: watchdog, orchestrator, confidence gate, server
  adapters/       pluggable domains behind one interface
    base.py       the DomainAdapter contract
    devops/       flagship: heal a microservice (wraps tools/ below)
    finops/       proof: heal a cloud bill (+ standalone runner)
  tools/          DevOps ops: repo/sandbox, observability, GitHub/WeKan/Slack connectors
dashboard/        Glass-box UI (vanilla JS — zero build step, demo-proof)
mcp_servers/      SENTINEL as a Model Context Protocol server
scripts/          Fault injection + one-shot demo launchers
tests/            Offline engine + FinOps suite (no API key needed)
logs/audit/       Replayable JSONL audit trail per incident
```

## Tech

Python 3.10+ · FastAPI · Anthropic SDK (Claude Opus 4.8, adaptive thinking) ·
MCP (FastMCP) · pytest · vanilla-JS dashboard over WebSockets.
