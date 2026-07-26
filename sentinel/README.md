# Mentor

> Copilot finishes your code. Mentor makes you finish it.

![Model Context Protocol](https://img.shields.io/badge/Model%20Context%20Protocol-MCP-blue) ![Built with Nitrostack](https://img.shields.io/badge/Built%20with-Nitrostack-0A66FF) ![Status](https://img.shields.io/badge/status-live-brightgreen) ![Tests](https://img.shields.io/badge/tests-72%2F72%20offline-brightgreen) ![Track](https://img.shields.io/badge/track-Education%20%26%20Research-a855f7)

**Mentor** is an [MCP (Model Context Protocol)](https://nitrostack.ai) server that extends AI assistants — like Claude, Cursor, and any MCP-compatible client — with new, real-world capabilities. It is built and deployed on [Nitrostack](https://nitrostack.ai), the fastest way to build, deploy, and share MCP apps.

> ⚠️ **Do not commit to this repository.** It is a **one-way mirror** of `sentinel/` in the
> monorepo, pushed with `git subtree`. Anything committed directly here is clobbered by the
> next mirror push. Send changes to
> **[nitrostacklh/command-global](https://github.com/nitrostacklh/command-global)** instead.

## Table of Contents

- [Overview](#overview)
- [What is MCP?](#what-is-mcp)
- [Features](#features)
- [Tools](#tools)
- [Getting Started](#getting-started)
- [Connect to an MCP Client](#connect-to-an-mcp-client)
- [Deploy Your Own MCP App](#deploy-your-own-mcp-app)
- [Explore More MCP Apps](#explore-more-mcp-apps)
- [FAQ](#faq)
- [Keywords](#keywords)
- [License](#license)

## Overview

Copilot finishes your code. Mentor makes you finish it.

A student picks a real project and a role on it, gets the slice they would actually own in a company, designs that slice on a canvas, then builds against checkpoints derived from their own design. When it breaks, Mentor compares what they planned against what they built and names the decision that caused it — a file and a line — and then refuses to write the fix.

The refusal is the product. The concept flashcard is released only after the student's own tests pass, and only one of the three services ever holds an answer, so a bug in the other two cannot leak what the student is meant to earn.

23 tools across three deployed MCP services (8 · 6 · 9), one loop.

**This repository is one of those three.** It is MCP-2 — drift and the verdict — and it is the half that deploys to NitroCloud. The full project, including the design canvas the student draws in, the demo fixtures and the concept docs, lives at [nitrostacklh/command-global](https://github.com/nitrostacklh/command-global).

```
①  browse_catalog    pick a product type, then a project    mentor.catalog/v1   MCP-1
②  open_brief        what you OWN vs what you're GIVEN      mentor.brief/v1     MCP-1
③  (design canvas)   the architecture you drew, pre-code    lumina.plan/v1      local
④  checkpoints       gates derived from YOUR design         mentor.build/v1     MCP-1→2
⑤  explain_drift     where the build left the plan — then it refuses to fix it  MCP-2
⑥  flashcard         the concept, released only once YOU made the tests pass    MCP-3
                                                            mentor.card/v1
```

Every stage hands the next one a plain-JSON file with a versioned schema. That is the whole architecture — no shared types, no RPC, no database.

## What is MCP?

The **Model Context Protocol (MCP)** is an open standard that lets AI assistants securely connect to external tools, data sources, and services. Instead of being limited to what it was trained on, an AI model can call **MCP servers** to fetch live data, run actions, and integrate with real systems.

This project is one such MCP server. Learn more about building and shipping MCP apps at [nitrostack.ai](https://nitrostack.ai).

## Features

- 🔌 **MCP-native** — works with any MCP-compatible client (Claude, Cursor, and more)
- 🧠 **Needs no model of its own** — in MCP the *client* supplies the model. Mentor's work is an ordering comparison, a weighted confidence score and a refusal; there is nothing to generate, so it runs with **no API key, no network and no per-student cost**
- 🚫 **Refuses on purpose** — `withhold_fix` declines to write the fix and offers a question instead. That refusal is the feature, not a missing capability
- 📊 **Ships a widget** — `explain_drift` renders an interactive **causal-timeline**: the plan on one row, the build on the other, and the drift arrow landing on a line number
- 🔐 **Secure by design** — secrets stay in environment variables, never in code. No `query` or `execute_sql` tool exists, so a client's model never gets arbitrary access to a student's record
- ⚡ **Deployed on Nitrostack** — reliable, hosted, and instantly shareable
- ✅ **72/72 tests, fully offline** — no network, no key, no fixture downloads (182 across all three services)

## Tools

`tools/list` returns **6 tools** on this server — MCP-2's whole story and only MCP-2's.

| Tool | Does |
|---|---|
| `open_session` | Start watching a build against the checkpoint spec MCP-1 issued |
| `build_event` | Record one step the student actually implemented, in the order it happened |
| `build_verdict` | Judge the build against its spec and file the verdict with MCP-3 |
| `explain_drift` | Name where the build left the plan — a file and a line, with a confidence score and the signals behind it. Renders the causal-timeline widget |
| `withhold_fix` | Decline to write the fix, and hand back the question worth asking instead |
| `mentor_status` | What this service owns, and what it will not do |

Every artifact argument is optional and falls back to a bundled demo project, so the server demos standalone — ask it about a failing pricing test with no setup at all.

The other two thirds of the loop are separate deployments: [`mentor-roster`](https://github.com/nitrostacklh/mentor-roster) (MCP-1, 8 tools — catalog, briefs, lessons, the checkpoint spec) and [`mentor-profile`](https://github.com/nitrostacklh/mentor-profile) (MCP-3, 9 tools — the student record, and the only copy of a concept answer).

## Getting Started

### Prerequisites

- **Node.js 20.x** — 18 is the hard minimum, but 20 is what NitroStudio bundles and what the cloud build images use. If a deploy fails for no obvious reason, try `nvm use 20.18.1` first. Node 22.5+ only if you want durable SQLite storage; below that the app falls back to in-memory and says so rather than failing to start
- An MCP-compatible client (Claude Desktop, Cursor, NitroStudio, etc.)

### Installation

```bash
git clone https://github.com/nitrostacklh/mentor-mcp.git
cd mentor-mcp
npm install
```

### Configuration

Optional — the server runs with zero configuration. To customise it:

```bash
cp .env.example .env
```

Everything in `.env.example` is optional and documented inline. Nothing is required: unset, the app runs with no storage, no secret and no network.

### Run

```bash
npm run build
npm test          # 72/72, fully offline
npm start         # builds, then serves
```

## Connect to an MCP Client

**Use the hosted server** — nothing to install:

```json
{
  "mcpServers": {
    "mentor": {
      "type": "http",
      "url": "https://mentor-6a64f852-the-localhosts-amrita-university-coimbatore.app.nitrocloud.ai/mcp"
    }
  }
}
```

**Or run it locally over stdio:**

```json
{
  "mcpServers": {
    "mentor": {
      "command": "npm",
      "args": ["run", "start:prod"],
      "cwd": "/absolute/path/to/mentor-mcp"
    }
  }
}
```

> `cwd` matters. Widget HTML is resolved from the process working directory, so launching the
> entry point from somewhere else fails at startup with an error about a missing HTML file —
> which reads like a broken widget build and is not.

Restart your client, then try it:

1. *"A student's pricing test is failing — when did they go wrong?"* → `explain_drift` names `tax` at `build/pricing.js:12` with confidence 0.91 and renders the causal-timeline widget.
2. *"Great, fix it for me."* → `withhold_fix` declines, and offers *"why does tax have to come after discount?"* instead.

That second answer is the whole product.

## Deploy Your Own MCP App

Want to build and ship an MCP server like this one? **[Nitrostack](https://nitrostack.ai)** lets you create, deploy, and host MCP apps in minutes — no infrastructure to manage.

👉 **Start building:** [https://nitrostack.ai](https://nitrostack.ai)

## Explore More MCP Apps

- 🌙 Discover and share MCP projects with the community on [r/mcptothemoon](https://www.reddit.com/r/mcptothemoon/)
- 🧰 Browse a growing catalog of MCP apps on [Nitrostack](https://nitrostack.ai)

## FAQ

### What is an MCP server?

An MCP server implements the Model Context Protocol to expose tools, resources, and prompts that AI assistants can call. It lets an AI model take real actions and access live data.

### What does Mentor do?

It shows a student the exact moment their build stopped matching the architecture they designed — a file and a line — and then refuses to write the fix, handing them the question worth asking instead.

### Why would I want a tool that refuses to help?

Because a fix you were handed teaches you nothing. Mentor has the design the student drew *before* they started, so it can answer "when did I go wrong?" rather than "what is wrong with this code?" — and then it stops, so the student writes the fix and earns the concept.

### Does it need an API key or a model?

No. In MCP the client supplies the model. This server's own work is a comparison, a confidence formula and a refusal, so it runs offline with no key and no network.

### Why three servers instead of one?

The split is the security boundary. Only MCP-3 ever holds a flashcard answer, so a bug in the catalog or the verifier cannot leak what the student is meant to earn — not because the answer is filtered out, but because it was never in those processes.

### Which AI clients does this work with?

Any MCP-compatible client, including Claude Desktop, Cursor and NitroStudio. New clients are adding MCP support regularly.

### How do I deploy my own MCP app?

Use [Nitrostack](https://nitrostack.ai) to build, deploy, and host MCP apps without managing infrastructure.

## Keywords

`Education & Research` · `Mentor` · `MCP` · `Model Context Protocol` · `MCP server` · `MCP app` · `AI tools` · `AI agents` · `LLM tools` · `Claude MCP` · `Nitrostack` · `deploy MCP server` · `build MCP app` · `computer science education` · `code review` · `architectural drift` · `learning loop`

## License

No licence file is committed yet — see the note in the monorepo before reusing this code.

---

Built with ❤️ using the Model Context Protocol on [Nitrostack](https://nitrostack.ai). Share your MCP app on [r/mcptothemoon](https://www.reddit.com/r/mcptothemoon/).

Built for the Amrita Vishwa Vidyapeetham × NitroStack Agentic AI Hackathon.
