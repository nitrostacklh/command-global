"use client";

/**
 * The causal timeline: the plan on top, the build underneath, and the labelled
 * arrow between them at the point they stopped matching.
 *
 * This is the shape of MENTOR's whole claim, so three things are non-negotiable
 * in how it draws:
 *
 * - **Both rows, always.** The finding is a *comparison*. A single row of code
 *   with a red mark on it is what every other tool already shows.
 * - **Confidence per component, with its reason.** "91% sure the origin is here,
 *   and here is which part I am guessing about" is an honesty feature, and a
 *   student who learns to check where the tool is guessing has learned something
 *   durable. It is *not* evidence that MENTOR helps anyone debug faster — that
 *   would be a study, and there isn't one yet.
 * - **No fix.** The origin is a file and a line, and then it stops. The button
 *   under it asks a better question instead of dead-ending the student.
 *
 * Fed from either `build_verdict` (the student's own streamed history) or
 * `explain_drift` (the bundled worked example). Both carry the same fields under
 * different names, so callers normalise into `TimelineData` rather than this
 * component knowing which tool spoke.
 */

import React from 'react';
import { Confidence } from './ui';

export interface TimelineData {
  readonly explanation: string;
  readonly planRow: readonly string[];
  readonly buildRow: readonly string[];
  readonly origin: {
    component: string;
    shouldFollow: string;
    file: string;
    line: number | null;
    dependency?: string;
    plannedPosition?: number;
    actualPosition?: number;
  } | null;
  readonly failure: { test: string; file: string; line: number | null; message: string } | null;
  readonly confidence: number;
  readonly components: Record<string, { score: number; reason?: string; weight?: number }>;
  readonly caveats: readonly string[];
  readonly nextQuestion: string;
  readonly source: string;
}

function Boxes({
  items,
  highlight,
  colour,
}: {
  items: readonly string[];
  highlight?: string | null;
  colour: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {items.map((item, i) => (
        <React.Fragment key={`${item}-${i}`}>
          <span
            className="rounded-lg border px-2.5 py-1.5 font-mono text-[11px]"
            style={
              item === highlight
                ? { borderColor: colour, background: `${colour}25`, color: '#fff' }
                : { borderColor: '#ffffff1f', background: '#0B1E35', color: '#C8D6E5' }
            }
          >
            {item}
          </span>
          {i < items.length - 1 && <span className="font-mono text-[11px] text-slate-600">▸</span>}
        </React.Fragment>
      ))}
    </div>
  );
}

export default function CausalTimeline({
  data,
  onAskInstead,
}: {
  data: TimelineData;
  onAskInstead?: () => void;
}) {
  return (
    <div className="rounded-xl border border-[#D4AF37]/40 bg-[#D4AF37]/[0.06] p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-[13px] font-bold text-white">The decision that broke it</h3>
        <span className="font-mono text-[10px] text-slate-500">{data.source}</span>
      </div>
      <p className="mt-1.5 text-[12.5px] leading-relaxed text-slate-200">{data.explanation}</p>

      <div className="mt-4">
        <p className="mb-1.5 font-mono text-[9.5px] uppercase tracking-[0.15em] text-slate-500">
          the plan — what you designed
        </p>
        <Boxes items={data.planRow} highlight={data.origin?.component} colour="#1565C0" />
      </div>

      {data.origin && (
        <div className="my-3 flex items-start gap-3 border-l-2 border-[#D4AF37] pl-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-[#D4AF37]">⚠ drift</p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-slate-200">
              You designed <span className="font-mono text-[#1565C0]">{data.origin.component}</span> to
              come after <span className="font-mono text-[#1565C0]">{data.origin.shouldFollow}</span>. You
              implemented it first — {data.origin.file}
              {data.origin.line !== null ? `:${data.origin.line}` : ''}.
            </p>
            {data.origin.dependency && (
              <p className="mt-1 font-mono text-[10.5px] text-slate-500">
                the plan states that order {data.origin.dependency === 'direct' ? 'directly' : 'transitively'}
                {data.origin.plannedPosition && data.origin.actualPosition
                  ? ` · planned #${data.origin.plannedPosition}, built #${data.origin.actualPosition}`
                  : ''}
              </p>
            )}
          </div>
        </div>
      )}

      <div className="mt-3">
        <p className="mb-1.5 font-mono text-[9.5px] uppercase tracking-[0.15em] text-slate-500">
          the build — what actually happened
        </p>
        <Boxes items={data.buildRow} highlight={data.origin?.component} colour="#D4AF37" />
      </div>

      {data.failure && (
        <p className="mt-3 rounded-lg border border-[#EA4335]/40 bg-[#EA4335]/10 px-3 py-2 font-mono text-[11px] leading-relaxed text-[#EA4335]">
          the error you saw — {data.failure.test} · {data.failure.file}
          {data.failure.line !== null ? `:${data.failure.line}` : ''}
          {/* A witnessed test_run carries one summary, which arrives as both the
              test name and the message. Printing it twice reads like two facts. */}
          {data.failure.message && data.failure.message !== data.failure.test
            ? ` — ${data.failure.message}`
            : ''}
        </p>
      )}

      <div className="mt-4">
        <p className="mb-1 font-mono text-[9.5px] uppercase tracking-[0.15em] text-slate-500">
          how sure it is, and about what — {Math.round(data.confidence * 100)}% overall
        </p>
        {Object.entries(data.components).map(([key, part]) => (
          <Confidence key={key} value={Number(part.score ?? 0)} reason={part.reason ?? key} />
        ))}
      </div>

      {data.caveats.length > 0 && (
        <ul className="mt-3 space-y-1">
          {data.caveats.map((caveat) => (
            <li key={caveat} className="text-[11.5px] leading-relaxed text-slate-500">
              · {caveat}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-white/10 pt-3">
        <p className="text-[12px] leading-relaxed text-slate-300">
          <span className="font-mono text-[10px] uppercase tracking-wider text-[#D4AF37]">
            it stops here.{' '}
          </span>
          You write the fix. A better question to answer first: {data.nextQuestion}
        </p>
        {onAskInstead && (
          <button
            type="button"
            onClick={onAskInstead}
            className="rounded-lg border border-[#D4AF37]/50 bg-[#D4AF37]/15 px-3 py-1.5 font-mono text-[10.5px] font-semibold uppercase tracking-wider text-[#D4AF37]"
          >
            ask for the fix anyway →
          </button>
        )}
      </div>
    </div>
  );
}

/** Normalise `build_verdict`'s drift block into what the timeline draws. */
export function fromVerdict(drift: Record<string, any>, nextQuestion: string, source: string): TimelineData {
  return {
    explanation: String(drift.explanation ?? ''),
    planRow: (drift.planned_order ?? []) as string[],
    buildRow: (drift.actual_order ?? []) as string[],
    origin: drift.origin
      ? {
          component: String(drift.origin.component),
          shouldFollow: String(drift.origin.should_follow ?? drift.origin.shouldFollow ?? ''),
          file: String(drift.origin.file ?? ''),
          line: drift.origin.line ?? null,
          dependency: drift.origin.dependency,
          plannedPosition: drift.origin.planned_position ?? drift.origin.plannedPosition,
          actualPosition: drift.origin.actual_position ?? drift.origin.actualPosition,
        }
      : null,
    failure: (drift.failure ?? null) as TimelineData['failure'],
    confidence: Number(drift.confidence ?? 0),
    components: (drift.confidence_components ?? {}) as TimelineData['components'],
    caveats: (drift.caveats ?? []) as string[],
    nextQuestion,
    source,
  };
}

/** Normalise `explain_drift`'s payload, which names the same rows differently. */
export function fromExplain(doc: Record<string, any>): TimelineData {
  return {
    explanation: String(doc.explanation ?? ''),
    planRow: (doc.plan_row ?? []) as string[],
    buildRow: (doc.build_row ?? []) as string[],
    origin: doc.origin
      ? {
          component: String(doc.origin.component),
          shouldFollow: String(doc.origin.shouldFollow ?? doc.origin.should_follow ?? ''),
          file: String(doc.origin.file ?? ''),
          line: doc.origin.line ?? null,
          dependency: doc.origin.dependency,
          plannedPosition: doc.origin.plannedPosition,
          actualPosition: doc.origin.actualPosition,
        }
      : null,
    failure: (doc.failure ?? null) as TimelineData['failure'],
    confidence: Number(doc.confidence ?? 0),
    components: (doc.confidence_components ?? {}) as TimelineData['components'],
    caveats: (doc.caveats ?? []) as string[],
    nextQuestion: String(doc.next_question ?? ''),
    source: 'explain_drift · the bundled worked example',
  };
}
