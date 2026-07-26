"use client";

/**
 * The OpenAI-compatible branch: any endpoint that speaks `/chat/completions`.
 *
 * This exists so the agent demo does not require a paid key. A local Ollama at
 * http://127.0.0.1:11434/v1 works, as does a campus gateway or an OpenAI-shaped
 * proxy — the same 23 MCP tools, a different driver.
 *
 * Raw `fetch` rather than an SDK is deliberate here: this branch is defined by a
 * wire format that several vendors implement, not by one vendor's client, and
 * adding a second SDK to reach a localhost server would be a dependency for
 * nothing. The Anthropic branch lives in its own file on the official SDK; the
 * two never mix.
 *
 * Caveat worth knowing before the demo: small local models are much worse at
 * multi-tool sequencing than a frontier model, and they are also the models most
 * likely to volunteer the fix MENTOR refuses to give. The system prompt forbids
 * it, but only MCP-3 withholding the concept answer actually enforces it.
 */

import {
  MAX_TURNS,
  systemPrompt,
  type AgentConfig,
  type AgentHandlers,
  type AgentSession,
  type AgentTool,
  type ToolExecutor,
} from './types';

interface ToolCall {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  name?: string;
}

export function openAiSession(
  config: AgentConfig,
  tools: AgentTool[],
  exec: ToolExecutor,
  handlers: AgentHandlers,
): AgentSession {
  const base = config.baseUrl.replace(/\/+$/, '');
  const declared = tools.map((tool) => ({
    type: 'function' as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.inputSchema,
    },
  }));

  let messages: ChatMessage[] = [{ role: 'system', content: systemPrompt(tools.length) }];

  async function complete(): Promise<ChatMessage> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    // Ollama needs no key; a gateway usually does. Send one only if given.
    if (config.apiKey) headers.Authorization = `Bearer ${config.apiKey}`;

    let response: Response;
    try {
      response = await fetch(`${base}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: config.model,
          messages,
          tools: declared,
          tool_choice: 'auto',
        }),
      });
    } catch {
      throw new Error(
        `could not reach ${base}. For a local Ollama, check \`ollama serve\` is running and that ` +
          `the model is pulled; a browser also needs the server to allow this origin (for Ollama, ` +
          `OLLAMA_ORIGINS).`,
      );
    }

    if (!response.ok) {
      throw new Error(`${base} answered ${response.status}: ${(await response.text()).slice(0, 300)}`);
    }

    const payload = (await response.json()) as {
      choices?: { message?: ChatMessage; finish_reason?: string }[];
      error?: { message?: string };
    };
    if (payload.error) throw new Error(payload.error.message ?? 'the endpoint returned an error');

    const message = payload.choices?.[0]?.message;
    if (!message) throw new Error('the endpoint returned no message');
    return message;
  }

  async function send(userText: string): Promise<void> {
    messages.push({ role: 'user', content: userText });

    for (let turn = 0; turn < MAX_TURNS; turn++) {
      const message = await complete();
      if (message.content) handlers.onText(message.content);

      messages.push({
        role: 'assistant',
        content: message.content ?? null,
        ...(message.tool_calls?.length ? { tool_calls: message.tool_calls } : {}),
      });

      const calls = message.tool_calls ?? [];
      if (calls.length === 0) return;

      for (const call of calls) {
        let args: Record<string, unknown> = {};
        try {
          args = call.function.arguments ? JSON.parse(call.function.arguments) : {};
        } catch {
          // A local model that emitted malformed arguments gets told so rather
          // than having them guessed at on its behalf.
          messages.push({
            role: 'tool',
            tool_call_id: call.id,
            name: call.function.name,
            content: `Those arguments were not valid JSON: ${call.function.arguments}`,
          });
          handlers.onToolResult(call.function.name, true);
          continue;
        }

        handlers.onToolCall(call.function.name, args);
        try {
          const result = await exec(call.function.name, args);
          handlers.onToolResult(call.function.name, result.isError);
          messages.push({
            role: 'tool',
            tool_call_id: call.id,
            name: call.function.name,
            content: result.text,
          });
        } catch (err) {
          const detail = err instanceof Error ? err.message : String(err);
          handlers.onToolResult(call.function.name, true);
          messages.push({
            role: 'tool',
            tool_call_id: call.id,
            name: call.function.name,
            content: `That tool could not be reached: ${detail}`,
          });
        }
      }
    }

    handlers.onNotice(
      `Stopped after ${MAX_TURNS} model turns without finishing. Ask for the next step directly.`,
    );
  }

  return {
    send,
    clear: () => {
      messages = [{ role: 'system', content: systemPrompt(tools.length) }];
    },
  };
}
