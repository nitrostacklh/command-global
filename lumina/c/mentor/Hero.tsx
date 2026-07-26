"use client";

/**
 * The home screen's hero, imported from the interface redesign (PR #4).
 *
 * Same card, same spotlight, same 3D scene on the right — with one addition the
 * original did not have: a fallback.
 *
 * The scene is fetched from `prod.spline.design`, and the property this whole
 * platform rests on is that it runs with no network and no API key
 * (`ARCHITECTURE.md` §13 — it is what makes the test suite possible). The
 * original renders `<Suspense>` with a spinner and nothing else, so on a
 * conference network the first thing a judge sees is a hero that never arrives.
 *
 * So: the scene loads when it can, and a locally-drawn plan-vs-build panel takes
 * the same slot when it cannot. Detection is a race between the module import and
 * a timeout rather than an error boundary, because the failure mode we actually
 * care about is *slow*, not *broken* — a request that eventually resolves after
 * forty seconds has already lost the room.
 */

import React, { useEffect, useState } from "react";
import { ArrowRight, Play, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Spotlight } from "@/components/ui/spotlight";
import { SplineScene } from "@/components/ui/splite";

const SCENE = "https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode";
/** Past this, the local panel wins. Tuned for a room, not for a fast desk. */
const PATIENCE_MS = 4000;

/**
 * The offline stand-in: the two rows the product is about, drawn in CSS.
 *
 * Deliberately not a placeholder box. If the 3D scene is unreachable this is what
 * the hero *is*, so it says something true about the tool rather than apologising
 * for a missing asset.
 */
function LocalHero() {
  const plan = ["validate", "discount", "tax", "total"];
  const build = ["validate", "tax", "discount", "total"];

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-6 p-6">
      <div className="w-full max-w-[320px] space-y-5">
        <div>
          <p className="mb-2 font-mono text-[9px] uppercase tracking-[0.2em] text-slate-500">
            the plan
          </p>
          <div className="flex flex-wrap items-center gap-1.5">
            {plan.map((step) => (
              <span
                key={step}
                className={`rounded-lg border px-2 py-1 font-mono text-[10px] ${
                  step === "tax"
                    ? "border-mentor-primary/60 bg-mentor-primary/10 text-mentor-primary"
                    : "border-white/10 bg-white/[0.03] text-slate-300"
                }`}
              >
                {step}
              </span>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 border-l-2 border-mentor-secondary pl-3">
          <span className="animate-glow-pulse font-mono text-[10px] uppercase tracking-widest text-mentor-secondary">
            ⚠ drift
          </span>
          <span className="font-mono text-[10px] text-slate-400">tax jumped the queue</span>
        </div>

        <div>
          <p className="mb-2 font-mono text-[9px] uppercase tracking-[0.2em] text-slate-500">
            the build
          </p>
          <div className="flex flex-wrap items-center gap-1.5">
            {build.map((step) => (
              <span
                key={step}
                className={`rounded-lg border px-2 py-1 font-mono text-[10px] ${
                  step === "tax"
                    ? "border-mentor-error/60 bg-mentor-error/10 text-mentor-error"
                    : "border-white/10 bg-white/[0.03] text-slate-300"
                }`}
              >
                {step}
              </span>
            ))}
          </div>
        </div>
      </div>
      <p className="font-mono text-[9px] uppercase tracking-widest text-slate-600">
        drawn locally · no network needed
      </p>
    </div>
  );
}

export default function Hero({
  onStart,
  onInspect,
  headline,
  blurb,
}: {
  onStart: () => void;
  onInspect: () => void;
  headline: string;
  blurb: string;
}) {
  const [scene, setScene] = useState<"waiting" | "remote" | "local">("waiting");

  useEffect(() => {
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        setScene("local");
      }
    }, PATIENCE_MS);

    // Probing the scene URL rather than the module: a cached bundle with an
    // unreachable scene is exactly the case that hangs.
    fetch(SCENE, { method: "GET", mode: "cors" })
      .then((response) => {
        if (settled) return;
        settled = true;
        setScene(response.ok ? "remote" : "local");
      })
      .catch(() => {
        if (settled) return;
        settled = true;
        setScene("local");
      })
      .finally(() => clearTimeout(timer));

    return () => {
      settled = true;
      clearTimeout(timer);
    };
  }, []);

  return (
    <Card className="relative h-[480px] w-full overflow-hidden rounded-3xl border border-mentor-border bg-slate-950/80">
      <Spotlight className="-top-40 left-0 md:-top-20 md:left-60" fill="white" />

      <div className="flex h-full flex-col md:flex-row">
        <div className="relative z-10 flex flex-1 flex-col justify-center space-y-4 p-8 md:p-10">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-mentor-primary/20 bg-mentor-primary/10 px-3 py-1 text-mentor-primary">
            <Sparkles size={12} className="animate-spin-slow" />
            <span className="text-[10px] font-black uppercase tracking-widest">
              Plan · build · drift · card
            </span>
          </div>
          <h1 className="text-3xl font-bold text-neutral-50 md:text-4xl">{headline}</h1>
          <p className="max-w-lg text-xs leading-relaxed text-neutral-400">{blurb}</p>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              onClick={onStart}
              className="flex cursor-pointer items-center gap-2 rounded-xl bg-mentor-primary px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-black shadow-lg transition-all hover:opacity-90 active:scale-95"
            >
              Open the loop
              <Play size={10} fill="currentColor" />
            </button>
            <button
              onClick={onInspect}
              className="flex cursor-pointer items-center gap-2 rounded-xl border border-mentor-border bg-mentor-card px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-mentor-text transition-all hover:bg-white/[0.04] active:scale-95"
            >
              Draw a design
              <ArrowRight size={10} />
            </button>
          </div>
        </div>

        <div className="relative min-h-[250px] flex-1 md:min-h-0">
          {scene === "remote" ? (
            <SplineScene scene={SCENE} className="h-full w-full" />
          ) : scene === "local" ? (
            <LocalHero />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <span className="loader" />
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
