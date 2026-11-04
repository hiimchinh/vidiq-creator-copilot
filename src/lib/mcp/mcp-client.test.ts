import { describe, expect, it } from "vitest";
import { createMcpClient } from "./mcp-client";

const KEY = "test-key-should-never-leak";
type Handler = (method: string, body: Record<string, unknown>, headers: Headers) => Response | Promise<Response>;

function fakeServer(onCall: Handler) {
  const log: { method: string; headers: Headers }[] = [];
  const fetch = async (_url: string | URL | Request, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
    const headers = new Headers(init?.headers);
    const method = String(body.method);
    log.push({ method, headers });
    if (method === "initialize") {
      return Response.json(
        { jsonrpc: "2.0", id: body.id, result: { protocolVersion: "2025-06-18", capabilities: {} } },
        { headers: { "Mcp-Session-Id": "sess-1" } },
      );
    }
    if (method === "notifications/initialized") return new Response(null, { status: 202 });
    return onCall(method, body, headers);
  };
  return { fetch: fetch as typeof globalThis.fetch, log };
}

const sse = (payload: unknown) =>
  new Response(`event: message\ndata: ${JSON.stringify(payload)}\n\n`, {
    headers: { "Content-Type": "text/event-stream" },
  });

const toolOk = (id: unknown, text: string) => ({
  jsonrpc: "2.0",
  id,
  result: { content: [{ type: "text", text }], structuredContent: { score: 71 } },
});

describe("createMcpClient", () => {
  it("initializes, sends the session id, then calls the tool", async () => {
    const server = fakeServer((_m, body) => Response.json(toolOk(body.id, "hello")));
    const client = createMcpClient({ endpoint: "https://mcp.test/mcp", apiKey: KEY, fetch: server.fetch });
    const r = await client.callTool("vidiq_score_title", { title: "x", type: "long" });

    expect(r).toEqual({ ok: true, text: "hello", structured: { score: 71 } });
    expect(server.log.map((l) => l.method)).toEqual(["initialize", "notifications/initialized", "tools/call"]);
    expect(server.log[0]?.headers.get("Authorization")).toBe(`Bearer ${KEY}`);
    expect(server.log[2]?.headers.get("Mcp-Session-Id")).toBe("sess-1");
    expect(server.log[2]?.headers.get("MCP-Protocol-Version")).toBe("2025-06-18");
  });

  it("reads JSON-RPC responses delivered as SSE data lines", async () => {
    const server = fakeServer((_m, body) => sse(toolOk(body.id, "from sse")));
    const client = createMcpClient({ endpoint: "https://mcp.test/mcp", apiKey: KEY, fetch: server.fetch });
    const r = await client.callTool("vidiq_outliers", { keyword: "budget travel" });
    expect(r.ok && r.text).toBe("from sse");
  });

  it("initializes only once per client", async () => {
    const server = fakeServer((_m, body) => Response.json(toolOk(body.id, "x")));
    const client = createMcpClient({ endpoint: "https://mcp.test/mcp", apiKey: KEY, fetch: server.fetch });
    await client.callTool("vidiq_balance", {});
    await client.callTool("vidiq_balance", {});
    expect(server.log.filter((l) => l.method === "initialize")).toHaveLength(1);
  });

  it.each([
    [401, "auth"],
    [403, "auth"],
    [402, "credits"],
    [429, "rate_limit"],
    [500, "upstream"],
  ] as const)("maps HTTP %i to %s", async (status, kind) => {
    const server = fakeServer(() => new Response(`denied ${KEY}`, { status }));
    const client = createMcpClient({ endpoint: "https://mcp.test/mcp", apiKey: KEY, fetch: server.fetch });
    const r = await client.callTool("vidiq_keyword_research", { keyword: "x" });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.kind).toBe(kind);
      expect(r.error.message).not.toContain(KEY);
    }
  });

  it("maps a tool-level insufficient credits error to credits", async () => {
    const server = fakeServer((_m, body) =>
      Response.json({
        jsonrpc: "2.0",
        id: body.id,
        result: { isError: true, content: [{ type: "text", text: "Insufficient credits: need 5, have 2" }] },
      }),
    );
    const client = createMcpClient({ endpoint: "https://mcp.test/mcp", apiKey: KEY, fetch: server.fetch });
    const r = await client.callTool("vidiq_outliers", { keyword: "x" });
    expect(!r.ok && r.error.kind).toBe("credits");
  });

  it("times out instead of hanging", async () => {
    const server = fakeServer(() => new Promise<Response>(() => {}));
    const client = createMcpClient({ endpoint: "https://mcp.test/mcp", apiKey: KEY, fetch: server.fetch, timeoutMs: 30 });
    const r = await client.callTool("vidiq_outliers", { keyword: "x" });
    expect(!r.ok && r.error.kind).toBe("timeout");
  });

  it("never retries a paid call, even on 429", async () => {
    const server = fakeServer(() => new Response("slow down", { status: 429 }));
    const client = createMcpClient({ endpoint: "https://mcp.test/mcp", apiKey: KEY, fetch: server.fetch });
    const r = await client.callTool("vidiq_keyword_research", { keyword: "x" });
    expect(server.log.filter((l) => l.method === "tools/call")).toHaveLength(1);
    expect(!r.ok && r.error.retryable).toBe(false);
  });

  it("retries a free call once on 429", async () => {
    let calls = 0;
    const server = fakeServer((_m, body) =>
      ++calls === 1 ? new Response("slow down", { status: 429 }) : Response.json(toolOk(body.id, "ok")),
    );
    const client = createMcpClient({ endpoint: "https://mcp.test/mcp", apiKey: KEY, fetch: server.fetch });
    const r = await client.callTool("vidiq_balance", {});
    expect(r.ok).toBe(true);
    expect(server.log.filter((l) => l.method === "tools/call")).toHaveLength(2);
  });
});
