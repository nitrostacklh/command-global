# MENTOR — Deploy Runbook (NitroCloud)

Get it live in ~15 minutes. Do this **early** — an explicit rule (*"Deploy your project to
NitroStack Cloud as soon as you have a working prototype"* / *"Don't wait until the last
hour"*). **Read the box below first** — the fastest path is Studio's Deploy button, not GitHub.

> ### ✅ Pre-flight — already done for you (2026-07-25)
>
> Everything in §1 has been run and passed, so start at §2 unless you've changed code.
>
> | Check | Result |
> |---|---|
> | `git push origin main` | ✅ **pushed** — MENTOR is on GitHub, `main` green |
> | `npm run build` in `sentinel/` | ✅ clean — `dist` + `src/widgets/out/` |
> | `npm run verify` at root | ✅ 107/107 + fixture guard (Node-only) · `verify:all` adds the plan-determinism check |
> | **clean `git clone` → `install:all` → `verify`** | ✅ passes with nothing pre-installed — the judge's path |
> | `npm run build` in `lumina/` | ✅ Next.js production build clean, 6 routes |
> | `prompts/get debugging_tutor` | ✅ **fixed** — every `@Prompt` returned the wrong shape and had never worked |
> | **built** `node dist/index.js` over stdio | ✅ `initialize` → **`mentor 1.0.0`**; `tools/list` → exactly `explain_drift`, `withhold_fix`, `mentor_status` |
> | `explain_drift` on the built artifact | ✅ origin `tax @ build/pricing.js:12`, confidence **0.91**, `fix_withheld: true` |
> | `resources/list` | ✅ advertises **only** `causal-timeline` (+ health, examples) — `mission-trace` removed |
>
> That last row matters: `mission-trace`'s example payload contained the patch MENTOR
> exists to withhold, and it was being served one layer below the tool surface. Fixed.
>
> **What is left is entirely on the NitroCloud side** — it needs the Studio desktop GUI and
> a sign-in to the organizer-provided account, so it can't be automated from a terminal.

## 0. Prerequisites (one-time)
- **Node 20.x** (`node -v` → v20.x; 18 is Studio's hard minimum, 20 is what Studio bundles and what the cloud Docker images use — use 20).
- **NitroStudio** desktop app — nitrostack.ai → Product → Studio. The **desktop app is required**: STDIO spawns a local process and HTTP needs a CORS bypass, so neither works in a browser.
- **NitroCloud account** — use the **organizer-provided** account (submissions must go through it). API keys are `nsk_live_` + 64 chars.
- **An MCP client to demo in.** See §6 — **NitroStudio's own AI Chat is the default** and needs only NitroCloud sign-in. ChatGPT is optional and its Developer mode requires a paid plan.
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
> | **C. Connect GitHub** (auto-deploy on push) | the linked repo **at its root** | ⚠️ needs a root-dir field or the §5 mirror — **and is optional, see below** |
>
> **Use A to get live today.** Studio deploys the folder you connected, so the
> subdirectory question never comes up.
>
> **Do you also need C?** Read the rules carefully — they say two different things at two
> different strengths. The *Before Submission* **checklist** requires only *"Ensure your
> project is successfully deployed on NitroStack Cloud"*, which **path A satisfies in full.**
> Auto-redeploy appears in the Do's as advice (*"continue pushing updates to GitHub so
> NitroStack Cloud can automatically redeploy your latest changes"*), not as a criterion. So
> **C is a convenience — get live with A, then wire C if you have time.**
>
> The rules *do* independently require the code on GitHub with a stable, deployable default
> branch and a public repo through judging. That is already satisfied: `origin/main` carries the full
> project and is green.
>
> The handbook documents no Root Directory field for path C (§9 "Connect Repository"
> is repo + branch only), so if you wire C:
> 1. Look for a Root Directory / subdirectory field in the real dialog. If it exists, point
>    it at **`sentinel/`** and you're done.
> 2. If it doesn't, use the `git subtree` mirror in **§5**. Note `npm run push:sentinel`
>    pushes to a remote named **`sentinel-origin`, which does not exist yet** — create the
>    second repo first, then
>    `git remote add sentinel-origin <url>`. `sentinel/` is self-contained and valid on its
>    own (`name: "mentor"`, has `src/index.ts` and `@nitrostack/core`), so its root is a
>    legitimate NitroStack project root.
>
> See `GAPS.md` Gap 1.
>
> **Point Studio at `sentinel/`, never the repo root.** Studio validates a project by
> looking for `package.json` + `src/index.ts` + the `@nitrostack/core` dependency
> (handbook §5). The root has only the first, so it is correctly rejected as invalid.

## 1. Verify it builds locally
```bash
cd sentinel
npm install
npm run build      # ✓ Widgets bundled + TypeScript compiled
npm test           # ✓ 107/107
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
- **Tools** (sidebar → App) → pick **`explain_drift`** → **Execute Tool**. It takes no
  required arguments, so just run it; the **causal-timeline** widget renders under
  *Widget Preview* (Mobile/Tablet/Desktop). Then run **`withhold_fix`** and read what it
  refuses to do — that beat is the pitch.
- **Logs** (sidebar → SYSTEM) → *Server Logs* / *Traffic* tabs show MCP traffic; expand
  a row for params/result/error. This is where to look when a tool misbehaves.
- Sign in to NitroCloud to unlock **AI Chat**, then ask *"a student's pricing test is
  failing — when did they go wrong?"* and **Allow** the tool-approval modal.

> **Gotcha — `tsx` must be a declared dependency.** Studio's launch command is
> `npx tsx src/index.ts`. `tsx` was *not* in `package.json`, so `npx` had to fetch it at
> launch — which fails on a flaky network or a locked npm cache (seen here: `EPERM` on
> cache cleanup, server never started, no output). It is now a `devDependency`, so the
> launch is deterministic and offline. **Verified:** `npx tsx src/index.ts` serves
> `initialize` as `mentor 1.0.0` and returns exactly 3 tools — `explain_drift`,
> `withhold_fix`, `mentor_status`. If you see twenty-three, the platform modules got
> re-registered in `app.module.ts`; see `GAPS.md` Gap 11 for why that breaks the demo.
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

## 6. Connect a client

You need *something* with a model in it to drive the tools. Two options, and the first
costs nothing beyond the NitroCloud account you already need.

### 6a. NitroStudio AI Chat — the default, no paid plan

Studio's **AI Chat** (sidebar → AGENT → Chat) is a full MCP client: it has a model picker,
it calls your tools automatically, it shows a tool-approval modal, and it renders your
widgets live. It is gated on **NitroCloud sign-in**, not on any ChatGPT subscription.

1. Sign in to NitroCloud (Studio footer → **Connect to NitroCloud**).
2. Open **AI Chat**, pick a model, and ask: *"a student's pricing test is failing — when did
   they go wrong?"*
3. **Allow** the `explain_drift` tool call. The **causal-timeline** widget renders in-chat.
4. Then ask it to fix the bug, and watch `withhold_fix` decline.

> ⚠️ **Confirm this satisfies the submission rules.** Notes from the official handbook and
> Do's & Don'ts record a requirement to connect to ChatGPT at `{serviceUrl}/sse`. If that is
> a hard criterion, a Studio demo will not substitute — **ask the organizers**, and if they
> insist, borrow *one* teammate's Plus account for the ten minutes §6b takes. Don't buy five.

### 6b. ChatGPT — optional, needs Plus or Pro

The MCP URL is **`{serviceUrl}/sse`** — the base Service URL is on the deployment details
page, and the full URL has a copy button in the **Deploy to ChatGPT** step.

1. NitroCloud → live app **Overview** → the **MCP** module → **Deploy to ChatGPT** → copy the **MCP URL**.
2. ChatGPT → **Settings → Plugins (Apps)** → **Developer mode**.
3. Plugins page → **＋** → leave **Connection = Server URL**, set **Authentication = No Auth**,
   paste `{serviceUrl}/sse`, name it, tick *"I understand and want to continue"* → **Create**.
4. On *"Add {app} to ChatGPT"* → **Connect**. ChatGPT loads the tools.

### 6c. Any local MCP client (fully offline)

Nothing in `sentinel/` calls an LLM — zero API keys, zero outbound requests, and the whole
suite runs with no model. So any MCP client works, including ones backed by a local Ollama
model: Claude Code (`claude mcp add`), Open WebUI, LibreChat, Continue, Cline.

Point them at the **stdio** transport rather than the deployed URL:

```bash
cd sentinel && npx tsx src/index.ts
```

Small local models are unreliable multi-step tool planners, but that barely matters here:
`explain_drift` is one call with no arguments, so the model only has to decide *which tool*,
not plan a loop.

> **Widgets blank?** Disconnect and reconnect the MCP server to force a widget reload
> (Studio: *Retry Connection* in Compose, or remove and re-add the project on App Canvas).

## 7a. Demo script — MENTOR (the submission) ✅ *built and verified*
Record this one. It is the Education & Research submission; §7b is the platform demo, now
the backup and the "it also runs five other domains" beat.

> **Rehearse it with `npm run probe` first.** That command walks all six stages over real
> MCP and prints each artifact, so you can time the beats and confirm every number below
> before you point a camera at Studio.

**The three minutes are tight. Beats 4 and 6 are the ones nobody else can show — protect
those two and cut anything else if the clock runs out.**

1. **The choice** (~20s). `browse_catalog` → three product types. Pick `web-service` → the
   pricing project. *"Real projects, and it says out loud that 2 of 5 roles are playable."*
2. **The role** (~30s) — `open_brief` with `pricing` / `backend`. Read the three lists off
   the screen: **owns** `validate, discount, tax, total`; **given** `cart API (frontend)`,
   `payment gateway (payments)`; **not yours** `receipt`. *"You don't build the system. You
   build your slice, against interfaces other people own — like a real job."*
3. **The design** (~25s). Lumina canvas: four **Component** nodes,
   `validate → discount → tax → total`. Hit **Plan** to export live if you want the beat —
   the checked-in fixture is byte-identical to what that button produces (`GAPS.md` Gap 2).
4. **Scope drift** (~25s) ⭐. Drag a `receipt` node on and call `check_scope`. → **`receipt`
   is not yours to build.** *"It knows what your job is, so it can tell you when you've
   wandered into someone else's."* Delete it; `in_scope: true`.
5. **The work** (~20s). `checkpoints` → six, sequenced by **the order they drew**, with
   dependencies from their own edges. *"Not our checklist. Theirs."*
6. **The drift** (~40s) ⭐⭐ — the money beat. Show the failing test (`test 3 ✗`, **line
   40**). *"When did I go wrong?"* → `explain_drift` (**no arguments** — bundled demo) → the
   **causal-timeline** widget: plan row on top, build row below, `tax` highlighted in both,
   the drift arrow landing on **line 12**, **confidence 0.91** in five signals each with its
   reason. Point at the `provenance` bar — 40%. *"It tells you where it's guessing."*
7. **The refusal** (~25s) ⭐⭐. **Ask it to fix the bug.** → `withhold_fix` declines and says
   why. Then click **"Ask instead → Why does tax have to come after discount?"** — the
   refusal hands the student the next question instead of a patch.
   ← *this is the whole pitch; do not cut this beat*
8. **The card** (~20s). Ask for the flashcard with the tests still red → **withheld, and the
   answer is not in the response at all.** *"You earn the concept by fixing it yourself."*
   If you have the seconds, paste passing output and watch it release.

**If a judge asks "is this one hardcoded demo?"** — the honest answer, and it is a good one:
`fixtures/safety-gear/` runs the identical loop with three owned components instead of four,
a different bug (alerting on a condition that did not exist yet), and a **tracked** build
history rather than an authored one — which scores **0.97** against pricing's 0.91 on the
same formula, because the evidence was observed rather than remembered. `npm run probe`
demonstrates it in about fifteen seconds.

## 7b. Demo script — the platform (backup only, and **not runnable as shipped**)

> ⚠️ **Requires re-enabling the platform modules first.** `app.module.ts` registers only
> `MentorModule`; every tool below is unregistered, deliberately — `self_heal` runs on the
> same pricing service and the same `tax-before-discount` bug as MENTOR's fixture and
> offers to patch it, which contradicts the submission's whole thesis in front of a judge.
> Full reasoning in `GAPS.md` Gap 11. To record this demo, uncomment the six imports and
> the `imports:` entries, and **re-comment them before deploying the submission.**

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
