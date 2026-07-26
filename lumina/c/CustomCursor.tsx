"use client";

import React, { useEffect, useState, useRef } from "react";

export default function CustomCursor() {
  const [position, setPosition] = useState({ x: -100, y: -100 });
  const [ringPosition, setRingPosition] = useState({ x: -100, y: -100 });
  const [isHovered, setIsHovered] = useState(false);
  const [magneticTarget, setMagneticTarget] = useState<DOMRect | null>(null);

  const targetRef = useRef({ x: -100, y: -100 });
  const ringCurrentRef = useRef({ x: -100, y: -100 });
  const ringVelocityRef = useRef({ x: 0, y: 0 });
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    // Check if device supports touch (disable custom cursor on mobile)
    const isTouchDevice = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    if (isTouchDevice) return;

    // Apply global stylesheet rule to hide default cursor
    const style = document.createElement("style");
    style.innerHTML = `
      @media (min-width: 1024px) {
        html, body, a, button, input, select, textarea, [role="button"], .gradient-border-card {
          cursor: none !important;
        }
      }
    `;
    document.head.appendChild(style);

    const handleMouseMove = (e: MouseEvent) => {
      targetRef.current = { x: e.clientX, y: e.clientY };
      setPosition({ x: e.clientX, y: e.clientY });

      // Scan target element for magnetics
      const target = e.target as HTMLElement;
      if (!target) return;

      const hoverable = target.closest("a, button, select, [role='button'], .gradient-border-card, .perspective-1000");
      
      if (hoverable) {
        setIsHovered(true);
        // Snaps to center of element if it has a small/medium size (like buttons, menu options)
        const rect = hoverable.getBoundingClientRect();
        if (rect.width < 300) {
          setMagneticTarget(rect);
        } else {
          setMagneticTarget(null);
        }
      } else {
        setIsHovered(false);
        setMagneticTarget(null);
      }
    };

    window.addEventListener("mousemove", handleMouseMove);

    // Spring physics update loop
    const updateRing = () => {
      const target = targetRef.current;
      const current = ringCurrentRef.current;
      const velocity = ringVelocityRef.current;

      let tx = target.x;
      let ty = target.y;

      // Apply magnetic lock coordinates if target is locked
      if (magneticTarget) {
        tx = magneticTarget.left + magneticTarget.width / 2;
        ty = magneticTarget.top + magneticTarget.height / 2;
      }

      // Easing constants
      const stiffness = 0.08;
      const damping = 0.72;

      const ax = stiffness * (tx - current.x);
      const ay = stiffness * (ty - current.y);

      velocity.x = (velocity.x + ax) * damping;
      velocity.y = (velocity.y + ay) * damping;

      current.x += velocity.x;
      current.y += velocity.y;

      setRingPosition({ x: current.x, y: current.y });

      frameRef.current = requestAnimationFrame(updateRing);
    };

    frameRef.current = requestAnimationFrame(updateRing);

    return () => {
      style.remove();
      window.removeEventListener("mousemove", handleMouseMove);
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [magneticTarget]);

  // Hide on initial load offscreen
  if (position.x < 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999] hidden lg:block">
      {/* 1. Outer Spring Ring */}
      <div
        className={`absolute rounded-full border transform -translate-x-1/2 -translate-y-1/2 transition-all duration-300 pointer-events-none mix-blend-difference ${
          isHovered
            ? "w-10 h-10 border-tangent-primary/70 bg-tangent-primary/10 shadow-glow-cyan"
            : "w-6 h-6 border-tangent-primary/60 bg-transparent"
        }`}
        style={{
          left: `${ringPosition.x}px`,
          top: `${ringPosition.y}px`,
          transitionProperty: "width, height, border-color, background-color, box-shadow",
        }}
      />

      {/* 2. Inner Hard Dot */}
      <div
        className={`absolute w-1.5 h-1.5 rounded-full bg-tangent-secondary transform -translate-x-1/2 -translate-y-1/2 pointer-events-none mix-blend-difference transition-transform duration-300 ${
          isHovered ? "scale-[0.5]" : "scale-100"
        }`}
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
        }}
      />
    </div>
  );
}
