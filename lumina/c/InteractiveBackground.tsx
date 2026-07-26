"use client";

import React, { useEffect, useRef } from "react";

export default function InteractiveBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -1000, y: -1000 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Dynamic resizing
    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    // Track mouse
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener("mousemove", handleMouseMove);

    // Setup 80 particles
    const particleCount = 80;
    const particles: {
      x: number;
      y: number;
      ox: number; // original x
      oy: number; // original y
      size: number;
      vx: number;
      vy: number;
      alpha: number;
      speed: number;
    }[] = [];

    for (let i = 0; i < particleCount; i++) {
      const rx = Math.random() * width;
      const ry = Math.random() * height;
      particles.push({
        x: rx,
        y: ry,
        ox: rx,
        oy: ry,
        size: Math.random() * 2 + 0.5,
        vx: (Math.random() - 0.5) * 0.2,
        vy: (Math.random() - 0.5) * 0.2,
        alpha: Math.random() * 0.3 + 0.1,
        speed: Math.random() * 0.02 + 0.01,
      });
    }

    // Volumetric gradient blobs coordinates
    let blobTime = 0;
    const blob1 = { x: width * 0.25, y: height * 0.3, r: Math.min(width, height) * 0.4 };
    const blob2 = { x: width * 0.75, y: height * 0.7, r: Math.min(width, height) * 0.35 };

    const animate = () => {
      // Check if document has .dark class (detect theme)
      const isDark = document.documentElement.classList.contains("dark");
      
      // Clear background
      ctx.fillStyle = isDark ? "#020617" : "#f8fafc";
      ctx.fillRect(0, 0, width, height);

      // Render Volumetric Aurora Blobs
      blobTime += 0.002;
      blob1.x = width * 0.25 + Math.cos(blobTime) * width * 0.08;
      blob1.y = height * 0.3 + Math.sin(blobTime * 1.5) * height * 0.08;
      blob2.x = width * 0.75 + Math.sin(blobTime * 0.8) * width * 0.08;
      blob2.y = height * 0.7 + Math.cos(blobTime * 1.2) * height * 0.08;

      // Blob 1: Cyan / Light Purple
      const grad1 = ctx.createRadialGradient(blob1.x, blob1.y, 0, blob1.x, blob1.y, blob1.r);
      if (isDark) {
        grad1.addColorStop(0, "rgba(110, 231, 255, 0.06)"); // Cyan
        grad1.addColorStop(0.5, "rgba(139, 92, 246, 0.03)"); // Purple
      } else {
        grad1.addColorStop(0, "rgba(139, 92, 246, 0.03)"); // Soft Violet
        grad1.addColorStop(0.5, "rgba(110, 231, 255, 0.02)");
      }
      grad1.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = grad1;
      ctx.beginPath();
      ctx.arc(blob1.x, blob1.y, blob1.r, 0, Math.PI * 2);
      ctx.fill();

      // Blob 2: Violet / Blue
      const grad2 = ctx.createRadialGradient(blob2.x, blob2.y, 0, blob2.x, blob2.y, blob2.r);
      if (isDark) {
        grad2.addColorStop(0, "rgba(139, 92, 246, 0.05)"); // Violet
        grad2.addColorStop(0.5, "rgba(56, 189, 248, 0.02)"); // Blue
      } else {
        grad2.addColorStop(0, "rgba(56, 189, 248, 0.03)"); // Soft Sky Blue
        grad2.addColorStop(0.5, "rgba(139, 92, 246, 0.015)");
      }
      grad2.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = grad2;
      ctx.beginPath();
      ctx.arc(blob2.x, blob2.y, blob2.r, 0, Math.PI * 2);
      ctx.fill();

      // Render Procedural Particles
      const mouse = mouseRef.current;
      particles.forEach((p) => {
        // Passive float movement
        p.ox += p.vx;
        p.oy += p.vy;

        // Wrap around edges
        if (p.ox < 0) p.ox = width;
        if (p.ox > width) p.ox = 0;
        if (p.oy < 0) p.oy = height;
        if (p.oy > height) p.oy = 0;

        // Mouse interaction attraction/repulsion forces
        const dx = mouse.x - p.ox;
        const dy = mouse.y - p.oy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        let tx = p.ox;
        let ty = p.oy;

        if (dist < 150) {
          // Push particles away from cursor
          const force = (150 - dist) / 150;
          const angle = Math.atan2(dy, dx);
          tx -= Math.cos(angle) * force * 24;
          ty -= Math.sin(angle) * force * 24;
        }

        // Interpolate current position to target interactive position
        p.x += (tx - p.x) * 0.08;
        p.y += (ty - p.y) * 0.08;

        // Draw particle
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = isDark 
          ? `rgba(110, 231, 255, ${p.alpha})` // Glow cyan in dark mode
          : `rgba(15, 23, 42, ${p.alpha * 0.8})`; // Contrast charcoal in light mode
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 w-full h-full z-0 pointer-events-none" />;
}
