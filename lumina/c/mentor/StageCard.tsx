"use client";

/**
 * Stage 5 — MCP-3, the only process that has ever held a concept answer.
 *
 * The gate is two independent readings and it is worth understanding before the
 * demo: this service re-parses the student's verbatim runner output *itself*, and
 * separately checks what MCP-2 last witnessed. Both have to agree. A single
 * boolean travelling over a bridge is exactly the field somebody would forge.
 *
 * When a card is unearned, `back` is **absent from the payload** rather than
 * present behind a flag — so there is nothing on screen for a model or a curious
 * student to read. This panel could not leak it if it wanted to; it renders what
 * arrived, and what arrived does not contain the answer.
 */

import React, { useState } from 'react';
import { useMentor, type Doc } from '@/l/mentor/store';
import { Button, Chips, ErrorNote, Note, Panel, RawDoc, Row } from './ui';

const GRADES = ['again', 'hard', 'good', 'easy'] as const;

export default function StageCard() {
  const { project, role, handle, verdict, card, due, profile, run, set } = useMentor();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [testOutput, setTestOutput] = useState('');
  const [explained, setExplained] = useState(true);
  const [classProgress, setClassProgress] = useState<Doc | null>(null);

  const student = handle ? `handle:${handle.toLowerCase()}` : undefined;
  const ready = !!project;

  async function askForCard() {
    setBusy('card');
    setError(null);
    try {
      const doc = await run('profile', 'flashcard', {
        project,
        role: role ?? undefined,
        test_output: testOutput,
        student,
        explained_in_own_words: explained,
      });
      set({ card: doc });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  }

  async function review(grade: string) {
    if (!card?.id) return;
    setBusy(`review:${grade}`);
    setError(null);
    try {
      const doc = await run('profile', 'review_flashcard', {
        card_id: String(card.id),
        grade,
        student,
      });
      if (doc.error) setError(String(doc.error));
      else set({ card: { ...card, review: doc.review ?? card.review, reviewed: doc } });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  }

  async function loadDue() {
    setBusy('due');
    setError(null);
    try {
      const doc = await run('profile', 'due_cards', { student });
      set({ due: (doc.due ?? []) as Doc[] });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  }

  async function loadProfile() {
    setBusy('profile');
    setError(null);
    try {
      set({ profile: await run('profile', 'read_profile', { student }) });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  }

  async function loadClass() {
    setBusy('class');
    setError(null);
    try {
      setClassProgress(await run('profile', 'class_progress', {}));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  }

  const earned = card?.earned === true;
  const verdictFiled = verdict?.verdict ? true : false;

  return (
    <Panel
      step="Stage 5 of 5 — the concept, earned"
      title="The card, and the record it goes into"
      service="profile"
      subtitle="A fix stays with the file. A concept doesn't — that is what carries to the next project, and it is released against your own green tests rather than against a syllabus."
      disabled={!ready}
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <p className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.15em] text-slate-500">
            your test output, verbatim
          </p>
          <textarea
            value={testOutput}
            onChange={(e) => setTestOutput(e.target.value)}
            rows={4}
            placeholder="e.g. the full output of `node --test` — this service parses it itself rather than trusting a flag"
            className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 font-mono text-[11px] text-slate-200 outline-none focus:border-[#FF6D00]/60"
          />
          <label className="mt-2 flex items-center gap-2 text-[11.5px] text-slate-400">
            <input
              type="checkbox"
              checked={explained}
              onChange={(e) => setExplained(e.target.checked)}
              className="accent-[#FF6D00]"
            />
            I already tried to say the idea in my own words
          </label>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button onClick={() => void askForCard()} tone="profile" busy={busy === 'card'} disabled={!ready}>
              flashcard
            </Button>
            <Button onClick={() => void loadDue()} tone="profile" busy={busy === 'due'}>
              due_cards
            </Button>
          </div>
          {!verdictFiled && (
            <p className="mt-2 text-[11px] leading-relaxed text-slate-600">
              No verdict filed yet this sitting. The card is issued against what the verifier saw, so
              finish your gates with MCP-2 first — pasted text alone will not open it.
            </p>
          )}
        </div>

        <div>
          <p className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.15em] text-slate-500">
            the record
          </p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void loadProfile()} tone="profile" busy={busy === 'profile'}>
              read_profile
            </Button>
            <Button onClick={() => void loadClass()} tone="profile" busy={busy === 'class'}>
              class_progress
            </Button>
          </div>

          {profile && (
            <div className="mt-3 space-y-1 rounded-xl border border-white/10 bg-black/30 p-3">
              <Row label="Projects">
                <Chips
                  items={((profile.projects ?? []) as Doc[]).map(
                    (p) => `${p.project}/${p.role} · ${p.status}`,
                  )}
                  colour="#FF6D00"
                />
              </Row>
              <Row label="Mastery">
                <Chips items={((profile.mastery ?? []) as any[]).map((m) => String(m.concept ?? m))} colour="#00C853" />
              </Row>
              <Row label="Roles played">
                <Chips items={((profile.role_history ?? []) as Doc[]).map((r) => String(r.role))} />
              </Row>
            </div>
          )}

          {classProgress && (
            <div className="mt-3 rounded-xl border border-white/10 bg-black/30 p-3">
              <p className="text-[12px] leading-relaxed text-slate-300">
                {String(classProgress.summary ?? classProgress.note ?? '')}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-3">
        <ErrorNote error={error} />
      </div>

      {card && (
        <div
          className="mt-4 rounded-xl border p-4"
          style={{
            borderColor: earned ? '#00C85366' : '#FF6D0055',
            background: earned ? '#00C8530F' : '#FF6D000F',
          }}
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-[13px] font-bold text-white">
              {earned ? 'Earned' : 'Not earned yet'} — {String(card.concept ?? '')}
            </h3>
            <span className="font-mono text-[10px] text-slate-500">{String(card.id ?? '')}</span>
          </div>

          <p className="mt-2 text-[13px] leading-relaxed text-slate-100">{String(card.front ?? '')}</p>

          {earned ? (
            <>
              <p className="mt-3 rounded-lg border border-[#00C853]/40 bg-[#00C853]/10 px-3 py-2 text-[12.5px] leading-relaxed text-slate-100">
                {String(card.back ?? '')}
              </p>
              {card.transfersTo && (
                <p className="mt-2 text-[12px] leading-relaxed text-slate-400">
                  Transfers to: {String(card.transfersTo)}
                </p>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
                  how well did you recall it?
                </span>
                {GRADES.map((grade) => (
                  <Button key={grade} onClick={() => void review(grade)} tone="profile" busy={busy === `review:${grade}`}>
                    {grade}
                  </Button>
                ))}
              </div>
            </>
          ) : (
            <div className="mt-3 space-y-2">
              <ul className="space-y-1">
                {((card.blocking ?? []) as string[]).map((item) => (
                  <li key={item} className="text-[12px] leading-relaxed text-[#FF6D00]">
                    · {item}
                  </li>
                ))}
              </ul>
              <p className="text-[11.5px] leading-relaxed text-slate-500">{String(card.note ?? '')}</p>
            </div>
          )}

          {card.test_verdict && (
            <div className="mt-3 border-t border-white/10 pt-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-slate-500">
                two independent readings
              </p>
              <p className="mt-1.5 text-[11.5px] leading-relaxed text-slate-400">
                This service read your output as{' '}
                <span style={{ color: (card.test_verdict as Doc).green ? '#00C853' : '#EA4335' }}>
                  {(card.test_verdict as Doc).green ? 'green' : 'not green'}
                </span>{' '}
                ({String((card.test_verdict as Doc).runner ?? 'runner unrecognised')} —{' '}
                {String((card.test_verdict as Doc).evidence ?? '')}). The verifier last saw{' '}
                <span
                  style={{
                    color:
                      card.verifier_agreed === true
                        ? '#00C853'
                        : card.verifier_agreed === false
                          ? '#EA4335'
                          : '#8AA4C8',
                  }}
                >
                  {card.verifier_agreed === true
                    ? 'green'
                    : card.verifier_agreed === false
                      ? 'failing'
                      : 'nothing filed'}
                </span>
                .
              </p>
              <p className="mt-1.5 text-[11px] leading-relaxed text-slate-600">
                {String(card.why_two_readings ?? '')}
              </p>
            </div>
          )}
        </div>
      )}

      {due.length > 0 && (
        <div className="mt-4">
          <p className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.15em] text-slate-500">
            due for review
          </p>
          <div className="space-y-1">
            {due.map((item) => (
              <div
                key={String(item.card_id ?? item.id)}
                className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-[12px] text-slate-300"
              >
                {String(item.front ?? item.concept ?? '')}
              </div>
            ))}
          </div>
        </div>
      )}

      {!card && ready && (
        <div className="mt-4">
          <Note>
            Nothing asked for yet. Note what happens if you ask early: the answer is not hidden in the
            response behind a flag, it is absent from it.
          </Note>
        </div>
      )}

      <RawDoc label="mentor.card/v1 — exactly what arrived" doc={card} />
      <RawDoc label="mentor.profile/v1" doc={profile} />
    </Panel>
  );
}
