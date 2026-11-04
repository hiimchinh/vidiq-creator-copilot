import { cacheKey } from "../cache/cache-key";
import type { McpCallResult } from "../mcp/mcp-client";
import type { ResultView } from "../schemas/view-types";
import { toResultView } from "../schemas/result-view";
import type { ReplayScenario } from "./replay-types";

export interface RecordedStep {
  id: string;
  tool: string;
  args: Record<string, unknown>;
  parse: "ok" | "repaired";
  result: Extract<McpCallResult, { ok: true }>;
  view: ResultView;
}

/** The recorded calls that returned data, in plan order, each once, with the view the browser would build. */
export function scenarioSteps(scenario: ReplayScenario): RecordedStep[] {
  const seen = new Set<string>();
  return scenario.plan.calls.flatMap((call) => {
    const key = cacheKey(call.tool, call.args);
    const result = scenario.results[key];
    if (seen.has(key) || !result?.ok) return [];
    seen.add(key);
    return [{ id: call.id, tool: call.tool, args: call.args, parse: call.parse, result, view: toResultView(call.tool, result, call.args) }];
  });
}
