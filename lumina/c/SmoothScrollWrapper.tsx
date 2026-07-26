"use client";

import React, { useEffect, useRef } from "react";

interface SmoothScrollWrapperProps {
  children: React.ReactNode;
  id?: string;
  className?: string;
}

export default function SmoothScrollWrapper({ children, id, className }: SmoothScrollWrapperProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let targetY = container.scrollTop;
    let currentY = container.scrollTop;
    const damping = 0.08; // Inertia damping speed (lower is smoother/slower)
    let frameId: number | null = null;

    // Track when user manually clicks sidebar to prevent scroll fights
    const handleScrollReset = (e: CustomEvent<{ top: number }>) => {
      targetY = e.detail.top;
      currentY = e.detail.top;
      container.scrollTop = e.detail.top;
    };

    // Listen to custom scroll-triggers
    window.addEventListener("tangent:scroll-to", handleScrollReset as EventListener);

    const onWheel = (e: WheelEvent) => {
      // Prevent browser default instant jump scroll
      e.preventDefault();

      // Compute target scroll destination
      targetY += e.deltaY;
      const maxScroll = container.scrollHeight - container.clientHeight;
      targetY = Math.max(0, Math.min(targetY, maxScroll));

      // Launch interpolation loop if not already running
      if (frameId === null) {
        updateScroll();
      }
    };

    const updateScroll = () => {
      const diff = targetY - currentY;

      if (Math.abs(diff) > 0.5) {
        currentY += diff * damping;
        container.scrollTop = currentY;
        frameId = requestAnimationFrame(updateScroll);
      } else {
        container.scrollTop = targetY;
        currentY = targetY;
        frameId = null;
      }
    };

    // Attach wheel event with passive set to false so preventDefault works
    container.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      window.removeEventListener("tangent:scroll-to", handleScrollReset as EventListener);
      container.removeEventListener("wheel", onWheel);
      if (frameId !== null) cancelAnimationFrame(frameId);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      id={id}
      className={`h-full w-full overflow-y-auto scrollbar-none scroll-smooth ${className}`}
    >
      {children}
    </div>
  );
}
