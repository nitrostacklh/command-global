"use client";

/**
 * The entry point the architecture draws first: Login / Register, plus a live
 * read on whether the three services are actually reachable.
 *
 * `sign_in` is MCP-1's bridge to MCP-3, not authentication, and it says so in its
 * own response — so this header repeats that rather than dressing a handle up as
 * a login. The one thing it must never do is imply progress is being kept when it
 * is not: `record_kept` comes back from the profile service, and the wording
 * follows it.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Settings2, RefreshCw, LogIn, UserPlus } from 'lucide-react';
import {
  SERVICES,
  applyUrlOverrides,
  client,
  loadUrlOverrides,
  type ServiceKey,
} from '@/l/mcp/servers';
import { useMentor } from '@/l/mentor/store';
import { Button, COLOUR, ErrorNote, Field, Note } from './ui';

type Health = Record<ServiceKey, 'unknown' | 'checking' | 'up' | 'down'>;

const STATUS_TOOL: Record<ServiceKey, string> = {
  roster: 'roster_status',
  sentinel: 'mentor_status',
  profile: 'profile_status',
};

export default function Header({
  onProbed,
  /**
   * `full` keeps the handle field and the two entry buttons — the shape this had
   * before there was a dedicated sign-in screen, and still the right thing when
   * the header is the only way in. `bar` drops them and keeps the wordmark,
   * the three service lights, the probe and the settings drawer, for use behind
   * AuthScreen where a second set of sign-in controls would just raise the
   * question of which one is authoritative.
   */
  variant = "full",
  onSignOut,
}: {
  onProbed?: () => void;
  variant?: "full" | "bar";
  onSignOut?: () => void;
}) {
  const { handle, setHandle, identity, recordKept, run, set, reset } = useMentor();
  const [health, setHealth] = useState<Health>({
    roster: 'unknown',
    sentinel: 'unknown',
    profile: 'unknown',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [urls, setUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    const overrides = loadUrlOverrides();
    setUrls(
      Object.fromEntries(
        SERVICES.map((s) => [s.key, overrides[s.key] ?? s.defaultUrl]),
      ) as Record<string, string>,
    );
  }, []);

  /**
   * Reachability is probed, never inferred from a URL being configured — a URL
   * pointing at a service that is down would otherwise read as "wired", which is
   * the one thing a pre-demo check must not do.
   */
  const probe = useCallback(async () => {
    setHealth({ roster: 'checking', sentinel: 'checking', profile: 'checking' });
    await Promise.all(
      SERVICES.map(async (meta) => {
        try {
          await client(meta.key).call(STATUS_TOOL[meta.key], {});
          setHealth((prev) => ({ ...prev, [meta.key]: 'up' }));
        } catch {
          setHealth((prev) => ({ ...prev, [meta.key]: 'down' }));
        }
      }),
    );
    onProbed?.();
  }, [onProbed]);

  useEffect(() => {
    void probe();
  }, [probe]);

  async function signIn(newAccount: boolean) {
    setBusy(true);
    setError(null);
    try {
      const doc = await run('roster', 'sign_in', {
        handle: handle || undefined,
        new_account: newAccount,
      });
      set({ identity: doc, recordKept: doc.record_kept === true });
      // A returning student's role menu should know what they have played, so
      // pull their record in the same breath.
      if (handle) {
        const profile = await run('profile', 'read_profile', { student: `handle:${handle.toLowerCase()}` });
        set({ profile });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <header className="border-b border-white/10 bg-black/30 px-8 py-5 backdrop-blur-xl">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#D4AF37]">
            Student journey · three MCP services · one loop
          </div>
          <h1 className="mt-1.5 text-2xl font-black tracking-[0.06em] text-white">MENTOR</h1>
          <p className="mt-1.5 max-w-2xl text-[12.5px] leading-relaxed text-slate-400">
            You didn&apos;t just write the bug. You designed it. Pick a role, learn the concept, draw
            your slice in Lumina, build — and when it breaks, MENTOR names the decision that broke it
            and then stops.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {SERVICES.map((meta) => (
            <span
              key={meta.key}
              title={`${meta.badge} — ${meta.owns}\n${client(meta.key).endpoint}`}
              className="flex items-center gap-2 rounded-lg border px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-wider"
              style={{ borderColor: `${COLOUR[meta.key]}44`, color: COLOUR[meta.key] }}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{
                  background:
                    health[meta.key] === 'up'
                      ? '#00C853'
                      : health[meta.key] === 'down'
                        ? '#EA4335'
                        : '#5C6B80',
                }}
              />
              {meta.badge} {meta.title}
            </span>
          ))}
          <button
            type="button"
            onClick={() => void probe()}
            title="Probe all three again"
            className="rounded-lg border border-white/10 p-2 text-slate-500 transition-colors hover:text-slate-200"
          >
            <RefreshCw size={13} />
          </button>
          <button
            type="button"
            onClick={() => setShowSettings((s) => !s)}
            title="Point at different deployments"
            className="rounded-lg border border-white/10 p-2 text-slate-500 transition-colors hover:text-slate-200"
          >
            <Settings2 size={13} />
          </button>
        </div>
      </div>

      {variant === 'full' ? (
        <>
          <div className="mt-5 flex flex-wrap items-end gap-3">
            <div className="w-56">
              <Field
                label="Handle"
                value={handle}
                onChange={setHandle}
                placeholder="e.g. daasa"
                mono
              />
            </div>
            <Button onClick={() => void signIn(false)} tone="roster" busy={busy}>
              <span className="flex items-center gap-1.5">
                <LogIn size={11} /> Sign in
              </span>
            </Button>
            <Button onClick={() => void signIn(true)} tone="roster" busy={busy}>
              <span className="flex items-center gap-1.5">
                <UserPlus size={11} /> Register
              </span>
            </Button>
            {identity && (
              <button
                type="button"
                onClick={reset}
                className="font-mono text-[10.5px] uppercase tracking-wider text-slate-600 underline hover:text-slate-400"
              >
                start over
              </button>
            )}
          </div>

          {identity && (
            <div className="mt-3 max-w-3xl space-y-2">
              <Note tone={recordKept ? 'good' : 'warn'}>
                {String(identity.you?.student ?? 'anonymous')} —{' '}
                {String(identity.what_that_means ?? '')}
              </Note>
              {!identity.you?.authenticated && (
                <p className="text-[11.5px] leading-relaxed text-slate-500">
                  A handle is a name, not a login: anyone who types the same handle on this
                  deployment gets the same record. Fine for a classroom, and not a security
                  boundary.
                </p>
              )}
            </div>
          )}
        </>
      ) : (
        identity && (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="font-mono text-[11px] text-slate-300">
              {String(identity.you?.student ?? 'anonymous')}
            </span>
            <span
              className="font-mono text-[10px] uppercase tracking-wider"
              style={{ color: recordKept ? '#00C853' : '#FF6D00' }}
            >
              {recordKept ? 'record kept' : 'nothing kept this session'}
            </span>
            {onSignOut && (
              <button
                type="button"
                onClick={() => {
                  reset();
                  onSignOut();
                }}
                className="font-mono text-[10.5px] uppercase tracking-wider text-slate-600 underline hover:text-slate-400"
              >
                sign out
              </button>
            )}
          </div>
        )
      )}

      <div className="mt-3">
        <ErrorNote error={error} />
      </div>

      {showSettings && (
        <div className="mt-5 rounded-xl border border-white/10 bg-black/40 p-4">
          <p className="mb-3 text-[12px] leading-relaxed text-slate-400">
            Defaults are the live NitroCloud deployments. Point these at local services only if you
            are running them in <span className="font-mono text-slate-300">http</span> mode — a
            browser cannot reach a stdio server, which is why these are URLs.
          </p>
          <div className="grid gap-3 md:grid-cols-3">
            {SERVICES.map((meta) => (
              <Field
                key={meta.key}
                label={`${meta.badge} ${meta.title}`}
                value={urls[meta.key] ?? ''}
                onChange={(v) => setUrls((prev) => ({ ...prev, [meta.key]: v }))}
                mono
              />
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <Button
              onClick={() => {
                applyUrlOverrides(urls as Partial<Record<ServiceKey, string>>);
                void probe();
              }}
            >
              apply &amp; probe
            </Button>
            <Button
              onClick={() => {
                const defaults = Object.fromEntries(
                  SERVICES.map((s) => [s.key, s.defaultUrl]),
                ) as Record<string, string>;
                setUrls(defaults);
                applyUrlOverrides({});
                void probe();
              }}
            >
              reset to deployed
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
