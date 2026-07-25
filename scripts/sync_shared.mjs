/**
 * Copy `shared/` into each app, and fail loudly when a copy has drifted.
 *
 *   node scripts/sync_shared.mjs            # write the copies
 *   node scripts/sync_shared.mjs --check    # verify them, exit 1 on drift
 *
 * ## Why copies and not a workspace package
 *
 * Each MCP app is deployed to NitroCloud as **one folder**, mirrored to its own
 * GitHub repo at that repo's root (NitroCloud's Connect Repository dialog has no
 * root-directory field — see DEPLOY.md). A `file:../shared` dependency does not
 * survive that trip: the sibling directory simply is not in the mirror.
 *
 * So the contracts are duplicated, on purpose, and the duplication is *guarded*
 * rather than trusted. `--check` runs inside `npm run verify`, which means a
 * hand-edit to one app's copy fails the build with the file name in the message
 * instead of becoming a bridge that silently disagrees with the other end.
 *
 * The generated banner is what makes the rule discoverable at the point someone
 * would break it: you cannot open a copy without being told where the original is.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = join(ROOT, 'shared');
const CHECK = process.argv.includes('--check');

/**
 * Where each app wants its copy. The apps differ because a NitroStack server
 * compiles `src/` while a Next.js client resolves from its own root.
 */
const TARGETS = [
  { app: 'mcp-roster', dir: join(ROOT, 'mcp-roster', 'src', 'shared') },
  { app: 'sentinel', dir: join(ROOT, 'sentinel', 'src', 'shared') },
  { app: 'mcp-profile', dir: join(ROOT, 'mcp-profile', 'src', 'shared') },
  { app: 'studio', dir: join(ROOT, 'studio', 'shared') },
];

const BANNER = (file) =>
  `// ─────────────────────────────────────────────────────────────────────────────\n` +
  `// GENERATED FILE — do not edit here.\n` +
  `//\n` +
  `// The original is shared/${file} at the monorepo root. Three deployed services\n` +
  `// need the same copy of the bridge contracts, and each deploys as a lone folder,\n` +
  `// so the file is duplicated and the duplication is guarded:\n` +
  `//\n` +
  `//   npm run sync:shared            regenerate every copy\n` +
  `//   npm run sync:shared -- --check fail if any copy has drifted (runs in verify)\n` +
  `// ─────────────────────────────────────────────────────────────────────────────\n\n`;

const G = (s) => `\x1b[32m${s}\x1b[0m`;
const R = (s) => `\x1b[31m${s}\x1b[0m`;
const DIM = (s) => `\x1b[2m${s}\x1b[0m`;

if (!existsSync(SOURCE)) {
  console.error(R(`shared/ not found at ${SOURCE}`));
  process.exit(1);
}

const files = readdirSync(SOURCE).filter((f) => f.endsWith('.ts'));
if (files.length === 0) {
  console.error(R('shared/ contains no .ts files — nothing to sync'));
  process.exit(1);
}

let drifted = 0;
let written = 0;
let skipped = 0;

console.log(`\n\x1b[1m${CHECK ? 'Checking' : 'Syncing'}\x1b[0m ${files.length} shared file(s)\n`);

for (const target of TARGETS) {
  // An app that does not exist yet is not a failure — the three MCPs and the
  // studio client land at different points in the build, and a check that broke
  // on a not-yet-created directory would block the very commit that creates it.
  const appRoot = join(ROOT, target.app);
  if (!existsSync(appRoot)) {
    console.log(`  ${DIM(`skip ${target.app} — not present`)}`);
    skipped++;
    continue;
  }

  if (!CHECK) mkdirSync(target.dir, { recursive: true });

  for (const file of files) {
    const wanted = BANNER(file) + readFileSync(join(SOURCE, file), 'utf8');
    const dest = join(target.dir, file);

    if (CHECK) {
      const actual = existsSync(dest) ? readFileSync(dest, 'utf8') : null;
      if (actual === null) {
        console.log(`  ${R('MISSING')}  ${target.app}/…/${file}`);
        drifted++;
      } else if (actual !== wanted) {
        console.log(`  ${R('DRIFTED')}  ${target.app}/…/${file}`);
        drifted++;
      } else {
        console.log(`  ${G('ok')}       ${target.app}/…/${file}`);
      }
      continue;
    }

    const actual = existsSync(dest) ? readFileSync(dest, 'utf8') : null;
    if (actual === wanted) {
      console.log(`  ${DIM(`unchanged ${target.app}/…/${file}`)}`);
      continue;
    }
    writeFileSync(dest, wanted, 'utf8');
    written++;
    console.log(`  ${G('wrote')}    ${target.app}/…/${file}`);
  }
}

console.log('');
if (CHECK) {
  if (drifted === 0) {
    console.log(G('shared contracts are identical in every app.'));
    if (skipped) console.log(DIM(`(${skipped} app(s) not present yet)`));
    process.exit(0);
  }
  console.log(R(`${drifted} copy/copies differ from shared/.`));
  console.log('Run:  npm run sync:shared');
  process.exit(1);
}

console.log(G(`${written} file(s) written.`));
if (skipped) console.log(DIM(`(${skipped} app(s) not present yet)`));
