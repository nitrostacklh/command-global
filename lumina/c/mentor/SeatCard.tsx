"use client";

/**
 * The home screen's project card, imported from the interface redesign (PR #4).
 *
 * The wireframe canvas, the parallax tilt and the glow-by-state are kept exactly
 * as drawn. What changed is where the numbers come from: the original card took
 * an `alignment` percentage and a `driftCount` from a hard-coded array, and this
 * one is handed the student's own record — checkpoints actually passed, and drift
 * entries the verifier actually filed.
 *
 * The colour rule is worth keeping honest, because it is doing real work here:
 * red means the verifier filed drift against this seat, green means every gate it
 * knows about passed, cyan means in progress. A card that glowed green because a
 * mock said `alignment: 100` would be the one piece of this UI a student could
 * not trust.
 */

import React, { useEffect, useRef, useState } from "react";
import { AlertOctagon, ArrowRight } from "lucide-react";

export interface Seat {
  readonly project: string;
  readonly role: string;
  /** From the record: attempted, complete, escalated — or 'new' for a fresh seat. */
  readonly status: "new" | "attempted" | "complete" | "escalated";
  /** Gates passed ÷ gates known. Null when nothing has been witnessed yet. */
  readonly alignment: number | null;
  readonly driftCount: number;
  /** Human title from the catalog when we have it, else the key. */
  readonly title: string;
  readonly updatedAt: string | null;
}

const SHAPES = ["torus", "icosahedron", "octahedron"] as const;
export type ShapeType = (typeof SHAPES)[number];

export function shapeFor(index: number): ShapeType {
  return SHAPES[index % SHAPES.length];
}

/** "2 hours ago", from an ISO timestamp. Null-safe, because a new seat has none. */
function ago(iso: string | null): string {
  if (!iso) return "not started";
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return "unknown";
  const minutes = Math.max(0, Math.round((Date.now() - then) / 60000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export default function SeatCard({
  seat,
  shapeType,
  onClick,
}: {
  seat: Seat;
  shapeType: ShapeType;
  onClick: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const { alignment, driftCount } = seat;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let frameId = 0;
    const width = (canvas.width = 160);
    const height = (canvas.height = 160);

    let vertices: { x: number; y: number; z: number }[] = [];
    let edges: [number, number][] = [];

    if (shapeType === "octahedron") {
      vertices = [
        { x: 0, y: -45, z: 0 },
        { x: 45, y: 0, z: 0 },
        { x: 0, y: 0, z: 45 },
        { x: -45, y: 0, z: 0 },
        { x: 0, y: 0, z: -45 },
        { x: 0, y: 45, z: 0 },
      ];
      edges = [
        [0, 1], [0, 2], [0, 3], [0, 4],
        [5, 1], [5, 2], [5, 3], [5, 4],
        [1, 2], [2, 3], [3, 4], [4, 1],
      ];
    } else if (shapeType === "icosahedron") {
      const t = ((1.0 + Math.sqrt(5.0)) / 2.0) * 25;
      vertices = [
        { x: -25, y: t, z: 0 }, { x: 25, y: t, z: 0 }, { x: -25, y: -t, z: 0 }, { x: 25, y: -t, z: 0 },
        { x: 0, y: -25, z: t }, { x: 0, y: 25, z: t }, { x: 0, y: -25, z: -t }, { x: 0, y: 25, z: -t },
        { x: t, y: 0, z: -25 }, { x: t, y: 0, z: 25 }, { x: -t, y: 0, z: -25 }, { x: -t, y: 0, z: 25 },
      ];
      edges = [
        [0, 1], [0, 5], [0, 7], [0, 10], [0, 11], [1, 5], [1, 7], [1, 8], [1, 9],
        [2, 3], [2, 4], [2, 6], [2, 10], [2, 11], [3, 4], [3, 6], [3, 8], [3, 9],
        [4, 5], [4, 9], [4, 11], [5, 9], [5, 11], [6, 7], [6, 8], [6, 10], [7, 8], [7, 10],
        [8, 9], [10, 11],
      ];
    } else {
      const R = 32;
      const r = 12;
      const numU = 12;
      const numV = 8;
      for (let i = 0; i < numU; i++) {
        const u = (i / numU) * Math.PI * 2;
        for (let j = 0; j < numV; j++) {
          const v = (j / numV) * Math.PI * 2;
          vertices.push({
            x: (R + r * Math.cos(v)) * Math.cos(u),
            y: (R + r * Math.cos(v)) * Math.sin(u),
            z: r * Math.sin(v),
          });
        }
      }
      for (let i = 0; i < numU; i++) {
        for (let j = 0; j < numV; j++) {
          const idx = i * numV + j;
          edges.push([idx, ((i + 1) % numU) * numV + j]);
          edges.push([idx, i * numV + ((j + 1) % numV)]);
        }
      }
    }

    // Seeded from the shape rather than Math.random(), so a card does not jump to
    // a new orientation every time React remounts it.
    let angleX = shapeType.length * 0.7;
    let angleY = shapeType.length * 1.1;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      const speed = isHovered ? 2.5 : 1.0;
      angleX += 0.006 * speed;
      angleY += 0.008 * speed;

      const tiltX = angleX + (hover.y - 80) * 0.002;
      const tiltY = angleY + (hover.x - 80) * 0.002;

      const projected = vertices.map((v) => {
        const y1 = v.y * Math.cos(tiltX) - v.z * Math.sin(tiltX);
        const z1 = v.y * Math.sin(tiltX) + v.z * Math.cos(tiltX);
        const x2 = v.x * Math.cos(tiltY) - z1 * Math.sin(tiltY);
        const z2 = v.x * Math.sin(tiltY) + z1 * Math.cos(tiltY);
        const fov = 150;
        const scale = fov / (fov + z2);
        return { x: width / 2 + x2 * scale, y: height / 2 + y1 * scale, z: z2 };
      });

      let glow = "rgba(110, 231, 255, 0.4)";
      let line = "rgba(110, 231, 255, 0.65)";
      if (driftCount > 0) {
        glow = "rgba(239, 68, 68, 0.4)";
        line = "rgba(239, 68, 68, 0.7)";
      } else if (alignment === 100) {
        glow = "rgba(34, 197, 94, 0.4)";
        line = "rgba(34, 197, 94, 0.7)";
      }

      ctx.lineWidth = 1;
      ctx.strokeStyle = line;
      ctx.shadowBlur = isHovered ? 8 : 4;
      ctx.shadowColor = glow;

      edges.forEach(([i, j]) => {
        const p1 = projected[i];
        const p2 = projected[j];
        if (!p1 || !p2) return;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      });

      ctx.shadowBlur = 0;
      ctx.fillStyle = "#ffffff";
      projected.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.2, 0, Math.PI * 2);
        ctx.fill();
      });

      frameId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(frameId);
  }, [shapeType, alignment, driftCount, isHovered, hover]);

  return (
    <div
      ref={containerRef}
      onMouseMove={(e) => {
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) setHover({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
      className="gradient-border-card group flex h-72 cursor-pointer select-none flex-col justify-between border border-mentor-border bg-mentor-card p-6 transition-all duration-500 hover:translate-y-[-6px] hover:shadow-[0_20px_50px_rgba(110,231,255,0.08)]"
      style={{
        transform: isHovered
          ? `perspective(1000px) rotateX(${(hover.y - 144) * -0.06}deg) rotateY(${(hover.x - 144) * 0.06}deg)`
          : "perspective(1000px) rotateX(0deg) rotateY(0deg)",
      }}
    >
      <div className="relative flex h-36 w-full items-center justify-center">
        <canvas ref={canvasRef} className="pointer-events-none absolute" />
        <div className="absolute bottom-0 text-[10px] font-black uppercase tracking-widest text-slate-400">
          {alignment === null ? (
            <span className="text-slate-600">nothing witnessed yet</span>
          ) : (
            <>
              gates passed:{" "}
              <span className={driftCount > 0 ? "text-mentor-error" : "text-mentor-primary"}>
                {alignment}%
              </span>
            </>
          )}
        </div>
      </div>

      <div className="space-y-4 border-t border-mentor-border/40 pt-4">
        <div>
          <span className="block text-[9px] font-bold uppercase tracking-widest text-slate-500">
            {seat.role}
          </span>
          <h4 className="mt-0.5 truncate text-sm font-bold text-mentor-text transition-colors group-hover:text-mentor-primary">
            {seat.title}
          </h4>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <span className="rounded border border-mentor-border bg-mentor-card px-2 py-0.5 text-[8px] font-black text-slate-400">
              {ago(seat.updatedAt)}
            </span>
            {driftCount > 0 ? (
              <span className="flex items-center gap-1 rounded border border-mentor-error/20 bg-mentor-error/10 px-2 py-0.5 text-[8px] font-black text-mentor-error">
                <AlertOctagon size={8} />
                {driftCount} drift
              </span>
            ) : seat.status === "complete" ? (
              <span className="rounded border border-mentor-success/20 bg-mentor-success/10 px-2 py-0.5 text-[8px] font-black text-mentor-success">
                complete
              </span>
            ) : (
              <span className="rounded border border-mentor-border bg-mentor-card px-2 py-0.5 text-[8px] font-black text-slate-500">
                {seat.status}
              </span>
            )}
          </div>

          <span className="flex items-center gap-1 text-[9px] font-black text-mentor-primary transition-transform group-hover:translate-x-1.5">
            {seat.status === "new" ? "start" : "resume"}
            <ArrowRight size={10} />
          </span>
        </div>
      </div>
    </div>
  );
}
