"use client";

/**
 * Picks a driver and remembers how the student configured it.
 *
 * The key is kept in localStorage and nowhere else — never in the repo, never in
 * a build, never sent anywhere except the provider the student chose. It is
 * theirs, and the page is honest that a key on this origin is readable by
 * anything else running here.
 */

import { anthropicSession } from './anthropic';
import { openAiSession } from './openai';
import {
  DEFAULT_CONFIG,
  type AgentConfig,
  type AgentHandlers,
  type AgentSession,
  type AgentTool,
  type ToolExecutor,
} from './types';

const CONFIG_KEY = 'mentor-agent-config';

export function loadConfig(): AgentConfig {
  if (typeof window === 'undefined') return DEFAULT_CONFIG;
  try {
    const raw = window.localStorage.getItem(CONFIG_KEY);
    if (!raw) return DEFAULT_CONFIG;
    return { ...DEFAULT_CONFIG, ...(JSON.parse(raw) as Partial<AgentConfig>) };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function saveConfig(config: AgentConfig): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  } catch {
    // Private browsing. The configuration still applies for this sitting.
  }
}

/** True when this configuration can actually talk to a model. */
export function isUsable(config: AgentConfig): boolean {
  if (config.provider === 'anthropic') return config.apiKey.trim().length > 0;
  return config.baseUrl.trim().length > 0 && config.model.trim().length > 0;
}

export function createSession(
  config: AgentConfig,
  tools: AgentTool[],
  exec: ToolExecutor,
  handlers: AgentHandlers,
): AgentSession {
  return config.provider === 'anthropic'
    ? anthropicSession(config, tools, exec, handlers)
    : openAiSession(config, tools, exec, handlers);
}

export * from './types';
