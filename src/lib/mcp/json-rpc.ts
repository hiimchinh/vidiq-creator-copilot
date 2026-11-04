export interface JsonRpcMessage {
  jsonrpc: "2.0";
  id?: number | string | null;
  result?: Record<string, unknown>;
  error?: { code: number; message: string };
}

function parseSse(body: string): JsonRpcMessage[] {
  const messages: JsonRpcMessage[] = [];
  for (const block of body.split(/\r?\n\r?\n/)) {
    const data = block
      .split(/\r?\n/)
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trimStart())
      .join("\n");
    if (!data) continue;
    try {
      messages.push(JSON.parse(data) as JsonRpcMessage);
    } catch {
      // Ignore keep-alive or partial frames.
    }
  }
  return messages;
}

/** Finds the JSON-RPC response for `id` in a JSON or SSE (`data:` lines) body. */
export async function readJsonRpc(response: Response, id: number): Promise<JsonRpcMessage | undefined> {
  const body = await response.text();
  const type = response.headers.get("content-type") ?? "";
  const messages = type.includes("text/event-stream") ? parseSse(body) : parseJson(body);
  return messages.find((message) => message.id === id);
}

function parseJson(body: string): JsonRpcMessage[] {
  try {
    const value = JSON.parse(body) as JsonRpcMessage | JsonRpcMessage[];
    return Array.isArray(value) ? value : [value];
  } catch {
    return [];
  }
}
