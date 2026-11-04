import { costOf } from "../credits/cost-of";
import { readJsonRpc } from "./json-rpc";
import { type McpError, errorFromStatus, errorFromToolText, mcpError } from "./mcp-errors";

export const PROTOCOL_VERSION = "2025-06-18";

export type McpCallResult = { ok: true; text: string; structured?: unknown } | { ok: false; error: McpError };

export interface McpClientOptions {
  endpoint: string;
  apiKey: string;
  fetch?: typeof fetch;
  timeoutMs?: number;
}

type Step = { ok: true; response: Response } | { ok: false; error: McpError };

export function createMcpClient({ endpoint, apiKey, fetch: doFetch = fetch, timeoutMs = 45_000 }: McpClientOptions) {
  let nextId = 1;
  let sessionId: string | undefined;
  let ready: Promise<McpError | undefined> | undefined;

  async function post(body: Record<string, unknown>): Promise<Step> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      "MCP-Protocol-Version": PROTOCOL_VERSION,
    };
    if (sessionId) headers["Mcp-Session-Id"] = sessionId;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<Step>((resolve) => {
      timer = setTimeout(() => {
        controller.abort();
        resolve({ ok: false, error: mcpError("timeout", `${timeoutMs} ms`, true) });
      }, timeoutMs);
    });
    const request = doFetch(endpoint, { method: "POST", headers, body: JSON.stringify(body), signal: controller.signal })
      .then((response): Step => (response.ok ? { ok: true, response } : { ok: false, error: errorFromStatus(response.status) }))
      .catch((): Step => ({ ok: false, error: mcpError(controller.signal.aborted ? "timeout" : "upstream", "network") }));
    try {
      return await Promise.race([request, timeout]);
    } finally {
      clearTimeout(timer);
    }
  }

  async function initialize(): Promise<McpError | undefined> {
    const id = nextId++;
    const init = await post({
      jsonrpc: "2.0",
      id,
      method: "initialize",
      params: { protocolVersion: PROTOCOL_VERSION, capabilities: {}, clientInfo: { name: "creator-copilot", version: "0.1.0" } },
    });
    if (!init.ok) return init.error;
    sessionId = init.response.headers.get("Mcp-Session-Id") ?? undefined;
    const message = await readJsonRpc(init.response, id);
    if (!message?.result) return mcpError("protocol", "initialize failed");
    const ack = await post({ jsonrpc: "2.0", method: "notifications/initialized" });
    return ack.ok ? undefined : ack.error;
  }

  async function callOnce(name: string, args: Record<string, unknown>): Promise<McpCallResult> {
    ready ??= initialize().then((error) => {
      if (error) ready = undefined; // allow a fresh handshake next time
      return error;
    });
    const initError = await ready;
    if (initError) return { ok: false, error: initError };

    const id = nextId++;
    const step = await post({ jsonrpc: "2.0", id, method: "tools/call", params: { name, arguments: args } });
    if (!step.ok) return step;
    const message = await readJsonRpc(step.response, id);
    if (!message) return { ok: false, error: mcpError("protocol", "no response") };
    if (message.error) return { ok: false, error: errorFromToolText(message.error.message) };

    const result = message.result ?? {};
    const content = Array.isArray(result.content) ? (result.content as { type?: string; text?: string }[]) : [];
    const text = content
      .filter((part) => part.type === "text" && typeof part.text === "string")
      .map((part) => part.text)
      .join("\n");
    if (result.isError === true) return { ok: false, error: errorFromToolText(text) };
    return result.structuredContent === undefined ? { ok: true, text } : { ok: true, text, structured: result.structuredContent };
  }

  return {
    /**
     * Calls a tool once. Paid tools are never retried: vidIQ charges every call, retries included.
     * Free tools get one retry on rate limits and timeouts.
     */
    async callTool(name: string, args: Record<string, unknown>): Promise<McpCallResult> {
      const cost = costOf(name, args);
      const paid = cost.kind === "unknown" || cost.credits > 0;
      const first = await callOnce(name, args);
      if (first.ok) return first;
      if (paid) return { ok: false, error: { ...first.error, retryable: false } };
      if (!first.error.retryable) return first;
      return callOnce(name, args);
    },
  };
}

export type McpClient = ReturnType<typeof createMcpClient>;
