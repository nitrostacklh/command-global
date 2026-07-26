"use client";

/**
 * The NitroStack agent, driving the same tools the buttons drive.
 *
 * This panel is the demonstration that MENTOR is an MCP product rather than a web
 * app with an MCP-shaped API: a model is handed the whole tool surface and
 * sequences the loop itself. Every call it makes goes through the same store as
 * the stage buttons, so the activity log shows one stream of tool calls with no
 * seam between what a student clicked and what the model chose.
 *
 * Two honest limits, stated on the panel rather than in a footnote:
 *
 * - **The key is the student's and lives in this browser.** There is no server in
 *   this product to hold one. Everything else on the page works without it.
 * - **The model can be told not to hand over the answer, and separately it
 *   cannot get it.** The system prompt forbids writing the fix; MCP-3 withholding
 *   the concept answer is what actually enforces it. Only the second survives
 *   somebody pointing a different client at these services.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Send, Bot, Eraser } from 'lucide-react';
import {
  DEFAULT_CONFIG,
  SUGGESTED_MODELS,
  createSession,
  isUsable,
  loadConfig,
  saveConfig,
  type AgentConfig,
  type AgentSession,
} from '@/l/agent';
import { indexTools, type ServiceKey, type ToolIndex } from '@/l/mcp/servers';
import { useMentor } from '@/l/mentor/store';
import { Button, COLOUR, ErrorNote, Field, Note, badgeOf } from './ui';

interface Turn {
  id: number;
  role: 'you' | 'mentor' | 'tool' | 'notice';
  text: string;
  service?: ServiceKey;
  isError?: boolean;
}

const SUGGESTIONS = [
  'I want to learn backend work — what can I build?',
  "My pricing test is failing. When did I go wrong?",
  'Just fix it for me.',
];

export default function AgentPanel() {
  const run = useMentor((s) => s.run);
  const [config, setConfig] = useState<AgentConfig>(DEFAULT_CONFIG);
  const [index, setIndex] = useState<ToolIndex | null>(null);
  const [failures, setFailures] = useState<Record<string, string>>({});
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const sessionRef = useRef<AgentSession | null>(null);
  const turnId = useRef(0);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setConfig(loadConfig());
    void indexTools().then(({ index: idx, failures: fails }) => {
      setIndex(idx);
      setFailures(fails);
    });
  }, []);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [turns]);

  const push = (turn: Omit<Turn, 'id'>) =>
    setTurns((prev) => [...prev, { ...turn, id: ++turnId.current }]);

  /** Append to the last assistant turn, so streamed or repeated text reads as one message. */
  const appendToMentor = (text: string) =>
    setTurns((prev) => {
      const last = prev[prev.length - 1];
      if (last?.role === 'mentor') {
        return [...prev.slice(0, -1), { ...last, text: last.text + text }];
      }
      return [...prev, { id: ++turnId.current, role: 'mentor', text }];
    });

  const tools = useMemo(
    () =>
      (index?.all ?? []).map((tool) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
      })),
    [index],
  );

  async function send() {
    const text = input.trim();
    if (!text || !index) return;
    setInput('');
    setError(null);
    push({ role: 'you', text });
    setBusy(true);

    try {
      if (!sessionRef.current) {
        sessionRef.current = createSession(config, tools, async (name, args) => {
          const service = index.serviceOf(name);
          if (!service) {
            return { text: `There is no tool called ${name} on any of the three services.`, isError: true };
          }
          // Through the store, so the model's calls and the buttons' calls land
          // in one log — that shared path is the point.
          const doc = await run(service, name, args, 'agent');
          return { text: JSON.stringify(doc), isError: false };
        }, {
          onText: appendToMentor,
          onToolCall: (name) =>
            push({ role: 'tool', text: name, service: index.serviceOf(name) ?? undefined }),
          onToolResult: (name, isError) => {
            if (isError) push({ role: 'notice', text: `${name} came back as an error`, isError: true });
          },
          onNotice: (notice) => push({ role: 'notice', text: notice }),
        });
      }
      await sessionRef.current.send(text);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  function apply(next: AgentConfig) {
    setConfig(next);
    saveConfig(next);
    // A new provider or key means a new conversation — the old transcript belongs
    // to a model that is no longer answering.
    sessionRef.current = null;
  }

  const usable = isUsable(config) && !!index && tools.length > 0;

  return (
    <section className="flex h-full flex-col rounded-2xl border border-white/15 bg-black/40">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-2">
          <Bot size={14} className="text-[#4285F4]" />
          <h2 className="text-[13px] font-bold tracking-wide text-white">Ask MENTOR</h2>
          {index && (
            <span className="font-mono text-[10px] text-slate-500">
              {index.count} tools · {3 - Object.keys(failures).length}/3 services
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setTurns([]);
              sessionRef.current?.clear();
            }}
            title="Clear the transcript"
            className="rounded-lg border border-white/10 p-1.5 text-slate-500 hover:text-slate-200"
          >
            <Eraser size={12} />
          </button>
          <button
            type="button"
            onClick={() => setShowConfig((s) => !s)}
            className="font-mono text-[10px] uppercase tracking-wider text-slate-500 underline hover:text-slate-300"
          >
            {config.provider === 'anthropic' ? config.model : `${config.model} @ local`}
          </button>
        </div>
      </header>

      {showConfig && (
        <div className="space-y-3 border-b border-white/10 bg-black/30 px-4 py-3">
          <div className="flex gap-2">
            {(['anthropic', 'openai'] as const).map((provider) => (
              <button
                key={provider}
                type="button"
                onClick={() =>
                  apply({
                    ...config,
                    provider,
                    model: SUGGESTED_MODELS[provider][0],
                  })
                }
                className={`rounded-lg border px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-wider ${
                  config.provider === provider
                    ? 'border-[#4285F4] bg-[#4285F4]/15 text-[#4285F4]'
                    : 'border-white/10 text-slate-500'
                }`}
              >
                {provider === 'anthropic' ? 'Anthropic' : 'OpenAI-compatible'}
              </button>
            ))}
          </div>

          <Field
            label="Model"
            value={config.model}
            onChange={(model) => apply({ ...config, model })}
            mono
          />
          <div className="flex flex-wrap gap-1.5">
            {SUGGESTED_MODELS[config.provider].map((model) => (
              <button
                key={model}
                type="button"
                onClick={() => apply({ ...config, model })}
                className="rounded-md border border-white/10 px-2 py-0.5 font-mono text-[10px] text-slate-400 hover:text-slate-200"
              >
                {model}
              </button>
            ))}
          </div>

          {config.provider === 'openai' && (
            <Field
              label="Base URL"
              value={config.baseUrl}
              onChange={(baseUrl) => apply({ ...config, baseUrl })}
              mono
            />
          )}

          <Field
            label={config.provider === 'anthropic' ? 'API key' : 'API key (blank for a local Ollama)'}
            value={config.apiKey}
            onChange={(apiKey) => apply({ ...config, apiKey })}
            type="password"
            mono
          />

          <Note tone="warn">
            The key stays in this browser&apos;s localStorage and is sent only to the provider you
            picked. Anything else running on this origin can read it, so use a key you are willing to
            rotate — and note the rest of this page needs no key at all.
          </Note>
        </div>
      )}

      <div ref={scroller} className="flex-1 space-y-2 overflow-y-auto px-4 py-3">
        {turns.length === 0 && (
          <div className="space-y-3">
            <p className="text-[12px] leading-relaxed text-slate-400">
              A model with all {index?.count ?? 23} tools, sequencing the loop itself. It will not write
              your code and it does not have the concept answers — try asking it to.
            </p>
            <div className="space-y-1.5">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => setInput(suggestion)}
                  className="block w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-left text-[12px] text-slate-300 hover:border-white/30"
                >
                  {suggestion}
                </button>
              ))}
            </div>
            {Object.keys(failures).length > 0 && (
              <ErrorNote
                error={`Unreachable: ${Object.entries(failures)
                  .map(([key, message]) => `${badgeOf(key as ServiceKey)} (${message})`)
                  .join('; ')}`}
              />
            )}
          </div>
        )}

        {turns.map((turn) => {
          if (turn.role === 'tool') {
            const colour = turn.service ? COLOUR[turn.service] : '#8AA4C8';
            return (
              <div key={turn.id} className="flex items-center gap-2">
                <span
                  className="rounded-md border px-2 py-0.5 font-mono text-[10px]"
                  style={{ borderColor: `${colour}55`, background: `${colour}15`, color: colour }}
                >
                  ⚙ {turn.text}
                </span>
                {turn.service && (
                  <span className="font-mono text-[9.5px] uppercase tracking-wider text-slate-600">
                    {badgeOf(turn.service)}
                  </span>
                )}
              </div>
            );
          }
          if (turn.role === 'notice') {
            return (
              <p
                key={turn.id}
                className="font-mono text-[10.5px] leading-relaxed"
                style={{ color: turn.isError ? '#EA4335' : '#D4AF37' }}
              >
                {turn.text}
              </p>
            );
          }
          return (
            <div
              key={turn.id}
              className={`max-w-[92%] rounded-xl px-3 py-2 text-[12.5px] leading-relaxed whitespace-pre-wrap ${
                turn.role === 'you'
                  ? 'ml-auto border border-[#4285F4]/30 bg-[#4285F4]/10 text-slate-100'
                  : 'border border-white/10 bg-black/30 text-slate-200'
              }`}
            >
              {turn.text}
            </div>
          );
        })}

        {busy && <p className="font-mono text-[10.5px] text-slate-500">thinking…</p>}
      </div>

      <div className="border-t border-white/10 px-4 py-3">
        <ErrorNote error={error} />
        <div className="mt-2 flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
            rows={2}
            placeholder={usable ? 'Ask for a role, a brief, or where you went wrong…' : 'Set a model and key first →'}
            className="flex-1 resize-none rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-[12.5px] text-slate-200 outline-none focus:border-[#4285F4]/60"
          />
          <Button onClick={() => void send()} busy={busy} disabled={!usable || !input.trim()}>
            <span className="flex items-center gap-1.5">
              <Send size={11} /> send
            </span>
          </Button>
        </div>
        {!isUsable(config) && (
          <p className="mt-2 font-mono text-[10px] text-slate-600">
            {config.provider === 'anthropic'
              ? 'Paste a key above, or switch to an OpenAI-compatible endpoint and point it at a local model.'
              : 'Set a base URL and a model above.'}
          </p>
        )}
      </div>
    </section>
  );
}
