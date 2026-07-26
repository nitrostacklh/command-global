"use client";

/**
 * The home screen, imported from the interface redesign (PR #4).
 *
 * The layout is the one that was drawn: greeting row with a live clock, the 3D
 * hero, a grid of project cards on the left, drift telemetry down the right. Every
 * number in it now comes from the student's own `mentor.profile/v1` instead of the
 * hard-coded array the original shipped with, which had three invented projects
 * ("Token Auth Microservice") and one invented anomaly.
 *
 * That swap is the point of integrating rather than pasting. A homepage that opens
 * on somebody else's telemetry is the one screen a judge is guaranteed to look at,
 * and MENTOR's whole argument is that it reports what actually happened to *you*.
 *
 * Where there is nothing to show, it says so. Empty states are not a failure of
 * this screen — a student who has not built anything yet has no drift, and
 * inventing some to fill the panel would be the exact dishonesty the product
 * exists to refuse.
 */

import React, { useEffect, useMemo, useState } from "react";
import { AlertOctagon, Award, Calendar, Compass, Search, TrendingUp } from "lucide-react";
import { useMentor, type Doc } from "@/l/mentor/store";
import Hero from "./Hero";
import SeatCard, { shapeFor, type Seat } from "./SeatCard";

/** `pricing` → `Pricing`, `safety-gear` → `Safety gear`. The keys are the truth; this is presentation. */
function prettify(key: string): string {
  const spaced = key.replace(/[-_]/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function greetingFor(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default function HomeScreen({
  onOpenLoop,
  onOpenCanvas,
  onResumeSeat,
}: {
  onOpenLoop: () => void;
  onOpenCanvas: () => void;
  onResumeSeat: (project: string, role: string) => void;
}) {
  const { handle, identity, recordKept, profile, due, run, set } = useMentor();
  const [query, setQuery] = useState("");
  const [clock, setClock] = useState("");
  const [greeting, setGreeting] = useState("Welcome");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setGreeting(greetingFor(new Date().getHours()));
    const tick = () =>
      setClock(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, []);

  // The record, and what is due. Both are reads — nothing here writes, so landing
  // on the home screen cannot change a student's progress.
  useEffect(() => {
    const student = handle ? `handle:${handle.toLowerCase()}` : undefined;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const [record, dueDoc] = await Promise.all([
          run("profile", "read_profile", { student }),
          run("profile", "due_cards", { student }),
        ]);
        if (cancelled) return;
        set({
          profile: record.found === false ? null : record,
          due: (dueDoc.due ?? []) as Doc[],
        });
      } catch {
        // The header already reports an unreachable service; this screen just
        // shows what it has rather than throwing a second error at the student.
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [handle, run, set]);

  const driftLedger = useMemo(() => ((profile?.drift_ledger ?? []) as Doc[]).slice().reverse(), [profile]);

  const seats: Seat[] = useMemo(() => {
    const projects = (profile?.projects ?? []) as Doc[];
    return projects.map((p) => {
      const checkpoints = (p.checkpoints ?? []) as Doc[];
      const passed = checkpoints.filter((c) => c.status === "pass").length;
      const drift = ((profile?.drift_ledger ?? []) as Doc[]).filter(
        (d) => d.project === p.project && d.role === p.role,
      ).length;
      return {
        project: String(p.project),
        role: String(p.role),
        status: (p.status ?? "attempted") as Seat["status"],
        alignment: checkpoints.length ? Math.round((passed / checkpoints.length) * 100) : null,
        driftCount: drift,
        title: `${prettify(String(p.project))} · ${p.role}`,
        updatedAt: (p.updated_at as string) ?? null,
      };
    });
  }, [profile]);

  const visible = seats.filter((s) => s.title.toLowerCase().includes(query.toLowerCase()));
  const resuming = (identity?.picking_up ?? null) as Doc | null;
  const mastery = (profile?.mastery ?? []) as Doc[];
  const sessions = Number(profile?.sessions ?? 0);

  return (
    <div className="animate-fade-in space-y-10 p-8 pr-12 text-mentor-text">
      {/* Greeting row */}
      <div className="flex flex-col justify-between gap-4 border-b border-mentor-border pb-6 md:flex-row md:items-center">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-mentor-primary">
              {recordKept ? "Record kept" : "Nothing kept this session"}
            </span>
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-mentor-primary shadow-glow-cyan" />
          </div>
          <h1 className="font-sans text-3xl font-bold tracking-tight text-mentor-text">
            {greeting}
            {handle ? `, ${handle}` : ""}
          </h1>
          <p className="mt-1.5 max-w-2xl text-xs leading-relaxed text-slate-500">
            {recordKept
              ? "Your work is filed under this identity and will be here next session."
              : "Everything below works for this sitting, and none of it is being stored between sessions."}
          </p>
        </div>

        <div className="flex items-center gap-4 rounded-xl border border-mentor-border bg-mentor-card px-4 py-2.5 backdrop-blur-md">
          <Calendar size={14} className="text-slate-500" />
          <span className="text-xs font-bold tracking-wider text-slate-500">
            {new Date().toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
          </span>
          <div className="h-4 w-[1px] bg-mentor-border" />
          <span className="font-mono text-xs font-bold tracking-widest text-mentor-primary">{clock}</span>
        </div>
      </div>

      {resuming && Object.keys(resuming).length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-mentor-primary/30 bg-mentor-primary/[0.06] px-5 py-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-mentor-primary">
              Picking up where you left off
            </p>
            <p className="mt-1 text-[13px] text-slate-200">
              {String(resuming.project ?? "")} · {String(resuming.role ?? "")}
              {resuming.status ? ` — ${String(resuming.status)}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onResumeSeat(String(resuming.project ?? ""), String(resuming.role ?? ""))}
            className="cursor-pointer rounded-xl bg-mentor-primary px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-black transition-all hover:opacity-90 active:scale-95"
          >
            Resume
          </button>
        </div>
      )}

      <Hero
        onStart={onOpenLoop}
        onInspect={onOpenCanvas}
        headline="Your code broke on line 40. It went wrong on line 12."
        blurb="Pick a role, learn the concept, draw your slice, then build. When it breaks, MENTOR compares what you designed against what you did, names the decision that caused it — and stops there. You write the fix."
      />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Seats */}
        <div className="space-y-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-500">
              Your seats
            </h3>
            <div className="group relative w-52">
              <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Filter seats..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full rounded-lg border border-mentor-border bg-mentor-card py-1.5 pl-9 pr-3 text-[10px] text-mentor-text placeholder-slate-600 transition-all focus:border-mentor-primary/30 focus:outline-none"
              />
            </div>
          </div>

          {visible.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-mentor-border bg-mentor-card p-8 text-center">
              <Compass size={20} className="mx-auto text-slate-600" />
              <p className="mt-3 text-[13px] font-bold text-slate-300">
                {loading ? "Reading your record…" : seats.length === 0 ? "No seats yet" : "Nothing matches that"}
              </p>
              <p className="mx-auto mt-1.5 max-w-md text-[11.5px] leading-relaxed text-slate-500">
                {seats.length === 0
                  ? "Roles come first here — you are hired into a job, and the projects you are shown are the ones that have that job. Open the loop to pick one."
                  : "Clear the filter to see the rest."}
              </p>
              {seats.length === 0 && (
                <button
                  type="button"
                  onClick={onOpenLoop}
                  className="mt-4 cursor-pointer rounded-xl bg-mentor-primary px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-black transition-all hover:opacity-90 active:scale-95"
                >
                  Choose a role
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {visible.map((seat, idx) => (
                <SeatCard
                  key={`${seat.project}/${seat.role}`}
                  seat={seat}
                  shapeType={shapeFor(idx)}
                  onClick={() => onResumeSeat(seat.project, seat.role)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Telemetry */}
        <div className="space-y-6">
          <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-500">
            Drift telemetry
          </h3>

          <div className="space-y-6 rounded-2xl border border-mentor-border bg-mentor-card p-6 backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-mentor-border pb-4">
              <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-mentor-text">
                <AlertOctagon
                  size={14}
                  className={driftLedger.length > 0 ? "animate-pulse text-mentor-error" : "text-slate-600"}
                />
                Where you went wrong
              </span>
              <span className="font-mono text-[10px] text-slate-500">{driftLedger.length}</span>
            </div>

            {driftLedger.length === 0 ? (
              <p className="text-[11.5px] leading-relaxed text-slate-500">
                Nothing filed. The verifier records an entry here each time a build leaves its
                design — so an empty panel means either you have not built yet, or you built it in
                the order you drew.
              </p>
            ) : (
              <div className="space-y-4">
                {driftLedger.slice(0, 4).map((entry, idx) => (
                  <div key={`${entry.at}-${idx}`} className="space-y-1.5">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-mono text-[11px] font-bold text-mentor-error">
                        {String(entry.component)}
                      </span>
                      <span className="font-mono text-[10px] text-slate-500">
                        {Math.round(Number(entry.confidence ?? 0) * 100)}% sure
                      </span>
                    </div>
                    <p className="text-[11.5px] leading-relaxed text-slate-400">
                      built before <span className="text-slate-200">{String(entry.should_follow)}</span>,
                      which your design put first — {String(entry.file)}
                      {entry.line !== null && entry.line !== undefined ? `:${entry.line}` : ""}
                    </p>
                    <p className="font-mono text-[9.5px] uppercase tracking-wider text-slate-600">
                      {String(entry.project)} · {String(entry.role)} · {String(entry.concept)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Two counts that are read straight off the record. */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-2xl border border-mentor-border bg-mentor-card p-5">
              <TrendingUp size={14} className="text-mentor-primary" />
              <p className="mt-3 text-2xl font-bold text-mentor-text">{sessions}</p>
              <p className="text-[9.5px] font-black uppercase tracking-widest text-slate-500">
                sittings
              </p>
            </div>
            <div className="rounded-2xl border border-mentor-border bg-mentor-card p-5">
              <Award size={14} className="text-mentor-success" />
              <p className="mt-3 text-2xl font-bold text-mentor-text">{due.length}</p>
              <p className="text-[9.5px] font-black uppercase tracking-widest text-slate-500">
                cards due
              </p>
            </div>
          </div>

          {mastery.length > 0 && (
            <div className="space-y-3 rounded-2xl border border-mentor-border bg-mentor-card p-6">
              <h4 className="text-xs font-bold uppercase tracking-wider text-mentor-text">
                What you have shown
              </h4>
              {mastery.slice(0, 4).map((m) => (
                <div key={String(m.concept)} className="space-y-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-mono text-[10.5px] text-slate-300">{String(m.concept)}</span>
                    <span className="font-mono text-[10px] text-mentor-success">
                      {Math.round(Number(m.level ?? 0) * 100)}%
                    </span>
                  </div>
                  <div className="h-1 overflow-hidden rounded bg-white/10">
                    <div
                      className="h-full rounded bg-mentor-success"
                      style={{ width: `${Math.round(Number(m.level ?? 0) * 100)}%` }}
                    />
                  </div>
                  <p className="text-[10px] leading-relaxed text-slate-600">{String(m.evidence ?? "")}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
