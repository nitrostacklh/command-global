"use client";

import React, { useEffect, useRef, useState } from "react";
import { AlertOctagon, ArrowRight } from "lucide-react";

interface Project3DCardProps {
  name: string;
  role: string;
  difficulty: string;
  modified: string;
  alignment: number;
  driftCount: number;
  shapeType: "torus" | "icosahedron" | "octahedron";
  onClick: () => void;
}

export default function Project3DCard({
  name,
  role,
  difficulty,
  modified,
  alignment,
  driftCount,
  shapeType,
  onClick,
}: Project3DCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoverPosition, setHoverPosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let frameId: number;
    const width = (canvas.width = 160);
    const height = (canvas.height = 160);

    // 3D Geometry vertices definitions
    let vertices: { x: number; y: number; z: number }[] = [];
    let edges: [number, number][] = [];

    if (shapeType === "octahedron") {
      // 6 vertices
      vertices = [
        { x: 0, y: -45, z: 0 },
        { x: 45, y: 0, z: 0 },
        { x: 0, y: 0, z: 45 },
        { x: -45, y: 0, z: 0 },
        { x: 0, y: 0, z: -45 },
        { x: 0, y: 45, z: 0 },
      ];
      // 12 edges
      edges = [
        [0, 1], [0, 2], [0, 3], [0, 4],
        [5, 1], [5, 2], [5, 3], [5, 4],
        [1, 2], [2, 3], [3, 4], [4, 1],
      ];
    } else if (shapeType === "icosahedron") {
      const t = (1.0 + Math.sqrt(5.0)) / 2.0 * 25; // Scale
      // 12 vertices
      vertices = [
        { x: -25, y: t, z: 0 }, { x: 25, y: t, z: 0 }, { x: -25, y: -t, z: 0 }, { x: 25, y: -t, z: 0 },
        { x: 0, y: -25, z: t }, { x: 0, y: 25, z: t }, { x: 0, y: -25, z: -t }, { x: 0, y: 25, z: -t },
        { x: t, y: 0, z: -25 }, { x: t, y: 0, z: 25 }, { x: -t, y: 0, z: -25 }, { x: -t, y: 0, z: 25 }
      ];
      // edges
      edges = [
        [0,1], [0,5], [0,7], [0,10], [0,11], [1,5], [1,7], [1,8], [1,9],
        [2,3], [2,4], [2,6], [2,10], [2,11], [3,4], [3,6], [3,8], [3,9],
        [4,5], [4,9], [4,11], [5,9], [5,11], [6,7], [6,8], [6,10], [7,8], [7,10],
        [8,9], [10,11]
      ];
    } else {
      // Torus geometry (procedural wireframe ring)
      const R = 32; // major radius
      const r = 12; // minor radius
      const numU = 12;
      const numV = 8;
      for (let i = 0; i < numU; i++) {
        const u = (i / numU) * Math.PI * 2;
        for (let j = 0; j < numV; j++) {
          const v = (j / numV) * Math.PI * 2;
          const x = (R + r * Math.cos(v)) * Math.cos(u);
          const y = (R + r * Math.cos(v)) * Math.sin(u);
          const z = r * Math.sin(v);
          vertices.push({ x, y, z });
        }
      }
      // Edge connections for Torus
      for (let i = 0; i < numU; i++) {
        for (let j = 0; j < numV; j++) {
          const idx = i * numV + j;
          const nextU = ((i + 1) % numU) * numV + j;
          const nextV = i * numV + ((j + 1) % numV);
          edges.push([idx, nextU]);
          edges.push([idx, nextV]);
        }
      }
    }

    let angleX = Math.random() * Math.PI;
    let angleY = Math.random() * Math.PI;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Rotation speeds (accelerates on hover)
      const speedMultiplier = isHovered ? 2.5 : 1.0;
      angleX += 0.006 * speedMultiplier;
      angleY += 0.008 * speedMultiplier;

      // Subtle mouse tilt coordinates
      const targetAngleX = angleX + (hoverPosition.y - 80) * 0.002;
      const targetAngleY = angleY + (hoverPosition.x - 80) * 0.002;

      // Project points to 2D
      const projected = vertices.map((v) => {
        // Rotate X
        let y1 = v.y * Math.cos(targetAngleX) - v.z * Math.sin(targetAngleX);
        let z1 = v.y * Math.sin(targetAngleX) + v.z * Math.cos(targetAngleX);

        // Rotate Y
        let x2 = v.x * Math.cos(targetAngleY) - z1 * Math.sin(targetAngleY);
        let z2 = v.x * Math.sin(targetAngleY) + z1 * Math.cos(targetAngleY);

        // Perspective
        const fov = 150;
        const scale = fov / (fov + z2);
        return {
          x: width / 2 + x2 * scale,
          y: height / 2 + y1 * scale,
          z: z2,
        };
      });

      // Neon glows definitions depending on completion
      const isDark = document.documentElement.classList.contains("dark");
      let glowColor = "rgba(110, 231, 255, 0.4)";
      let lineColor = isDark ? "rgba(110, 231, 255, 0.65)" : "rgba(139, 92, 246, 0.75)";
      
      if (driftCount > 0) {
        glowColor = "rgba(239, 68, 68, 0.4)";
        lineColor = isDark ? "rgba(239, 68, 68, 0.7)" : "rgba(220, 38, 38, 0.8)";
      } else if (alignment === 100) {
        glowColor = "rgba(34, 197, 94, 0.4)";
        lineColor = isDark ? "rgba(34, 197, 94, 0.7)" : "rgba(22, 163, 74, 0.8)";
      }

      // Draw Edges
      ctx.lineWidth = 1.0;
      ctx.strokeStyle = lineColor;
      
      // Shadow glow for premium vector feel
      ctx.shadowBlur = isHovered ? 8 : 4;
      ctx.shadowColor = glowColor;

      edges.forEach(([i, j]) => {
        const p1 = projected[i];
        const p2 = projected[j];
        if (p1 && p2) {
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        }
      });

      // Reset shadows
      ctx.shadowBlur = 0;

      // Draw vertices nodes
      ctx.fillStyle = isDark ? "#ffffff" : "#0f172a";
      projected.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.2, 0, Math.PI * 2);
        ctx.fill();
      });

      frameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [shapeType, alignment, driftCount, isHovered, hoverPosition]);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setHoverPosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const isDark = typeof document !== "undefined" && document.documentElement.classList.contains("dark");

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
      className="gradient-border-card cursor-pointer group p-6 flex flex-col justify-between h-72 transition-all duration-500 hover:translate-y-[-6px] hover:shadow-[0_20px_50px_rgba(110,231,255,0.08)] select-none bg-tangent-card border border-tangent-border"
      style={{
        // 3D card tilt parallax rotation
        transform: isHovered
          ? `perspective(1000px) rotateX(${(hoverPosition.y - 144) * -0.06}deg) rotateY(${(hoverPosition.x - 144) * 0.06}deg)`
          : "perspective(1000px) rotateX(0deg) rotateY(0deg)",
      }}
    >
      {/* 3D Model Canvas Center */}
      <div className="relative w-full h-36 flex items-center justify-center">
        <canvas ref={canvasRef} className="absolute pointer-events-none" />
        
        {/* Progress alignment text ring */}
        <div className="absolute bottom-0 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
          ALIGNMENT: <span className={driftCount > 0 ? "text-tangent-error" : "text-tangent-primary"}>{alignment}%</span>
        </div>
      </div>

      {/* Card Details */}
      <div className="space-y-4 pt-4 border-t border-tangent-border/40">
        <div>
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">{role}</span>
          <h4 className="text-sm font-bold text-tangent-text mt-0.5 group-hover:text-tangent-primary transition-colors truncate">
            {name}
          </h4>
        </div>

        {/* Footer badges */}
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <span className="text-[8px] font-black px-2 py-0.5 rounded bg-tangent-card border border-tangent-border text-slate-500 dark:text-slate-400">
              {difficulty}
            </span>
            {driftCount > 0 ? (
              <span className="text-[8px] font-black px-2 py-0.5 rounded bg-tangent-error/10 border border-tangent-error/20 text-tangent-error flex items-center gap-1">
                <AlertOctagon size={8} />
                {driftCount} Drift
              </span>
            ) : (
              <span className="text-[8px] font-black px-2 py-0.5 rounded bg-tangent-success/10 border border-tangent-success/20 text-tangent-success">
                Aligned
              </span>
            )}
          </div>
          
          <span className="text-[9px] font-black text-tangent-primary group-hover:translate-x-1.5 transition-transform flex items-center gap-1">
            Trace
            <ArrowRight size={10} />
          </span>
        </div>
      </div>
    </div>
  );
}
