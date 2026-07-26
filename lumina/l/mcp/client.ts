/**
 * A Model Context Protocol client that runs in the browser.
 *
 * MENTOR is three deployed MCP services and the loop only closes when something
 * drives all three. In the demo that something is a model in an MCP client; here
 * it is this page. So the dashboard is a real MCP client rather than a wrapper
 * around a REST facade someone would have had to write first — `tools/list` and
 * `tools/call` are the same calls NitroStudio's AI Chat makes, which is what
 * makes the agent panel and the buttons two ways of doing one thing.
 *
 * Two details of the streamable-HTTP transport decide the shape of this file:
 *
 * - **A POST answers with SSE, not JSON.** The deployed fleet replies
 *   `text/event-stream` even to a single request/response pair, so every read
 *   goes through `parseBody` below. Assuming JSON works against some servers and
 *   silently fails against these.
 * - **The session id arrives in a header.** `initialize` returns
 *   `Mcp-Session-Id`, and every later call has to echo it. Reading it from the
 *   browser needs `Access-Control-Expose-Headers` on the server side; the
 *   deployed services send it (`access-control-allow-origin: *`, and the id is
 *   exposed), which is the property that makes a page-only client possible at
 *   all. If a deployment ever stops exposing it, `handshake` still resolves and
 *   the server treats each call as a fresh session — degraded, not broken.
 */

export const PROTOCOL_VERSION = '2025-06-18';

/** A tool as the server describes it — passed to the model verbatim. */
export interface McpTool {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: Record<string, unknown>;
}

/** What a tool call produced, already unwrapped from MCP's content envelope. */
export interface McpToolResult {
  /** Parsed JSON when the tool returned JSON text, which all 23 of ours do. */
  readonly data: unknown;
  /** The raw text, kept so a caller can show exactly what the server said. */
  readonly text: string;
  readonly isError: boolean;
}

export class McpError extends Error {
  constructor(
    message: string,
    readonly detail?: unknown,
  ) {
    super(message);
    this.name = 'McpError';
  }
}

interface JsonRpcResponse {
  jsonrpc: '2.0';
  id?: number | string;
  result?: Record<string, unknown>;
  error?: { code: number; message: string; data?: unknown };
}

/**
 * Pull the JSON-RPC payload out of a response body.
 *
 * Handles both transports the spec allows: a bare JSON object, or an SSE stream
 * whose `data:` lines each carry one message. We take the last message that has
 * a `result` or an `error`, because a server is allowed to interleave
 * notifications (progress, logging) ahead of the answer.
 */
function parseBody(contentType: string, body: string): JsonRpcResponse {
  const trimmed = body.trim();
  if (!trimmed) throw new McpError('the server returned an empty body');

  if (!contentType.includes('text/event-stream')) {
    return JSON.parse(trimmed) as JsonRpcResponse;
  }

  let found: JsonRpcResponse | null = null;
  for (const line of trimmed.split(/\r?\n/)) {
    if (!line.startsWith('data:')) continue;
    const payload = line.slice(5).trim();
    if (!payload || payload === '[DONE]') continue;
    try {
      const message = JSON.parse(payload) as JsonRpcResponse;
      if (message.result !== undefined || message.error !== undefined) found = message;
    } catch {
      // A partial frame is not fatal — keep reading. The last complete message
      // wins, and if none parses we fall through to the error below.
    }
  }
  if (!found) throw new McpError('no JSON-RPC message in the event stream', trimmed.slice(0, 400));
  return found;
}

/**
 * One connection to one MENTOR service.
 *
 * Construct it with a URL and call `listTools` / `call`. The handshake is lazy
 * and shared: several panels mounting at once produce one `initialize`, because
 * the in-flight promise is cached rather than the result.
 */
export class McpClient {
  private sessionId: string | null = null;
  private handshake: Promise<void> | null = null;
  private nextId = 1;
  private tools: McpTool[] | null = null;

  constructor(
    readonly label: string,
    private url: string,
  ) {}

  get endpoint(): string {
    return this.url;
  }

  /** Point at a different deployment (or a local one) and drop the session. */
  setUrl(url: string): void {
    if (url === this.url) return;
    this.url = url;
    this.reset();
  }

  reset(): void {
    this.sessionId = null;
    this.handshake = null;
    this.tools = null;
  }

  private async post(payload: Record<string, unknown>): Promise<Response> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      // Both, in that order: the server picks, and ours picks SSE.
      Accept: 'application/json, text/event-stream',
      'MCP-Protocol-Version': PROTOCOL_VERSION,
    };
    if (this.sessionId) headers['Mcp-Session-Id'] = this.sessionId;

    return fetch(this.url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
  }

  private async rpc<T>(method: string, params: Record<string, unknown>): Promise<T> {
    await this.ensureSession();
    let response = await this.post({ jsonrpc: '2.0', id: this.nextId++, method, params });

    // 404 on a call means the server forgot our session — a restart, or a
    // deployment rolling. One silent re-handshake is the difference between a
    // student losing their place and never noticing.
    if (response.status === 404 && this.sessionId) {
      this.reset();
      await this.ensureSession();
      response = await this.post({ jsonrpc: '2.0', id: this.nextId++, method, params });
    }

    if (!response.ok) {
      throw new McpError(
        `${this.label} answered ${response.status} to ${method}`,
        (await response.text()).slice(0, 400),
      );
    }

    const message = parseBody(response.headers.get('content-type') ?? '', await response.text());
    if (message.error) {
      throw new McpError(`${this.label} refused ${method}: ${message.error.message}`, message.error.data);
    }
    return (message.result ?? {}) as T;
  }

  private ensureSession(): Promise<void> {
    if (this.handshake) return this.handshake;
    this.handshake = this.openSession().catch((err) => {
      // Don't cache a failed handshake, or a service that was briefly down
      // stays down for the life of the page.
      this.handshake = null;
      throw err;
    });
    return this.handshake;
  }

  private async openSession(): Promise<void> {
    const response = await this.post({
      jsonrpc: '2.0',
      id: this.nextId++,
      method: 'initialize',
      params: {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: {},
        clientInfo: { name: 'mentor-console', version: '1.0.0' },
      },
    });

    if (!response.ok) {
      throw new McpError(
        `could not reach ${this.label} (HTTP ${response.status})`,
        (await response.text()).slice(0, 400),
      );
    }

    this.sessionId = response.headers.get('mcp-session-id');
    const message = parseBody(response.headers.get('content-type') ?? '', await response.text());
    if (message.error) throw new McpError(`${this.label} refused initialize: ${message.error.message}`);

    // Required by the spec, and the server is entitled to reject calls made
    // before it. Fire-and-forget: it is a notification with no reply.
    await this.post({ jsonrpc: '2.0', method: 'notifications/initialized' }).catch(() => undefined);
  }

  async listTools(force = false): Promise<McpTool[]> {
    if (this.tools && !force) return this.tools;
    const result = await this.rpc<{ tools?: McpTool[] }>('tools/list', {});
    this.tools = (result.tools ?? []).map((t) => ({
      name: t.name,
      description: t.description ?? '',
      inputSchema: (t.inputSchema ?? { type: 'object', properties: {} }) as Record<string, unknown>,
    }));
    return this.tools;
  }

  /**
   * Call a tool and unwrap the result.
   *
   * MENTOR's tools return one JSON text block, so `data` is the document the
   * service meant to send. `isError` carries MCP's own flag — note that a tool
   * which *declines* (withhold_fix, or a lesson gate awaiting a choice) is a
   * success at this layer and says so in its payload. That distinction is the
   * product, so it is preserved rather than flattened into an error.
   */
  async call(name: string, args: Record<string, unknown> = {}): Promise<McpToolResult> {
    const result = await this.rpc<{
      content?: { type: string; text?: string }[];
      isError?: boolean;
      structuredContent?: unknown;
    }>('tools/call', { name, arguments: args });

    const text = (result.content ?? [])
      .filter((block) => block.type === 'text' && typeof block.text === 'string')
      .map((block) => block.text as string)
      .join('\n');

    let data: unknown = result.structuredContent ?? null;
    if (data === null && text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
    }

    return { data, text, isError: result.isError === true };
  }
}
