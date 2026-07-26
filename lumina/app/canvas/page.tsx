"use client";

/**
 * The Lumina design canvas — where a student draws their slice before building.
 *
 * This lived at `/` until the interface redesign (PR #4) replaced that route with
 * the Tangent dashboard. Nothing else routed to `Canvas`, so the canvas became
 * unreachable: 73KB of component still in the tree with no way in, and MENTOR's
 * "Draw a design" button opening `/` and landing the student on a sign-in form
 * instead of the canvas. It has its own route now so neither page has to win.
 *
 * `ReactFlowProvider` has to wrap `Canvas` — the nodes call into React Flow's
 * context and throw without a provider above them. That is why this file exists
 * at all rather than the route rendering `Canvas` directly.
 */

import { useState } from "react";
import { ReactFlowProvider } from "reactflow";
import Canvas from "@/c/Canvas";
import LandingPage from "@/c/LandingPage";

export default function CanvasPage() {
  const [entered, setEntered] = useState(false);

  if (!entered) {
    return <LandingPage onEnter={() => setEntered(true)} />;
  }

  return (
    <ReactFlowProvider>
      <div className="h-screen w-screen overflow-hidden bg-[#030305]">
        <Canvas />
      </div>
    </ReactFlowProvider>
  );
}
