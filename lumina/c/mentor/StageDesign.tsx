"use client";

/**
 * Stage 3 — Lumina, which belongs to no MCP.
 *
 * This is the stage that makes Layer 4 possible: the graph is a machine-readable
 * record of what the student *intended* to build, and MENTOR's whole claim ("you
 * designed tax last, you built it second") is a comparison against its `order`.
 * No other tool in this space has that artifact, so the handoff is worth being
 * fussy about.
 *
 * Three ways to produce it, and the panel always says which one happened —
 * "reviewed the bundled worked example" and "reviewed your design" are different
 * claims and blurring them would be claiming something the demo did not do.
 *
 * Then two checks, in this order and not the other:
 *
 * - `check_scope` — did you design *your* job? Cheap to move a box now.
 * - `checkpoint_spec` — turn that design into gates, **in the order you drew**,
 *   which is what makes it fair to hold you to them later.
 */

import React, { useEffect, useState } from 'react';
import { ExternalLink, Upload } from 'lucide-react';
import { parsePlan, planFromCanvas, savedCanvases, type SavedCanvas } from '@/l/mentor/bridge';
import { useMentor } from '@/l/mentor/store';
import { Button, Chips, ErrorNote, Note, Panel, RawDoc, Row } from './ui';

const VERDICT_COLOUR: Record<string, string> = {
  covered: '#00C853',
  boundary: '#D4AF37',
  out_of_scope: '#EA4335',
  missing: '#FF6D00',
};

export default function StageDesign() {
  const { project, role, handle, brief, plan, planSource, planName, scope, spec, run, set, clearFrom } =
    useMentor();
  const [canvases, setCanvases] = useState<SavedCanvas[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const ready = !!brief;

  useEffect(() => {
    setCanvases(savedCanvases());
  }, []);

  function adopt(next: { plan: Record<string, any> | null; name: string; source: 'bundled' | 'yours' }) {
    clearFrom('plan');
    set({ plan: next.plan, planName: next.name, planSource: next.source, scope: null });
  }

  async function useCanvas(id: string) {
    setBusy(`canvas:${id}`);
    setError(null);
    try {
      const { plan: doc, name } = await planFromCanvas(id);
      adopt({ plan: doc, name, source: 'yours' });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  }

  async function readFile(file: File) {
    setError(null);
    try {
      const { plan: doc, name } = parsePlan(await file.text());
      adopt({ plan: doc, name, source: 'yours' });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function checkScope() {
    setBusy('scope');
    setError(null);
    try {
      // Omitting `plan` is the mechanism for the bundled path — the service falls
      // back to the design shipped for that project, so we never carry a second
      // copy of the fixture that could drift from the real one.
      const doc = await run('roster', 'check_scope', {
        project,
        role,
        ...(planSource === 'yours' && plan ? { plan } : {}),
      });
      if (doc.error) {
        setError(String(doc.error));
        return;
      }
      set({ scope: doc });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  }

  async function deriveSpec() {
    setBusy('spec');
    setError(null);
    try {
      const doc = await run('roster', 'checkpoint_spec', {
        project,
        role,
        handle: handle || undefined,
        ...(planSource === 'yours' && plan ? { plan } : {}),
      });
      if (doc.error) {
        setError(String(doc.error));
        return;
      }
      set({ spec: doc, session: (doc.session ?? null) as Record<string, any> | null });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  }

  const gates = ((spec?.spec as Record<string, any>)?.checkpoints ?? []) as Record<string, any>[];

  return (
    <Panel
      step="Stage 3 of 5 — design before you code"
      title="Draw your slice in Lumina, then bring the plan back"
      subtitle="One box per component you own, plus the given ones as your boundary, wired in the order you intend to build them. That order is what MENTOR compares your build against."
      disabled={!ready}
    >
      <div className="flex flex-wrap items-center gap-2">
        <a
          href="/"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-slate-200 transition-colors hover:border-white/40"
        >
          <ExternalLink size={11} /> open the canvas
        </a>
        <span className="font-mono text-[10.5px] text-slate-500">
          design → component, one box per thing you own · then hit <span className="text-slate-300">Plan</span>
        </span>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <div>
          <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.15em] text-slate-500">
            canvases saved in this browser
          </p>
          {canvases.length === 0 ? (
            <p className="text-[12px] leading-relaxed text-slate-600">
              None yet. Draw one on the canvas, or drop an exported plan on the right.
            </p>
          ) : (
            <div className="space-y-1.5">
              {canvases.slice(0, 5).map((canvas) => (
                <button
                  key={canvas.id}
                  type="button"
                  disabled={!ready || busy === `canvas:${canvas.id}`}
                  onClick={() => void useCanvas(canvas.id)}
                  className="flex w-full items-baseline justify-between gap-3 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-left transition-colors hover:border-white/30 disabled:opacity-40"
                >
                  <span className="text-[12px] text-slate-200">{canvas.name}</span>
                  <span className="font-mono text-[10px] text-slate-500">
                    {canvas.nodes} nodes · {canvas.edges} edges
                  </span>
                </button>
              ))}
            </div>
          )}
          <p className="mt-2 text-[11px] leading-relaxed text-slate-600">
            Compiled through Lumina&apos;s own exporter, so the artifact is identical to what the Plan
            button downloads. Needs the Python backend running.
          </p>
        </div>

        <div>
          <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.15em] text-slate-500">
            or bring the file
          </p>
          <label
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              const file = e.dataTransfer.files?.[0];
              if (file) void readFile(file);
            }}
            className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 transition-colors ${
              dragging ? 'border-[#4285F4] bg-[#4285F4]/10' : 'border-white/15 bg-black/20'
            }`}
          >
            <Upload size={16} className="text-slate-500" />
            <span className="text-center font-mono text-[11px] text-slate-400">
              drop <span className="text-slate-200">plan.lumina.json</span> here
            </span>
            <input
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void readFile(file);
              }}
            />
          </label>
          <div className="mt-2">
            <Button
              onClick={() => adopt({ plan: null, name: 'the bundled worked example', source: 'bundled' })}
              disabled={!ready}
            >
              use the bundled design
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-3">
        <ErrorNote error={error} />
      </div>

      {planSource !== 'none' && (
        <div className="mt-4">
          <Note tone={planSource === 'yours' ? 'good' : 'info'}>
            {planSource === 'yours'
              ? `Reviewing your design — “${planName}”, ${((plan?.order ?? []) as unknown[]).length} components in the order you drew.`
              : 'Reviewing the design bundled with this project. The loop runs end to end, and the finding is about that example rather than about anything you drew.'}
          </Note>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button
          onClick={() => void checkScope()}
          tone="roster"
          busy={busy === 'scope'}
          disabled={!ready || planSource === 'none'}
        >
          check_scope
        </Button>
        <Button
          onClick={() => void deriveSpec()}
          tone="roster"
          busy={busy === 'spec'}
          disabled={!ready || planSource === 'none'}
        >
          checkpoint_spec
        </Button>
      </div>

      {scope && (
        <div className="mt-4 rounded-xl border border-white/10 bg-black/30 p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-[13px] font-bold text-white">
              {scope.in_scope === true ? 'You designed your slice' : 'This design is not your slice yet'}
            </h3>
            <span className="font-mono text-[10px] text-slate-500">{String(scope.coverage ?? '')}</span>
          </div>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-slate-300">{String(scope.summary ?? '')}</p>

          <div className="mt-3 space-y-1.5">
            {((scope.per_component ?? []) as Record<string, any>[]).map((entry) => (
              <div key={String(entry.component)} className="flex items-baseline gap-2">
                <span
                  className="w-24 shrink-0 font-mono text-[10px] uppercase tracking-wider"
                  style={{ color: VERDICT_COLOUR[String(entry.verdict)] ?? '#8AA4C8' }}
                >
                  {String(entry.verdict)}
                </span>
                <span className="font-mono text-[11.5px] text-slate-200">{String(entry.component)}</span>
                <span className="text-[11.5px] leading-relaxed text-slate-500">{String(entry.note ?? '')}</span>
              </div>
            ))}
          </div>

          <p className="mt-3 text-[11.5px] leading-relaxed text-[#D4AF37]">{String(scope.next ?? '')}</p>
        </div>
      )}

      {spec && (
        <div className="mt-4 rounded-xl border border-white/10 bg-black/30 p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-[13px] font-bold text-white">
              {String(spec.gates ?? gates.length)} gates, in the order you drew
            </h3>
            <span className="font-mono text-[10px] text-slate-500">{String(spec.derived_from ?? '')}</span>
          </div>

          <ol className="mt-3 space-y-1">
            {gates.map((gate, i) => (
              <li key={String(gate.id)} className="flex items-baseline gap-2 text-[12px]">
                <span className="w-5 shrink-0 font-mono text-[10px] text-slate-600">{i + 1}</span>
                <span
                  className="w-16 shrink-0 font-mono text-[9.5px] uppercase tracking-wider"
                  style={{ color: gate.kind === 'verify' ? '#00C853' : '#1565C0' }}
                >
                  {String(gate.kind)}
                </span>
                <span className="font-mono text-[11.5px] text-slate-200">{String(gate.subject)}</span>
                {Array.isArray(gate.after) && gate.after.length > 0 && (
                  <span className="font-mono text-[10px] text-slate-600">after {gate.after.join(', ')}</span>
                )}
              </li>
            ))}
          </ol>

          <div className="mt-3 space-y-1">
            <Row label="Definition of done">
              {String((spec.spec as Record<string, any>)?.definition_of_done ?? '')}
            </Row>
            <Row label="Handed off">
              {spec.handed_off_to_sentinel === true ? (
                <span className="text-[#00C853]">
                  MCP-1 posted the spec to MCP-2 and a session is open —{' '}
                  <span className="font-mono">{String((spec.session as Record<string, any>)?.id ?? '')}</span>
                </span>
              ) : (
                <span className="text-[#FF6D00]">
                  not handed off. {String((spec.bridge as Record<string, any>)?.note ?? '')}
                </span>
              )}
            </Row>
          </div>

          <p className="mt-3 text-[11.5px] leading-relaxed text-slate-400">{String(spec.how_to_use ?? '')}</p>
        </div>
      )}

      <RawDoc label="lumina.plan/v1 — what you intended to build" doc={plan} />
      <RawDoc label="mentor.checkpoints/v1 — what MCP-2 verifies against" doc={spec?.spec ?? null} />
    </Panel>
  );
}
