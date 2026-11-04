import type { McpCallResult } from "../mcp/mcp-client";
import type { Plan } from "../llm/planner";

export interface AnswerChunk {
  /** Milliseconds after the answer request started. */
  t: number;
  text: string;
}

/** One recorded creator question: the model's plan, the real vidIQ responses and the streamed answer. */
export interface ReplayScenario {
  id: string;
  label: string;
  prompt: string;
  model: string;
  recordedAt: string;
  plan: Omit<Plan, "costUsd">;
  /** Keyed by cacheKey(tool, args). */
  results: Record<string, McpCallResult>;
  answer: { ttftMs: number; chunks: AnswerChunk[] };
  costs: { credits: number; llmUsd: number };
}
