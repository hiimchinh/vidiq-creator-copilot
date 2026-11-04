import { readSseData } from "../stream/read-lines";
import type { OpenAiTool } from "./copilot-tools";
import type { LlmConfig } from "./llm-config";
import type { SpendGuard } from "./spend-guard";

const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

export interface ToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

export type ChatMessage =
  | { role: "system" | "user"; content: string }
  | { role: "assistant"; content: string | null; tool_calls?: ToolCall[] };

export interface Completion {
  message: { role: "assistant"; content: string | null; tool_calls?: ToolCall[] };
  costUsd: number;
}

export interface CompletionRequest {
  messages: ChatMessage[];
  tools?: OpenAiTool[];
}

export class LlmError extends Error {
  constructor(
    readonly kind: "no_key" | "budget" | "upstream",
    message: string,
  ) {
    super(message);
  }
}

export interface LlmDeps {
  config: LlmConfig;
  guard: SpendGuard;
  fetch?: typeof fetch;
}

function requestInit({ config }: LlmDeps, body: Record<string, unknown>): RequestInit {
  return {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
      "X-Title": "Creator Copilot demo",
    },
    body: JSON.stringify({ model: config.model, max_tokens: config.maxTokens, usage: { include: true }, provider: { sort: "latency" }, ...body }),
  };
}

function preflight({ config, guard }: LlmDeps): void {
  if (!config.apiKey) throw new LlmError("no_key", "OPENROUTER_API_KEY is not set on the server.");
  if (!guard.canSpend()) throw new LlmError("budget", "The daily LLM budget for this demo is used up.");
}

export async function complete(deps: LlmDeps, request: CompletionRequest): Promise<Completion> {
  preflight(deps);
  const response = await (deps.fetch ?? fetch)(ENDPOINT, requestInit(deps, { ...request, temperature: 0 }));
  if (!response.ok) throw new LlmError("upstream", `OpenRouter HTTP ${response.status}`);
  const json = (await response.json()) as { choices?: { message: Completion["message"] }[]; usage?: { cost?: number } };
  const costUsd = json.usage?.cost ?? 0;
  deps.guard.record(costUsd);
  const message = json.choices?.[0]?.message;
  if (!message) throw new LlmError("upstream", "OpenRouter returned no choices");
  return { message, costUsd };
}

export type StreamEvent = { type: "delta"; text: string } | { type: "done"; costUsd: number };

/** Streams answer text. Spend is recorded from the final usage chunk. */
export async function* streamText(deps: LlmDeps, messages: ChatMessage[], signal?: AbortSignal): AsyncGenerator<StreamEvent> {
  preflight(deps);
  const response = await (deps.fetch ?? fetch)(ENDPOINT, { ...requestInit(deps, { messages, stream: true, temperature: 0.3 }), signal });
  if (!response.ok || !response.body) throw new LlmError("upstream", `OpenRouter HTTP ${response.status}`);
  let costUsd = 0;
  for await (const data of readSseData(response.body)) {
    let chunk: { choices?: { delta?: { content?: string } }[]; usage?: { cost?: number } };
    try {
      chunk = JSON.parse(data);
    } catch {
      continue;
    }
    const text = chunk.choices?.[0]?.delta?.content;
    if (text) yield { type: "delta", text };
    if (chunk.usage?.cost !== undefined) costUsd = chunk.usage.cost;
  }
  deps.guard.record(costUsd);
  yield { type: "done", costUsd };
}
