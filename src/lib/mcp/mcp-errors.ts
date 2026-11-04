export type McpErrorKind = "auth" | "credits" | "rate_limit" | "timeout" | "upstream" | "protocol" | "not_allowed";

export interface McpError {
  kind: McpErrorKind;
  message: string;
  /** Whether the client may retry on its own. Always false for paid calls. */
  retryable: boolean;
}

const MESSAGES: Record<McpErrorKind, string> = {
  auth: "vidIQ rejected the API key. Check the key in Live settings.",
  credits: "Not enough vidIQ credits for this call.",
  rate_limit: "vidIQ is rate limiting requests. Wait a moment before trying again.",
  timeout: "vidIQ did not answer in time. Nothing was retried automatically.",
  upstream: "vidIQ returned an error.",
  protocol: "Unexpected response from the vidIQ MCP server.",
  not_allowed: "This tool is not enabled in the copilot.",
};

export function mcpError(kind: McpErrorKind, detail?: string, retryable = false): McpError {
  const base = MESSAGES[kind];
  return { kind, message: detail ? `${base} (${detail})` : base, retryable };
}

export function errorFromStatus(status: number): McpError {
  if (status === 401 || status === 403) return mcpError("auth", `HTTP ${status}`);
  if (status === 402) return mcpError("credits", "HTTP 402");
  if (status === 429) return mcpError("rate_limit", "HTTP 429", true);
  return mcpError("upstream", `HTTP ${status}`);
}

/** Maps a tool-level error text (result.isError) to a kind without echoing server text verbatim. */
export function errorFromToolText(text: string): McpError {
  const lower = text.toLowerCase();
  if (/insufficient|not enough|out of credits|credit balance/.test(lower)) return mcpError("credits");
  if (/unauthori[sz]ed|invalid api key|forbidden/.test(lower)) return mcpError("auth");
  if (/rate limit|too many requests/.test(lower)) return mcpError("rate_limit", undefined, true);
  return mcpError("upstream", text.slice(0, 160));
}
