"use client";

import React, { useState, useEffect, useRef } from "react";
import { Play, Sparkles, AlertTriangle, Eye, ShieldAlert, Cpu, CheckCircle } from "lucide-react";

// Mini component emitting glowing warning sparks when drift active
function NodeParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const width = (canvas.width = 120);
    const height = (canvas.height = 120);

    const particles: {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      alpha: number;
      decay: number;
    }[] = [];

    let animId: number;

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      // Spawn new spark periodically
      if (Math.random() < 0.35 && particles.length < 25) {
        particles.push({
          x: width / 2,
          y: height / 2,
          vx: (Math.random() - 0.5) * 1.5,
          vy: (Math.random() - 0.5) * 1.5 - 0.5, // Float upwards slightly
          size: Math.random() * 2 + 1,
          alpha: 1.0,
          decay: Math.random() * 0.015 + 0.01,
        });
      }

      particles.forEach((p, idx) => {
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= p.decay;

        if (p.alpha <= 0) {
          particles.splice(idx, 1);
          return;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(239, 68, 68, ${p.alpha})`; // Glowing red spark
        ctx.shadowBlur = 4;
        ctx.shadowColor = "#EF4444";
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      animId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute -inset-10 w-[120px] h-[120px] pointer-events-none z-20" />;
}

export default function TimelineTab() {
  const [driftActive, setDriftActive] = useState(false);
  const [zoomLevel, setZoomLevel] = useState("scale-100");
  const [typewriterText, setTypewriterText] = useState("");
  const [confidence, setConfidence] = useState(100);

  const fullExplanation = "CRITICAL DRIFT: The system has detected a direct TCP/Socket connection from the Client Node directly to the Database Router. The planned architecture requires all traffic to traverse the Auth Gateway middleware first. This bypasses structural filters and invalidates authentication requirements.";

  useEffect(() => {
    let index = 0;
    let timer: NodeJS.Timeout;

    if (driftActive) {
      setTypewriterText("");
      const type = () => {
        if (index < fullExplanation.length) {
          // Slice to the new length rather than appending inside the updater.
          // `prev + charAt(index)` reads the mutable `index` when React runs the
          // updater, not when it is scheduled, so a replayed or double-invoked
          // updater (StrictMode) appended the wrong character and the sentence
          // came out garbled. Deriving from a captured length is idempotent.
          const next = index + 1;
          index = next;
          setTypewriterText(fullExplanation.slice(0, next));
          timer = setTimeout(type, 15);
        }
      };
      const delay = setTimeout(type, 1800);
      return () => {
        clearTimeout(timer);
        clearTimeout(delay);
      };
    } else {
      setTypewriterText("");
    }
  }, [driftActive]);

  const triggerDrift = () => {
    setDriftActive(false);
    setZoomLevel("scale-100");
    setConfidence(100);

    setTimeout(() => {
      setDriftActive(true);
      setZoomLevel("scale-105 translate-x-[-4%] translate-y-[-2%]");
      
      let currentConf = 100;
      const confInterval = setInterval(() => {
        if (currentConf > 64) {
          currentConf--;
          setConfidence(currentConf);
        } else {
          clearInterval(confInterval);
        }
      }, 30);
    }, 300);
  };

  const resetSimulation = () => {
    setDriftActive(false);
    setZoomLevel("scale-100");
    setConfidence(100);
    setTypewriterText("");
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row h-full overflow-hidden text-tangent-text animate-fade-in select-none">
      
      {/* Main Cinematic Visualizer (Left) */}
      <div className={`flex-1 relative flex flex-col justify-between p-8 overflow-hidden transition-all duration-1000 ${
        driftActive ? "bg-[#0b0c16]/95" : "bg-tangent-bg"
      }`}>
        {/* Floating Controls */}
        <div className="flex items-center justify-between z-10 pointer-events-auto">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-tangent-primary uppercase tracking-[0.25em]">Causal Engine</span>
              <span className="w-1.5 h-1.5 rounded-full bg-tangent-primary shadow-glow-cyan" />
            </div>
            <h2 className="text-xl font-bold tracking-tight text-tangent-text">Cinematic Drift Timeline</h2>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={resetSimulation}
              className="px-4 py-2 rounded-xl border border-tangent-border bg-tangent-card hover:bg-tangent-card/60 text-[9px] font-black uppercase tracking-widest text-slate-500 hover:text-tangent-text transition-all cursor-pointer"
            >
              Reset Graph
            </button>
            <button
              onClick={triggerDrift}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-tangent-primary to-tangent-secondary hover:scale-105 text-black font-black text-[9px] uppercase tracking-widest transition-all cursor-pointer shadow-lg active:scale-95"
            >
              <Play size={10} fill="black" />
              Trace Drift
            </button>
          </div>
        </div>

        {/* Cinematic Zoom Container */}
        <div className={`flex-1 flex flex-col justify-center items-center relative transition-all duration-[2000ms] ease-out ${zoomLevel}`}>
          
          {/* Subtle Background Grid Lines */}
          <div className="absolute inset-0 pointer-events-none opacity-5">
            <div className="absolute inset-y-0 left-1/4 w-[1px] bg-white" />
            <div className="absolute inset-y-0 left-2/4 w-[1px] bg-white" />
            <div className="absolute inset-y-0 left-3/4 w-[1px] bg-white" />
          </div>

          {/* Lane Labels */}
          <div className="w-full max-w-[800px] mb-2 flex items-center justify-between text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] px-4">
            <span>Planned Blueprint (Target Intent)</span>
            <span className="text-tangent-primary">Verified Path</span>
          </div>

          {/* TOP LANE: PLANNED ARCHITECTURE */}
          <div className="w-full max-w-[800px] py-6 px-8 rounded-3xl border border-tangent-border bg-tangent-card/40 backdrop-blur-md flex justify-between items-center relative">
            <div className="absolute left-6 right-6 h-[1px] bg-tangent-border z-0" />
            
            {/* Planned Node 1 */}
            <div className="relative z-10 flex flex-col items-center gap-1.5 bg-tangent-bg px-4 py-2 rounded-xl border border-tangent-borderBright hover:scale-105 transition-transform">
              <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">Plan 01</span>
              <span className="text-xs font-bold text-tangent-text">Client UI</span>
            </div>

            {/* Flow 1 */}
            <div className="w-full flex justify-center overflow-visible relative">
              <svg className="w-16 h-2 overflow-visible pointer-events-none">
                <path d="M0,4 L64,4" stroke="var(--primary)" strokeWidth="2" strokeDasharray="4 2" className="animate-flow opacity-40" />
                <circle r="2.5" fill="#FFFFFF" style={{ filter: "drop-shadow(0 0 4px var(--primary))" }}>
                  <animateMotion dur="1.8s" repeatCount="indefinite" path="M0,4 L64,4" />
                </circle>
              </svg>
            </div>

            {/* Planned Node 2 */}
            <div className="relative z-10 flex flex-col items-center gap-1.5 bg-tangent-bg px-4 py-2 rounded-xl border border-tangent-borderBright hover:scale-105 transition-transform">
              <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">Plan 02</span>
              <span className="text-xs font-bold text-tangent-text">Auth Gateway</span>
            </div>

            {/* Flow 2 */}
            <div className="w-full flex justify-center overflow-visible relative">
              <svg className="w-16 h-2 overflow-visible pointer-events-none">
                <path d="M0,4 L64,4" stroke="var(--primary)" strokeWidth="2" strokeDasharray="4 2" className="animate-flow opacity-40" />
                <circle r="2.5" fill="#FFFFFF" style={{ filter: "drop-shadow(0 0 4px var(--primary))" }}>
                  <animateMotion dur="1.8s" repeatCount="indefinite" path="M0,4 L64,4" />
                </circle>
              </svg>
            </div>

            {/* Planned Node 3 */}
            <div className="relative z-10 flex flex-col items-center gap-1.5 bg-tangent-bg px-4 py-2 rounded-xl border border-tangent-borderBright hover:scale-105 transition-transform">
              <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">Plan 03</span>
              <span className="text-xs font-bold text-tangent-text">DB Router</span>
            </div>
          </div>

          {/* Spacer / Mid-way Connectors */}
          <div className="h-20 w-full max-w-[800px] relative flex justify-between px-16 pointer-events-none">
            <div className="w-[1px] h-full border-l border-dashed border-tangent-border/40" />
            <div className="w-[1px] h-full border-l border-dashed border-tangent-border/40" />
            <div className="w-[1px] h-full border-l border-dashed border-tangent-border/40" />

            {/* Dynamic glowing red connection arrow when drift active */}
            {driftActive && (
              <svg className="absolute inset-0 w-full h-full animate-flow-in overflow-visible">
                <path
                  id="drift-bypass-path"
                  d="M 120 -10 C 120 40, 600 40, 680 80"
                  fill="none"
                  stroke="#EF4444"
                  strokeWidth="2.5"
                  strokeDasharray="6 3"
                  className="animate-flow"
                  style={{ filter: "drop-shadow(0 0 6px #EF4444)" }}
                />
                {/* Red energy pulse traveling down curved path */}
                <circle r="4.5" fill="#FFFFFF" style={{ filter: "drop-shadow(0 0 6px #EF4444)" }}>
                  <animateMotion dur="1.2s" repeatCount="indefinite">
                    <mpath href="#drift-bypass-path" />
                  </animateMotion>
                </circle>
                <circle cx="680" cy="80" r="4.5" fill="#EF4444" className="animate-ping" />
              </svg>
            )}
          </div>

          {/* Lane Labels */}
          <div className="w-full max-w-[800px] mb-2 flex items-center justify-between text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] px-4">
            <span>Actual Build (Codebase state)</span>
            <span className={driftActive ? "text-tangent-error animate-pulse font-bold" : "text-slate-500"}>
              {driftActive ? "Drift Active" : "Aligned"}
            </span>
          </div>

          {/* BOTTOM LANE: ACTUAL CODE SYSTEM */}
          <div className="w-full max-w-[800px] py-6 px-8 rounded-3xl border border-tangent-border bg-tangent-card/40 backdrop-blur-md flex justify-between items-center relative">
            <div className="absolute left-6 right-6 h-[1px] bg-tangent-border z-0" />

            {/* Actual Node 1 */}
            <div className="relative z-10 flex flex-col items-center gap-1.5 bg-tangent-bg px-4 py-2 rounded-xl border border-tangent-borderBright hover:scale-105 transition-transform">
              <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">Build 01</span>
              <span className="text-xs font-bold text-tangent-text">Client UI</span>
            </div>

            {/* Connection 1 */}
            <div className="w-full flex justify-center overflow-visible relative">
              <svg className="w-16 h-2 overflow-visible pointer-events-none">
                <path d="M0,4 L64,4" stroke={driftActive ? "var(--border)" : "var(--primary)"} strokeWidth="2" className="opacity-40" />
                {!driftActive && (
                  <circle r="2.5" fill="#FFFFFF" style={{ filter: "drop-shadow(0 0 4px var(--primary))" }}>
                    <animateMotion dur="1.8s" repeatCount="indefinite" path="M0,4 L64,4" />
                  </circle>
                )}
              </svg>
            </div>

            {/* Actual Node 2 (WARNING - bypassed) */}
            <div className={`relative z-10 flex flex-col items-center gap-1.5 bg-tangent-bg px-4 py-2 rounded-xl border transition-all duration-500 ${
              driftActive
                ? "border-amber-500/40 bg-amber-500/5 text-amber-500"
                : "border-tangent-borderBright text-slate-400"
            }`}>
              <span className="text-[8px] font-bold uppercase tracking-wider">Build 02</span>
              <span className="text-xs font-bold">Auth Gateway</span>
              {driftActive && <span className="absolute -top-1.5 -right-1.5 bg-amber-500 text-black text-[7px] font-black px-1 rounded">BYPASSED</span>}
            </div>

            {/* Connection 2 */}
            <div className="w-full flex justify-center overflow-visible relative">
              <svg className="w-16 h-2 overflow-visible pointer-events-none">
                <path d="M0,4 L64,4" stroke={driftActive ? "var(--border)" : "var(--primary)"} strokeWidth="2" className="opacity-40" />
                {!driftActive && (
                  <circle r="2.5" fill="#FFFFFF" style={{ filter: "drop-shadow(0 0 4px var(--primary))" }}>
                    <animateMotion dur="1.8s" repeatCount="indefinite" path="M0,4 L64,4" />
                  </circle>
                )}
              </svg>
            </div>

            {/* Actual Node 3 (ERROR - drifting node) */}
            <div
              className={`relative z-10 flex flex-col items-center gap-1.5 bg-tangent-bg px-5 py-2.5 rounded-xl border transition-all duration-300 ${
                driftActive
                  ? "border-tangent-error bg-tangent-error/10 text-tangent-text shadow-glow-red scale-110 animate-drift-shake"
                  : "border-tangent-borderBright"
              }`}
            >
              <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">Build 03</span>
              <span className="text-xs font-bold">DB Router</span>
              
              {/* Particle Sparks Burst when drift is active */}
              {driftActive && <NodeParticles />}

              {/* Ripple Ring when drift is active */}
              {driftActive && (
                <div className="absolute inset-0 rounded-xl border border-tangent-error animate-ripple-expand pointer-events-none z-10" />
              )}
            </div>
          </div>

        </div>

        {/* Bottom Status bar */}
        <div className="z-10 p-4 rounded-2xl border border-tangent-border bg-tangent-card/60 backdrop-blur-md flex items-center justify-between text-[10px] font-medium text-slate-500">
          <span>Drift Analysis logs are verified locally</span>
          <span>Simulation status: {driftActive ? "Divergent state loaded" : "Awaiting analysis"}</span>
        </div>
      </div>

      {/* Side Explanation Drawer (Right) */}
      <div className="w-full lg:w-96 border-t lg:border-t-0 lg:border-l border-tangent-border bg-tangent-card/25 flex flex-col justify-between flex-shrink-0">
        
        {/* Alignment Stat */}
        <div className="p-6 border-b border-tangent-border bg-tangent-card space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase text-slate-400 tracking-wider">Alignment Score</span>
            {driftActive ? (
              <span className="flex items-center gap-1.5 text-xs text-tangent-error font-bold uppercase tracking-wider">
                <ShieldAlert size={14} />
                Drift Alert
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-xs text-tangent-success font-bold uppercase tracking-wider">
                <CheckCircle size={14} />
                Healthy
              </span>
            )}
          </div>

          <div className="flex items-center gap-5">
            {/* Speedometer score */}
            <div className="relative w-16 h-16 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="32" cy="32" r="26" stroke="var(--border)" strokeWidth="4" fill="transparent" />
                <circle
                  cx="32"
                  cy="32"
                  r="26"
                  stroke={confidence < 70 ? "#EF4444" : "#6EE7FF"}
                  strokeWidth="4"
                  fill="transparent"
                  strokeDasharray="163"
                  strokeDashoffset={163 - (163 * confidence) / 100}
                  className="transition-all duration-500"
                />
              </svg>
              <span className="absolute text-xs font-black text-tangent-text">{confidence}%</span>
            </div>

            <div>
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Structural Integrity</span>
              <p className="text-[11px] text-slate-400 font-semibold leading-relaxed mt-0.5">
                {driftActive ? "Implementation bypass detected in Build Lane" : "Matches blueprint design perfectly"}
              </p>
            </div>
          </div>
        </div>

        {/* AI Drift Diagnosis */}
        <div className="flex-1 p-6 space-y-4 overflow-y-auto scrollbar-none">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] block">Divergence Diagnostics</span>
          
          {driftActive ? (
            <div className="space-y-4">
              {/* Diagnostic Card */}
              <div className="p-4 rounded-2xl bg-tangent-error/5 border border-tangent-error/15 text-xs leading-relaxed text-tangent-text font-medium">
                <p className="typewriter-cursor">{typewriterText}</p>
              </div>

              {/* Hints shelf */}
              <div className="space-y-2">
                <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest block">Guiding Question (Hint)</span>
                <div className="p-3.5 rounded-xl border border-tangent-border bg-tangent-card/30 text-[11px] text-slate-400 italic font-semibold leading-relaxed">
                  "Does your Database Router confirm the integrity of the request payload signature locally, or does it assume the client has already been audited?"
                </div>
              </div>
            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-center gap-3 opacity-40">
              <Cpu size={32} className="text-slate-500 animate-pulse" />
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Awaiting Drift Trigger...</p>
              <span className="text-[10px] text-slate-600 max-w-[200px]">Click 'Trace Drift' to launch comparison graph analysis.</span>
            </div>
          )}
        </div>

        {/* Action Panel */}
        <div className="p-6 border-t border-tangent-border bg-tangent-card space-y-3">
          <button
            disabled={!driftActive}
            onClick={resetSimulation}
            className="w-full text-center py-3 rounded-xl border border-tangent-border bg-tangent-card hover:bg-tangent-card/60 text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-tangent-text transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Clear Divergence Alerts
          </button>
        </div>

      </div>

    </div>
  );
}
