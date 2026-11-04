import type { Cost } from "./cost-of";

export type RunDecision = "cached" | "auto" | "confirm";

export interface RunInput {
  cost: Cost;
  cached: boolean;
  autoRun: boolean;
  /** Per-session credit cap for auto-run. */
  capCredits: number;
  spentCredits: number;
}

/** Decides whether a planned tool call runs from cache, runs now, or waits for the user. */
export function decideRun({ cost, cached, autoRun, capCredits, spentCredits }: RunInput): RunDecision {
  if (cached) return "cached";
  if (cost.kind === "unknown") return "confirm";
  if (cost.credits === 0) return "auto";
  if (autoRun && spentCredits + cost.credits <= capCredits) return "auto";
  return "confirm";
}
