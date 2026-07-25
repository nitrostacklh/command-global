"use client";

/**
 * ComponentNode — a generic software component, for designing an architecture
 * before writing code (MENTOR-CONCEPT.md §3 Layer 3).
 *
 * Every other node in this palette is a *runnable* pipeline primitive: it has a
 * backend handler, it fires on upstream data, it produces output. This one has
 * none of that on purpose. It is a design-time artifact — a box the student names
 * and gives a responsibility, wired in the order they intend to build it.
 *
 * The two fields are the contract with MENTOR:
 *   `component` — joins to a step in `mentor.build/v1` (case/separator-insensitive)
 *   `intent`    — quoted back to the student when the build drifts from the plan
 *
 * `label` is written alongside `component` because `export_plan._label_for()` reads
 * `label` first, and that label is the word MENTOR uses in "you designed *tax* last".
 * Keeping them equal means the plan reads the same whichever field wins.
 */

import React, { useState, useEffect } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import { Box } from "lucide-react";
import { useNodeData } from "@/l/useNodeData";
import NodeShell from "./NodeShell";

const ACCENT = "#8B5CF6"; // violet — matches the Plan export button

export default function ComponentNode({ id, selected, data }: NodeProps) {
  const [name, setName] = useState<string>(data.component || data.label || "");
  const [intent, setIntent] = useState<string>(data.intent || "");

  const updateData = useNodeData(id);
  useEffect(() => {
    const trimmed = name.trim();
    updateData({ label: trimmed, component: trimmed, intent: intent.trim() });
  }, [name, intent, updateData]);

  return (
    <NodeShell
      accent={ACCENT}
      title={name.trim() || "Component"}
      icon={<Box size={16} />}
      status="idle"
      selected={selected}
      width={280}
    >
      <Handle
        type="target"
        position={Position.Left}
        id="input"
        className="w-3 h-3 bg-[#8B5CF6] border-2 border-[#13131a]"
      />

      <div className="space-y-4 font-sans">
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase mb-2 block tracking-widest font-sans">
            Component
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-[#0a0a0f] border border-[#282838] rounded-xl px-3 py-2 text-xs font-mono text-violet-300 outline-none focus:border-[#8B5CF6]/50 nodrag"
            placeholder="validate"
          />
        </div>

        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase mb-2 block tracking-widest font-sans">
            Responsibility
          </label>
          <textarea
            value={intent}
            onChange={(e) => setIntent(e.target.value)}
            className="w-full bg-[#0a0a0f] border border-[#282838] rounded-xl p-3 text-xs text-slate-300 outline-none focus:border-[#8B5CF6]/50 h-20 resize-none nodrag nowheel"
            placeholder="What this part is responsible for — and what it must come after."
          />
        </div>

        <p className="text-[10px] text-slate-600 leading-relaxed font-sans">
          Design-time only — this box never runs. Wire it in the order you intend to
          build, then export with <span className="text-violet-400">Plan</span>.
        </p>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        id="output"
        className="w-3 h-3 bg-[#8B5CF6] border-2 border-[#13131a]"
      />
    </NodeShell>
  );
}
