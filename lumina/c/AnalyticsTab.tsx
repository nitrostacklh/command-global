"use client";

import React, { useState } from "react";
import { BarChart3, TrendingUp, Calendar, Zap, AlertTriangle, Layers, Percent } from "lucide-react";

export default function AnalyticsTab() {
  // Mock contribution data representing the last 15 weeks (15 columns x 7 rows)
  const days = Array.from({ length: 15 * 7 }).map((_, i) => {
    // Generate some random intensity for drift occurrences: 0 = none, 1 = low, 2 = medium, 3 = high
    const r = Math.random();
    if (r > 0.85) return 3; // Red
    if (r > 0.7) return 2;  // Dark Purple
    if (r > 0.4) return 1;  // Cyan/Light Blue
    return 0;               // Dark slate
  });

  const categories = [
    { label: "API Gateway Routes", count: 12, percentage: 85, color: "bg-tangent-primary" },
    { label: "Token Cryptography", count: 5, percentage: 92, color: "bg-tangent-secondary" },
    { label: "Caches & Buffers", count: 8, percentage: 68, color: "bg-amber-500" },
    { label: "Socket Bindings", count: 14, percentage: 54, color: "bg-tangent-error" },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-8 pr-12 space-y-10 scrollbar-none animate-fade-in text-tangent-text">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-tangent-border pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-black text-tangent-primary uppercase tracking-[0.25em]">Telemetry Analysis</span>
            <span className="w-1.5 h-1.5 rounded-full bg-tangent-primary shadow-glow-cyan" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-tangent-text font-sans">Mistake Analytics</h1>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-tangent-border bg-white/[0.01]">
          <BarChart3 size={14} className="text-tangent-primary" />
          <span className="text-xs font-bold text-slate-400">Monthly Diagnostic Report</span>
        </div>
      </div>

      {/* Analytics Hero Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: "System Alignment Rate", value: "82%", sub: "+4% from last week", color: "text-tangent-primary" },
          { label: "Unresolved Code Drifts", value: "2 Active", sub: "-3 resolved today", color: "text-tangent-error" },
          { label: "Concept Comprehension", value: "78%", sub: "Top 15% of class", color: "text-tangent-secondary" },
        ].map((stat, i) => (
          <div key={i} className="p-6 rounded-2xl border border-tangent-border bg-white/[0.01] space-y-2 backdrop-blur-md">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">{stat.label}</span>
            <div className={`text-3xl font-bold tracking-tight ${stat.color}`}>{stat.value}</div>
            <span className="text-[10px] text-slate-600 font-medium block">{stat.sub}</span>
          </div>
        ))}
      </div>

      {/* Row 2: Heatmap */}
      <div className="p-6 rounded-2xl border border-tangent-border bg-white/[0.01] space-y-6 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-tangent-text tracking-wide uppercase">Drift Occurrence Heatmap</h3>
            <p className="text-[10px] text-slate-500 font-medium">Daily grid track of architectural drifts identified in code uploads.</p>
          </div>
          <div className="flex items-center gap-2 text-[9px] font-black text-slate-500 uppercase tracking-wider">
            <span>Aligned</span>
            <div className="w-3 h-3 rounded bg-slate-900 border border-tangent-border" />
            <div className="w-3 h-3 rounded bg-tangent-primary/30" />
            <div className="w-3 h-3 rounded bg-tangent-secondary/60" />
            <div className="w-3 h-3 rounded bg-tangent-error shadow-glow-red" />
            <span>Drift Detected</span>
          </div>
        </div>

        {/* Heatmap Grid */}
        <div className="grid grid-flow-col grid-rows-7 gap-1.5 overflow-x-auto py-2">
          {days.map((val, idx) => {
            let color = "bg-slate-950 border border-tangent-border";
            if (val === 1) color = "bg-tangent-primary/30";
            if (val === 2) color = "bg-tangent-secondary/60";
            if (val === 3) color = "bg-tangent-error shadow-glow-red/20";
            return (
              <div
                key={idx}
                className={`w-4 h-4 rounded transition-all duration-300 hover:scale-125 ${color}`}
                title={`Telemetry check ${idx + 1}`}
              />
            );
          })}
        </div>
      </div>

      {/* Row 3: Skills Alignment */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Alignment Breakdown */}
        <div className="p-6 rounded-2xl border border-tangent-border bg-white/[0.01] space-y-6 backdrop-blur-md">
          <h3 className="text-sm font-bold text-tangent-text tracking-wide uppercase">Topic Competence Levels</h3>
          
          <div className="space-y-4">
            {categories.map((cat, i) => (
              <div key={i} className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-tangent-text">{cat.label}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-slate-500 text-[10px] uppercase font-bold">{cat.count} Drifts traced</span>
                    <span className="text-tangent-text font-bold">{cat.percentage}%</span>
                  </div>
                </div>
                <div className="w-full h-1.5 rounded-full bg-tangent-card overflow-hidden">
                  <div
                    className={`h-full rounded-full ${cat.color}`}
                    style={{ width: `${cat.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Dynamic Growth Analysis Card */}
        <div className="p-6 rounded-2xl border border-tangent-border bg-[#020617] relative overflow-hidden flex flex-col justify-between h-full min-h-[240px]">
          <div className="absolute inset-0 bg-radial-gradient from-tangent-primary/5 to-transparent pointer-events-none" />
          
          <div className="space-y-3 relative z-10">
            <span className="text-[10px] font-black text-tangent-primary uppercase tracking-widest block">AI Diagnostic Insight</span>
            <h4 className="text-lg font-bold text-tangent-text tracking-tight">Focus on middleware routing protocols.</h4>
            <p className="text-xs text-slate-400 leading-relaxed font-medium">
              Your analytics show a pattern: database sockets (direct bindings) represent 65% of your total implementation drifts. We recommend revising the **Gateway-Auth Gateway pattern** before the next class project milestone.
            </p>
          </div>

          <div className="pt-6 relative z-10 flex items-center justify-between text-[10px] font-black text-slate-500 tracking-wider border-t border-tangent-border">
            <span>SUGGESTED EXERCISE</span>
            <button className="flex items-center gap-1 text-tangent-primary font-bold hover:underline cursor-pointer">
              Launch Gateway Sandboxes
              <TrendingUp size={10} />
            </button>
          </div>
        </div>

      </div>

    </div>
  );
}
