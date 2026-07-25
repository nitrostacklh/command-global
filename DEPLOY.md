# COMMAND — Deploy Runbook (NitroCloud → ChatGPT)

Get the platform live in ~15 minutes. Do this **early** (hackathon rule: deploy on day 1). **Read the box below first** — the fastest path is Studio's Deploy button, not GitHub.

## 0. Prerequisites (one-time)
- **Node 20.x** (`node -v` → v20.x; 18 is Studio's hard minimum, 20 is what Studio bundles and what the cloud Docker images use — use 20).
- **NitroStudio** desktop app — nitrostack.ai → Product → Studio. The **desktop app is required**: STDIO spawns a local process and HTTP needs a CORS bypass, so neither works in a browser.
- **NitroCloud account** — use the **organizer-provided** account (submissions must go through it). API keys are `nsk_live_` + 64 chars.
- **ChatGPT Plus or Pro** — Developer mode is gated behind a paid plan. Confirm someone on the team has one *before* demo day; without it §6 is impossible.
- A **GitHub** repo you can push to — only needed for deploy path C.

### Signing in to Studio
Local features (Tools, Resources, Logs, Health) work signed out. **AI Chat, Compose,
and cloud deploy all require being signed in.** Two ways: *Continue with NitroCloud*
(browser, recommended) or the *API Key* tab. If the browser flow hangs on
"Waiting for login…", a **Switch to API Key** link appears after ~10s — use it with an
`nsk_live_...` key from https://nitrocloud.ai/home/api-keys.

> ### ⚠️ Read this first — there are THREE deploy paths, and two ignore the monorepo
>
> *(Updated after reading `NitroStack_Studio_Handbook.pdf` §9, 2026-07-25.)*
>
> The NitroStack app is **not** at the repo root. The root is `command-global/`; the
> app is **`sentinel/`**. That only matters for one of the three paths:
>
> | Path | Deploys | Monorepo-safe? |
> |---|---|---|
> | **A. Deploy from Studio** (App Canvas / Compose) | the **connected project folder** — bundles and uploads it | ✅ **yes** |
> | **B. Upload a code package** (`.zip`, ≤100 MB) | whatever you zip | ✅ yes — `sentinel/` zips to **0.21 MB** |
> | **C. Connect GitHub** (auto-deploy on push) | the linked repo **at its root** | ⚠️ the open question |
>
> **Use A to get live today.** Studio deploys the folder you connected, so the
> subdirectory question never comes up. Then add C later if you want push-to-deploy —
> that's a convenience, not the blocker it looked like.
>
> The handbook documents no Root Directory field for path C (§9 "Connect Repository"
> is repo + branch only), so assume C needs the `git subtree` mirror in **§5** until
> someone sees otherwise in the dialog. See `GAPS.md` Gap 1.
>
> **Point Studio at `sentinel/`, never the repo root.** Studio validates a project by
> looking for `package.json` + `src/index.ts` + the `@nitrostack/core` dependency
> (handbook §5). The root has only the first, so it is correctly rejected as invalid.

## 1. Verify it builds locally
```bash
cd sentinel
npm install
npm run build      # ✓ Widgets bundled + TypeScript compiled
npm test           # ✓ 32/32
```

From the monorepo root, `npm run sentinel:build` and `npm test` do the same thing.

## 2. Try it in NitroStudio (local)

**Don't run `npm run dev` first.** Studio launches the project itself with
`npx tsx src/index.ts`, and auto-runs `npm install` if dependencies are missing.

- **NitroStudio → Add Server → Nitro Project** → browse to the **`sentinel`** folder
  (the subfolder, *not* the monorepo root — the root is not a valid Studio project).
  A valid folder shows a **NitroStack badge**.
- **Open Project** → choose **Studio App Canvas** (inspect tools/resources/widgets)
  rather than **Vibe Code**.
- **Tools** (sidebar → App) → pick `self_heal` → **Execute Tool**. Inputs are generated
  from the tool's `inputSchema`; the **mission-trace** widget renders under
  *Widget Preview* (Mobile/Tablet/Desktop). **Run as Task** exercises the async path.
- **Logs** (sidebar → SYSTEM) → *Server Logs* / *Traffic* tabs show MCP traffic; expand
  a row for params/result/error. This is where to look when a tool misbehaves.
- Sign in to NitroCloud to unlock **AI Chat**, then ask *"heal the pricing service"* and
  **Allow** the tool-approval modal.

> **Gotcha — `tsx` must be a declared dependency.** Studio's launch command is
> `npx tsx src/index.ts`. `tsx` was *not* in `package.json`, so `npx` had to fetch it at
> launch — which fails on a flaky network or a locked npm cache (seen here: `EPERM` on
> cache cleanup, server never started, no output). It is now a `devDependency`, so the
> launch is deterministic and offline. **Verified:** `npx tsx src/index.ts` serves
> `initialize` + `tools/list` over stdio and registers all 20 tools.
>
> If Studio ever says *"Dependencies not installed or out of date…"* or *"tsx is not
> available…"*, run `npm install` inside `sentinel/` manually.

## 3. Deploy path A — from Studio (recommended; monorepo-safe)

Deployment is **not** a sidebar page — it lives on the **App Canvas** header and in
Compose's MCP chat header.

1. Header → **Link to app…** to pick an existing cloud app, or **Create Cloud App**.
2. Click **Deploy**. The modal walks: Preparing bundle → Uploading project →
   **Waiting for confirmation** → Building and deploying → Deployment live.
3. At the confirmation step click **Open Confirmation Page** and confirm in the browser.
   (**Run in background** is available.) When live, the modal shows the **Service URL**.

> ⏱ **Two clocks.** The presigned upload URL expires in **15 minutes**, and an
> unconfirmed deployment expires in **30 minutes**. Don't start a deploy and wander off.
>
> If you get *"You already have a pending deployment"* (HTTP 400), **cancel the pending
> one first**, then redeploy.

Because Studio deploys the folder you connected (`sentinel/`), the monorepo layout is
irrelevant on this path. Skip to **§6** to connect ChatGPT.

## 4. Deploy path B — upload a .zip

NitroCloud → app → **MCP** ("Ship your MCP server") → **Upload a code package** → drag a
`.zip` (max **100 MB**). `sentinel/` without `node_modules`/`dist` zips to **0.21 MB**, so
the limit is not a concern. Useful when Studio can't reach the network but a browser can.

## 5. Deploy path C — GitHub auto-deploy (optional; the monorepo-sensitive one)

Nice to have, not required. Once linked, every push to the branch redeploys.

**First, create the cloud app** (any path needs this):
https://nitrocloud.ai → `/home` or `/home/apps` → **Create Nitrostack App** → name it
(min 2 chars) → **Create App**. You land on `/apps/:id` with an **MCP** sidebar
(Deployments, Integrations, Logs, Monitoring, Domains, Settings).

**Then link a repo:**

1. App → **MCP → Deployments**. If the *Deploy from GitHub* card says the GitHub App
   isn't installed, click **Go to Organization Integrations** → **Install App** and
   authorise NitroStack for your org.
2. **Connect Repository** → search + select the repo → choose the branch (`main`) →
   **Link Repository & Enable Auto-Deploy**.
3. **Look for a Root Directory field here.** The handbook documents repo + branch only.
   - **Field exists** → set it to `sentinel`. Push the monorepo and you're done:
     ```bash
     git add -A && git commit -m "COMMAND platform + MENTOR" && git push -u origin main
     ```
   - **No field** → mirror `sentinel/`'s *contents* to the root of a second repo, so
     NitroCloud sees a plain NitroStack project. The monorepo stays the source of truth;
     this is a one-way mirror:
     ```bash
     git remote add sentinel-origin https://github.com/<you>/command-sentinel.git
     npm run push:sentinel
     ```
     Then link `command-sentinel` instead, and re-run `npm run push:sentinel` after every
     change to `sentinel/`.
4. **Deploy from GitHub** → the Deployment Details page streams
   Pending → Building → Deploying → **Live**, with build logs. Copy the **Service URL**.

> `.gitignore` already excludes `.env`, keys, `node_modules`, and `lumina/m/`. **Never commit secrets.**
>
> `git subtree push` recomputes history each time and slows down as the repo grows. If it
> gets painful: ``git push sentinel-origin `git subtree split --prefix sentinel main`:main --force``.

## 6. Connect to ChatGPT

The MCP URL is **`{serviceUrl}/sse`** — the base Service URL is on the deployment details
page, and the full URL has a copy button in the **Deploy to ChatGPT** step.

1. NitroCloud → live app **Overview** → the **MCP** module → **Deploy to ChatGPT** → copy the **MCP URL**.
2. ChatGPT (**Plus or Pro required**) → **Settings → Plugins (Apps)** → **Developer mode**.
3. Plugins page → **＋** → New Plugin dialog: leave **Connection = Server URL**, set
   **Authentication = No Auth**, paste `{serviceUrl}/sse`, give it a Name, tick
   *"I understand and want to continue"* → **Create**.
4. On *"Add {app} to ChatGPT"* → **Connect**. ChatGPT loads the tools.
5. New chat → run the demo below.

> **Widgets blank?** Disconnect and reconnect the MCP server to force a widget reload
> (Studio: *Retry Connection* in Compose, or remove and re-add the project on App Canvas).

## 7a. Demo script — MENTOR (the submission) ⬜ *tool not built yet, see `GAPS.md`*
This is the video to record once `explain_drift` exists. It is the Education & Research
submission; §7b is the platform demo and is the backup if MENTOR isn't finished.

1. Show the student's Lumina canvas: `validate → discount → tax → total`. *"This is the plan they drew before writing code."*
2. Show the failing test: `test 3 ✗`, error points at **line 40**.
3. *"When did I go wrong?"* → `explain_drift` → **causal-timeline** widget: plan row on top, build row below, the drift arrow landing on **line 12** — tax implemented before discount — with **confidence 91%**.
4. Ask it to fix the bug. **It refuses**, and says why. ← *this is the whole pitch; do not cut this beat*
5. Student edits the Lumina graph, re-runs → drift resolved.

## 7b. Demo script — the platform (≤3-min video, backup)
1. *"What can this platform do?"* → `platform_status` (five commanders + AEGIS).
2. *"The pricing service is overcharging discounted orders — fix it."* → `self_heal` → mission-trace widget shows diagnose → patch → tests green → confidence 0.93 → **AEGIS cleared** → resolved.
3. *"Our cloud bill spiked — optimize it."* → `optimize_spend` → money saved, SLA-safe.
4. *"Run the whole organization."* → `run_organization` → **LEDGER pulls in SENTINEL mid-task**, waits, continues; VERDICT + RELAY handle downstream; every action AEGIS-gated. Show the collaboration graph.
5. (Optional safety beat) `verify_output` with a nasty string (e.g. contains `rm -rf /`) → AEGIS blocks + rewrites.

## Troubleshooting

Verbatim error strings from the Studio handbook §11, plus what we hit ourselves.

| What you'll see | Fix |
|---|---|
| *"Connection Failed"* + **Retry Connection** | Click Retry; **read the error text underneath** — it's specific. |
| *"tsx is not available…"* / *"Dependencies not installed or out of date…"* | `cd sentinel && npm install`. `tsx` is a declared devDependency now, so this shouldn't recur. |
| *"Project directory not found: '…' The folder may have been moved or deleted."* | Remove the project in Studio and re-add it from the new path. Will happen if `command-global/` is moved. |
| *"Command '…' not found. Please ensure Node.js and npm are installed…"* | Install Node 18+ (20.x), or use **Install bundled Node.js** in onboarding (installs v20.11.0). |
| *"Node.js {N} is too old"* | Upgrade from nodejs.org → **Re-check**. |
| *"Waiting for login…"* never completes | Wait ~10s → **Switch to API Key** → paste an `nsk_live_...` key. |
| *"Sign-in didn't complete securely. Close other NitroCloud login tabs…"* | Close other NitroCloud tabs and retry, or use an API key. |
| *"You already have a pending deployment"* (400) | **Cancel the pending deployment first**, then redeploy. |
| *"Deployment failed"* + a reason | Read the subtitle. If it's *waiting for confirmation*, confirm in the browser — presigned URL dies at 15 min, the deployment at 30. |
| *"Widget dev server started on port {N} but did not respond within 45s"* | Retry the connection. Widget dev server defaults to **port 3001** — make sure nothing else has it. |
| *"MCP server unreachable after 5 reconnect attempts"* | Reopen the project in Studio. |
| Widgets stay blank / don't render | Disconnect and reconnect the MCP server to reload widgets. |
| Build fails on push (path C) | `npm run build` locally first; fix TS errors before pushing. Compose feeds build errors back to the agent, but GitHub auto-deploy just fails. |
| Studio rejects the folder | You pointed it at the monorepo root. Point it at **`sentinel/`** — Studio needs `package.json` + `src/index.ts` + `@nitrostack/core`. |

### Restore paths (handbook §11)
- **Compose → Checkpoints** (bottom chat dock): **Save** snapshots the working tree; the ↩ icon reverts. Uses a shadow branch, so your git HEAD is untouched.
- **Compose → Diff queue** (*Recent edits*): per-file **Revert** or **Keep**; **Keep all** clears it.
- **AI Chat → history → Closed/Cleared** → ↻ **Restore chat**.

### Port map (avoid collisions before you demo)
| Port | What |
|---|---|
| 3001 | Studio's widget dev server (`sentinel/`) |
| 3000 | Lumina's Next.js frontend |
| 8000 | Lumina's FastAPI backend |
| 8100 | `reference/python/` control plane (only if you run the prototype) |
