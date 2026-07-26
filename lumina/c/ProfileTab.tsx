"use client";

import React from "react";
import { User, Award, ShieldCheck, Flame, Cpu, GraduationCap, Trophy, ChevronRight } from "lucide-react";

export default function ProfileTab() {
  const stats = [
    { label: "Drifts Solved", value: "34", icon: <ShieldCheck size={16} />, color: "text-tangent-primary" },
    { label: "Trace Sessions", value: "82", icon: <Cpu size={16} />, color: "text-tangent-accent" },
    { label: "Active Streak", value: "12 Days", icon: <Flame size={16} />, color: "text-amber-500" },
  ];

  const badges = [
    { name: "Drift Buster", desc: "Correctly resolved 10 database pipeline drift anomalies.", icon: <Trophy />, unlocked: true, color: "from-[#6EE7FF] to-[#38BDF8]" },
    { name: "Gateway Guardian", desc: "Implemented authenticated gateways on 5 consecutive projects.", icon: <ShieldCheck />, unlocked: true, color: "from-[#8B5CF6] to-[#A855F7]" },
    { name: "Zero-Error Compiler", desc: "Compiled a plan with 100% design alignment on first upload.", icon: <Award />, unlocked: false, color: "from-slate-700 to-slate-800" },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-8 pr-12 space-y-10 scrollbar-none animate-fade-in text-tangent-text">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-tangent-border pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-black text-tangent-primary uppercase tracking-[0.25em]">Student Registry</span>
            <span className="w-1.5 h-1.5 rounded-full bg-tangent-primary shadow-glow-cyan" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-tangent-text font-sans">Academic Profile</h1>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-tangent-border bg-white/[0.01]">
          <GraduationCap size={14} className="text-tangent-primary" />
          <span className="text-xs font-bold text-slate-400">Class: Advanced Systems II</span>
        </div>
      </div>

      {/* Profile Overview Card */}
      <div className="p-8 rounded-3xl border border-tangent-border bg-white/[0.01] flex flex-col md:flex-row items-center gap-8 backdrop-blur-md relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-tangent-primary/5 via-transparent to-tangent-secondary/5 pointer-events-none" />

        {/* Animated Avatar Box */}
        <div className="relative w-28 h-28 flex items-center justify-center flex-shrink-0 select-none">
          {/* Orbital glowing lines spinning slowly */}
          <div className="absolute inset-0 rounded-full border border-tangent-primary/40 border-t-transparent animate-spin" />
          <div className="absolute inset-1.5 rounded-full border border-dashed border-tangent-secondary/40 border-b-transparent animate-spin-slow" />
          
          <div className="w-20 h-20 rounded-full bg-slate-900 border border-tangent-borderBright flex items-center justify-center text-tangent-text relative z-10 shadow-2xl overflow-hidden">
            <User size={36} className="text-slate-400" />
            <div className="absolute inset-x-0 bottom-0 bg-tangent-primary/10 border-t border-tangent-primary/20 text-[7px] text-center text-tangent-primary py-0.5 font-black uppercase tracking-widest">
              OP-04
            </div>
          </div>
        </div>

        {/* Student Details & XP Bar */}
        <div className="flex-1 space-y-4 text-center md:text-left w-full">
          <div>
            <h2 className="text-xl font-bold text-tangent-text tracking-tight">Alex Mercer</h2>
            <p className="text-xs text-slate-500 font-medium tracking-wide">Developer Profile ID: T-84092</p>
          </div>

          {/* XP Bar */}
          <div className="space-y-2 max-w-md mx-auto md:mx-0">
            <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider">
              <span className="text-tangent-primary">Level 4 System Architect</span>
              <span className="text-slate-400">2,450 / 4,000 XP</span>
            </div>
            <div className="w-full h-2 rounded-full bg-tangent-card overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-tangent-primary to-tangent-secondary shadow-glow-cyan"
                style={{ width: "61.25%" }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="p-6 rounded-2xl border border-tangent-border bg-white/[0.01] flex items-center justify-between backdrop-blur-md">
            <div className="space-y-1">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">{stat.label}</span>
              <div className="text-2xl font-bold text-tangent-text tracking-tight">{stat.value}</div>
            </div>
            <div className={`p-3 rounded-xl bg-white/[0.02] border border-tangent-border ${stat.color}`}>
              {stat.icon}
            </div>
          </div>
        ))}
      </div>

      {/* Row 3: Achievements & Badges shelf */}
      <div className="space-y-6">
        <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-400">Achievements Shelf</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {badges.map((badge, idx) => (
            <div
              key={idx}
              className={`p-6 rounded-2xl border transition-all duration-300 ${
                badge.unlocked
                  ? "border-tangent-border bg-white/[0.01] hover:border-tangent-primary/20"
                  : "border-tangent-border bg-white/[0.005] opacity-50"
              }`}
            >
              <div className="flex items-start gap-4">
                {/* Badge Icon Frame */}
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-tr ${badge.color} p-0.5 flex items-center justify-center text-black flex-shrink-0 shadow-lg`}>
                  <div className="w-full h-full rounded-[10px] bg-slate-950 flex items-center justify-center text-tangent-text">
                    {React.cloneElement(badge.icon, { size: 20, className: badge.unlocked ? "text-tangent-primary animate-pulse" : "text-slate-600" })}
                  </div>
                </div>

                {/* Badge details */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-tangent-text">{badge.name}</h4>
                    {badge.unlocked ? (
                      <span className="text-[8px] font-black text-tangent-success bg-tangent-success/10 px-1.5 py-0.2 rounded uppercase">UNLOCKED</span>
                    ) : (
                      <span className="text-[8px] font-black text-slate-600 bg-tangent-card px-1.5 py-0.2 rounded uppercase">LOCKED</span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 leading-normal font-medium">{badge.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
