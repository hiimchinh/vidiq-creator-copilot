/**
 * Records Replay fixtures by running the real pipeline once: model plan → vidIQ MCP → streamed answer.
 * Spends vidIQ credits, so it enforces a hard budget and refuses any tool outside the allowlist.
 *
 *   VIDIQ_API_KEY=… OPENROUTER_API_KEY=… pnpm record [--budget 50] [--only id]
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { cacheKey } from "../src/lib/cache/cache-key";
import { costOf } from "../src/lib/credits/cost-of";
import { answerMessages, type ToolEvidence } from "../src/lib/llm/answer";
import { isCopilotTool } from "../src/lib/llm/copilot-tools";
import { llmConfig, spendGuard } from "../src/lib/llm/llm-config";
import { complete, streamText } from "../src/lib/llm/openrouter";
import { planToolCalls } from "../src/lib/llm/planner";
import { type McpCallResult, createMcpClient } from "../src/lib/mcp/mcp-client";
import type { ReplayScenario } from "../src/lib/replay/replay-types";
import { sanitizeFixture } from "../src/lib/replay/sanitize";
import { SCENARIOS } from "./record-scenarios";

const OUT_DIR = join(import.meta.dirname, "../src/fixtures/replay");
const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : undefined;
};
const budget = Math.min(Number(arg("budget") ?? 50), 60);
const only = arg("only");

const vidiqKey = process.env.VIDIQ_API_KEY ?? "";
const config = llmConfig();
if (!vidiqKey || !config.apiKey) throw new Error("VIDIQ_API_KEY and OPENROUTER_API_KEY are required");
const secrets = [vidiqKey, config.apiKey];

const mcp = createMcpClient({ endpoint: "https://mcp.vidiq.com/mcp", apiKey: vidiqKey, timeoutMs: 90_000 });
const llm = { config, guard: spendGuard() };

async function balance(): Promise<number | null> {
  const r = await mcp.callTool("vidiq_balance", {});
  if (!r.ok) throw new Error(`balance failed: ${r.error.kind}`);
  const data = (r.structured ?? JSON.parse(r.text)) as { totalCredits?: number | null };
  return data.totalCredits ?? null;
}

const before = await balance();
console.log(`balance before: ${before}`);
let spent = 0;
mkdirSync(OUT_DIR, { recursive: true });

for (const scenario of SCENARIOS.filter((s) => !only || s.id === only)) {
  const plan = await planToolCalls(scenario.prompt, { complete: (req) => complete(llm, req) });
  const results: Record<string, McpCallResult> = {};
  const evidence: ToolEvidence[] = [];
  let credits = 0;
  for (const call of plan.calls) {
    const key = cacheKey(call.tool, call.args);
    if (results[key]) continue;
    const cost = costOf(call.tool, call.args);
    if (!isCopilotTool(call.tool) || cost.kind === "unknown") throw new Error(`refusing ${call.tool}`);
    if (spent + cost.credits > budget) throw new Error(`budget ${budget} would be exceeded by ${call.tool}`);
    const result = await mcp.callTool(call.tool, call.args);
    spent += cost.credits; // charged even when it fails; never retried
    credits += cost.credits;
    results[key] = result;
    if (result.ok) evidence.push({ tool: call.tool, args: call.args, text: result.text, structured: result.structured });
    console.log(`  ${scenario.id}: ${call.tool} ${JSON.stringify(call.args)} → ${result.ok ? "ok" : result.error.kind}`);
  }

  const started = performance.now();
  const chunks: ReplayScenario["answer"]["chunks"] = [];
  let llmUsd = plan.costUsd;
  for await (const event of streamText(llm, answerMessages(scenario.prompt, evidence))) {
    if (event.type === "delta") chunks.push({ t: Math.round(performance.now() - started), text: event.text });
    else llmUsd += event.costUsd;
  }

  const fixture: ReplayScenario = {
    id: scenario.id,
    label: scenario.label,
    prompt: scenario.prompt,
    model: config.model,
    recordedAt: new Date().toISOString(),
    plan: { calls: plan.calls, rejected: plan.rejected, note: plan.note },
    results,
    answer: { ttftMs: chunks[0]?.t ?? 0, chunks },
    costs: { credits, llmUsd },
  };
  writeFileSync(join(OUT_DIR, `${scenario.id}.json`), `${JSON.stringify(sanitizeFixture(fixture, secrets), null, 2)}\n`);
  console.log(`  ${scenario.id}: ${credits} credits, $${llmUsd.toFixed(5)}, ttft ${fixture.answer.ttftMs} ms`);
}

const after = await balance();
console.log(`balance after: ${after}; credits counted by client: ${spent}`);
