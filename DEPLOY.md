# COMMAND — Deploy Runbook (NitroCloud → ChatGPT)

Get the platform live in ~15 minutes. Do this **early** (hackathon rule: deploy on day 1), then every `git push` auto-redeploys.

## 0. Prerequisites (one-time)
- **Node 20.x** (`node -v` → v20.x; 18+ works, 20 is safest).
- **NitroStudio** desktop app — download from https://nitrostack.ai/studio.
- **NitroCloud account** — use the **organizer-provided** account (submissions must go through it). API keys start `nsk_live_`.
- A **GitHub** repo you can push to.

> ### ⚠️ Read this first — the monorepo changes step 3
>
> The NitroStack app is **not** at the repo root any more. The repo root is
> `command-global/`; the app is in **`sentinel/`**. NitroCloud's *Connect
> Repository* flow expects the repo root to be the NitroStack project (it looks
> for `package.json` + the nitrostack config there).
>
> **Before you do anything else, check whether the NitroCloud "Connect
> Repository" dialog offers a Root Directory / subdirectory field.**
>
> - **If it does** → set it to `sentinel` and follow this runbook unchanged.
> - **If it does not** → use **§3b**, which publishes `sentinel/` alone to its own
>   GitHub repo via `git subtree`. This is the pre-wired fallback; one command.
>
> Either way you keep one source of truth in the monorepo. See `GAPS.md` Gap 1.

## 1. Verify it builds locally
```bash
cd sentinel
npm install
npm run build      # ✓ Widgets bundled + TypeScript compiled
npm test           # ✓ 32/32
```

From the monorepo root, `npm run sentinel:build` and `npm test` do the same thing.

## 2. Try it in NitroStudio (local)
```bash
cd sentinel
npm run dev
```
- Open **NitroStudio → Add Server → Nitro Project →** select the **`sentinel`** folder (the subfolder, *not* the monorepo root) → **Open Project → Studio App Canvas**.
- **Tools** tab → run `self_heal` → watch the mission trace; the **mission-trace** widget renders the result.
- Sign in to NitroCloud (Studio footer → **Connect to NitroCloud**) to unlock **AI Chat**, then ask: *"heal the pricing service"* and approve any tool call.

## 3. Push to GitHub (monorepo — use this if NitroCloud supports a root directory)
```bash
git add -A && git commit -m "COMMAND platform + MENTOR"
git push -u origin main
```
> `.gitignore` already excludes `.env`, keys, `node_modules`, and `lumina/m/*.onnx`. **Never commit secrets.**

## 3b. Fallback — publish only `sentinel/` to its own repo
Use this if NitroCloud cannot deploy from a subdirectory. It pushes the *contents*
of `sentinel/` to the root of a second GitHub repo, so NitroCloud sees a normal
NitroStack project. The monorepo stays the source of truth; this is a one-way mirror.

```bash
git remote add sentinel-origin https://github.com/<you>/command-sentinel.git
git subtree push --prefix sentinel sentinel-origin main
```

Then point NitroCloud at `command-sentinel` instead. Re-run the `subtree push` after
each change to `sentinel/` — or use the wrapper: `npm run push:sentinel`.

> **Note:** `git subtree push` recomputes history each time and gets slow on large
> repos. If it becomes painful, `git push sentinel-origin \`git subtree split --prefix sentinel main\`:main --force` is the faster equivalent.

## 4. Deploy on NitroCloud (auto-deploy from GitHub)
1. https://nitrocloud.ai → **Create Nitrostack App** → name it `command-platform`.
2. App → **MCP → Deployments → Connect Repository**. If prompted, **Install the NitroStack GitHub App** for your org first (Integrations page).
3. Select the repo + `main` branch → **Link Repository & Enable Auto-Deploy** → **Deploy from GitHub**.
   - Monorepo route: set **Root Directory = `sentinel`** if the field exists.
   - Fallback route: select the `command-sentinel` mirror repo from §3b.
4. Watch the pipeline (Pending → Building → Deploying → **Live**). Copy the **Service URL**.

Every push to `main` now redeploys automatically (fallback route: every `npm run push:sentinel`).

## 5. Connect to ChatGPT
1. In the app's **MCP** module, open the **Deploy to ChatGPT** step → copy the **MCP URL** (`{serviceUrl}/sse`).
2. ChatGPT (Plus/Pro) → **Settings → Apps/Plugins → Developer mode** → **＋ Add** → **Server URL** → paste `{serviceUrl}/sse` → **No Auth** → Create → **Connect**.
3. New chat → try the demos below.

## 6a. Demo script — MENTOR (the submission) ⬜ *tool not built yet, see `GAPS.md`*
This is the video to record once `explain_drift` exists. It is the Education & Research
submission; §6b is the platform demo and is the backup if MENTOR isn't finished.

1. Show the student's Lumina canvas: `validate → discount → tax → total`. *"This is the plan they drew before writing code."*
2. Show the failing test: `test 3 ✗`, error points at **line 40**.
3. *"When did I go wrong?"* → `explain_drift` → **causal-timeline** widget: plan row on top, build row below, the drift arrow landing on **line 12** — tax implemented before discount — with **confidence 91%**.
4. Ask it to fix the bug. **It refuses**, and says why. ← *this is the whole pitch; do not cut this beat*
5. Student edits the Lumina graph, re-runs → drift resolved.

## 6b. Demo script — the platform (≤3-min video, backup)
1. *"What can this platform do?"* → `platform_status` (five commanders + AEGIS).
2. *"The pricing service is overcharging discounted orders — fix it."* → `self_heal` → mission-trace widget shows diagnose → patch → tests green → confidence 0.93 → **AEGIS cleared** → resolved.
3. *"Our cloud bill spiked — optimize it."* → `optimize_spend` → money saved, SLA-safe.
4. *"Run the whole organization."* → `run_organization` → **LEDGER pulls in SENTINEL mid-task**, waits, continues; VERDICT + RELAY handle downstream; every action AEGIS-gated. Show the collaboration graph.
5. (Optional safety beat) `verify_output` with a nasty string (e.g. contains `rm -rf /`) → AEGIS blocks + rewrites.

## Troubleshooting
| Symptom | Fix |
|---|---|
| Build fails on push | Run `npm run build` locally first; fix TS errors before pushing. |
| "pending deployment" (400) | Cancel the existing pending deployment, then redeploy. |
| Widget blank in chat | Reconnect the MCP server in Studio / re-open the project. |
| Login stuck in Studio | Wait ~10s → **Switch to API Key** → paste an `nsk_live_...` key. |
| Deploy "waiting for confirmation" | Confirm in the browser; presigned upload expires in ~15 min. |
