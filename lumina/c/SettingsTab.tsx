"use client";

import React, { useState } from "react";
import { Sliders, ToggleLeft, ToggleRight, Sparkles, SlidersHorizontal, Volume2, ShieldCheck } from "lucide-react";

interface SettingsTabProps {
  theme: "dark" | "light";
  onToggleTheme: () => void;
}

export default function SettingsTab({ theme, onToggleTheme }: SettingsTabProps) {
  const [animationsActive, setAnimationsActive] = useState(true);
  const [liveSync, setLiveSync] = useState(true);
  const [verboseLogs, setVerboseLogs] = useState(false);
  const [accent, setAccent] = useState("cyan");

  const accents = [
    { id: "cyan", label: "Cyan Theme", border: "border-[#6EE7FF]/30", bg: "bg-[#6EE7FF]", text: "text-[#6EE7FF]" },
    { id: "purple", label: "Purple Theme", border: "border-[#8B5CF6]/30", bg: "bg-[#8B5CF6]", text: "text-[#8B5CF6]" },
    { id: "blue", label: "Blue Theme", border: "border-[#38BDF8]/30", bg: "bg-[#38BDF8]", text: "text-[#38BDF8]" },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-8 pr-12 space-y-10 scrollbar-none animate-fade-in text-tangent-text">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-tangent-border pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-black text-tangent-primary uppercase tracking-[0.25em]">Preferences</span>
            <span className="w-1.5 h-1.5 rounded-full bg-tangent-primary shadow-glow-cyan" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-tangent-text font-sans">System Settings</h1>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-tangent-border bg-tangent-card">
          <Sliders size={14} className="text-tangent-primary" />
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Version 1.2.0</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Toggles config */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-6 rounded-2xl border border-tangent-border bg-tangent-card space-y-6">
            <h3 className="text-xs font-black uppercase text-tangent-text tracking-wider">Interface Options</h3>

            {/* Toggle 0: Dark / Light Mode */}
            <div className="flex items-center justify-between py-2 border-b border-tangent-border">
              <div>
                <span className="text-xs font-bold text-tangent-text block">Dark Space Mode</span>
                <span className="text-[10px] text-slate-500 font-medium">Use high-contrast dark space colors. Toggle off for light theme.</span>
              </div>
              <button
                onClick={onToggleTheme}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                {theme === "dark" ? (
                  <ToggleRight size={32} className="text-tangent-primary" />
                ) : (
                  <ToggleLeft size={32} className="text-slate-600" />
                )}
              </button>
            </div>

            {/* Toggle 1 */}
            <div className="flex items-center justify-between py-2 border-b border-tangent-border">
              <div>
                <span className="text-xs font-bold text-tangent-text block">Interactive Micro-Animations</span>
                <span className="text-[10px] text-slate-500 font-medium">Bounces, transitions, and hover glows active.</span>
              </div>
              <button
                onClick={() => setAnimationsActive(!animationsActive)}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                {animationsActive ? (
                  <ToggleRight size={32} className="text-tangent-primary" />
                ) : (
                  <ToggleLeft size={32} className="text-slate-600" />
                )}
              </button>
            </div>

            {/* Toggle 2 */}
            <div className="flex items-center justify-between py-2 border-b border-tangent-border">
              <div>
                <span className="text-xs font-bold text-tangent-text block">Live Compiler Sync</span>
                <span className="text-[10px] text-slate-500 font-medium">Automatically analyze file changes in background threads.</span>
              </div>
              <button
                onClick={() => setLiveSync(!liveSync)}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                {liveSync ? (
                  <ToggleRight size={32} className="text-tangent-primary" />
                ) : (
                  <ToggleLeft size={32} className="text-slate-600" />
                )}
              </button>
            </div>

            {/* Toggle 3 */}
            <div className="flex items-center justify-between py-2">
              <div>
                <span className="text-xs font-bold text-tangent-text block">Verbose Diagnostics</span>
                <span className="text-[10px] text-slate-500 font-medium">Display detailed tracer logs inside the AI explanation panel.</span>
              </div>
              <button
                onClick={() => setVerboseLogs(!verboseLogs)}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                {verboseLogs ? (
                  <ToggleRight size={32} className="text-tangent-primary" />
                ) : (
                  <ToggleLeft size={32} className="text-slate-600" />
                )}
              </button>
            </div>

          </div>
        </div>

        {/* Right Column: Accent selections */}
        <div className="space-y-6">
          <div className="p-6 rounded-2xl border border-tangent-border bg-tangent-bg space-y-6">
            <h3 className="text-xs font-black uppercase text-tangent-text tracking-wider">Branding theme</h3>

            {/* Accent theme select */}
            <div className="space-y-3">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Choose Theme Accent</span>
              <div className="space-y-2">
                {accents.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setAccent(item.id)}
                    className={`w-full flex items-center justify-between p-3.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      accent === item.id
                        ? `${item.border} bg-white/[0.02] ${item.text}`
                        : "border-tangent-border bg-transparent text-slate-500 hover:text-slate-200"
                    }`}
                  >
                    <span className="capitalize">{item.label}</span>
                    <div className={`w-3.5 h-3.5 rounded-full ${item.bg}`} />
                  </button>
                ))}
              </div>
            </div>

            <div className="w-full h-[1px] bg-tangent-border" />

            <div className="p-4 rounded-xl bg-tangent-card border border-tangent-border flex items-start gap-3">
              <ShieldCheck size={16} className="text-tangent-primary flex-shrink-0 mt-0.5" />
              <p className="text-[10px] text-slate-500 leading-normal font-medium">
                Tangent enforces localized, privacy-first analytics configurations. All project data traces remain inside this browser instance.
              </p>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
