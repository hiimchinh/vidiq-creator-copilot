import type { Step } from "@/store/copilot-store";
import { buildSources, type Source } from "../claims/provenance";

/** Steps whose results go to the answer model, in the order the model numbers them c1, c2, … */
export const answeredSteps = (steps: Step[]): Step[] => steps.filter((s) => s.status === "done" && s.resultText !== undefined);

export const answerSources = (steps: Step[]): Source[] =>
  buildSources(answeredSteps(steps).map(({ id, tool, args, view }) => ({ id, tool, args, view })));
