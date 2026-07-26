"use client";

/**
 * Stage 2 — the assignment, and the lesson that teaches the concept behind it.
 *
 * Two things this panel is careful about:
 *
 * **`owns` vs `given` vs `not_yours` all get shown.** A real engineer joining a
 * real team builds a slice against interfaces other people own, so the boundary
 * boxes are not clutter — drawing somebody else's component as your edge is
 * correct practice, and drawing it as your work is the scope drift `check_scope`
 * catches one stage later.
 *
 * **The lesson's reveal is withheld by the server, and this panel keeps it that
 * way.** The later panels are absent from the first response, not hidden behind a
 * flag, so there is nothing here to leak: the choice buttons call `open_lesson`
 * again and the second half arrives as a fresh result. The student commits to an
 * answer before seeing the case that separates the two — that commitment is the
 * pedagogy, and a reveal read out to somebody who never picked a side teaches
 * them nothing.
 *
 * No panel states the principle. The student derives it, and MCP-3 confirms it
 * against their own green tests at the end.
 */

import React, { useState } from 'react';
import { useMentor, type Doc } from '@/l/mentor/store';
import { Button, Chips, ErrorNote, Note, Panel, RawDoc, Row } from './ui';

function LessonPanels({ panels, chose }: { panels: Doc[]; chose: string | null }) {
  return (
    <div className="space-y-2">
      {panels.map((panel) => (
        <article key={String(panel.id)} className="rounded-xl border border-white/10 bg-black/30 p-3">
          <div className="flex items-baseline justify-between gap-2">
            <h4 className="text-[12.5px] font-bold text-white">{String(panel.title)}</h4>
            <span className="font-mono text-[9.5px] uppercase tracking-[0.15em] text-[#1565C0]">
              {String(panel.kind)}
            </span>
          </div>
          {panel.body && (
            <p className="mt-1.5 text-[12px] leading-relaxed text-slate-300">{String(panel.body)}</p>
          )}

          {/* An `unordered` figure is two boxes with no arrow — which is exactly
              the claim the setup panel makes, so it is drawn without one. */}
          {panel.figure?.items && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {(panel.figure.items as string[]).map((item) => (
                <span
                  key={item}
                  className="rounded-lg border border-[#1565C0]/50 bg-[#0F2847] px-3 py-1.5 font-mono text-[11px] text-slate-200"
                >
                  {item}
                </span>
              ))}
              <span className="font-mono text-[10px] text-slate-600">no order stated</span>
            </div>
          )}

          {Array.isArray(panel.cases) && (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[420px] border-collapse text-left">
                <thead>
                  <tr className="font-mono text-[9.5px] uppercase tracking-wider text-slate-500">
                    <th className="border-b border-white/10 py-1.5 pr-3 font-normal">input</th>
                    {Object.keys((panel.cases as Doc[])[0]?.results ?? {}).map((id) => (
                      <th
                        key={id}
                        className="border-b border-white/10 py-1.5 pr-3 font-normal"
                        style={chose === id ? { color: '#D4AF37' } : undefined}
                      >
                        {id}
                        {chose === id ? ' (yours)' : ''}
                      </th>
                    ))}
                    <th className="border-b border-white/10 py-1.5 font-normal">tells them apart?</th>
                  </tr>
                </thead>
                <tbody>
                  {(panel.cases as Doc[]).map((kase, i) => (
                    <tr key={i} className="font-mono text-[11px] text-slate-300">
                      <td className="border-b border-white/5 py-1.5 pr-3">{String(kase.input)}</td>
                      {Object.entries(kase.results ?? {}).map(([id, value]) => (
                        <td key={id} className="border-b border-white/5 py-1.5 pr-3">
                          {String(value)}
                        </td>
                      ))}
                      <td
                        className="border-b border-white/5 py-1.5"
                        style={{ color: kase.outcome === 'diverge' ? '#EA4335' : '#5C6B80' }}
                      >
                        {kase.outcome === 'diverge' ? 'yes' : 'no — looks identical'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {panel.note && (
            <p className="mt-2 text-[11.5px] leading-relaxed text-[#D4AF37]">{String(panel.note)}</p>
          )}
          {panel.prompt && (
            <p className="mt-2 rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-[12px] leading-relaxed text-slate-200">
              {String(panel.prompt)}
            </p>
          )}
        </article>
      ))}
    </div>
  );
}

export default function StageBrief() {
  const {
    project,
    role,
    handle,
    brief,
    lessonPart1,
    lessonPart2,
    lessonChoice,
    run,
    set,
    clearFrom,
  } = useMentor();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const ready = !!project && !!role;

  async function openBrief() {
    if (!ready) return;
    setBusy('brief');
    setError(null);
    clearFrom('brief');
    try {
      const doc = await run('roster', 'open_brief', { project, role, handle: handle || undefined });
      if (doc.error) {
        setError(String(doc.error));
        return;
      }
      set({ brief: doc });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  }

  async function openLesson(chose?: string) {
    if (!ready) return;
    setBusy('lesson');
    setError(null);
    try {
      const doc = await run('roster', 'open_lesson', {
        project,
        role,
        ...(chose ? { chose } : {}),
        handle: handle || undefined,
      });
      if (doc.error) {
        setError(String(doc.error));
        return;
      }
      if (chose) set({ lessonPart2: doc, lessonChoice: chose });
      else set({ lessonPart1: doc, lessonPart2: null, lessonChoice: null });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  }

  const concept = (brief?.concept_you_are_here_to_learn ?? {}) as Doc;
  const awaiting = (lessonPart1?.awaiting ?? {}) as Doc;
  const choices = (awaiting.choices ?? []) as Doc[];

  return (
    <Panel
      step="Stage 2 of 5 — your assignment, and the concept"
      title="The brief, then the lesson you walk"
      service="roster"
      subtitle="Knowing what you are not building is half of knowing what you are — so the brief names your slice, your boundaries, and the parts that are somebody else's."
      disabled={!ready}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={() => void openBrief()} tone="roster" busy={busy === 'brief'} disabled={!ready}>
          open_brief
        </Button>
        <Button
          onClick={() => void openLesson()}
          tone="roster"
          busy={busy === 'lesson'}
          disabled={!ready}
        >
          open_lesson
        </Button>
        {!ready && (
          <span className="font-mono text-[10.5px] text-slate-600">pick a role and a project first</span>
        )}
      </div>

      <div className="mt-3">
        <ErrorNote error={error} />
      </div>

      {brief && (
        <div className="mt-4 space-y-1 rounded-xl border border-white/10 bg-black/30 p-4">
          <h3 className="text-[14px] font-bold text-white">{String(brief.title ?? '')}</h3>
          <p className="pb-2 text-[12.5px] leading-relaxed text-slate-300">{String(brief.you_are ?? '')}</p>
          <Row label="Stakes">{String(brief.stakes ?? '')}</Row>
          <Row label="Deliverable">{String(brief.deliverable ?? '')}</Row>
          <Row label="You own">
            <div className="space-y-1.5">
              {((brief.you_own ?? []) as Doc[]).map((o) => (
                <div key={String(o.component)}>
                  <span className="font-mono text-[11px] text-[#1565C0]">{String(o.component)}</span>
                  <span className="text-slate-400"> — {String(o.intent ?? '')}</span>
                </div>
              ))}
            </div>
          </Row>
          <Row label="Given to you">
            <div className="space-y-1.5">
              {((brief.given_to_you ?? []) as Doc[]).map((g) => (
                <div key={String(g.component)}>
                  <span className="font-mono text-[11px] text-[#D4AF37]">{String(g.component)}</span>
                  <span className="text-slate-400">
                    {' '}
                    — owned by {String(g.owned_by ?? '')}. Draw it as your boundary; do not implement it.
                  </span>
                </div>
              ))}
            </div>
          </Row>
          <Row label="Not yours">
            <Chips items={(brief.not_yours ?? []) as string[]} colour="#5C6B80" />
          </Row>
          <Row label="Acceptance">
            <ol className="space-y-1">
              {((brief.acceptance ?? []) as Doc[]).map((a) => (
                <li key={String(a.id)} className="text-slate-300">
                  <span className="font-mono text-[10.5px] text-slate-500">{String(a.id)}</span>{' '}
                  given {String(a.given ?? '')} — must {String(a.must ?? '')}
                </li>
              ))}
            </ol>
          </Row>
          <Row label="Files">
            <span className="font-mono text-[11px] text-slate-400">
              {String((brief.files as Doc)?.entry ?? '')} · tests {String((brief.files as Doc)?.tests ?? '')}
            </span>
          </Row>

          <div className="mt-3 rounded-lg border border-[#FF6D00]/40 bg-[#FF6D00]/10 p-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-[#FF6D00]">
              the concept you are here to learn
            </p>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-slate-200">
              {String(concept.question ?? '')}
            </p>
            <p className="mt-2 text-[11.5px] leading-relaxed text-slate-500">
              Answer: {String(concept.answer ?? '')}
            </p>
          </div>
        </div>
      )}

      {lessonPart1 && (
        <div className="mt-5">
          <div className="mb-2 flex items-baseline justify-between gap-2">
            <h3 className="text-[13px] font-bold text-white">{String(lessonPart1.title ?? 'Lesson')}</h3>
            <span className="font-mono text-[9.5px] uppercase tracking-wider text-slate-500">
              {String(lessonPart1.step ?? '')}
            </span>
          </div>
          <LessonPanels panels={(lessonPart1.panels ?? []) as Doc[]} chose={lessonChoice} />

          {lessonPart1.rejected && <div className="mt-2"><ErrorNote error={String(lessonPart1.rejected)} /></div>}

          {!lessonPart2 && choices.length > 0 && (
            <div className="mt-3 rounded-xl border border-[#D4AF37]/40 bg-[#D4AF37]/10 p-3">
              <p className="text-[12px] leading-relaxed text-[#D4AF37]">
                {String(awaiting.why ?? '')} {String(lessonPart1.withheld ?? '')}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {choices.map((choice) => (
                  <Button
                    key={String(choice.id)}
                    onClick={() => void openLesson(String(choice.id))}
                    tone="sentinel"
                    busy={busy === 'lesson'}
                  >
                    {String(choice.label)}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {lessonPart2 && (
            <div className="mt-3 space-y-2">
              <Note>
                You committed to{' '}
                <span className="font-mono">{String((lessonPart2.you_chose as Doc)?.label ?? lessonChoice)}</span>.
                Read the case below and say the rule in your own words — nothing here states it for you.
              </Note>
              <LessonPanels panels={(lessonPart2.panels ?? []) as Doc[]} chose={lessonChoice} />
              <p className="text-[11.5px] leading-relaxed text-slate-500">
                {String((lessonPart2.concept_you_are_here_to_learn as Doc)?.answer ?? '')}
              </p>
            </div>
          )}
        </div>
      )}

      <RawDoc label="mentor.brief/v1" doc={brief} />
    </Panel>
  );
}
