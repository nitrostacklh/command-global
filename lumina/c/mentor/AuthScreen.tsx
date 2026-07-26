"use client";

/**
 * The sign-in screen, imported from the interface redesign (PR #4).
 *
 * The visual design is kept as drawn: two columns, the animated intent-vs-actual
 * graph and compiler sandbox on the left, the premium card on the right, glow on
 * the primary action. What changed is that every control now does something real,
 * because the original was wired to `setTimeout(onLogin, 1200)` and offered
 * email, password, Google and GitHub — four affordances this product does not
 * have. A form that pretends to check a password is a worse first impression than
 * one that says plainly what it is, especially for a tool whose whole pitch is
 * refusing to fake things.
 *
 * So the email/password pair became the one field the services actually key on: a
 * handle. The two social buttons became Sign in / Register, which is exactly the
 * pair the architecture draws as the entry point — and both call `sign_in` on
 * MCP-1, which opens the record in MCP-3 and reports whether it will be kept.
 *
 * `sign_in` is not authentication and says so in its own response. Real auth
 * arrives through the SDK's auth modules as `ctx.auth.subject` and wins over any
 * handle typed here; until then a handle is a name, and the screen says that
 * rather than implying a security boundary that does not exist.
 */

import React, { useEffect, useState } from "react";
import { ArrowRight, LogIn, User, UserPlus } from "lucide-react";
import { useMentor } from "@/l/mentor/store";

interface AuthScreenProps {
  /** Called once MCP-1 has answered and the identity is in the store. */
  onSignedIn: () => void;
}

export default function AuthScreen({ onSignedIn }: AuthScreenProps) {
  const { handle, setHandle, run, set } = useMentor();
  const [busy, setBusy] = useState<"in" | "new" | "anon" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [remember, setRemember] = useState(true);
  const [codeLines, setCodeLines] = useState<string[]>([]);

  /**
   * Seeded, not filled in an effect.
   *
   * The original set this from `[]` inside `useEffect`, so the first paint fed
   * `undefined` into the SVG connectors and the console took twelve
   * `<line> attribute x1: Expected length, "undefined%"` errors before the real
   * values landed. The positions are static, so they belong in the initial state;
   * the effect below only needs to drive the animation.
   */
  const [nodes, setNodes] = useState<{ x: number; y: number; label: string; active: boolean }[]>([
    { x: 30, y: 35, label: "the plan (Lumina)", active: true },
    { x: 70, y: 25, label: "the build (yours)", active: true },
    { x: 50, y: 70, label: "drift (Δ)", active: false },
    { x: 80, y: 65, label: "the card", active: false },
  ]);

  // The left panel: the product's own claim, animated. The lines are what this
  // page will really do a few clicks from now, which is why they name the actual
  // artifacts rather than a generic SDK.
  useEffect(() => {
    const script = [
      "checkpoint_spec  → 7 gates, in the order you drew",
      "build_event      → validate",
      "build_event      → tax",
      "// out of order: tax was reached before discount",
      "build_verdict    → escalated",
      "explain_drift    → tax @ pricing.js:12  (0.97)",
      "flashcard        → withheld: tests not green",
    ];

    let line = 0;
    const timer = setInterval(() => {
      if (line < script.length) {
        // Read the value out *before* the state update. React invokes the updater
        // during the next render, by which point `line++` has already run — the
        // original closed over the counter instead of its value, so the final tick
        // appended `undefined` and the next render threw on `line.includes`.
        const text = script[line];
        line++;
        setCodeLines((prev) => [...prev, text]);
        setNodes((prev) =>
          prev.map((node, i) => (i === line % prev.length ? { ...node, active: !node.active } : node)),
        );
      } else {
        setCodeLines([]);
        line = 0;
      }
    }, 1500);

    return () => clearInterval(timer);
  }, []);

  async function signIn(newAccount: boolean, anonymous = false) {
    setBusy(anonymous ? "anon" : newAccount ? "new" : "in");
    setError(null);
    try {
      const who = anonymous ? "" : handle.trim();
      const doc = await run("roster", "sign_in", {
        handle: who || undefined,
        new_account: newAccount,
      });
      set({ identity: doc, recordKept: doc.record_kept === true });

      // Only persist the handle if they asked for it. The checkbox in the original
      // promised "authenticated for 30 days"; this is the honest version of the
      // same control — it decides whether the name survives a reload.
      if (!anonymous && who && remember) setHandle(who);
      else if (!remember) setHandle(who);

      // The record itself is read by the home screen as it mounts. Reading it here
      // too would file two `read_profile` calls against the same navigation and
      // put a second round trip between the click and the screen appearing.
      onSignedIn();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="relative flex h-screen w-screen flex-col overflow-hidden bg-[#020617] font-sans text-white md:flex-row">
      {/* Background orbs */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div className="absolute right-[-10%] top-[-10%] h-[600px] w-[600px] animate-pulse rounded-full bg-mentor-primary/5 blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] h-[500px] w-[500px] animate-pulse rounded-full bg-mentor-secondary/5 blur-[120px]" />
        <div className="noise-overlay absolute inset-0 opacity-[0.01]" />
      </div>

      {/* Left: the claim, drawn */}
      <div className="z-10 hidden flex-1 flex-col justify-between overflow-hidden border-r border-white/5 bg-[#020617]/50 p-12 backdrop-blur-3xl md:flex">
        <div className="flex items-center gap-2">
          <div className="relative mr-1 flex h-4 w-4 items-center justify-center">
            <div className="absolute h-3 w-3 rounded-full border border-mentor-primary/80" />
            <div className="absolute right-0 top-0 h-5 w-[1px] translate-x-[2px] bg-mentor-secondary" />
            <div className="absolute right-0 top-1 h-1 w-1 translate-x-[2px] rounded-full bg-mentor-primary" />
          </div>
          <span className="text-md font-bold tracking-[0.25em] text-white">MENTOR</span>
        </div>

        <div className="relative my-auto flex h-[320px] w-full items-center justify-center">
          <svg className="absolute inset-0 h-full w-full">
            <line
              x1={`${nodes[0]?.x}%`}
              y1={`${nodes[0]?.y}%`}
              x2={`${nodes[2]?.x}%`}
              y2={`${nodes[2]?.y}%`}
              stroke="rgba(110, 231, 255, 0.2)"
              strokeWidth="1.5"
            />
            <line
              x1={`${nodes[1]?.x}%`}
              y1={`${nodes[1]?.y}%`}
              x2={`${nodes[2]?.x}%`}
              y2={`${nodes[2]?.y}%`}
              stroke="rgba(139, 92, 246, 0.2)"
              strokeWidth="1.5"
            />
            <line
              x1={`${nodes[2]?.x}%`}
              y1={`${nodes[2]?.y}%`}
              x2={`${nodes[3]?.x}%`}
              y2={`${nodes[3]?.y}%`}
              stroke="rgba(110, 231, 255, 0.2)"
              strokeWidth="1.5"
              strokeDasharray="5 3"
            />
          </svg>

          {nodes.map((node) => (
            <div
              key={node.label}
              className="absolute flex flex-col items-center gap-2 transition-all duration-1000"
              style={{ left: `${node.x}%`, top: `${node.y}%`, transform: "translate(-50%, -50%)" }}
            >
              <div
                className={`h-3 w-3 rounded-full transition-all duration-700 ${
                  node.active
                    ? "scale-125 bg-mentor-primary shadow-glow-cyan"
                    : "scale-100 bg-white/10 ring-1 ring-white/10"
                }`}
              />
              <span
                className={`whitespace-nowrap font-mono text-[9px] uppercase tracking-widest transition-colors ${
                  node.active ? "text-mentor-primary" : "text-slate-600"
                }`}
              >
                {node.label}
              </span>
            </div>
          ))}
        </div>

        <div className="h-44 w-full overflow-y-auto rounded-xl border border-white/5 bg-white/[0.01] p-5 font-mono text-[11px] text-slate-400 backdrop-blur-md scrollbar-none">
          <div className="mb-3 flex items-center gap-1.5 border-b border-white/5 pb-2">
            <div className="h-2.5 w-2.5 rounded-full bg-[#EF4444]/40" />
            <div className="h-2.5 w-2.5 rounded-full bg-[#F59E0B]/40" />
            <div className="h-2.5 w-2.5 rounded-full bg-[#22C55E]/40" />
            <span className="ml-2 text-[9px] font-bold uppercase tracking-widest text-slate-600">
              23 tools · three services
            </span>
          </div>
          <div className="space-y-1.5">
            {codeLines.map((line, idx) => (
              <div key={idx} className="flex animate-fade-in gap-3">
                <span className="w-4 select-none text-slate-700">0{idx + 1}</span>
                <span
                  className={
                    line.includes("//")
                      ? "italic text-mentor-secondary/80"
                      : line.includes("drift") || line.includes("withheld")
                        ? "text-mentor-primary"
                        : "text-slate-300"
                  }
                >
                  {line}
                </span>
              </div>
            ))}
            <div className="typewriter-cursor text-mentor-primary" />
          </div>
        </div>
      </div>

      {/* Right: the card */}
      <div className="z-10 flex flex-1 flex-col items-center justify-center p-8 md:p-16">
        <div className="flex w-full max-w-[420px] flex-col gap-8">
          <div className="flex flex-col gap-2 text-center md:text-left">
            <h2 className="bg-gradient-to-r from-white to-slate-400 bg-clip-text font-sans text-3xl font-bold tracking-tight text-transparent">
              Trace Your Thinking
            </h2>
            <p className="text-xs font-medium tracking-wide text-slate-500">
              You didn&apos;t just write the bug. You designed it — sign in and MENTOR will show you
              where.
            </p>
          </div>

          {/* The architecture's two entry points, in the slot the social buttons had. */}
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              disabled={!!busy}
              onClick={() => void signIn(false)}
              className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-white/5 bg-white/[0.02] py-3 text-xs font-bold text-slate-300 transition-all duration-300 hover:bg-white/[0.06] hover:text-white active:scale-95 disabled:opacity-40"
            >
              <LogIn size={14} className="text-mentor-primary" />
              {busy === "in" ? "Signing in…" : "Returning"}
            </button>
            <button
              type="button"
              disabled={!!busy}
              onClick={() => void signIn(true)}
              className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-white/5 bg-white/[0.02] py-3 text-xs font-bold text-slate-300 transition-all duration-300 hover:bg-white/[0.06] hover:text-white active:scale-95 disabled:opacity-40"
            >
              <UserPlus size={14} className="text-mentor-secondary" />
              {busy === "new" ? "Opening…" : "New here"}
            </button>
          </div>

          <div className="flex items-center gap-4">
            <div className="h-[1px] flex-1 bg-white/5" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600">
              filed under
            </span>
            <div className="h-[1px] flex-1 bg-white/5" />
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void signIn(false);
            }}
            className="flex flex-col gap-5"
          >
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                Handle
              </label>
              <div className="group relative">
                <User
                  size={16}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 transition-colors group-focus-within:text-mentor-primary"
                />
                <input
                  type="text"
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                  placeholder="your name, or leave it blank"
                  className="w-full rounded-xl border border-white/5 bg-white/[0.02] py-3.5 pl-12 pr-4 text-sm placeholder-slate-700 transition-all focus:border-mentor-primary/40 focus:bg-white/[0.04] focus:outline-none focus:ring-1 focus:ring-mentor-primary/20"
                />
              </div>
              <p className="text-[10.5px] leading-relaxed text-slate-600">
                A handle is a name, not a login — anyone who types the same one on this deployment
                gets the same record. Fine for a classroom, and not a security boundary.
              </p>
            </div>

            <div className="mt-1 flex items-center gap-2">
              <input
                type="checkbox"
                id="remember"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="h-4 w-4 rounded border-white/5 bg-white/[0.02] accent-mentor-primary focus:ring-0"
              />
              <label
                htmlFor="remember"
                className="cursor-pointer select-none text-xs font-medium text-slate-500"
              >
                Remember this handle in this browser
              </label>
            </div>

            <button
              type="submit"
              disabled={!!busy}
              className="relative mt-2 flex cursor-pointer items-center justify-center gap-3 overflow-hidden rounded-xl bg-gradient-to-r from-mentor-primary to-mentor-accent py-4 text-xs font-bold uppercase tracking-[0.25em] text-black shadow-glow-cyan transition-all duration-500 hover:from-mentor-primary hover:to-mentor-secondary hover:text-white hover:shadow-glow-purple active:scale-[0.98] disabled:opacity-50"
            >
              {busy === "in" || busy === "new" ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-black border-t-transparent" />
                  Opening your record…
                </>
              ) : (
                <>
                  Start the session
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </form>

          {error && (
            <p className="rounded-xl border border-[#EA4335]/40 bg-[#EA4335]/10 px-3 py-2 font-mono text-[11px] leading-relaxed text-[#EA4335]">
              {error}
            </p>
          )}

          <p className="text-center text-xs font-medium text-slate-600">
            No handle?{" "}
            <button
              type="button"
              disabled={!!busy}
              onClick={() => void signIn(false, true)}
              className="cursor-pointer font-bold text-mentor-primary hover:underline disabled:opacity-40"
            >
              {busy === "anon" ? "starting…" : "work anonymously"}
            </button>{" "}
            — everything runs, nothing is kept.
          </p>
        </div>
      </div>
    </div>
  );
}
