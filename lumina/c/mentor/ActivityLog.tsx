"use client";

/**
 * Every tool call this page has made, in one stream.
 *
 * Its job is to make the architecture visible while it runs: the badge says which
 * of the three services answered, and `by` says whether a student clicked it or
 * the model chose it. Those two columns together are the claim the submission
 * makes — one loop, three deployments, and a model that can drive the whole thing
 * through the same interface a button does.
 *
 * It is also the fastest way to see the boundary hold. Watch the orange rows: the
 * profile service is only ever reached at the end, which is the whole reason a
 * concept answer cannot leak from the stages before it.
 */

import React from 'react';
import { useMentor } from '@/l/mentor/store';
import { COLOUR, badgeOf } from './ui';

export default function ActivityLog() {
  const log = useMentor((s) => s.log);

  return (
    <section className="rounded-2xl border border-white/15 bg-black/40">
      <header className="flex items-baseline justify-between gap-2 border-b border-white/10 px-4 py-3">
        <h2 className="text-[13px] font-bold tracking-wide text-white">Tool calls</h2>
        <span className="font-mono text-[10px] text-slate-500">{log.length} this sitting</span>
      </header>

      <div className="max-h-80 overflow-y-auto">
        {log.length === 0 ? (
          <p className="px-4 py-4 text-[12px] leading-relaxed text-slate-600">
            Nothing yet. Sign in, or ask the agent something — either way the calls land here.
          </p>
        ) : (
          <ul className="divide-y divide-white/5">
            {log.map((entry) => (
              <li key={entry.id} className="flex flex-wrap items-baseline gap-2 px-4 py-2">
                <span
                  className="w-12 shrink-0 font-mono text-[9.5px] uppercase tracking-wider"
                  style={{ color: COLOUR[entry.service] }}
                >
                  {badgeOf(entry.service)}
                </span>
                <span className="font-mono text-[11.5px] text-slate-200">{entry.tool}</span>
                <span
                  className="font-mono text-[9.5px] uppercase tracking-wider"
                  style={{ color: entry.by === 'agent' ? '#4285F4' : '#5C6B80' }}
                >
                  {entry.by}
                </span>
                <span
                  className="ml-auto font-mono text-[9.5px] uppercase tracking-wider"
                  style={{
                    color:
                      entry.status === 'ok'
                        ? '#00C853'
                        : entry.status === 'error'
                          ? '#EA4335'
                          : '#8AA4C8',
                  }}
                >
                  {entry.status}
                  {entry.ms !== undefined ? ` · ${entry.ms}ms` : ''}
                </span>
                {entry.error && (
                  <p className="w-full font-mono text-[10px] leading-relaxed text-[#EA4335]">
                    {entry.error}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
