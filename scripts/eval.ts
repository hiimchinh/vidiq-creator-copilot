/**
 * Copilot eval. Reports schema-valid rate, tool-choice accuracy, time to first token and credits.
 *
 *   pnpm eval            # offline: recorded plans and timings only, no network, $0
 *   pnpm eval --live     # real planner + streamed answers via OpenRouter (cents), still 0 vidIQ credits
 *
 * vidIQ tools are never executed here. Each planned call is either served from the recorded
 * responses (0 credits) or counted as "would cost" with costOf().
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { cacheKey } from "../src/lib/cache/cache-key";
import { costOf } from "../src/lib/credits/cost-of";
import { answerMessages } from "../src/lib/llm/answer";
import { llmConfig, spendGuard } from "../src/lib/llm/llm-config";
import { complete, streamText } from "../src/lib/llm/openrouter";
import { type Plan, planToolCalls } from "../src/lib/llm/planner";
import { findReplayResult, matchScenario } from "../src/lib/replay/replay-store";
import { parseStructured } from "../src/lib/structured/parse-structured";

const root = join(import.meta.dirname, "..");
const live = process.argv.includes("--live");
const prompts = JSON.parse(readFileSync(join(root, "eval/prompts.json"), "utf8")) as { prompt: string; expect: string[] }[];
const malformed = JSON.parse(readFileSync(join(root, "eval/malformed-outputs.json"), "utf8")) as { label: string; text: string; repairTo?: string }[];
const llm = { config: llmConfig(), guard: spendGuard() };

const pct = (n: number, d: number) => (d === 0 ? "n/a" : `${((100 * n) / d).toFixed(0)}%`);
const median = (xs: number[]) => (xs.length ? [...xs].sort((a, b) => a - b)[Math.floor((xs.length - 1) / 2)] ?? 0 : null);
const p90 = (xs: number[]) => (xs.length ? [...xs].sort((a, b) => a - b)[Math.ceil(0.9 * xs.length) - 1] ?? 0 : null);

let evaluated = 0, correct = 0, callsOk = 0, callsRepaired = 0, callsInvalid = 0, blockedByAllowlist = 0;
let wouldCost = 0, servedFromRecording = 0;
const ttfts: number[] = [];
const rows: Record<string, unknown>[] = [];

for (const item of prompts) {
  let plan: Omit<Plan, "costUsd"> | undefined;
  let ttftMs: number | null = null;
  if (live) {
    plan = await planToolCalls(item.prompt, { complete: (req) => complete(llm, req) });
  } else {
    const scenario = matchScenario(item.prompt);
    plan = scenario?.plan;
    ttftMs = scenario?.answer.ttftMs ?? null;
  }
  if (!plan) {
    rows.push({ prompt: item.prompt, skipped: "not recorded (run with --live)" });
    continue;
  }
  evaluated++;
  const tools = [...new Set(plan.calls.map((c) => c.tool))].sort();
  const ok = JSON.stringify(tools) === JSON.stringify([...item.expect].sort());
  if (ok) correct++;
  for (const call of plan.calls) call.parse === "ok" ? callsOk++ : callsRepaired++;
  for (const r of plan.rejected) r.issues.some((i) => i.includes("allowlist")) ? blockedByAllowlist++ : callsInvalid++;

  const evidence = [];
  for (const call of plan.calls) {
    const recorded = findReplayResult(cacheKey(call.tool, call.args));
    const cost = costOf(call.tool, call.args);
    if (recorded?.ok) {
      servedFromRecording++;
      evidence.push({ tool: call.tool, args: call.args, text: recorded.text });
    } else wouldCost += cost.kind === "fixed" ? cost.credits : 0;
  }

  if (live && evidence.length > 0) {
    const started = performance.now();
    for await (const event of streamText(llm, answerMessages(item.prompt, evidence))) {
      if (event.type === "delta" && ttftMs === null) ttftMs = Math.round(performance.now() - started);
    }
  }
  if (ttftMs !== null) ttfts.push(ttftMs);
  rows.push({ prompt: item.prompt, expect: item.expect, got: tools, correct: ok, rejected: plan.rejected.map((r) => r.tool), ttftMs });
}

// Unpredictable-output suite: the same parser the planner uses, fed known-bad model output.
const Args = z.object({ title: z.string().min(1), type: z.enum(["long", "short"]) });
const outcomes = { ok: 0, repaired: 0, fallback: 0, crashed: 0 };
for (const m of malformed) {
  try {
    const repair = m.repairTo === undefined ? undefined : async () => m.repairTo ?? "";
    outcomes[(await parseStructured(m.text, Args, { repair })).status]++;
  } catch {
    outcomes.crashed++;
  }
}

const totalCalls = callsOk + callsRepaired + callsInvalid;
const summary = {
  mode: live ? "live" : "replay",
  model: live ? llm.config.model : "recorded",
  ranAt: new Date().toISOString(),
  prompts: prompts.length,
  evaluated,
  toolChoiceAccuracy: pct(correct, evaluated),
  schemaValidFirstPass: pct(callsOk, totalCalls),
  schemaValidAfterRepair: pct(callsOk + callsRepaired, totalCalls),
  blockedByAllowlist,
  ttftMsMedian: median(ttfts),
  ttftMsP90: p90(ttfts),
  vidiqCreditsSpent: 0,
  callsServedFromRecording: servedFromRecording,
  creditsPlannedCallsWouldCostLive: wouldCost,
  llmUsd: Number(llm.guard.spentUsd().toFixed(5)),
  malformedSuite: { cases: malformed.length, ...outcomes },
};
writeFileSync(join(root, `eval/results/latest-${summary.mode}.json`), `${JSON.stringify({ summary, rows }, null, 2)}\n`);
console.table(rows.map((r) => ({ ...r, prompt: String(r.prompt).slice(0, 48) })));
console.log(JSON.stringify(summary, null, 2));
