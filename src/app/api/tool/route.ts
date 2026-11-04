import { NextResponse } from "next/server";
import { cacheKey } from "@/lib/cache/cache-key";
import { type ToolResponse, ToolRequestSchema, VIDIQ_KEY_HEADER, VIDIQ_MCP_URL } from "@/lib/copilot/api-types";
import { refuseLiveMode } from "@/lib/demo/live-mode";
import { isCopilotTool } from "@/lib/llm/copilot-tools";
import { createMcpClient } from "@/lib/mcp/mcp-client";
import { mcpError } from "@/lib/mcp/mcp-errors";
import { findReplayResult } from "@/lib/replay/replay-store";
import type { McpCallResult } from "@/lib/mcp/mcp-client";
import { toResultView } from "@/lib/schemas/result-view";

const respond = (tool: string, args: Record<string, unknown>, result: McpCallResult, status = 200) => {
  const body: ToolResponse = { result, view: toResultView(tool, result, args) };
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
};

export async function POST(request: Request) {
  const parsed = ToolRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid request" }, { status: 400 });
  const { mode, tool, args } = parsed.data;
  const refused = refuseLiveMode(mode);
  if (refused) return refused;

  // Read-only allowlist, enforced on the server whatever the client or the model asks for.
  if (!isCopilotTool(tool)) return respond(tool, args, { ok: false, error: mcpError("not_allowed", tool) }, 403);

  if (mode === "replay") {
    const result = findReplayResult(cacheKey(tool, args));
    return respond(tool, args, result ?? { ok: false, error: mcpError("not_allowed", "not recorded in Replay mode") });
  }

  const apiKey = request.headers.get(VIDIQ_KEY_HEADER)?.trim();
  if (!apiKey) return respond(tool, args, { ok: false, error: mcpError("auth", "no key") }, 401);
  const client = createMcpClient({ endpoint: VIDIQ_MCP_URL, apiKey });
  return respond(tool, args, await client.callTool(tool, args));
}
