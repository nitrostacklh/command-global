# `shared/` — the only code the three MCP apps are allowed to have in common

MENTOR is three separately deployed NitroStack MCP applications:

| | App | Owns |
|---|---|---|
| **MCP‑1** | `mcp-roster/` | role → project list → the checkpoint spec |
| **MCP‑2** | `sentinel/` | verification, drift, the build verdict |
| **MCP‑3** | `mcp-profile/` | the student record, and the flashcards |

Three deployments cannot import each other. Everything they say to one another is a
**versioned plain-JSON artifact** defined in [`contracts.ts`](contracts.ts), sent over
MCP as a tool argument. That is the whole integration surface — there is no shared
database, no RPC types, no build-time coupling between the apps.

## What is in here, and why each file earns its place

| File | Why it is shared rather than owned |
|---|---|
| `contracts.ts` | The bridge artifacts themselves. Both ends of every arrow must agree on the envelope, so the envelope is the shared thing. |
| `plan.ts` | `lumina.plan/v1`. MCP‑1 reads it to derive checkpoints in the student's own order; MCP‑2 reads it to find drift. Two readers, one grammar. |
| `component.ts` | `normalizeComponent` — the join key between a canvas label and a code component. If the three apps normalised differently the bridges would silently miss. |
| `identity.ts` | Who is asking. All three resolve it identically or the record keys diverge. |
| `peer.ts` | The MCP-over-HTTP client one app uses to call another, and the honest report of what happened when it could not. |

**Nothing else belongs here.** Domain logic is owned by exactly one app: catalog and
briefs by MCP‑1, drift and verdicts by MCP‑2, profiles and card answers by MCP‑3. If
you find yourself wanting to share a rule, the cut is in the wrong place.

## How it reaches the apps

Each app gets a **copy** at `src/shared/`, written by:

```bash
npm run sync:shared          # copy shared/ into all three apps
npm run sync:shared -- --check   # fail if any copy has drifted
```

Copies, not a workspace package, for one reason that is not laziness: NitroCloud
deploys **one folder**, and each app is mirrored to its own repo at that repo's root.
A `file:../shared` dependency does not survive that trip. The `--check` mode runs
inside `npm run verify`, so a drifted copy fails the build rather than being
discovered in production.

## The concept answers are deliberately NOT here

A flashcard's answer lives only in MCP‑3 (`mcp-profile/src/concepts/`). MCP‑1 hands out
the concept *question* and the concept *key*; it has never held the answer, so no
mistake in MCP‑1 can leak it. That is stronger than a flag on a field — see
`mcp-profile/src/cards/card.ts`.
