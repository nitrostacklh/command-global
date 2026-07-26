"use client";

import React, { useState, useEffect } from "react";
import { Mail, Lock, Chrome, Github, Sparkles, ArrowRight, CheckCircle2 } from "lucide-react";

interface AuthScreenProps {
  onLogin: () => void;
}

export default function AuthScreen({ onLogin }: AuthScreenProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [codeLines, setCodeLines] = useState<string[]>([]);
  const [nodePositions, setNodePositions] = useState<{ x: number; y: number; label: string; active: boolean }[]>([]);

  // Simulation parameters for left-side graph
  useEffect(() => {
    setNodePositions([
      { x: 30, y: 35, label: "Intent (A)", active: true },
      { x: 70, y: 25, label: "Actual (B)", active: true },
      { x: 50, y: 70, label: "Drift Point (Δ)", active: false },
      { x: 80, y: 65, label: "Compiler", active: false },
    ]);

    const codeTemplates = [
      "import { trace } from '@tangent/core';",
      "const plan = new ArchitecturePlan('AuthService');",
      "const build = await localBuild.compile();",
      "// Drift detected at Node 3",
      "const drift = plan.compare(build);",
      "if (drift.diverged) {",
      "  console.log(drift.explanation);",
      "}"
    ];

    let currentLine = 0;
    const interval = setInterval(() => {
      if (currentLine < codeTemplates.length) {
        setCodeLines(prev => [...prev, codeTemplates[currentLine]]);
        currentLine++;
        
        // Toggle node activity as code compiles
        setNodePositions(prev =>
          prev.map((node, i) =>
            i === currentLine % prev.length ? { ...node, active: !node.active } : node
          )
        );
      } else {
        setCodeLines([]);
        currentLine = 0;
      }
    }, 1500);

    return () => clearInterval(interval);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      onLogin();
    }, 1200);
  };

  return (
    <div className="h-screen w-screen flex flex-col md:flex-row bg-[#020617] overflow-hidden text-white font-sans">
      {/* Background Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute w-[600px] h-[600px] top-[-10%] right-[-10%] rounded-full bg-tangent-primary/5 blur-[120px] animate-pulse" />
        <div className="absolute w-[500px] h-[500px] bottom-[-10%] left-[-10%] rounded-full bg-tangent-secondary/5 blur-[120px] animate-pulse" />
        <div className="absolute inset-0 noise-overlay opacity-[0.01]" />
      </div>

      {/* Left Column: Flowing Graph Illustration */}
      <div className="hidden md:flex flex-1 relative flex-col justify-between p-12 border-r border-white/5 bg-[#020617]/50 backdrop-blur-3xl overflow-hidden z-10">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="relative w-4 h-4 flex items-center justify-center mr-1">
            <div className="absolute w-3 h-3 rounded-full border border-tangent-primary/80" />
            <div className="absolute w-[1px] h-5 bg-tangent-secondary top-0 right-0 transform translate-x-[2px]" />
            <div className="absolute w-1 h-1 rounded-full bg-tangent-primary top-1 right-0 transform translate-x-[2px]" />
          </div>
          <span className="text-md font-bold tracking-[0.25em] text-white">TANGENT</span>
        </div>

        {/* Animated Graph Canvas */}
        <div className="relative w-full h-[320px] flex items-center justify-center my-auto">
          {/* SVGs linking nodes */}
          <svg className="absolute inset-0 w-full h-full">
            {/* Connection Lines with glowing dashes */}
            <line
              x1={`${nodePositions[0]?.x}%`}
              y1={`${nodePositions[0]?.y}%`}
              x2={`${nodePositions[2]?.x}%`}
              y2={`${nodePositions[2]?.y}%`}
              stroke="rgba(110, 231, 255, 0.2)"
              strokeWidth="1.5"
            />
            <line
              x1={`${nodePositions[1]?.x}%`}
              y1={`${nodePositions[1]?.y}%`}
              x2={`${nodePositions[2]?.x}%`}
              y2={`${nodePositions[2]?.y}%`}
              stroke="rgba(139, 92, 246, 0.2)"
              strokeWidth="1.5"
            />
            <line
              x1={`${nodePositions[2]?.x}%`}
              y1={`${nodePositions[2]?.y}%`}
              x2={`${nodePositions[3]?.x}%`}
              y2={`${nodePositions[3]?.y}%`}
              stroke="rgba(110, 231, 255, 0.2)"
              strokeWidth="1.5"
              strokeDasharray="5 3"
            />

            {/* Glowing active trails */}
            {nodePositions[0]?.active && (
              <line
                x1={`${nodePositions[0]?.x}%`}
                y1={`${nodePositions[0]?.y}%`}
                x2={`${nodePositions[2]?.x}%`}
                y2={`${nodePositions[2]?.y}%`}
                stroke="#6EE7FF"
                strokeWidth="2"
                strokeDasharray="6 6"
                className="animate-flow"
                style={{ filter: "drop-shadow(0 0 4px #6EE7FF)" }}
              />
            )}
            {nodePositions[1]?.active && (
              <line
                x1={`${nodePositions[1]?.x}%`}
                y1={`${nodePositions[1]?.y}%`}
                x2={`${nodePositions[2]?.x}%`}
                y2={`${nodePositions[2]?.y}%`}
                stroke="#8B5CF6"
                strokeWidth="2"
                strokeDasharray="6 6"
                className="animate-flow"
                style={{ filter: "drop-shadow(0 0 4px #8B5CF6)" }}
              />
            )}
          </svg>

          {/* Interactive Floating Node Points */}
          {nodePositions.map((node, i) => (
            <div
              key={i}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-2 group"
              style={{ left: `${node.x}%`, top: `${node.y}%` }}
            >
              <div
                className={`w-6 h-6 rounded-full border flex items-center justify-center transition-all duration-500 bg-[#020617] ${
                  node.active
                    ? "border-tangent-primary shadow-glow-cyan scale-110"
                    : "border-white/10 group-hover:border-white/30"
                }`}
              >
                <div
                  className={`w-2.5 h-2.5 rounded-full transition-colors duration-500 ${
                    node.active ? "bg-tangent-primary animate-pulse" : "bg-white/10"
                  }`}
                />
              </div>
              <span
                className={`text-[10px] font-medium tracking-wider px-2 py-0.5 rounded-md bg-white/[0.02] border border-white/5 transition-colors ${
                  node.active ? "text-tangent-primary border-tangent-primary/20" : "text-slate-500"
                }`}
              >
                {node.label}
              </span>
            </div>
          ))}
        </div>

        {/* Dynamic Code Panel */}
        <div className="w-full h-44 rounded-xl border border-white/5 bg-white/[0.01] p-5 font-mono text-[11px] text-slate-400 overflow-y-auto backdrop-blur-md">
          <div className="flex items-center gap-1.5 mb-3 border-b border-white/5 pb-2">
            <div className="w-2.5 h-2.5 rounded-full bg-[#EF4444]/40" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]/40" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#22C55E]/40" />
            <span className="text-[9px] font-bold tracking-widest uppercase text-slate-600 ml-2">Compiler Sandbox</span>
          </div>
          <div className="space-y-1.5">
            {codeLines.map((line, idx) => (
              <div key={idx} className="animate-fade-in flex gap-3">
                <span className="text-slate-700 select-none w-4">0{idx + 1}</span>
                <span className={line.includes("//") ? "text-tangent-secondary/80 italic" : line.includes("drift") ? "text-tangent-primary" : "text-slate-300"}>
                  {line}
                </span>
              </div>
            ))}
            <div className="typewriter-cursor text-tangent-primary" />
          </div>
        </div>
      </div>

      {/* Right Column: Premium Auth Card */}
      <div className="flex-1 flex flex-col justify-center items-center p-8 md:p-16 z-10">
        <div className="w-full max-w-[420px] flex flex-col gap-8">
          
          {/* Header */}
          <div className="flex flex-col gap-2 text-center md:text-left">
            <h2 className="text-3xl font-bold tracking-tight font-sans bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              Trace Your Thinking
            </h2>
            <p className="text-xs text-slate-500 font-medium tracking-wide">
              Sign in to analyze structural differences and discover code anomalies.
            </p>
          </div>

          {/* Social Logins */}
          <div className="grid grid-cols-2 gap-4">
            <button className="flex items-center justify-center gap-2 py-3 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.06] transition-all duration-300 text-xs font-bold text-slate-300 hover:text-white cursor-pointer active:scale-95">
              <Chrome size={14} className="text-tangent-primary" />
              Google
            </button>
            <button className="flex items-center justify-center gap-2 py-3 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.06] transition-all duration-300 text-xs font-bold text-slate-300 hover:text-white cursor-pointer active:scale-95">
              <Github size={14} className="text-tangent-secondary" />
              GitHub
            </button>
          </div>

          {/* Separator */}
          <div className="flex items-center gap-4">
            <div className="flex-1 h-[1px] bg-white/5" />
            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">or continue with</span>
            <div className="flex-1 h-[1px] bg-white/5" />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* Email input */}
            <div className="flex flex-col gap-2">
              <label className="text-[10px] uppercase tracking-widest font-black text-slate-500">Email Address</label>
              <div className="relative group">
                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-tangent-primary transition-colors" />
                <input
                  type="email"
                  required
                  placeholder="student@tangent.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-white/5 bg-white/[0.02] placeholder-slate-700 text-sm focus:outline-none focus:border-tangent-primary/40 focus:ring-1 focus:ring-tangent-primary/20 focus:bg-white/[0.04] transition-all"
                />
              </div>
            </div>

            {/* Password input */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="text-[10px] uppercase tracking-widest font-black text-slate-500">Password</label>
                <a href="#" className="text-[10px] font-bold text-tangent-primary hover:underline">Forgot password?</a>
              </div>
              <div className="relative group">
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-tangent-primary transition-colors" />
                <input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-white/5 bg-white/[0.02] placeholder-slate-700 text-sm focus:outline-none focus:border-tangent-primary/40 focus:ring-1 focus:ring-tangent-primary/20 focus:bg-white/[0.04] transition-all"
                />
              </div>
            </div>

            {/* Remember me */}
            <div className="flex items-center gap-2 mt-1">
              <input
                type="checkbox"
                id="remember"
                className="w-4 h-4 rounded border-white/5 bg-white/[0.02] text-tangent-primary focus:ring-0"
              />
              <label htmlFor="remember" className="text-xs text-slate-500 font-medium select-none cursor-pointer">
                Keep me authenticated for 30 days
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="relative mt-2 overflow-hidden flex items-center justify-center gap-3 py-4 rounded-xl font-bold text-xs uppercase tracking-[0.25em] text-black bg-gradient-to-r from-tangent-primary to-tangent-accent hover:from-tangent-primary hover:to-tangent-secondary hover:text-white transition-all duration-500 shadow-glow-cyan hover:shadow-glow-purple disabled:opacity-50 active:scale-[0.98] cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-black border-t-transparent animate-spin" />
                  Aligning Graph...
                </>
              ) : (
                <>
                  Initialize Session
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <p className="text-center text-xs text-slate-600 font-medium">
            New to Tangent?{" "}
            <a href="#" className="text-tangent-primary hover:underline font-bold">
              Create an academic account
            </a>
          </p>

        </div>
      </div>
    </div>
  );
}
