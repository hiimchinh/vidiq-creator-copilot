import { NextResponse } from "next/server";
import { type BalanceResponse, VIDIQ_KEY_HEADER, VIDIQ_MCP_URL } from "@/lib/copilot/api-types";
import { createMcpClient } from "@/lib/mcp/mcp-client";

/** Live balance through the free vidiq_balance tool. */
export async function POST(request: Request) {
  const apiKey = request.headers.get(VIDIQ_KEY_HEADER)?.trim();
  if (!apiKey) return NextResponse.json({ error: "no key" }, { status: 401 });
  const result = await createMcpClient({ endpoint: VIDIQ_MCP_URL, apiKey }).callTool("vidiq_balance", {});
  if (!result.ok) return NextResponse.json({ error: result.error.message, kind: result.error.kind }, { status: 502 });
  const data = (result.structured ?? {}) as { totalCredits?: number | null };
  const body: BalanceResponse = { totalCredits: data.totalCredits ?? null, simulated: false };
  return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
}
