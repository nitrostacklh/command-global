"use client";

/**
 * The state of one student's pass through the loop.
 *
 * Layer 1 → 2 → 3 → 4 each hand the next stage a versioned JSON artifact
 * (`MENTOR-CONCEPT.md` §4), so this store is mostly a place to hold those
 * documents between calls: the brief, the plan, the spec, the events, the
 * verdict, the card. It deliberately does **not** re-model them. They are
 * defined by `shared/contracts.ts` on the server side, and a second set of
 * interfaces here would disagree with the real ones within a week — so panels
 * read the fields they show and nothing validates a shape twice.
 *
 * The one thing this file adds is the activity log. Every tool call the page
 * makes lands in it, tagged with the service that answered, which is what lets
 * the transcript show that the buttons and the agent are doing the same thing
 * through the same 23 tools.
 */

import { create } from 'zustand';
import { client, type ServiceKey } from '@/l/mcp/servers';

/** A JSON document from a service. Its shape is the service's contract, not ours. */
export type Doc = Record<string, any>;

export interface CallRecord {
  readonly id: number;
  readonly service: ServiceKey;
  readonly tool: string;
  readonly args: Record<string, unknown>;
  readonly startedAt: number;
  /** By whom — a stage button, or the agent driving the same tool. */
  readonly by: 'panel' | 'agent';
  status: 'running' | 'ok' | 'error';
  result?: unknown;
  error?: string;
  ms?: number;
}

/** Where the design under review came from. Shown, never inferred. */
export type PlanSource = 'none' | 'bundled' | 'yours';

interface MentorState {
  // ── identity ───────────────────────────────────────────────────────────
  handle: string;
  identity: Doc | null;
  /** True when MCP-3 confirmed a record is being kept. */
  recordKept: boolean;

  // ── layer 1 ────────────────────────────────────────────────────────────
  roles: Doc[];
  role: string | null;
  projects: Doc[];
  project: string | null;
  brief: Doc | null;
  lessonPart1: Doc | null;
  lessonChoice: string | null;
  lessonPart2: Doc | null;

  // ── layer 3, the Lumina handoff ────────────────────────────────────────
  planSource: PlanSource;
  plan: Doc | null;
  planName: string;
  scope: Doc | null;

  // ── layer 4 ────────────────────────────────────────────────────────────
  spec: Doc | null;
  session: Doc | null;
  events: Doc[];
  gates: Doc[];
  stuck: Doc | null;
  outOfOrder: string[];
  verdict: Doc | null;
  drift: Doc | null;
  refusal: Doc | null;

  // ── layer 5, the card ──────────────────────────────────────────────────
  card: Doc | null;
  due: Doc[];
  profile: Doc | null;

  log: CallRecord[];

  // ── actions ────────────────────────────────────────────────────────────
  setHandle: (handle: string) => void;
  set: (patch: Partial<MentorState>) => void;
  /** Call a tool, log it, and hand back the parsed document. */
  run: (
    service: ServiceKey,
    tool: string,
    args?: Record<string, unknown>,
    by?: 'panel' | 'agent',
  ) => Promise<Doc>;
  pushEvents: (events: Doc[]) => void;
  clearFrom: (stage: 'role' | 'project' | 'brief' | 'plan' | 'build') => void;
  reset: () => void;
}

const HANDLE_KEY = 'mentor-handle';

function initialHandle(): string {
  if (typeof window === 'undefined') return '';
  try {
    return window.localStorage.getItem(HANDLE_KEY) ?? '';
  } catch {
    return '';
  }
}

/** Everything downstream of a choice, so changing the choice cannot leave stale artifacts on screen. */
const CASCADE: Record<'role' | 'project' | 'brief' | 'plan' | 'build', Partial<MentorState>> = {
  role: {
    projects: [],
    project: null,
    brief: null,
    lessonPart1: null,
    lessonChoice: null,
    lessonPart2: null,
    planSource: 'none',
    plan: null,
    planName: '',
    scope: null,
    spec: null,
    session: null,
    events: [],
    gates: [],
    stuck: null,
    outOfOrder: [],
    verdict: null,
    drift: null,
    refusal: null,
    card: null,
  },
  project: {
    brief: null,
    lessonPart1: null,
    lessonChoice: null,
    lessonPart2: null,
    planSource: 'none',
    plan: null,
    planName: '',
    scope: null,
    spec: null,
    session: null,
    events: [],
    gates: [],
    stuck: null,
    outOfOrder: [],
    verdict: null,
    drift: null,
    refusal: null,
    card: null,
  },
  brief: {
    scope: null,
    spec: null,
    session: null,
    events: [],
    gates: [],
    stuck: null,
    outOfOrder: [],
    verdict: null,
    drift: null,
    refusal: null,
    card: null,
  },
  plan: {
    spec: null,
    session: null,
    events: [],
    gates: [],
    stuck: null,
    outOfOrder: [],
    verdict: null,
    drift: null,
    refusal: null,
    card: null,
  },
  build: {
    events: [],
    gates: [],
    stuck: null,
    outOfOrder: [],
    verdict: null,
    drift: null,
    refusal: null,
    card: null,
  },
};

let callId = 0;

export const useMentor = create<MentorState>((set, get) => ({
  handle: initialHandle(),
  identity: null,
  recordKept: false,

  roles: [],
  role: null,
  projects: [],
  project: null,
  brief: null,
  lessonPart1: null,
  lessonChoice: null,
  lessonPart2: null,

  planSource: 'none',
  plan: null,
  planName: '',
  scope: null,

  spec: null,
  session: null,
  events: [],
  gates: [],
  stuck: null,
  outOfOrder: [],
  verdict: null,
  drift: null,
  refusal: null,

  card: null,
  due: [],
  profile: null,

  log: [],

  setHandle: (handle) => {
    set({ handle });
    try {
      if (handle) window.localStorage.setItem(HANDLE_KEY, handle);
      else window.localStorage.removeItem(HANDLE_KEY);
    } catch {
      // Not durable here. sign_in reports whether MCP-3 is keeping the record,
      // which is the claim that actually matters.
    }
  },

  set: (patch) => set(patch),

  run: async (service, tool, args = {}, by = 'panel') => {
    const record: CallRecord = {
      id: ++callId,
      service,
      tool,
      args,
      startedAt: Date.now(),
      by,
      status: 'running',
    };
    set({ log: [record, ...get().log].slice(0, 200) });

    const finish = (patch: Partial<CallRecord>) =>
      set({
        log: get().log.map((entry) =>
          entry.id === record.id ? { ...entry, ...patch, ms: Date.now() - entry.startedAt } : entry,
        ),
      });

    try {
      const result = await client(service).call(tool, args);
      const doc = (result.data ?? {}) as Doc;
      finish({ status: result.isError ? 'error' : 'ok', result: doc });
      return doc;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      finish({ status: 'error', error: message });
      throw err;
    }
  },

  pushEvents: (events) => set({ events: [...get().events, ...events] }),

  clearFrom: (stage) => set(CASCADE[stage]),

  // Everything a fresh sitting starts from: the cascade below the role, plus the
  // role menu, the identity and the record read back for it.
  reset: () =>
    set({
      ...CASCADE.role,
      identity: null,
      recordKept: false,
      roles: [],
      role: null,
      card: null,
      due: [],
      profile: null,
      log: [],
    }),
}));
