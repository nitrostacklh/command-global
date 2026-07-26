"use client";

import { useState, useEffect, useRef } from "react";

// Hook 1: Returns raw current mouse coordinates
export function useMousePosition() {
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return position;
}

// Hook 2: Interpolates mouse coordinates with spring physics
export function useSpringMousePosition(stiffness = 0.1, damping = 0.8) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const targetRef = useRef({ x: 0, y: 0 });
  const currentRef = useRef({ x: 0, y: 0 });
  const velocityRef = useRef({ x: 0, y: 0 });
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      targetRef.current = { x: e.clientX, y: e.clientY };
    };

    window.addEventListener("mousemove", handleMouseMove);

    const update = () => {
      const target = targetRef.current;
      const current = currentRef.current;
      const velocity = velocityRef.current;

      // Spring physics formulas: force = stiffness * (target - current)
      const ax = stiffness * (target.x - current.x);
      const ay = stiffness * (target.y - current.y);

      velocity.x = (velocity.x + ax) * damping;
      velocity.y = (velocity.y + ay) * damping;

      current.x += velocity.x;
      current.y += velocity.y;

      setPosition({ x: current.x, y: current.y });

      frameRef.current = requestAnimationFrame(update);
    };

    frameRef.current = requestAnimationFrame(update);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [stiffness, damping]);

  return position;
}
