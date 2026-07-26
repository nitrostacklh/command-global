"use client";

/**
 * Stage 1 — role first, then the project list derived from it.
 *
 * The ordering is the product, not a UI preference: a project without a role
 * attached is a topic rather than an assignment, and every artifact downstream
 * (`owns`, `given`, the gates, the verdict) is defined in terms of a role. So
 * this panel refuses to show a project list until a role is picked, and says out
 * loud that the list *changes* with the role — it is not the catalog filtered, it
 * is the catalog asked a different question.
 */

import React, { useState } from 'react';
import { useMentor } from '@/l/mentor/store';
import { Button, Chips, ErrorNote, Panel, RawDoc } from './ui';

export default function StageRole() {
  const { roles, role, projects, project, run, set, clearFrom } = useMentor();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [coverage, setCoverage] = useState<string>('');

  async function loadRoles() {
    setBusy('roles');
    setError(null);
    try {
      const doc = await run('roster', 'list_roles', { handle: useMentor.getState().handle || undefined });
      set({ roles: (doc.roles ?? []) as Record<string, any>[] });
      setCoverage(String(doc.honesty ?? ''));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  }

  async function pickRole(key: string) {
    setBusy(key);
    setError(null);
    clearFrom('role');
    try {
      const doc = await run('roster', 'projects_for_role', {
        role: key,
        handle: useMentor.getState().handle || undefined,
      });
      if (doc.error) {
        setError(String(doc.error));
        return;
      }
      set({ role: key, projects: (doc.projects ?? []) as Record<string, any>[] });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  }

  return (
    <Panel
      step="Stage 1 of 5 — who are you on this team?"
      title="Role, then the projects that have a seat for it"
      service="roster"
      subtitle="A role gives you constraints and a stake. That is the difference between “build a pricing service” and “you own pricing, and finance depends on your numbers being right”."
    >
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={() => void loadRoles()} tone="roster" busy={busy === 'roles'}>
          list_roles
        </Button>
        {roles.length > 0 && (
          <span className="font-mono text-[10.5px] text-slate-500">{roles.length} roles</span>
        )}
      </div>

      {coverage && <p className="mt-3 text-[12px] leading-relaxed text-slate-400">{coverage}</p>}
      <div className="mt-3">
        <ErrorNote error={error} />
      </div>

      {roles.length > 0 && (
        <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {roles.map((r) => {
            const key = String(r.role);
            const active = role === key;
            const playable = Number(r.playable_now ?? 0) > 0;
            return (
              <button
                key={key}
                type="button"
                disabled={!playable || busy === key}
                onClick={() => void pickRole(key)}
                className={`rounded-xl border p-3 text-left transition-all disabled:cursor-not-allowed disabled:opacity-40 ${
                  active
                    ? 'border-[#1565C0] bg-[#1565C0]/15'
                    : 'border-white/10 bg-black/30 hover:border-[#1565C0]/60'
                }`}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[13px] font-bold text-white">{String(r.title)}</span>
                  <span className="font-mono text-[9.5px] uppercase tracking-wider text-slate-500">
                    {String(r.role)}
                  </span>
                </div>
                <p className="mt-1.5 text-[11.5px] leading-relaxed text-slate-400">
                  {String(r.what_this_job_is ?? '')}
                </p>
                <p className="mt-2 font-mono text-[10px] text-[#1565C0]">
                  owns: {String(r.you_tend_to_own ?? '')}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2 font-mono text-[9.5px] uppercase tracking-wider text-slate-500">
                  <span>{String(r.playable_now)} playable</span>
                  {Number(r.watchable_end_to_end ?? 0) > 0 && (
                    <span className="text-[#00C853]">{String(r.watchable_end_to_end)} watchable</span>
                  )}
                  {r.you_have_played_this === true && <span className="text-[#D4AF37]">played before</span>}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {role && projects.length > 0 && (
        <div className="mt-6">
          <p className="mb-3 text-[12px] leading-relaxed text-slate-400">
            These are the {projects.length} project(s) with a{' '}
            <span className="text-[#1565C0]">{role}</span> seat. Pick a different role and this list
            changes.
          </p>
          <div className="grid gap-2 lg:grid-cols-2">
            {projects.map((p) => {
              const key = String(p.project);
              const seat = (p.your_seat ?? {}) as Record<string, any>;
              const active = project === key;
              return (
                <button
                  key={key}
                  type="button"
                  disabled={seat.playable !== true}
                  onClick={() => {
                    clearFrom('project');
                    set({ project: key });
                  }}
                  className={`rounded-xl border p-3 text-left transition-all disabled:cursor-not-allowed disabled:opacity-40 ${
                    active
                      ? 'border-[#1565C0] bg-[#1565C0]/15'
                      : 'border-white/10 bg-black/30 hover:border-[#1565C0]/60'
                  }`}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-[13px] font-bold text-white">{String(p.title)}</span>
                    <span className="font-mono text-[9.5px] uppercase tracking-wider text-slate-500">
                      {String(p.product_type ?? '')}
                    </span>
                  </div>
                  <p className="mt-1.5 text-[11.5px] leading-relaxed text-slate-400">
                    {String(p.why_its_worth_your_afternoon ?? '')}
                  </p>
                  <p className="mt-2 text-[11.5px] text-slate-300">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-[#1565C0]">
                      you are on the hook for{' '}
                    </span>
                    {String(seat.on_the_hook_for ?? '')}
                  </p>
                  <div className="mt-2">
                    <span className="font-mono text-[9.5px] uppercase tracking-wider text-slate-500">
                      every component in the system
                    </span>
                    <div className="mt-1">
                      <Chips items={(p.every_component_in_the_system ?? []) as string[]} />
                    </div>
                  </div>
                  {seat.watchable_end_to_end === true && (
                    <p className="mt-2 font-mono text-[9.5px] uppercase tracking-wider text-[#00C853]">
                      runs end to end with nothing uploaded
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <RawDoc label="mentor.catalog/v1 — the roles as returned" doc={roles.length ? roles : null} />
    </Panel>
  );
}
