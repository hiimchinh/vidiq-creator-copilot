import { REPLAY_SCENARIOS } from "../../fixtures/replay";
import type { McpCallResult } from "../mcp/mcp-client";
import type { ReplayScenario } from "./replay-types";

const STOP_WORDS = new Set(["a", "an", "the", "for", "in", "of", "to", "on", "and", "me", "my", "i", "do", "what", "from", "about", "so", "can", "is", "it"]);

const tokens = (text: string) =>
  new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9@\s]/g, " ")
      .split(/\s+/)
      .filter((t) => t && !STOP_WORDS.has(t)),
  );

/** Share of the question's meaningful words that the recorded prompt also contains. */
function overlap(question: Set<string>, recorded: Set<string>): number {
  if (question.size === 0) return 0;
  let shared = 0;
  for (const t of question) if (recorded.has(t)) shared++;
  return shared / question.size;
}

const MIN_OVERLAP = 0.6;

/** Finds the recorded scenario for a question. Replay never guesses: weak matches return undefined. */
export function matchScenario(prompt: string): ReplayScenario | undefined {
  const exact = REPLAY_SCENARIOS.find((s) => s.prompt.trim().toLowerCase() === prompt.trim().toLowerCase());
  if (exact) return exact;
  const question = tokens(prompt);
  let best: { scenario: ReplayScenario; score: number } | undefined;
  for (const scenario of REPLAY_SCENARIOS) {
    const score = overlap(question, tokens(scenario.prompt));
    if (!best || score > best.score) best = { scenario, score };
  }
  return best && best.score >= MIN_OVERLAP ? best.scenario : undefined;
}

export function findReplayScenario(id: string): ReplayScenario | undefined {
  return REPLAY_SCENARIOS.find((s) => s.id === id);
}

export function findReplayResult(key: string): McpCallResult | undefined {
  for (const scenario of REPLAY_SCENARIOS) {
    const result = scenario.results[key];
    if (result) return result;
  }
  return undefined;
}

export interface ScenarioSummary {
  id: string;
  label: string;
  prompt: string;
}

export function scenarioSummaries(): ScenarioSummary[] {
  return REPLAY_SCENARIOS.map(({ id, label, prompt }) => ({ id, label, prompt }));
}
