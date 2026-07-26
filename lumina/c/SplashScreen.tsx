"use client";

import React, { useEffect, useState } from "react";

interface SplashScreenProps {
  onComplete: () => void;
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const [logoState, setLogoState] = useState<"drawing" | "glowing" | "morphing" | "tagline" | "done">("drawing");
  const [particles, setParticles] = useState<{ id: number; x: number; y: number; size: number; delay: number; duration: number }[]>([]);

  useEffect(() => {
    // Generate random floating particles
    const newParticles = Array.from({ length: 25 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 3 + 1,
      delay: Math.random() * 5,
      duration: Math.random() * 10 + 10,
    }));
    setParticles(newParticles);

    // Timeline for logo animation steps
    const glowingTimer = setTimeout(() => setLogoState("glowing"), 2400);
    const morphingTimer = setTimeout(() => setLogoState("morphing"), 3400);
    const taglineTimer = setTimeout(() => setLogoState("tagline"), 4800);
    const doneTimer = setTimeout(() => {
      setLogoState("done");
      onComplete();
    }, 7200);

    return () => {
      clearTimeout(glowingTimer);
      clearTimeout(morphingTimer);
      clearTimeout(taglineTimer);
      clearTimeout(doneTimer);
    };
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#020617] overflow-hidden select-none transition-all duration-1000">
      {/* Dynamic Blob Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-[600px] h-[600px] -top-40 -left-40 rounded-full bg-tangent-secondary/10 blur-[120px] animate-float-slow" />
        <div className="absolute w-[500px] h-[500px] -bottom-30 -right-30 rounded-full bg-tangent-primary/10 blur-[100px] animate-float-medium" />
        <div className="absolute inset-0 noise-overlay opacity-[0.02]" />
      </div>

      {/* Floating Particles */}
      <div className="absolute inset-0 pointer-events-none">
        {particles.map((p) => (
          <div
            key={p.id}
            className="absolute rounded-full bg-tangent-primary/30"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: `${p.size}px`,
              height: `${p.size}px`,
              animation: `floatSlow ${p.duration}s ease-in-out infinite`,
              animationDelay: `${p.delay}s`,
            }}
          />
        ))}
      </div>

      {/* Center Animation Block */}
      <div className="relative z-10 flex flex-col items-center justify-center gap-10">
        
        {/* Animated SVG Logo */}
        <div className="relative flex items-center justify-center h-48 w-48">
          
          {logoState !== "morphing" && logoState !== "tagline" && logoState !== "done" ? (
            <svg viewBox="0 0 100 100" className="w-32 h-32 relative z-20">
              {/* Animated Circle */}
              <circle
                cx="50"
                cy="50"
                r="25"
                fill="none"
                stroke="url(#circleGrad)"
                strokeWidth="2.5"
                strokeLinecap="round"
                className="draw-logo-circle"
              />
              
              {/* Animated Tangent Line touching at (75, 50) */}
              <line
                x1="75"
                y1="15"
                x2="75"
                y2="85"
                stroke="url(#tangentGrad)"
                strokeWidth="2.5"
                strokeLinecap="round"
                className="draw-logo-tangent"
              />

              {/* Glowing Point of Contact */}
              {logoState === "glowing" && (
                <circle
                  cx="75"
                  cy="50"
                  r="4"
                  fill="#6EE7FF"
                  className="animate-ping"
                  style={{ filter: "drop-shadow(0 0 8px #6EE7FF)" }}
                />
              )}
              {logoState === "glowing" && (
                <circle
                  cx="75"
                  cy="50"
                  r="3.5"
                  fill="#6EE7FF"
                  style={{ filter: "drop-shadow(0 0 12px #6EE7FF)" }}
                />
              )}

              {/* Gradients definitions */}
              <defs>
                <linearGradient id="circleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#8B5CF6" />
                  <stop offset="100%" stopColor="#6EE7FF" />
                </linearGradient>
                <linearGradient id="tangentGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#6EE7FF" />
                  <stop offset="50%" stopColor="#8B5CF6" />
                  <stop offset="100%" stopColor="#6EE7FF" />
                </linearGradient>
              </defs>
            </svg>
          ) : (
            /* Morphing Logo Text */
            <div className="flex flex-col items-center justify-center animate-fade-in">
              <div className="flex items-center gap-1">
                {/* Visual token reference (tangent-circle concept inline) */}
                <div className="relative w-5 h-5 flex items-center justify-center mr-1">
                  <div className="absolute w-4 h-4 rounded-full border border-tangent-primary/80" />
                  <div className="absolute w-[1px] h-6 bg-tangent-secondary top-0 right-0 transform translate-x-[2px]" />
                  <div className="absolute w-1.5 h-1.5 rounded-full bg-tangent-primary top-1.5 right-0 transform translate-x-[2px]" />
                </div>
                <h1 className="text-5xl font-bold tracking-[0.2em] font-sans bg-gradient-to-r from-tangent-primary via-white to-tangent-secondary bg-clip-text text-transparent">
                  TANGENT
                </h1>
              </div>
              <p className="text-[9px] font-bold text-slate-500 tracking-[0.4em] uppercase mt-3">
                INTELLIGENT LEARNING PLATFORM
              </p>
            </div>
          )}
        </div>

        {/* Tagline Container */}
        <div className="h-8">
          {(logoState === "tagline" || logoState === "done") && (
            <p className="text-sm md:text-md text-slate-300 font-light tracking-widest text-center animate-slide-up duration-1000">
              Find where your thinking changed.
            </p>
          )}
        </div>
      </div>

      {/* Skip Button */}
      <button
        onClick={onComplete}
        className="absolute bottom-8 right-8 z-50 text-[10px] uppercase font-bold tracking-widest text-slate-500 hover:text-white transition-colors cursor-pointer px-4 py-2 rounded-full border border-white/5 bg-white/[0.01] hover:bg-white/[0.04]"
      >
        Skip intro
      </button>
    </div>
  );
}
