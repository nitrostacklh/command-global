"use client";

/**
 * The Anthropic branch of the agent, on the official SDK.
 *
 * A manual tool loop rather than the SDK's tool runner, for one reason: every
 * call has to be reported into the page's own activity log with the service that
 * answered it, so the transcript can show that the model and the stage buttons
 * are driving the same 23 tools. The runner owns the loop and would hide the
 * seam this page exists to show.
 *
 * The key is the student's own and lives in localStorage, which is why
 * `dangerouslyAllowBrowser` is set: there is no server in this product to hold
 * one. That is a real trade — a key pasted here is readable by anything else
 * running on this origin — and the settings panel says so rather than burying
 * it. Everything else on the page works with no key at all.
 */

import Anthropic from '@anthropic-ai/sdk';
import {
  MAX_TURNS,
  systemPrompt,
  type AgentConfig,
  type AgentHandlers,
  type AgentSession,
  type AgentTool,
  type ToolExecutor,
} from './types';

type Message = Anthropic.Beta.Messages.BetaMessageParam;

export function anthropicSession(
  config: AgentConfig,
  tools: AgentTool[],
  exec: ToolExecutor,
  handlers: AgentHandlers,
): AgentSession {
  const client = new Anthropic({
    apiKey: config.apiKey,
    dangerouslyAllowBrowser: true,
  });

  const declared: Anthropic.Beta.Messages.BetaTool[] = tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    input_schema: tool.inputSchema as Anthropic.Beta.Messages.BetaTool.InputSchema,
  }));

  let messages: Message[] = [];

  async function send(userText: string): Promise<void> {
    messages.push({ role: 'user', content: userText });

    for (let turn = 0; turn < MAX_TURNS; turn++) {
      const response = await client.beta.messages.create({
        model: config.model,
        // Thinking is on by default on Opus 5 and shares this ceiling with the
        // reply, so a tight number would truncate mid-answer.
        max_tokens: 16000,
        system: systemPrompt(tools.length),
        tools: declared,
        messages,
        // Recommended for Opus 5: a safety decline is re-run server-side on the
        // recommended fallback instead of coming back as a dead turn.
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
      });

      // Checked before reading content: on a refusal `content` is empty or
      // partial, and indexing it would throw in the student's face.
      if (response.stop_reason === 'refusal') {
        handlers.onNotice(
          'The model declined this request' +
            (response.stop_details && 'category' in response.stop_details
              ? ` (${String(response.stop_details.category)})`
              : '') +
            '. Nothing was sent to the MENTOR services. Try rephrasing.',
        );
        return;
      }

      for (const block of response.content) {
        if (block.type === 'text' && block.text) handlers.onText(block.text);
      }

      messages.push({ role: 'assistant', content: response.content });

      if (response.stop_reason !== 'tool_use') {
        if (response.stop_reason === 'max_tokens') {
          handlers.onNotice('That answer hit the token ceiling and was cut off.');
        }
        return;
      }

      const calls = response.content.filter(
        (block): block is Anthropic.Beta.Messages.BetaToolUseBlock => block.type === 'tool_use',
      );

      // All results go back in one user message. Splitting them teaches the
      // model to stop calling tools in parallel.
      const results: Anthropic.Beta.Messages.BetaToolResultBlockParam[] = [];
      for (const call of calls) {
        const args = (call.input ?? {}) as Record<string, unknown>;
        handlers.onToolCall(call.name, args);
        try {
          const result = await exec(call.name, args);
          handlers.onToolResult(call.name, result.isError);
          results.push({
            type: 'tool_result',
            tool_use_id: call.id,
            content: result.text,
            is_error: result.isError,
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          handlers.onToolResult(call.name, true);
          // Returned as a tool_result rather than thrown: the model can route
          // around an unreachable service, and a student mid-loop should not
          // lose the turn because one bridge is down.
          results.push({
            type: 'tool_result',
            tool_use_id: call.id,
            content: `That tool could not be reached: ${message}`,
            is_error: true,
          });
        }
      }

      messages.push({ role: 'user', content: results });
    }

    handlers.onNotice(
      `Stopped after ${MAX_TURNS} model turns without finishing. Ask for the next step directly.`,
    );
  }

  return {
    send,
    clear: () => {
      messages = [];
    },
  };
}
