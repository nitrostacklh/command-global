'use client'

import { SplineScene } from "@/components/ui/splite";
import { Card } from "@/components/ui/card";
import { Spotlight } from "@/components/ui/spotlight";
import { Sparkles, Play, ArrowRight } from "lucide-react";

interface SplineSceneBasicProps {
  onNavigateToTab: (tab: any) => void;
}

export function SplineSceneBasic({ onNavigateToTab }: SplineSceneBasicProps) {
  return (
    <Card className="w-full h-[480px] bg-slate-950/80 border border-tangent-border relative overflow-hidden rounded-3xl">
      <Spotlight
        className="-top-40 left-0 md:left-60 md:-top-20"
        fill="white"
      />
      
      <div className="flex flex-col md:flex-row h-full">
        {/* Left content */}
        <div className="flex-1 p-8 md:p-10 relative z-10 flex flex-col justify-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-tangent-primary/20 bg-tangent-primary/10 text-tangent-primary w-fit">
            <Sparkles size={12} className="animate-spin-slow" />
            <span className="text-[10px] font-black tracking-widest uppercase">Tangent Causal Telemetry</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-neutral-50 to-neutral-400">
            Interactive 3D Auditing
          </h1>
          <p className="text-xs text-neutral-400 max-w-lg leading-relaxed">
            Trace architectural drift in real-time. Hover to interact with the 3D node meshes; rotate and pull components to inspect structural deviations in the code intents graph.
          </p>
          
          <div className="flex flex-wrap gap-3 pt-2">
            <button
              onClick={() => onNavigateToTab("workspace")}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-tangent-primary text-black font-bold text-[10px] uppercase tracking-wider hover:opacity-90 transition-all cursor-pointer shadow-lg active:scale-95"
            >
              Open Workspace
              <Play size={10} fill="currentColor" />
            </button>
            <button
              onClick={() => onNavigateToTab("timeline")}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-tangent-border bg-tangent-card hover:bg-white/[0.04] font-bold text-[10px] uppercase tracking-wider text-tangent-text transition-all cursor-pointer active:scale-95"
            >
              Inspect Timeline
              <ArrowRight size={10} />
            </button>
          </div>
        </div>

        {/* Right content */}
        <div className="flex-1 relative min-h-[250px] md:min-h-0">
          <SplineScene 
            scene="https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode"
            className="w-full h-full"
          />
        </div>
      </div>
    </Card>
  )
}
