/**
 * Push `command-global` and every MCP mirror from one command.
 *
 * ## Why mirrors exist at all
 *
 * NitroCloud's Connect Repository dialog has **no Root Directory field** — confirmed in the
 * real console, `DEPLOY.md` §5. It deploys the repo it is given, at that repo's root. Our
 * three apps live in subdirectories of a monorepo, so path C (auto-deploy on push) is only
 * available if each app also exists as a repo whose root *is* that app. That is what these
 * mirrors are. They are a deployment mechanism, not a second copy of the project.
 *
 * `command-global` stays the source of truth. **The mirrors are one-way.** Never commit into
 * one: the next push here overwrites it, and you will lose the work without a warning.
 *
 * ## Why `subtree split` + force-push rather than `subtree push`
 *
 * `git subtree push` recomputes the whole history on every run and gets slower as the repo
 * grows — `DEPLOY.md` §5 already flags this and gives the escape hatch. This *is* the escape
 * hatch, made routine: `subtree split` produces the same commit, and force-pushing it is
 * safe precisely because nothing else is allowed to write to a mirror.
 *
 *   npm run push            # origin + all three mirrors
 *   npm run push -- --dry-run
 *   npm run push -- sentinel roster      # only these
 *   npm run push -- --no-origin          # mirrors only
 *
 * A missing remote is not an error you have to decode — the script prints the exact
 * `git remote add` line and carries on with the others.
 */

import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/** The GitHub org the mirrors live in. Override with MENTOR_MIRROR_ORG. */
const ORG = process.env.MENTOR_MIRROR_ORG ?? 'nitrostacklh';

/**
 * One row per deployable app. `name` is what you type on the command line.
 *
 * `repo` is the mirror's GitHub name — change these to whatever you actually create, or set
 * MENTOR_MIRROR_<NAME> to override one without editing this file.
 */
const TARGETS = [
  { name: 'sentinel', prefix: 'sentinel', remote: 'sentinel-origin', repo: 'mentor-mcp', mcp: 'MCP-2 · drift + verdict' },
  { name: 'roster', prefix: 'mcp-roster', remote: 'roster-origin', repo: 'mentor-roster', mcp: 'MCP-1 · catalog + briefs + lessons' },
  { name: 'profile', prefix: 'mcp-profile', remote: 'profile-origin', repo: 'mentor-profile', mcp: 'MCP-3 · student record + cards' },
];

const G = (s) => `\x1b[32m${s}\x1b[0m`;
const R = (s) => `\x1b[31m${s}\x1b[0m`;
const Y = (s) => `\x1b[33m${s}\x1b[0m`;
const B = (s) => `\x1b[1m${s}\x1b[0m`;
const DIM = (s) => `\x1b[2m${s}\x1b[0m`;

const args = process.argv.slice(2);
const DRY = args.includes('--dry-run');
const NO_ORIGIN = args.includes('--no-origin');
const only = args.filter((a) => !a.startsWith('--'));

const git = (...a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8' }).trim();

function tryGit(...a) {
  try {
    return { ok: true, out: git(...a) };
  } catch (err) {
    const e = err;
    return { ok: false, out: `${e.stdout ?? ''}${e.stderr ?? ''}`.trim() || String(e.message) };
  }
}

const urlFor = (t) => {
  const override = process.env[`MENTOR_MIRROR_${t.name.toUpperCase()}`];
  return override ?? `https://github.com/${ORG}/${t.repo}.git`;
};

// ── refuse to mirror a working tree that is not committed ────────────────────
//
// A mirror built from a dirty tree is a lie in the most expensive way: the deployed
// service would match neither the repo nor your editor, and the difference is invisible
// until something behaves oddly in the cloud.
const dirty = git('status', '--porcelain');
if (dirty && !DRY) {
  console.error(R('\nWorking tree is not clean. The mirrors would not match what you pushed.\n'));
  console.error(dirty.split('\n').slice(0, 12).join('\n'));
  console.error(DIM('\nCommit (or stash) first, then re-run. Use --dry-run to see the plan anyway.\n'));
  process.exit(1);
}

const branch = git('rev-parse', '--abbrev-ref', 'HEAD');
const selected = only.length ? TARGETS.filter((t) => only.includes(t.name)) : TARGETS;

if (only.length && selected.length !== only.length) {
  const known = TARGETS.map((t) => t.name).join(', ');
  console.error(R(`\nUnknown target. Known targets: ${known}\n`));
  process.exit(1);
}

console.log(`\n${B('Pushing')} from ${B(branch)}${DRY ? Y('  (dry run — nothing will be pushed)') : ''}\n`);

let failed = 0;
const notes = [];

// ── ① the source of truth ────────────────────────────────────────────────────
if (!NO_ORIGIN) {
  process.stdout.write(`  ${'command-global'.padEnd(16)} ${DIM('origin')} `);
  if (DRY) {
    console.log(Y(`would push ${branch} → origin/${branch}`));
  } else {
    const res = tryGit('push', 'origin', `${branch}`);
    if (res.ok) console.log(G('pushed'));
    else {
      console.log(R('FAILED'));
      notes.push(`origin: ${res.out.split('\n').pop()}`);
      failed++;
    }
  }
}

// ── ② the mirrors ────────────────────────────────────────────────────────────
for (const t of selected) {
  process.stdout.write(`  ${t.name.padEnd(16)} ${DIM(t.prefix + '/')} `);

  const remotes = git('remote').split('\n');
  if (!remotes.includes(t.remote)) {
    console.log(Y('no remote'));
    notes.push(
      `${t.name}: remote ${t.remote} is not configured. Create the repo, then:\n` +
        `      git remote add ${t.remote} ${urlFor(t)}`,
    );
    continue;
  }

  if (DRY) {
    console.log(Y(`would split ${t.prefix}/ → ${t.remote}/main`));
    continue;
  }

  // `subtree split` rewrites the subdirectory's history into a standalone commit whose
  // root is that directory. Same content, root-level — which is the shape NitroCloud needs.
  const split = tryGit('subtree', 'split', '--prefix', t.prefix, branch);
  if (!split.ok) {
    console.log(R('SPLIT FAILED'));
    notes.push(`${t.name}: ${split.out.split('\n').pop()}`);
    failed++;
    continue;
  }
  const sha = split.out.split('\n').pop().trim();

  // Force is correct here and only here: a mirror has exactly one writer, this script.
  const push = tryGit('push', t.remote, `${sha}:refs/heads/main`, '--force');
  if (push.ok) {
    console.log(G(`pushed ${sha.slice(0, 8)}`));
  } else {
    console.log(R('FAILED'));
    const last = push.out.split('\n').find((l) => /denied|403|not found|rejected/i.test(l));
    notes.push(
      `${t.name}: ${last ?? push.out.split('\n').pop()}` +
        (/denied|403/i.test(push.out)
          ? `\n      → read access is not write access. On ${t.repo}: Settings → Collaborators → Add people → Write (DEPLOY.md §troubleshooting)`
          : ''),
    );
    failed++;
  }
}

if (notes.length) {
  console.log(`\n${B('Notes')}`);
  for (const n of notes) console.log(`  • ${n}`);
}

console.log('');
if (DRY) {
  console.log(Y('Dry run. Nothing was pushed.'));
} else if (failed) {
  console.log(R(`${failed} push(es) failed.`));
  process.exit(1);
} else {
  console.log(G('All pushed. NitroCloud redeploys each connected mirror on its own.'));
}
console.log(DIM('\nMirrors are one-way. Never commit into one — the next push overwrites it.\n'));
