/**
 * Launch the MENTOR MCP server from anywhere.
 *
 * ## Why this exists
 *
 * `sentinel/dist/index.js` cannot be started from an arbitrary working directory.
 * `@nitrostack/core` resolves a tool's widget HTML relative to **`process.cwd()`**,
 * not to the module, so launching from the monorepo root dies before serving a
 * single request:
 *
 *     ❌ Failed to start server: Error: Exported HTML for route 'causal-timeline'
 *        not found. Tried:
 *          - <cwd>/dist/widgets/out/causal-timeline/index.html
 *
 * That is a rough failure to hand somebody. The message names an HTML file, so the
 * obvious reading is "the widget build is broken" — you would go and rebuild
 * widgets, which changes nothing, rather than move the working directory. It is
 * also silent on stdout, which is where an MCP client is listening, so the client
 * reports a generic connection failure and the real error only exists on stderr.
 *
 * `npm run sentinel:dev` and `npx tsx src/index.ts` both happen to run inside
 * `sentinel/`, which is why this never came up. Any MCP client configured with an
 * absolute path to `dist/index.js` hits it immediately.
 *
 * So: chdir first, then hand over. The same class of trap as `lumina/srv.py`
 * resolving its ONNX models from the process working directory.
 *
 *   npm run mcp          # from anywhere in the repo
 *   node scripts/start-mcp.mjs
 */

import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { existsSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SENTINEL = join(ROOT, 'sentinel');
const ENTRY = join(SENTINEL, 'dist', 'index.js');

// Fail on stderr with something actionable, rather than letting the framework
// throw about a missing HTML file it was never going to find.
if (!existsSync(ENTRY)) {
  console.error(
    'MENTOR is not built. Run:\n\n  npm run sentinel:build\n\n' +
      `Expected ${ENTRY}`,
  );
  process.exit(1);
}

process.chdir(SENTINEL);

// Import rather than spawn: one process, so an MCP client's stdio pipes and
// signal handling reach the server directly with nothing in between to buffer or
// mangle a JSON-RPC frame.
await import(new URL('file://' + ENTRY.replace(/\\/g, '/')).href);
