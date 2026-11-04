/**
 * Re-records only the streamed answers of the Replay fixtures with the current answer prompt.
 * Uses the recorded vidIQ results as evidence, so it calls OpenRouter only: 0 vidIQ credits.
 *
 *   OPENROUTER_API_KEY=… pnpm rerecord:answers [--only id]
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { cacheKey } from "../src/lib/cache/cache-key";
import { answerMessages, type ToolEvidence } from "../src/lib/llm/answer";
import { llmConfig, spendGuard } from "../src/lib/llm/llm-config";
import { streamText } from "../src/lib/llm/openrouter";
import type { ReplayScenario } from "../src/lib/replay/replay-types";
import { sanitizeFixture } from "../src/lib/replay/sanitize";

const DIR = join(import.meta.dirname, "../src/fixtures/replay");
const only = process.argv.includes("--only") ? process.argv[process.argv.indexOf("--only") + 1] : undefined;
const config = llmConfig();
if (!config.apiKey) throw new Error("OPENROUTER_API_KEY is required");
const llm = { config, guard: spendGuard() };
let total = 0;

for (const file of readdirSync(DIR).filter((f) => f.endsWith(".json"))) {
  const path = join(DIR, file);
  const scenario = JSON.parse(readFileSync(path, "utf8")) as ReplayScenario;
  if (only && scenario.id !== only) continue;
  const evidence: ToolEvidence[] = [];
  const seen = new Set<string>();
  for (const call of scenario.plan.calls) {
    const key = cacheKey(call.tool, call.args);
    const result = scenario.results[key];
    if (seen.has(key) || !result?.ok) continue;
    seen.add(key);
    evidence.push({ tool: call.tool, args: call.args, text: result.text, structured: result.structured });
  }
  const started = performance.now();
  const chunks: ReplayScenario["answer"]["chunks"] = [];
  let usd = 0;
  for await (const event of streamText(llm, answerMessages(scenario.prompt, evidence))) {
    if (event.type === "delta") chunks.push({ t: Math.round(performance.now() - started), text: event.text });
    else usd = event.costUsd;
  }
  total += usd;
  const next: ReplayScenario = {
    ...scenario,
    model: config.model,
    answer: { ttftMs: chunks[0]?.t ?? 0, chunks },
    costs: { ...scenario.costs, llmUsd: scenario.costs.llmUsd + usd },
  };
  writeFileSync(path, `${JSON.stringify(sanitizeFixture(next, [config.apiKey]), null, 2)}\n`);
  console.log(`${scenario.id}: $${usd.toFixed(5)}, ttft ${next.answer.ttftMs} ms`);
}
console.log(`total $${total.toFixed(5)}`);
