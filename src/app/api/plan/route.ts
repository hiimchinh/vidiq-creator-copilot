import { NextResponse } from "next/server";
import { type PlanResponse, PlanRequestSchema } from "@/lib/copilot/api-types";
import { refuseLiveMode } from "@/lib/demo/live-mode";
import { llmConfig, spendGuard } from "@/lib/llm/llm-config";
import { LlmError, complete } from "@/lib/llm/openrouter";
import { planToolCalls } from "@/lib/llm/planner";
import { matchScenario } from "@/lib/replay/replay-store";

const REPLAY_MISS =
  "Replay mode only answers the recorded questions, so it never spends credits. Pick one of the examples, or switch to Live with your own vidIQ key.";

export async function POST(request: Request) {
  const parsed = PlanRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid request" }, { status: 400 });
  const { mode, prompt } = parsed.data;
  const refused = refuseLiveMode(mode);
  if (refused) return refused;

  if (mode === "replay") {
    const scenario = matchScenario(prompt);
    const body: PlanResponse = scenario
      ? { scenarioId: scenario.id, ...scenario.plan }
      : { calls: [], rejected: [], note: REPLAY_MISS };
    return NextResponse.json(body);
  }

  try {
    const llm = { config: llmConfig(), guard: spendGuard() };
    const plan = await planToolCalls(prompt, { complete: (req) => complete(llm, req) });
    const body: PlanResponse = { calls: plan.calls, rejected: plan.rejected, note: plan.note };
    return NextResponse.json(body);
  } catch (error) {
    const status = error instanceof LlmError && error.kind === "budget" ? 429 : 502;
    const message = error instanceof LlmError ? error.message : "The planner is unavailable.";
    return NextResponse.json({ error: message }, { status });
  }
}
