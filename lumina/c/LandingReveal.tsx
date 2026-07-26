"use client";

import React, { useEffect, useRef } from "react";

interface LandingRevealProps {
  onComplete: () => void;
}

export default function LandingReveal({ onComplete }: LandingRevealProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const phaseRef = useRef<"flythrough" | "assemble" | "glow" | "done">("flythrough");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);
    let animationFrameId: number;

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    // Timeline phases using ref updates to avoid re-running the useEffect hook
    const assembleTimer = setTimeout(() => {
      phaseRef.current = "assemble";
    }, 2200);

    const glowTimer = setTimeout(() => {
      phaseRef.current = "glow";
    }, 4000);

    const doneTimer = setTimeout(() => {
      phaseRef.current = "done";
      onComplete();
    }, 5500);

    // Setup 3D points
    const pointCount = 120;
    const points: {
      x: number;
      y: number;
      z: number;
      tx: number; // target x
      ty: number; // target y
      tz: number; // target z
      color: string;
    }[] = [];

    // Generate flythrough stars/nodes
    for (let i = 0; i < pointCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const r = Math.random() * 300 + 50;
      points.push({
        x: Math.cos(theta) * r,
        y: Math.sin(theta) * r,
        z: Math.random() * 800 - 400,
        tx: 0,
        ty: 0,
        tz: 0,
        color: i % 2 === 0 ? "#6EE7FF" : "#8B5CF6",
      });
    }

    // Precalculate target points for assembling Tangent Logo:
    // 80 points map to a circle of radius 100 centered at (-40, 0)
    // 40 points map to a vertical tangent line at x = 60, y from -150 to 150
    points.forEach((p, idx) => {
      if (idx < 80) {
        // Circle coordinates
        const angle = (idx / 80) * Math.PI * 2;
        p.tx = Math.cos(angle) * 80 - 40;
        p.ty = Math.sin(angle) * 80;
        p.tz = 0;
      } else {
        // Tangent line coordinates
        const progress = (idx - 80) / 40; // 0 to 1
        p.tx = 40; // touches circle at (40, 0)
        p.ty = -120 + progress * 240;
        p.tz = 0;
      }
    });

    let cameraZ = -500;
    let rotationAngle = 0;
    let fadeAlpha = 1.0;

    const render = () => {
      const phase = phaseRef.current;
      
      ctx.fillStyle = "rgba(2, 6, 23, 0.25)"; // Trails
      ctx.fillRect(0, 0, width, height);

      // Camera motion parameters
      rotationAngle += 0.003;
      if (phase === "flythrough") {
        cameraZ += 4;
      } else {
        cameraZ += (0 - cameraZ) * 0.05; // Pan camera back to center
      }

      // Project points to 2D screen
      const projected: { x: number; y: number; size: number; color: string; alpha: number }[] = [];

      points.forEach((p) => {
        // If assembling, interpolate points toward targets
        if (phase !== "flythrough") {
          p.x += (p.tx - p.x) * 0.08;
          p.y += (p.ty - p.y) * 0.08;
          p.z += (p.tz - p.z) * 0.08;
        } else {
          // Slowly rotate stars in 3D
          const cosR = Math.cos(0.002);
          const sinR = Math.sin(0.002);
          const tempX = p.x * cosR - p.z * sinR;
          p.z = p.x * sinR + p.z * cosR;
          p.x = tempX;
        }

        // Apply camera Z translation
        const relativeZ = p.z - cameraZ;
        if (relativeZ <= 0) return;

        // Perspective projection formula
        const fov = 400;
        const scale = fov / relativeZ;
        const screenX = width / 2 + p.x * scale;
        const screenY = height / 2 + p.y * scale;
        
        let size = Math.max(0.5, scale * 1.5);
        if (phase === "glow") {
          size *= 1.5;
        }

        // Calculate opacity based on depth
        let alpha = Math.min(1.0, scale * 2.0);
        if (phase === "glow") {
          alpha = 1.0;
        }

        projected.push({
          x: screenX,
          y: screenY,
          size,
          color: p.color,
          alpha,
        });
      });

      // Render Connection Lines (Neural Network)
      if (phase === "flythrough") {
        ctx.lineWidth = 0.5;
        for (let i = 0; i < projected.length; i++) {
          for (let j = i + 1; j < projected.length; j++) {
            const p1 = projected[i];
            const p2 = projected[j];
            const dx = p1.x - p2.x;
            const dy = p1.y - p2.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // Connect close points
            if (dist < 80) {
              const alpha = (1 - dist / 80) * 0.15;
              ctx.strokeStyle = `rgba(110, 231, 255, ${alpha})`;
              ctx.beginPath();
              ctx.moveTo(p1.x, p1.y);
              ctx.lineTo(p2.x, p2.y);
              ctx.stroke();
            }
          }
        }
      } else {
        // Draw the assembled logo lines
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = phase === "glow" ? "rgba(110, 231, 255, 0.8)" : "rgba(110, 231, 255, 0.4)";
        
        // Draw Circle
        ctx.beginPath();
        for (let i = 0; i < 80; i++) {
          const pt = projected[i];
          if (pt) {
            if (i === 0) ctx.moveTo(pt.x, pt.y);
            else ctx.lineTo(pt.x, pt.y);
          }
        }
        ctx.closePath();
        ctx.stroke();

        // Draw Tangent line
        ctx.beginPath();
        const startPt = projected[80];
        const endPt = projected[119];
        if (startPt && endPt) {
          ctx.moveTo(startPt.x, startPt.y);
          ctx.lineTo(endPt.x, endPt.y);
        }
        ctx.stroke();

        // Glow contact point at (40, 0)
        const contactPt = projected[0];
        if (contactPt && phase === "glow") {
          ctx.shadowBlur = 20;
          ctx.shadowColor = "#6EE7FF";
          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.arc(contactPt.x, contactPt.y, 8, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0; // reset
        }
      }

      // Render Nodes
      projected.forEach((p) => {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });

      // Render Title text morph fade-in during glow phase
      if (phase === "glow") {
        ctx.font = "bold 24px Space Grotesk, sans-serif";
        ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
        ctx.textAlign = "center";
        ctx.fillText("TANGENT SECURED", width / 2, height / 2 + 180);
      }

      // Exit fade out sequence
      if (phase === "glow") {
        fadeAlpha -= 0.005;
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      clearTimeout(assembleTimer);
      clearTimeout(glowTimer);
      clearTimeout(doneTimer);
      cancelAnimationFrame(animationFrameId);
    };
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-[999] bg-[#020617] flex items-center justify-center pointer-events-auto overflow-hidden animate-fade-in duration-500">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      <div className="absolute bottom-16 flex flex-col items-center gap-2 select-none pointer-events-none">
        <span className="text-[10px] font-black text-tangent-primary uppercase tracking-[0.4em] animate-pulse">
          Reconciling Architecture blueprints
        </span>
        <span className="text-[8px] text-slate-500 font-mono">Camera: spatial flythrough active</span>
      </div>
    </div>
  );
}
