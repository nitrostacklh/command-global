"use client";

import React, { useState, useEffect } from "react";
import { Sparkles, ArrowRight, Play, Compass, AlertOctagon, TrendingUp, Search, Calendar, Award } from "lucide-react";
import Project3DCard from "@/c/Project3DCard";
import { SplineSceneBasic } from "@/components/ui/demo";

interface HomeTabProps {
  onNavigateToTab: (tab: any) => void;
}

export default function HomeTab({ onNavigateToTab }: HomeTabProps) {
  const [greeting, setGreeting] = useState("Greetings, Architect");
  const [searchQuery, setSearchQuery] = useState("");
  const [timeString, setTimeString] = useState("");

  useEffect(() => {
    const hours = new Date().getHours();
    if (hours < 12) setGreeting("Good morning, Architect");
    else if (hours < 18) setGreeting("Good afternoon, Architect");
    else setGreeting("Good evening, Architect");

    const updateTime = () => {
      const now = new Date();
      setTimeString(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const projects = [
    {
      id: "p1",
      name: "Token Auth Microservice",
      role: "Lead Architect",
      difficulty: "Advanced",
      modified: "2 hours ago",
      alignment: 92,
      driftCount: 0,
      color: "from-cyan-500 to-blue-600",
    },
    {
      id: "p2",
      name: "Distributed Event Bus",
      role: "System Engineer",
      difficulty: "Intermediate",
      modified: "1 day ago",
      alignment: 64,
      driftCount: 2,
      color: "from-purple-500 to-pink-500",
    },
    {
      id: "p3",
      name: "Concurrent Cache Handler",
      role: "Developer",
      difficulty: "Beginner",
      modified: "3 days ago",
      alignment: 100,
      driftCount: 0,
      color: "from-emerald-500 to-teal-600",
    },
  ];

  const recentDrifts = [
    {
      project: "Distributed Event Bus",
      node: "Kafka Broker (Node 4)",
      deviation: "Subscribed to untrusted HTTP buffer directly instead of routing through Auth gateway.",
      impact: "High Vulnerability",
    }
  ];

  return (
    <div className="flex-1 overflow-y-auto p-8 pr-12 space-y-10 scrollbar-none animate-fade-in text-tangent-text">
      
      {/* Top Header Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-tangent-border pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-black text-tangent-primary uppercase tracking-[0.25em]">Session Active</span>
            <span className="w-1.5 h-1.5 rounded-full bg-tangent-primary shadow-glow-cyan animate-pulse" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-tangent-text font-sans">{greeting}</h1>
        </div>

        {/* Dynamic Clock Widget */}
        <div className="flex items-center gap-4 px-4 py-2.5 rounded-xl border border-tangent-border bg-tangent-card backdrop-blur-md">
          <Calendar size={14} className="text-slate-500" />
          <span className="text-xs font-bold text-slate-500 tracking-wider">
            {new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
          </span>
          <div className="w-[1px] h-4 bg-tangent-border" />
          <span className="text-xs font-mono font-bold text-tangent-primary tracking-widest">{timeString || "09:30 AM"}</span>
        </div>
      </div>

      {/* Hero Banner Grid Card - Elevated to Interactive Spline 3D Scene */}
      <SplineSceneBasic onNavigateToTab={onNavigateToTab} />

      {/* Main Grid: Projects & Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left 2 Cols: Recent Projects */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-500">Recent Class Projects</h3>
            <div className="relative w-52 group">
              <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Search projects..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-tangent-border bg-tangent-card text-[10px] text-tangent-text placeholder-slate-600 focus:outline-none focus:border-tangent-primary/30 transition-all"
              />
            </div>
          </div>

          {/* Cards list */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {projects
              .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
              .map((project, idx) => (
                <Project3DCard
                  key={project.id}
                  name={project.name}
                  role={project.role}
                  difficulty={project.difficulty}
                  modified={project.modified}
                  alignment={project.alignment}
                  driftCount={project.driftCount}
                  shapeType={idx === 0 ? "torus" : idx === 1 ? "icosahedron" : "octahedron"}
                  onClick={() => onNavigateToTab("workspace")}
                />
              ))}
          </div>
        </div>

        {/* Right Col: Stats & Active Drift Warnings */}
        <div className="space-y-6">
          <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-500">Drift Telemetry</h3>
          
          <div className="rounded-2xl border border-tangent-border bg-tangent-card p-6 space-y-6 backdrop-blur-xl">
            {/* Active alerts header */}
            <div className="flex items-center justify-between border-b border-tangent-border pb-4">
              <span className="text-xs font-bold text-tangent-text uppercase tracking-wider flex items-center gap-2">
                <AlertOctagon size={14} className="text-tangent-error animate-pulse" />
                Critical Anomalies
              </span>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Real-time</span>
            </div>

            {/* List of drifts */}
            {recentDrifts.map((drift, i) => (
              <div key={i} className="space-y-3 p-4 rounded-xl bg-tangent-error/5 border border-tangent-error/15">
                <div className="flex items-center justify-between text-[9px] font-black text-tangent-error uppercase tracking-wider">
                  <span>{drift.project}</span>
                  <span className="bg-tangent-error/10 px-2 py-0.5 rounded">{drift.impact}</span>
                </div>
                <h4 className="text-xs font-bold text-tangent-text">{drift.node}</h4>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium">{drift.deviation}</p>
                <button
                  onClick={() => onNavigateToTab("timeline")}
                  className="w-full text-center py-2 rounded-lg bg-tangent-error/10 hover:bg-tangent-error/20 border border-tangent-error/20 text-tangent-text font-bold text-[9px] uppercase tracking-widest transition-all cursor-pointer active:scale-95"
                >
                  Locate Deviation Node
                </button>
              </div>
            ))}

            {/* Overall summary stats */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between p-3 rounded-lg bg-tangent-card border border-tangent-border text-xs font-medium">
                <span className="text-slate-500 flex items-center gap-2">
                  <TrendingUp size={12} className="text-tangent-primary" />
                  Monthly Streak
                </span>
                <span className="font-bold text-tangent-text">12 Days</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-tangent-card border border-tangent-border text-xs font-medium">
                <span className="text-slate-500 flex items-center gap-2">
                  <Award size={12} className="text-tangent-secondary" />
                  Achievements Unlocked
                </span>
                <span className="font-bold text-tangent-text">8 / 15</span>
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
