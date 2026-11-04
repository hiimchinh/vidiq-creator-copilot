import { readLines } from "../stream/read-lines";
import { VIDIQ_KEY_HEADER } from "./api-constants";
import type { AnswerEvent, BalanceResponse, Mode, PlanResponse, ToolResponse } from "./api-types";

async function postJson<T>(url: string, body: unknown, key?: string): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (key) headers[VIDIQ_KEY_HEADER] = key;
  const response = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
  const json = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok && !(json as { result?: unknown }).result) throw new Error(json.error ?? `HTTP ${response.status}`);
  return json;
}

export const postPlan = (mode: Mode, prompt: string) => postJson<PlanResponse>("/api/plan", { mode, prompt });

export const postTool = (mode: Mode, tool: string, args: Record<string, unknown>, key?: string) =>
  postJson<ToolResponse>("/api/tool", { mode, tool, args }, mode === "live" ? key : undefined);

export const fetchBalance = (key: string) => postJson<BalanceResponse>("/api/balance", {}, key);

export interface AnswerRequest {
  mode: Mode;
  prompt: string;
  scenarioId?: string;
  evidence: { tool: string; args: Record<string, unknown>; text: string }[];
  skipped: number;
}

/** Streams the answer route's NDJSON events. */
export async function* streamAnswer(request: AnswerRequest, signal?: AbortSignal): AsyncGenerator<AnswerEvent> {
  const response = await fetch("/api/answer", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
    signal,
  });
  if (!response.ok || !response.body) throw new Error(`HTTP ${response.status}`);
  for await (const line of readLines(response.body)) {
    if (!line.trim()) continue;
    try {
      yield JSON.parse(line) as AnswerEvent;
    } catch {
      // A malformed line must not kill the stream.
    }
  }
}
