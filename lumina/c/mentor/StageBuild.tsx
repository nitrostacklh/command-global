"use client";

/**
 * Stage 4 — MCP-2 watches the build, then names the decision that broke it.
 *
 * The architecture has Sentinel running *alongside* Lumina in real time, and this
 * page is inside Lumina, so the events it streams are genuinely observed rather
 * than reconstructed afterwards: `source: 'lumina'` is literally true, and `at`
 * is real elapsed time. That matters because "where is this student stuck" is a
 * property of a sequence of attempts over time — a stateless snapshot cannot
 * answer it, which is why a session exists at all.
 *
 * Nothing here refuses out-of-order work, and nothing warns the student off it.
 * The divergence between the order they planned and the order they built is
 * exactly the material the explanation is made of, so blocking it would delete
 * the lesson. It is recorded and judged, never prevented.
 */

import React, { useMemo, useState } from 'react';
import { buildEvent, looksPassing, type EventKind } from '@/l/mentor/bridge';
import { useMentor, type Doc } from '@/l/mentor/store';
import CausalTimeline, { fromExplain, fromVerdict, type TimelineData } from './CausalTimeline';
import { Button, ErrorNote, Note, Panel, RawDoc, Row, StatusDot } from './ui';

export default function StageBuild() {
  const {
    brief,
    plan,
    planSource,
    spec,
    session,
    events,
    gates,
    stuck,
    outOfOrder,
    verdict,
    drift,
    refusal,
    handle,
    run,
    set,
    pushEvents,
  } = useMentor();

  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [testOutput, setTestOutput] = useState('');
  const [openedAt] = useState(() => Date.now());

  const specDoc = (spec?.spec ?? null) as Doc | null;
  const sessionId = session?.id ? String(session.id) : null;
  const owned = useMemo(
    () => ((brief?.you_own ?? []) as Doc[]).map((o) => String(o.component)),
    [brief],
  );
  const entryFile = String((brief?.files as Doc)?.entry ?? '');
  const ready = !!specDoc;

  /**
   * Open a session ourselves when MCP-1 could not.
   *
   * MCP-1 posts the spec to MCP-2 whenever `SENTINEL_URL` is configured — the
   * arrow the architecture draws — and on the deployed fleet it is. This is the
   * fallback for a deployment where it is not, and it needs the plan, which is
   * why it is only offered when the student brought their own.
   */
  async function openSession() {
    if (!specDoc) return;
    setBusy('session');
    setError(null);
    try {
      const doc = await run('sentinel', 'open_session', {
        spec: specDoc,
        plan,
        student: handle ? `handle:${handle.toLowerCase()}` : undefined,
      });
      if (doc.error || doc.refused) {
        setError(String(doc.error ?? doc.reason));
        return;
      }
      set({ session: (doc.session ?? null) as Doc | null });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  }

  async function stream(kind: EventKind, extra: Partial<Parameters<typeof buildEvent>[0]> = {}) {
    setBusy(`event:${kind}:${extra.component ?? extra.checkpoint ?? ''}`);
    setError(null);
    try {
      const event = buildEvent(
        {
          kind,
          summary: String(extra.summary ?? ''),
          component: extra.component ?? null,
          checkpoint: extra.checkpoint ?? null,
          file: extra.file ?? entryFile,
          line: extra.line ?? null,
          outcome: extra.outcome ?? null,
          test_output: extra.test_output ?? null,
        },
        events.length + 1,
        openedAt,
      );

      const doc = await run('sentinel', 'build_event', {
        ...(sessionId ? { session: sessionId } : {}),
        student: handle ? `handle:${handle.toLowerCase()}` : undefined,
        events: [event],
      });
      if (doc.error) {
        setError(String(doc.error));
        return;
      }
      pushEvents([event]);
      set({
        gates: (doc.gates ?? []) as Doc[],
        stuck: (doc.stuck ?? null) as Doc | null,
        outOfOrder: (doc.out_of_order ?? []) as string[],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  }

  async function verdictNow(finalise: boolean) {
    setBusy('verdict');
    setError(null);
    try {
      const doc = await run('sentinel', 'build_verdict', {
        ...(sessionId ? { session: sessionId } : {}),
        student: handle ? `handle:${handle.toLowerCase()}` : undefined,
        // The inline path, for a deployment with no session: same analysis, same
        // normalisation, so a client holding its own history cannot get a
        // different verdict from one that streamed it.
        ...(sessionId ? {} : { spec: specDoc, plan, events }),
        finalise,
      });
      if (doc.error || doc.refused) {
        setError(String(doc.error ?? doc.reason));
        return;
      }
      const artifact = (doc.verdict ?? {}) as Doc;
      set({
        verdict: doc,
        gates: (doc.gates ?? []) as Doc[],
        stuck: (doc.stuck ?? null) as Doc | null,
        drift: (artifact.drift ?? null) as Doc | null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  }

  async function explainWorkedExample() {
    setBusy('explain');
    setError(null);
    try {
      const doc = await run('sentinel', 'explain_drift', {});
      set({ drift: { ...doc, __from: 'explain' } });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  }

  async function askForTheFix() {
    setBusy('refuse');
    try {
      const doc = await run('sentinel', 'withhold_fix', {
        asked_for: 'the student asked the dashboard for the patch',
      });
      set({ refusal: doc });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  }

  const timeline: TimelineData | null = drift
    ? drift.__from === 'explain'
      ? fromExplain(drift)
      : drift.found === false
        ? null
        : fromVerdict(
            drift,
            String(verdict?.next_question ?? ''),
            `build_verdict · ${planSource === 'yours' ? 'your design and your history' : 'the bundled design'}`,
          )
    : null;

  const passed = gates.filter((g) => g.status === 'pass').length;

  return (
    <Panel
      step="Stage 4 of 5 — build, and when it breaks"
      title="Sentinel marks each gate, then names the decision"
      service="sentinel"
      subtitle="Record what you actually did as you do it. Building out of the order you planned is not blocked and not warned about — it is the material the explanation is made of."
      disabled={!ready}
    >
      <div className="flex flex-wrap items-center gap-2">
        {sessionId ? (
          <Note tone="good">
            Session <span className="font-mono">{sessionId}</span> is open and watching{' '}
            {String((spec?.spec as Doc)?.checkpoints?.length ?? 0)} gates. Sessions live in that
            process — a restart costs the &ldquo;stuck&rdquo; signal for one sitting, not your progress.
          </Note>
        ) : (
          <>
            <Button
              onClick={() => void openSession()}
              tone="sentinel"
              busy={busy === 'session'}
              disabled={!ready || planSource !== 'yours'}
              title={planSource !== 'yours' ? 'needs the plan the spec came from' : undefined}
            >
              open_session
            </Button>
            <span className="font-mono text-[10.5px] text-slate-500">
              MCP-1 did not hand off — open one here, or drive the verdict with the artifacts inline
            </span>
          </>
        )}
      </div>

      <div className="mt-3">
        <ErrorNote error={error} />
      </div>

      {ready && (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div>
            <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.15em] text-slate-500">
              what you just did
            </p>
            <div className="flex flex-wrap gap-1.5">
              {owned.map((component) => (
                <Button
                  key={component}
                  tone="sentinel"
                  busy={busy === `event:component_built:${component}`}
                  onClick={() =>
                    void stream('component_built', {
                      component,
                      summary: `implemented ${component}`,
                    })
                  }
                >
                  built {component}
                </Button>
              ))}
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-slate-600">
              Press these in the order you really worked in, not the order they are listed.
            </p>

            <div className="mt-4">
              <p className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.15em] text-slate-500">
                test output, verbatim
              </p>
              <textarea
                value={testOutput}
                onChange={(e) => setTestOutput(e.target.value)}
                rows={4}
                placeholder="paste what your test runner printed — this is the only thing that can prove a test passed"
                className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 font-mono text-[11px] text-slate-200 outline-none focus:border-[#D4AF37]/60"
              />
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Button
                  tone="sentinel"
                  busy={busy === 'event:test_run:'}
                  disabled={!testOutput.trim()}
                  onClick={() =>
                    void stream('test_run', {
                      // Becomes the failure's name in the timeline when it fails,
                      // so it says which command and how it read rather than "a test".
                      summary: `${String((brief?.files as Doc)?.tests ?? 'the tests')} — reads as ${
                        looksPassing(testOutput) ? 'passing' : 'not passing'
                      }`,
                      outcome: looksPassing(testOutput) ? 'pass' : 'fail',
                      test_output: testOutput,
                      file: String((brief?.files as Doc)?.tests ?? entryFile),
                    })
                  }
                >
                  test_run
                </Button>
                {testOutput.trim() && (
                  <span
                    className="font-mono text-[10.5px]"
                    style={{ color: looksPassing(testOutput) ? '#00C853' : '#EA4335' }}
                  >
                    reads as {looksPassing(testOutput) ? 'passing' : 'not passing'}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-baseline justify-between gap-2">
              <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-slate-500">
                gates
              </p>
              {gates.length > 0 && (
                <span className="font-mono text-[10.5px] text-slate-500">
                  {passed} of {gates.length} passed
                </span>
              )}
            </div>

            {gates.length === 0 ? (
              <p className="text-[12px] leading-relaxed text-slate-600">
                Nothing witnessed yet. Record something on the left.
              </p>
            ) : (
              <div className="space-y-1">
                {gates.map((gate) => (
                  <div
                    key={String(gate.id)}
                    className="flex flex-wrap items-baseline gap-2 rounded-lg border border-white/10 bg-black/30 px-2.5 py-1.5"
                  >
                    <StatusDot status={String(gate.status)} />
                    <span className="font-mono text-[11.5px] text-slate-200">{String(gate.subject)}</span>
                    <span className="font-mono text-[9.5px] uppercase tracking-wider text-slate-600">
                      {String(gate.kind)}
                    </span>
                    {gate.out_of_order === true && (
                      <span className="font-mono text-[9.5px] uppercase tracking-wider text-[#D4AF37]">
                        out of order
                      </span>
                    )}
                    {Number(gate.attempts ?? 0) > 1 && (
                      <span className="font-mono text-[9.5px] text-slate-500">
                        {String(gate.attempts)} attempts
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        void stream('checkpoint_claimed', {
                          checkpoint: String(gate.id),
                          component: (gate.subject ?? null) as string | null,
                          summary: `claimed ${gate.subject}`,
                        })
                      }
                      className="ml-auto font-mono text-[9.5px] uppercase tracking-wider text-slate-500 underline hover:text-slate-300"
                    >
                      claim
                    </button>
                  </div>
                ))}
              </div>
            )}

            {outOfOrder.length > 0 && (
              <ul className="mt-2 space-y-1">
                {outOfOrder.map((line) => (
                  <li key={line} className="font-mono text-[10.5px] leading-relaxed text-[#D4AF37]">
                    · {line}
                  </li>
                ))}
              </ul>
            )}

            {stuck && (
              <div className="mt-2">
                <Note tone="warn">
                  Stuck on <span className="font-mono">{String(stuck.subject ?? stuck.checkpoint)}</span> —{' '}
                  {String(stuck.attempts ?? '')} attempts since {String(stuck.since ?? '')}.
                </Note>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-white/10 pt-4">
        <Button onClick={() => void verdictNow(false)} tone="sentinel" busy={busy === 'verdict'} disabled={!ready}>
          build_verdict · snapshot
        </Button>
        <Button onClick={() => void verdictNow(true)} tone="sentinel" busy={busy === 'verdict'} disabled={!ready}>
          build_verdict · finalise
        </Button>
        <Button onClick={() => void explainWorkedExample()} tone="sentinel" busy={busy === 'explain'}>
          explain_drift · worked example
        </Button>
      </div>

      {verdict && (
        <div className="mt-4 space-y-1 rounded-xl border border-white/10 bg-black/30 p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-[13px] font-bold text-white">{String(verdict.status ?? '')}</h3>
            <span className="font-mono text-[10px] text-slate-500">{String(verdict.driven_by ?? '')}</span>
          </div>
          <p className="pb-2 text-[12.5px] leading-relaxed text-slate-200">{String(verdict.statement ?? '')}</p>
          {Array.isArray(verdict.blocking) && verdict.blocking.length > 0 && (
            <Row label="Outstanding">
              <ul className="space-y-0.5">
                {(verdict.blocking as string[]).map((item) => (
                  <li key={item}>· {item}</li>
                ))}
              </ul>
            </Row>
          )}
          {Array.isArray(verdict.expected_unbuilt) && verdict.expected_unbuilt.length > 0 && (
            <Row label="Correctly unbuilt">
              <span className="text-slate-400">
                {(verdict.expected_unbuilt as string[]).join(', ')} —{' '}
                {String(verdict.expected_unbuilt_note ?? '')}
              </span>
            </Row>
          )}
          <Row label="Tests green">
            <span
              style={{ color: (verdict.verdict as Doc)?.tests_green === true ? '#00C853' : '#EA4335' }}
            >
              {(verdict.verdict as Doc)?.tests_green === true ? 'yes, as witnessed' : 'not yet'}
            </span>
          </Row>
          <Row label="Concept">
            <span className="text-slate-300">{String((verdict.concept as Doc)?.question ?? '')}</span>
            <p className="mt-1 text-[11.5px] text-slate-500">{String((verdict.concept as Doc)?.answer ?? '')}</p>
          </Row>
        </div>
      )}

      {drift?.found === false && (
        <div className="mt-4">
          <Note tone="good">
            No ordering drift: you built it in the order you designed. That is a real answer, not an
            empty one — {String(drift.explanation ?? '')}
          </Note>
        </div>
      )}

      {timeline && (
        <div className="mt-4">
          <CausalTimeline data={timeline} onAskInstead={() => void askForTheFix()} />
        </div>
      )}

      {refusal && (
        <div className="mt-3 rounded-xl border border-[#EA4335]/40 bg-[#EA4335]/10 p-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-[#EA4335]">
            withhold_fix — the tool that exists only to decline
          </p>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-slate-200">
            {String(refusal.refusal ?? refusal.answer ?? '')}
          </p>
          {refusal.instead && (
            <p className="mt-1.5 text-[12px] leading-relaxed text-slate-400">{String(refusal.instead)}</p>
          )}
        </div>
      )}

      <RawDoc label="lumina.build_event/v1 — what was witnessed" doc={events.length ? events : null} />
      <RawDoc label="mentor.verdict/v1 — the document MCP-3 files" doc={verdict?.verdict ?? null} />
    </Panel>
  );
}
