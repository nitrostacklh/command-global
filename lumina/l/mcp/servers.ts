/**
 * The three MENTOR services, and where to find them.
 *
 * The split is the security boundary, not a deployment detail: MCP-3 is the only
 * process that ever holds a flashcard answer, so this file keeps three clients
 * rather than one merged tool bag. Everything user-facing is colour-coded by
 * which service answered, using the palette from the workflow architecture, so a
 * judge can see the boundary being respected while the loop runs.
 *
 * Defaults are the live NitroCloud deployments (DEPLOY.md 5b) — a student who
 * opens this page needs no build, no key and no account. Overrides live in
 * localStorage for anyone pointing at services they are running locally in
 * http mode (`MCP_TRANSPORT_TYPE=http`); stdio cannot be reached from a browser
 * at all, which is why the settings panel takes URLs only.
 */

import { McpClient, type McpTool } from './client';

export type ServiceKey = 'roster' | 'sentinel' | 'profile';

export interface ServiceMeta {
  readonly key: ServiceKey;
  /** How the architecture page names it — students see this, not the package. */
  readonly badge: string;
  readonly title: string;
  readonly owns: string;
  readonly colour: string;
  readonly defaultUrl: string;
}

export const SERVICES: readonly ServiceMeta[] = [
  {
    key: 'roster',
    badge: 'MCP-1',
    title: 'Roster',
    owns: 'role, projects, the brief, the lesson, and the checkpoint spec',
    colour: '#1565C0',
    defaultUrl:
      'https://roster-6a654317-the-localhosts-amrita-university-coimbatore.app.nitrocloud.ai/mcp',
  },
  {
    key: 'sentinel',
    badge: 'MCP-2',
    title: 'Sentinel',
    owns: 'checkpoint verification, drift, and the build verdict',
    colour: '#D4AF37',
    defaultUrl:
      'https://mentor-6a64f852-the-localhosts-amrita-university-coimbatore.app.nitrocloud.ai/mcp',
  },
  {
    key: 'profile',
    badge: 'MCP-3',
    title: 'Profile',
    owns: 'the whole student record, and the only copy of a concept answer',
    colour: '#FF6D00',
    defaultUrl:
      'https://profile-6a65408b-the-localhosts-amrita-university-coimbatore.app.nitrocloud.ai/mcp',
  },
] as const;

const STORAGE_KEY = 'mentor-service-urls';

export function loadUrlOverrides(): Partial<Record<ServiceKey, string>> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Partial<Record<ServiceKey, string>>) : {};
  } catch {
    return {};
  }
}

export function saveUrlOverrides(overrides: Partial<Record<ServiceKey, string>>): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
  } catch {
    // Private browsing or a full quota. The URLs still apply for this sitting.
  }
}

const clients = new Map<ServiceKey, McpClient>();

export function serviceMeta(key: ServiceKey): ServiceMeta {
  const meta = SERVICES.find((s) => s.key === key);
  if (!meta) throw new Error(`unknown service ${key}`);
  return meta;
}

/** The client for one service, created on first use and reused after. */
export function client(key: ServiceKey): McpClient {
  const existing = clients.get(key);
  if (existing) return existing;
  const meta = serviceMeta(key);
  const url = loadUrlOverrides()[key] ?? meta.defaultUrl;
  const created = new McpClient(`${meta.badge} ${meta.title}`, url);
  clients.set(key, created);
  return created;
}

export function applyUrlOverrides(overrides: Partial<Record<ServiceKey, string>>): void {
  saveUrlOverrides(overrides);
  for (const meta of SERVICES) {
    const url = overrides[meta.key]?.trim() || meta.defaultUrl;
    client(meta.key).setUrl(url);
  }
}

/**
 * Which service owns a tool.
 *
 * Built from `tools/list` at runtime rather than hard-coded, so it cannot drift
 * from what is actually deployed — the whole point of the split is that the tool
 * surface of each service is legible, and a stale table here would quietly lie
 * about which process is holding a student's answer.
 */
export class ToolIndex {
  private owner = new Map<string, ServiceKey>();

  constructor(private readonly tools: Map<ServiceKey, McpTool[]>) {
    for (const [key, list] of tools) {
      for (const tool of list) if (!this.owner.has(tool.name)) this.owner.set(tool.name, key);
    }
  }

  serviceOf(toolName: string): ServiceKey | null {
    return this.owner.get(toolName) ?? null;
  }

  get all(): (McpTool & { service: ServiceKey })[] {
    return [...this.tools.entries()].flatMap(([service, list]) =>
      list.map((tool) => ({ service, ...tool })),
    );
  }

  get count(): number {
    return this.owner.size;
  }
}

/** Load every service's tool list, tolerating one being unreachable. */
export async function indexTools(): Promise<{ index: ToolIndex; failures: Record<string, string> }> {
  const tools = new Map<ServiceKey, McpTool[]>();
  const failures: Record<string, string> = {};

  await Promise.all(
    SERVICES.map(async (meta) => {
      try {
        tools.set(meta.key, await client(meta.key).listTools());
      } catch (err) {
        tools.set(meta.key, []);
        failures[meta.key] = err instanceof Error ? err.message : String(err);
      }
    }),
  );

  return { index: new ToolIndex(tools), failures };
}
