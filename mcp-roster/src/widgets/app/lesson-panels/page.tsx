'use client';

import { useRef, useState } from 'react';
import { useWidgetSDK, useTheme } from '@nitrostack/widgets';

/**
 * LessonPanels — Layer 2 rendered as panels rather than as JSON (`GAPS.md` Gap 13).
 *
 * `MENTOR-CONCEPT.md` §3 asks for "panels, not prose": authored text and figures,
 * **deterministic, never image-model output**. Nothing here generates anything. Every
 * string on screen was authored in a brief under `fixtures/` and travelled through
 * `scripts/embed_fixtures.mjs` — so the lesson renders identically on stage as it did
 * in the test, and a lesson the student can re-read is a lesson.
 *
 * ## The gate survives the widget, and that is the whole design constraint
 *
 * `open_lesson` withholds the reveal **by omitting the later panels from the first
 * response**, not by flagging them. A widget that fetched the whole lesson and hid
 * part of it client-side would destroy that: the withheld panels would be sitting in
 * the page, one devtools inspection — or one model reading the payload — from being
 * read out to a student who never picked a side.
 *
 * So this widget never has the reveal until the student has committed. The choice
 * buttons call `open_lesson` **again**, with `chose` set, and the server decides. The
 * second half arrives as a fresh tool result. Concretely:
 *
 *   render 1   payload = { panels: [setup, commit], awaiting: {...} }   ← no witness
 *   click      callTool('open_lesson', { project, role, chose })        ← server gates
 *   render 2   payload = { panels: [witness, generalise], you_chose }
 *
 * The consequence worth stating: **this component cannot show the reveal early even
 * if it wanted to**, because it has never been sent it. That is the same construction
 * as the flashcard's absent `back` field, and it is why the mechanism is structural
 * rather than a promise about rendering.
 *
 * A made-up `chose` is refused by the server, and `rejected` comes back with the
 * first half again — so the widget renders the refusal without ever advancing.
 */

interface Figure {
  kind: 'unordered';
  items: string[];
}

interface Choice {
  id: string;
  label: string;
}

interface WitnessCase {
  input: string;
  results: Record<string, string>;
  outcome: 'agree' | 'diverge';
}

interface Panel {
  id: string;
  kind: 'setup' | 'commit' | 'witness' | 'generalise';
  title: string;
  body?: string;
  figure?: Figure | null;
  choices?: Choice[];
  cases?: WitnessCase[];
  note?: string;
  prompt?: string;
}

interface LessonData {
  step?: string;
  project?: string;
  role?: string;
  title?: string;
  panels?: Panel[];
  awaiting?: { panel: string | null; choices: Choice[]; why?: string } | null;
  withheld?: string;
  rejected?: string;
  you_chose?: { id: string; label: string } | null;
  concept_you_are_here_to_learn?: { key: string; answer: string } | null;
  next?: string;
  error?: string;
  seats_with_lessons?: string[];
}

export default function LessonPanels() {
  const theme = useTheme();
  const sdk = useWidgetSDK();
  const fromTool = sdk.getToolOutput<LessonData>();

  // The reveal, once the *server* has sent it. Never derived, never pre-fetched.
  const [revealed, setRevealed] = useState<LessonData | null>(null);
  const [asking, setAsking] = useState<string | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  // `disabled={asking !== null}` alone is not enough: React batches state, so two
  // clicks in one tick both see `asking === null` and both issue a call. Committing
  // is a network round trip, so the guard has to be synchronous.
  const inFlight = useRef(false);

  const isDark = theme === 'dark';
  const bg = isDark ? '#0f1420' : '#ffffff';
  const fg = isDark ? '#e6edf3' : '#0b1220';
  const muted = isDark ? 'rgba(230,237,243,0.6)' : 'rgba(11,18,32,0.6)';
  const card = isDark ? '#161d2b' : '#f5f7fb';
  const border = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
  const ACCENT = '#8b5cf6'; // violet — Lumina's `design` category, and Layer 2 is the design stage
  const DIVERGE = '#f59e0b';
  const AGREE = '#10b981';

  const data = revealed ?? fromTool;

  if (!data) {
    return <div style={{ padding: 24, color: fg, background: bg }}>Waiting for a lesson…</div>;
  }

  if (data.error) {
    return (
      <div style={{ padding: 20, background: bg, color: fg, borderRadius: 16, maxWidth: 620, fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ fontWeight: 700, letterSpacing: 1, marginBottom: 8 }}>MENTOR · Lesson</div>
        <div style={{ fontSize: 13, lineHeight: 1.55, marginBottom: 10 }}>{data.error}</div>
        {(data.seats_with_lessons?.length ?? 0) > 0 && (
          <div style={{ fontSize: 12, color: muted }}>
            Lessons exist for: {data.seats_with_lessons?.join(' · ')}
          </div>
        )}
      </div>
    );
  }

  const panels = data.panels ?? [];
  const awaiting = data.awaiting ?? null;
  const chosenId = data.you_chose?.id ?? null;

  /**
   * Commit to an answer.
   *
   * Deliberately a round trip. Calling the tool again is what makes the reveal the
   * server's decision rather than this component's, and it is why the withheld
   * panels were never in the page to begin with.
   */
  const commit = async (choice: Choice) => {
    if (!sdk.callTool || !data.project || !data.role) return;
    if (inFlight.current) return;
    inFlight.current = true;
    setAsking(choice.id);
    setFailed(null);
    try {
      const response = await sdk.callTool('open_lesson', {
        project: data.project,
        role: data.role,
        chose: choice.id,
      });
      // The SDK hands back either the structured result or a { result } envelope,
      // depending on host. Take whichever carries panels.
      const envelope = response as unknown as { result?: LessonData } & LessonData;
      const next = envelope?.panels ? envelope : envelope?.result;
      if (next?.panels) setRevealed(next);
      else setFailed('The lesson came back in a shape this panel could not read.');
    } catch {
      setFailed('Could not reach open_lesson. Ask in chat and the lesson will continue there.');
    } finally {
      inFlight.current = false;
      setAsking(null);
    }
  };

  // ── small shared pieces ────────────────────────────────────────────────────

  const chip = (label: string, tone: 'plain' | 'accent' = 'plain') => (
    <span
      key={label}
      style={{
        display: 'inline-block',
        padding: '6px 11px',
        borderRadius: 8,
        fontSize: 12.5,
        fontFamily: 'monospace',
        whiteSpace: 'nowrap',
        color: tone === 'accent' ? '#0b1220' : fg,
        background: tone === 'accent' ? ACCENT : card,
        border: `1px solid ${tone === 'accent' ? ACCENT : border}`,
        fontWeight: tone === 'accent' ? 700 : 500,
      }}
    >
      {label}
    </span>
  );

  /**
   * The `unordered` figure: the boxes with **no arrow between them**.
   *
   * The absence is the content. `causal-timeline` draws `→` between its chips
   * because that row is a sequence; this one must not, because the setup panel's
   * entire claim is that the order has not been decided yet. Drawing a connector
   * here would answer the question the next panel is about to ask.
   */
  const figure = (fig: Figure) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, overflowX: 'auto', padding: '10px 0 4px', flexWrap: 'wrap' }}>
      {fig.items.map((item, i) => (
        <span key={`${item}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {i > 0 && (
            // Not an arrow. A bare `?` glyph read as a font failure when this was
            // rendered, so the undecidedness is spelled out instead.
            <span style={{ color: muted, fontSize: 11, fontStyle: 'italic', whiteSpace: 'nowrap' }}>
              then? or first?
            </span>
          )}
          {chip(item)}
        </span>
      ))}
    </div>
  );

  const panelShell = (panel: Panel, index: number, children?: React.ReactNode) => (
    <div
      key={panel.id}
      style={{
        background: card,
        border: `1px solid ${border}`,
        borderLeft: `3px solid ${ACCENT}`,
        borderRadius: 12,
        padding: '13px 15px',
        marginBottom: 12,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
        <span style={{ fontSize: 10, fontFamily: 'monospace', color: muted, letterSpacing: 1 }}>
          {String(index + 1).padStart(2, '0')} · {panel.kind.toUpperCase()}
        </span>
      </div>
      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: panel.body ? 6 : 0 }}>{panel.title}</div>
      {panel.body && <div style={{ fontSize: 13, lineHeight: 1.6, color: fg }}>{panel.body}</div>}
      {panel.figure && figure(panel.figure)}
      {children}
    </div>
  );

  // ── the witness table: where the answers agree, and where they part ────────

  const witnessTable = (panel: Panel) => {
    const cases = panel.cases ?? [];
    const ids = Array.from(new Set(cases.flatMap((k) => Object.keys(k.results))));
    return (
      <div style={{ overflowX: 'auto', marginTop: 10 }}>
        <table style={{ borderCollapse: 'collapse', fontSize: 12, width: '100%', minWidth: 320 }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '6px 8px', color: muted, fontWeight: 600, borderBottom: `1px solid ${border}` }}>
                input
              </th>
              {ids.map((id) => (
                <th
                  key={id}
                  style={{
                    textAlign: 'left',
                    padding: '6px 8px',
                    fontFamily: 'monospace',
                    fontWeight: id === chosenId ? 800 : 600,
                    color: id === chosenId ? ACCENT : muted,
                    borderBottom: `1px solid ${border}`,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {id}
                  {id === chosenId && <span style={{ fontSize: 10 }}> ← yours</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cases.map((kase, i) => (
              <tr key={`${kase.input}-${i}`}>
                <td style={{ padding: '7px 8px', borderBottom: `1px solid ${border}`, lineHeight: 1.45 }}>
                  {kase.input}
                  <div
                    style={{
                      fontSize: 10,
                      letterSpacing: 0.5,
                      marginTop: 2,
                      color: kase.outcome === 'diverge' ? DIVERGE : AGREE,
                      fontWeight: 700,
                    }}
                  >
                    {kase.outcome === 'diverge' ? 'THEY PART HERE' : 'both agree — the bug hides'}
                  </div>
                </td>
                {ids.map((id) => (
                  <td
                    key={id}
                    style={{
                      padding: '7px 8px',
                      borderBottom: `1px solid ${border}`,
                      fontFamily: 'monospace',
                      whiteSpace: 'nowrap',
                      color: kase.outcome === 'diverge' ? fg : muted,
                      fontWeight: kase.outcome === 'diverge' && id === chosenId ? 700 : 500,
                      background:
                        kase.outcome === 'diverge' && id === chosenId
                          ? isDark
                            ? 'rgba(139,92,246,0.12)'
                            : 'rgba(139,92,246,0.08)'
                          : 'transparent',
                    }}
                  >
                    {kase.results[id] ?? '—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // ── render ─────────────────────────────────────────────────────────────────

  return (
    <div
      style={{
        padding: 20,
        background: bg,
        color: fg,
        borderRadius: 16,
        maxWidth: 620,
        fontFamily: 'system-ui, sans-serif',
        boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
      }}
    >
      {/* ── header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
        <div>
          <div style={{ fontWeight: 700, letterSpacing: 1 }}>MENTOR · Lesson</div>
          <div style={{ fontSize: 12, color: muted }}>
            {data.title || `${data.project ?? ''}${data.role ? ` · ${data.role}` : ''}`}
          </div>
        </div>
        {data.step && (
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: '#fff',
              background: awaiting ? ACCENT : AGREE,
              padding: '4px 10px',
              borderRadius: 999,
              whiteSpace: 'nowrap',
            }}
          >
            {data.step.replace('lesson · ', '')}
          </span>
        )}
      </div>

      {/* a made-up choice was refused by the server, and nothing advanced */}
      {data.rejected && (
        <div
          style={{
            background: isDark ? 'rgba(239,68,68,0.07)' : 'rgba(239,68,68,0.05)',
            border: `1px solid ${isDark ? 'rgba(239,68,68,0.25)' : 'rgba(239,68,68,0.2)'}`,
            borderRadius: 10,
            padding: '10px 13px',
            marginBottom: 12,
            fontSize: 12.5,
          }}
        >
          {data.rejected}
        </div>
      )}

      {/* what they committed to, carried into the reveal */}
      {data.you_chose && (
        <div style={{ fontSize: 12, color: muted, marginBottom: 12 }}>
          You chose <span style={{ color: ACCENT, fontWeight: 700, fontFamily: 'monospace' }}>{data.you_chose.id}</span>
          {data.you_chose.label ? ` — ${data.you_chose.label}` : ''}
        </div>
      )}

      {/* ── the panels ── */}
      {panels.map((panel, i) =>
        panel.kind === 'witness'
          ? panelShell(panel, i, (
              <>
                {witnessTable(panel)}
                {panel.note && (
                  <div style={{ fontSize: 12, color: muted, marginTop: 10, lineHeight: 1.55 }}>{panel.note}</div>
                )}
              </>
            ))
          : panel.kind === 'generalise'
            ? panelShell(panel, i, (
                panel.prompt ? (
                  <div
                    style={{
                      marginTop: 10,
                      padding: '10px 12px',
                      borderRadius: 9,
                      border: `1px dashed ${border}`,
                      fontSize: 12.5,
                      lineHeight: 1.5,
                    }}
                  >
                    <span style={{ color: muted }}>Answer this yourself → </span>
                    {panel.prompt}
                  </div>
                ) : null
              ))
            : panelShell(panel, i),
      )}

      {/* ── the commit gate ── */}
      {awaiting && (awaiting.choices?.length ?? 0) > 0 && (
        <div
          style={{
            background: card,
            border: `1px solid ${ACCENT}`,
            borderRadius: 12,
            padding: 14,
            marginTop: 4,
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Commit before you look</div>
          <div style={{ fontSize: 11.5, color: muted, lineHeight: 1.55, marginBottom: 11 }}>
            {awaiting.why}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {awaiting.choices.map((choice) => (
              <button
                key={choice.id}
                type="button"
                disabled={asking !== null || !sdk.callTool}
                onClick={() => void commit(choice)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  cursor: asking ? 'progress' : 'pointer',
                  background: bg,
                  color: fg,
                  border: `1px solid ${asking === choice.id ? ACCENT : border}`,
                  borderRadius: 9,
                  padding: '10px 12px',
                  fontSize: 12.5,
                  fontFamily: 'inherit',
                  lineHeight: 1.45,
                  opacity: asking && asking !== choice.id ? 0.5 : 1,
                }}
              >
                <span style={{ fontFamily: 'monospace', color: ACCENT }}>{choice.id}</span>
                <span style={{ color: muted }}> — </span>
                {choice.label}
                {asking === choice.id && <span style={{ color: muted }}> · asking…</span>}
              </button>
            ))}
          </div>

          {data.withheld && (
            <div style={{ fontSize: 11, color: muted, marginTop: 11, lineHeight: 1.5 }}>
              🔒 {data.withheld}. Not hidden below — not sent to this panel at all.
            </div>
          )}

          {failed && <div style={{ fontSize: 11.5, color: '#ef4444', marginTop: 10 }}>{failed}</div>}
        </div>
      )}

      {/* ── after the reveal: the principle is still not here ── */}
      {data.concept_you_are_here_to_learn && (
        <div
          style={{
            background: isDark ? 'rgba(139,92,246,0.07)' : 'rgba(139,92,246,0.05)',
            border: `1px solid ${isDark ? 'rgba(139,92,246,0.25)' : 'rgba(139,92,246,0.2)'}`,
            borderRadius: 12,
            padding: 14,
            marginTop: 4,
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>⛔ Still no principle, on purpose</div>
          <div style={{ fontSize: 12, color: muted, lineHeight: 1.55 }}>
            {data.concept_you_are_here_to_learn.answer}
          </div>
          {sdk.sendFollowUpMessage && (
            <button
              type="button"
              onClick={() =>
                sdk.sendFollowUpMessage?.(
                  'Here is the rule in my own words, from the case above: ',
                )
              }
              style={{
                width: '100%',
                textAlign: 'left',
                cursor: 'pointer',
                background: card,
                color: fg,
                border: `1px solid ${border}`,
                borderRadius: 9,
                padding: '10px 12px',
                fontSize: 12.5,
                fontFamily: 'inherit',
                lineHeight: 1.45,
                marginTop: 11,
              }}
            >
              <span style={{ color: muted }}>Say it yourself → </span>
              state the rule in your own words
            </button>
          )}
        </div>
      )}

      {/* the witness table is wide; offer the room for it */}
      {sdk.requestFullscreen && sdk.displayMode !== 'fullscreen' && (
        <button
          type="button"
          onClick={() => sdk.requestFullscreen?.()}
          style={{
            marginTop: 14,
            cursor: 'pointer',
            background: 'transparent',
            color: muted,
            border: `1px solid ${border}`,
            borderRadius: 8,
            padding: '5px 10px',
            fontSize: 11,
            fontFamily: 'inherit',
          }}
        >
          Expand
        </button>
      )}
    </div>
  );
}
