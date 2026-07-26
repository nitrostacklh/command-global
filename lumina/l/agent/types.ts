"use client";

/**
 * The contract between the chat panel and whichever model is driving the tools.
 *
 * Two providers ship: Anthropic through the official SDK, and any
 * OpenAI-compatible endpoint (which is what makes a local Ollama or an on-campus
 * gateway work). The panel knows neither — it hands a session a string and gets
 * callbacks. That split exists because the deterministic buttons are the primary
 * path and the agent is the demonstration that a *model* can drive the same 23
 * tools; a page that only worked with a key would have inverted that.
 */

export type ProviderKind = 'anthropic' | 'openai';

export interface AgentConfig {
  readonly provider: ProviderKind;
  readonly model: string;
  readonly apiKey: string;
  /** OpenAI-compatible only, e.g. http://127.0.0.1:11434/v1 for a local Ollama. */
  readonly baseUrl: string;
}

export const DEFAULT_CONFIG: AgentConfig = {
  provider: 'anthropic',
  model: 'claude-opus-5',
  apiKey: '',
  baseUrl: 'http://127.0.0.1:11434/v1',
};

/** Models worth offering by name. Any other id can be typed in. */
export const SUGGESTED_MODELS: Record<ProviderKind, readonly string[]> = {
  anthropic: ['claude-opus-5', 'claude-sonnet-5', 'claude-haiku-4-5'],
  openai: ['qwen2.5-coder:14b', 'llama3', 'gpt-4o-mini'],
};

export interface AgentTool {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: Record<string, unknown>;
}

/** Runs one tool call and returns what the service said, verbatim. */
export type ToolExecutor = (
  name: string,
  args: Record<string, unknown>,
) => Promise<{ text: string; isError: boolean }>;

export interface AgentHandlers {
  /** Assistant prose, appended as it arrives. */
  onText: (text: string) => void;
  onToolCall: (name: string, args: Record<string, unknown>) => void;
  onToolResult: (name: string, isError: boolean) => void;
  /** Something the student needs to know about the turn itself. */
  onNotice: (notice: string) => void;
}

export interface AgentSession {
  send: (userText: string) => Promise<void>;
  /** Drop the transcript but keep the configuration. */
  clear: () => void;
}

/** The maximum number of model turns in one send, so a loop cannot run away. */
export const MAX_TURNS = 12;

/**
 * What the model is for, and what it must not do.
 *
 * This is the product's pitch expressed as an instruction: the tool surface
 * cannot write to a student's build (there is no such tool), but a model can
 * still *type the answer into the chat*, which would defeat the whole thing. So
 * the refusals are stated here as well as enforced server-side — belt and
 * braces, because only one of the two survives a student pointing a different
 * client at these services.
 */
export function systemPrompt(toolCount: number): string {
  return [
    'You are MENTOR, helping a student build a real project and learn from where it breaks.',
    `You have ${toolCount} tools across three services: MCP-1 (roster) hands out roles, projects,`,
    'briefs, lessons and the checkpoint spec; MCP-2 (sentinel) watches the build and reports drift;',
    'MCP-3 (profile) keeps the student record and releases flashcards.',
    '',
    'Work the loop in order and let the tools tell you what is true:',
    'sign_in → list_roles → projects_for_role → open_brief → open_lesson → (the student draws their',
    'design in Lumina) → check_scope → checkpoint_spec → build_event as they work → build_verdict →',
    'explain_drift → flashcard.',
    '',
    'Four rules you do not break, because they are the product rather than a policy:',
    '1. NEVER write the fix, and never write the student\'s code. Name the decision that caused the',
    '   failure — a file and a line — and then stop. If they ask you to fix it, say plainly that you',
    '   will not and why, and offer to explain the shape of the mistake instead.',
    '2. NEVER state the concept answer. You do not have it: only MCP-3 holds it, and only after the',
    '   student\'s own tests pass. Do not reconstruct it, hint it, or paraphrase it from the panels.',
    '3. On a lesson, do NOT describe or guess at the withheld panels. Ask which answer the student',
    '   would write, wait for it, and only then call open_lesson again with their choice.',
    '4. Do NOT warn a student off building out of the order they planned, and do not reorder their',
    '   gates. That divergence is the material the explanation is made of.',
    '',
    'Read owns, given and not_yours out loud when a brief opens — knowing what they are not building',
    'is half of knowing what they are. When a tool reports that a service is unreachable or that',
    'nothing is being kept between sessions, say so rather than implying their work is safe.',
    'Be brief: the tools carry the content, and your job is to sequence them and ask good questions.',
  ].join('\n');
}
