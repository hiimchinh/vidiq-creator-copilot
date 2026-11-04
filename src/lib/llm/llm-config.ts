import { SpendGuard } from "./spend-guard";

/** Cheap, fast model with reliable tool calling. Override with OPENROUTER_MODEL. */
export const DEFAULT_MODEL = "google/gemini-3.1-flash-lite";

export interface LlmConfig {
  apiKey: string | undefined;
  model: string;
  maxTokens: number;
  capUsd: number;
}

export function llmConfig(env: Record<string, string | undefined> = process.env): LlmConfig {
  const cap = Number(env.LLM_SPEND_CAP_USD ?? "0.5");
  return {
    apiKey: env.OPENROUTER_API_KEY || undefined,
    model: env.OPENROUTER_MODEL || DEFAULT_MODEL,
    maxTokens: 700,
    capUsd: Number.isFinite(cap) && cap >= 0 ? cap : 0.5,
  };
}

const holder = globalThis as unknown as { __llmSpendGuard?: SpendGuard };

/** One guard per server process, shared by every route and script. */
export function spendGuard(): SpendGuard {
  holder.__llmSpendGuard ??= new SpendGuard({ capUsd: llmConfig().capUsd });
  return holder.__llmSpendGuard;
}
