import type { Step, Turn } from "@/store/copilot-store";
import { costOf } from "../credits/cost-of";
import { findReplayScenario } from "./replay-store";
import { scenarioSteps } from "./scenario-steps";

/** The scenario a visitor sees on landing: the question where AI Coach's exact-text check raised a false alarm. */
export const FEATURED_SCENARIO_ID = "title-espresso";

/**
 * Builds a finished turn from a recorded scenario on the server, so the landing page shows a complete
 * answer without any request. "Worked for" uses the recorded answer timing; nothing is invented.
 */
export function featuredTurn(id: string = FEATURED_SCENARIO_ID): Turn | undefined {
  const scenario = findReplayScenario(id);
  if (!scenario) return undefined;
  const steps: Step[] = scenarioSteps(scenario).map(({ id: stepId, tool, args, parse, result, view }) => {
    const cost = costOf(tool, args);
    const reported = "creditsUsed" in view && typeof view.creditsUsed === "number" ? view.creditsUsed : undefined;
    const charged = reported ?? (cost.kind === "fixed" ? cost.credits : 0);
    return { id: stepId, tool, args, parse, cost, status: "done", cached: false, charged, view, resultText: result.text };
  });
  return {
    id: `featured-${scenario.id}`,
    prompt: scenario.prompt,
    mode: "replay",
    scenarioId: scenario.id,
    status: "done",
    note: scenario.plan.note,
    rejected: [],
    steps,
    answer: scenario.answer.chunks.map((c) => c.text).join(""),
    ttftMs: null,
    workedMs: scenario.answer.chunks.at(-1)?.t ?? null,
    featured: true,
  };
}
