"use client";

/**
 * The small pieces every stage panel is built from.
 *
 * Colour carries one meaning on this page and only one: which service answered.
 * Blue is MCP-1, gold MCP-2, orange MCP-3, and a plain outline is Lumina, which
 * belongs to no MCP. That is the legend from the workflow architecture, and it is
 * load-bearing rather than decorative — a judge watching the loop run can see
 * which process is holding what, including that the service holding the answers
 * is only ever reached at the end.
 */

import React from 'react';
import { SERVICES, type ServiceKey } from '@/l/mcp/servers';

export const COLOUR: Record<ServiceKey, string> = {
  roster: '#1565C0',
  sentinel: '#D4AF37',
  profile: '#FF6D00',
};

export const LUMINA_COLOUR = '#E8F0FE';

export function badgeOf(service: ServiceKey): string {
  return SERVICES.find((s) => s.key === service)?.badge ?? service;
}

/** A stage box. `service` tints it; `lumina` renders the outline-only variant. */
export function Panel({
  step,
  title,
  service,
  subtitle,
  disabled,
  children,
}: {
  step: string;
  title: string;
  service?: ServiceKey;
  subtitle?: string;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  const colour = service ? COLOUR[service] : LUMINA_COLOUR;
  return (
    <section
      className={`rounded-2xl border p-5 transition-opacity ${disabled ? 'opacity-45' : ''}`}
      style={{
        borderColor: service ? `${colour}55` : '#ffffff22',
        background: service ? `${colour}0A` : 'rgba(255,255,255,0.02)',
        borderStyle: service ? 'solid' : 'dashed',
      }}
    >
      <header className="mb-4">
        <div
          className="font-mono text-[10px] uppercase tracking-[0.2em]"
          style={{ color: colour }}
        >
          {step}
          {service ? ` · ${badgeOf(service)}` : ' · Lumina — outside every MCP'}
        </div>
        <h2 className="mt-1.5 text-[15px] font-bold tracking-wide text-white">{title}</h2>
        {subtitle && <p className="mt-1 text-[12px] leading-relaxed text-slate-400">{subtitle}</p>}
      </header>
      {children}
    </section>
  );
}

export function Button({
  onClick,
  children,
  tone = 'neutral',
  busy,
  disabled,
  title,
}: {
  onClick: () => void;
  children: React.ReactNode;
  tone?: 'neutral' | ServiceKey;
  busy?: boolean;
  disabled?: boolean;
  title?: string;
}) {
  const colour = tone === 'neutral' ? '#5B8DEF' : COLOUR[tone];
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled || busy}
      className="rounded-lg border px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider transition-all disabled:cursor-not-allowed disabled:opacity-40"
      style={{ borderColor: `${colour}66`, background: `${colour}18`, color: colour }}
    >
      {busy ? 'working…' : children}
    </button>
  );
}

export function Field({
  label,
  value,
  onChange,
  placeholder,
  mono,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  mono?: boolean;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-slate-500">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={`mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-[12px] text-slate-200 outline-none focus:border-[#4285F4]/60 ${
          mono ? 'font-mono' : ''
        }`}
      />
    </label>
  );
}

/** A claim the page is making, with the service that made it. */
export function Note({ children, tone = 'info' }: { children: React.ReactNode; tone?: 'info' | 'warn' | 'good' }) {
  const colour = tone === 'warn' ? '#FF6D00' : tone === 'good' ? '#00C853' : '#8AA4C8';
  return (
    <p
      className="rounded-lg border px-3 py-2 text-[12px] leading-relaxed"
      style={{ borderColor: `${colour}44`, background: `${colour}12`, color: colour }}
    >
      {children}
    </p>
  );
}

export function ErrorNote({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <p className="rounded-lg border border-[#EA4335]/40 bg-[#EA4335]/10 px-3 py-2 font-mono text-[11px] leading-relaxed text-[#EA4335]">
      {error}
    </p>
  );
}

/** Chip list — components, criteria, gates. */
export function Chips({
  items,
  colour = '#8AA4C8',
}: {
  items: readonly (string | null | undefined)[];
  colour?: string;
}) {
  const clean = items.filter((i): i is string => !!i);
  if (clean.length === 0) return <span className="text-[12px] text-slate-600">none</span>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {clean.map((item) => (
        <span
          key={item}
          className="rounded-md border px-2 py-0.5 font-mono text-[10.5px]"
          style={{ borderColor: `${colour}44`, background: `${colour}12`, color: colour }}
        >
          {item}
        </span>
      ))}
    </div>
  );
}

/** The raw document, folded away. The artifacts *are* the contribution, so they stay reachable. */
export function RawDoc({ label, doc }: { label: string; doc: unknown }) {
  if (doc === null || doc === undefined) return null;
  return (
    <details className="mt-3 rounded-lg border border-white/10 bg-black/30">
      <summary className="cursor-pointer px-3 py-2 font-mono text-[10px] uppercase tracking-[0.15em] text-slate-500">
        {label}
      </summary>
      <pre className="max-h-72 overflow-auto px-3 pb-3 font-mono text-[10.5px] leading-relaxed text-slate-400">
        {JSON.stringify(doc, null, 2)}
      </pre>
    </details>
  );
}

export function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[110px_1fr] items-start gap-3 py-1.5">
      <span className="pt-0.5 font-mono text-[10px] uppercase tracking-[0.15em] text-slate-500">
        {label}
      </span>
      <div className="text-[12.5px] leading-relaxed text-slate-300">{children}</div>
    </div>
  );
}

/** pass / fail / not_reached, in the one place a colour means outcome not service. */
export function StatusDot({ status }: { status: string }) {
  const colour =
    status === 'pass' ? '#00C853' : status === 'fail' ? '#EA4335' : '#5C6B80';
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-[10.5px]" style={{ color: colour }}>
      <span className="h-2 w-2 rounded-full" style={{ background: colour }} />
      {status}
    </span>
  );
}

/** Confidence, with its reason. Stated per-claim is the honesty feature. */
export function Confidence({ value, reason }: { value: number; reason?: string }) {
  const pct = Math.round(value * 100);
  return (
    <div className="py-1">
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-mono text-[10.5px] text-slate-400">{reason ?? 'confidence'}</span>
        <span className="font-mono text-[11px] font-bold text-[#D4AF37]">{pct}%</span>
      </div>
      <div className="mt-1 h-1 overflow-hidden rounded bg-white/10">
        <div className="h-full rounded bg-[#D4AF37]" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
