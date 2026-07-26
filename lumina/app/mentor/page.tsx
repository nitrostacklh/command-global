"use client";

/**
 * MENTOR — the one page that drives all three MCP services.
 *
 * Three screens, in the order the workflow architecture draws them:
 *
 *   sign in  →  home  →  the loop (role → lesson → design → build → card)
 *
 * The first two are the interface redesign from PR #4, wired to the real
 * services; the third is the five stage panels. They share one store, so the
 * identity the sign-in screen establishes is the identity every later tool call
 * is filed against, and the home screen's telemetry is read from the same record
 * the loop writes to.
 *
 * It lives inside Lumina rather than beside it, which buys two things: the design
 * canvas is one click away instead of one deployment away, and the dashboard can
 * read the canvases a student has actually drawn, because it is the same origin.
 * The canvas keeps `/` — Lumina belongs to no MCP and the `lumina.plan/v1` export
 * is what Layer 4's whole claim rests on, so nothing here takes that route over.
 */

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, GitBranch, Home as HomeIcon, Workflow } from "lucide-react";
import ActivityLog from "@/c/mentor/ActivityLog";
import AgentPanel from "@/c/mentor/AgentPanel";
import AuthScreen from "@/c/mentor/AuthScreen";
import Header from "@/c/mentor/Header";
import HomeScreen from "@/c/mentor/HomeScreen";
import StageBrief from "@/c/mentor/StageBrief";
import StageBuild from "@/c/mentor/StageBuild";
import StageCard from "@/c/mentor/StageCard";
import StageDesign from "@/c/mentor/StageDesign";
import StageRole from "@/c/mentor/StageRole";
import { COLOUR } from "@/c/mentor/ui";
import { useMentor } from "@/l/mentor/store";

type Screen = "auth" | "home" | "loop";

const LEGEND = [
  { colour: COLOUR.roster, label: "MCP-1 · role, projects, brief, lesson, checkpoints" },
  { colour: COLOUR.sentinel, label: "MCP-2 · Sentinel — verify, drift, verdict" },
  { colour: COLOUR.profile, label: "MCP-3 · profile, flashcards, the only copy of an answer" },
  { colour: "#E8F0FE", label: "Lumina · client surface, not an MCP", dashed: true },
];

export default function MentorPage() {
  const [screen, setScreen] = useState<Screen>("auth");
  const { set, clearFrom, run, handle } = useMentor();

  if (screen === "auth") {
    return <AuthScreen onSignedIn={() => setScreen("home")} />;
  }

  /**
   * Jump straight to a seat from the home screen.
   *
   * Sets the seat and clears everything downstream of it, so a resumed seat cannot
   * inherit the previous one's plan, spec or verdict. The panels are the same ones
   * a fresh start uses, which is what keeps a resumed session from behaving
   * differently.
   *
   * The two catalog reads matter more than they look: without them Stage 1 shows
   * a bare button while Stage 2 is somehow already unlocked, and the student has
   * no way to see *which* seat they resumed into. Backfilling the role menu and
   * the project list makes the resumed state say the same thing a chosen one does.
   */
  const resumeSeat = (project: string, role: string) => {
    setScreen("loop");
    if (!project || !role) return;

    clearFrom("role");
    set({ project, role });

    void (async () => {
      try {
        const [roles, projects] = await Promise.all([
          run("roster", "list_roles", { handle: handle || undefined }),
          run("roster", "projects_for_role", { role, handle: handle || undefined }),
        ]);
        set({
          roles: (roles.roles ?? []) as Record<string, unknown>[],
          projects: (projects.projects ?? []) as Record<string, unknown>[],
          // Re-asserted: `projects_for_role` clears nothing, but the two reads
          // race with the panels' own state and the seat is what we came here for.
          project,
          role,
        });
      } catch {
        // The header reports an unreachable service; the seat is already set, so
        // the student can still open their brief.
      }
    })();
  };

  return (
    <div className="min-h-screen bg-[#060E1A] text-slate-200">
      <div
        className="min-h-screen"
        style={{
          background:
            "radial-gradient(ellipse 1200px 700px at 20% 0%, #0F2847 0%, #0B1E35 45%, #060E1A 100%)",
        }}
      >
        <Header variant="bar" onSignOut={() => setScreen("auth")} />

        {/* Where you are, and the two other places you can be. */}
        <nav className="flex flex-wrap items-center gap-2 border-b border-white/10 px-8 py-3">
          {(
            [
              { id: "home" as Screen, label: "Home", icon: <HomeIcon size={12} /> },
              { id: "loop" as Screen, label: "The loop", icon: <Workflow size={12} /> },
            ]
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setScreen(tab.id)}
              className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 font-mono text-[10.5px] font-semibold uppercase tracking-wider transition-all ${
                screen === tab.id
                  ? "border-[#4285F4]/60 bg-[#4285F4]/15 text-[#4285F4]"
                  : "border-white/10 text-slate-500 hover:text-slate-300"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
          {/* /canvas, not / — the redesign took `/` for the dashboard. */}
          <a
            href="/canvas"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-1.5 font-mono text-[10.5px] font-semibold uppercase tracking-wider text-slate-500 transition-all hover:text-slate-300"
          >
            <GitBranch size={12} />
            Canvas
          </a>
        </nav>

        {screen === "home" ? (
          <main className="mx-auto max-w-[1500px]">
            <HomeScreen
              onOpenLoop={() => setScreen("loop")}
              onOpenCanvas={() => window.open("/canvas", "_blank", "noreferrer")}
              onResumeSeat={resumeSeat}
            />
          </main>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-4 border-b border-white/10 px-8 py-3">
              <Link
                href="/"
                className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-slate-500 hover:text-slate-200"
              >
                <ArrowLeft size={11} /> canvas
              </Link>
              {LEGEND.map((item) => (
                <span
                  key={item.label}
                  className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-slate-400"
                >
                  <span
                    className="h-3 w-3 rounded-[3px]"
                    style={
                      item.dashed
                        ? { border: `1px dashed ${item.colour}`, opacity: 0.7 }
                        : { background: item.colour }
                    }
                  />
                  {item.label}
                </span>
              ))}
            </div>

            <main className="grid gap-5 px-8 py-6 xl:grid-cols-[minmax(0,1fr)_400px]">
              <div className="space-y-5">
                <StageRole />
                <StageBrief />
                <StageDesign />
                <StageBuild />
                <StageCard />
              </div>

              <div className="space-y-5 xl:sticky xl:top-6 xl:h-fit">
                <div className="h-[560px]">
                  <AgentPanel />
                </div>
                <ActivityLog />
              </div>
            </main>
          </>
        )}

        <footer className="border-t border-white/10 px-8 py-5">
          <p className="max-w-4xl font-mono text-[10.5px] leading-relaxed text-slate-600">
            Three deployed applications, not one, and the split is the security boundary: MCP-3 is
            the only process that ever holds a flashcard answer. MCP-1 files your role choice with
            MCP-3 and hands the checkpoint spec to MCP-2; MCP-2 files its verdict back to MCP-3,
            which is what releases the card once your own tests are green. Nothing on this page can
            write to your build — no tool on any of the three can.
          </p>
        </footer>
      </div>
    </div>
  );
}
