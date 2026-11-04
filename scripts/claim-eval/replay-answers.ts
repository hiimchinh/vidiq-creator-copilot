import { cacheKey } from "../../src/lib/cache/cache-key";
import { buildSources } from "../../src/lib/claims/provenance";
import { displayText, verifyAnswer } from "../../src/lib/claims/verify-answer";
import type { ReplayScenario } from "../../src/lib/replay/replay-types";
import { toResultView } from "../../src/lib/schemas/result-view";

export interface ReplayCheck {
  id: string;
  verified: number;
  flagged: { display: string; check: string; reason: string }[];
  text: string;
}

/** Runs the claim checker over a recorded Replay answer, with sources built the way the browser builds them. */
export function checkReplayAnswer(scenario: ReplayScenario): ReplayCheck {
  const seen = new Set<string>();
  const steps = scenario.plan.calls.flatMap((call) => {
    const key = cacheKey(call.tool, call.args);
    const result = scenario.results[key];
    if (seen.has(key) || !result?.ok) return [];
    seen.add(key);
    return [{ id: call.id, tool: call.tool, args: call.args, view: toResultView(call.tool, result, call.args) }];
  });
  const answer = scenario.answer.chunks.map((c) => c.text).join("");
  const { segments, summary } = verifyAnswer(answer, buildSources(steps));
  const flagged = segments.flatMap((s) => (s.kind !== "text" && s.check !== "verified" ? [{ display: s.display, check: s.check, reason: s.reason }] : []));
  return { id: scenario.id, verified: summary.verified, flagged, text: displayText(segments).text };
}
