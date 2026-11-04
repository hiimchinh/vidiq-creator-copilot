import { NextResponse } from "next/server";
import { type AnswerEvent, AnswerRequestSchema } from "@/lib/copilot/api-types";
import { answerMessages } from "@/lib/llm/answer";
import { llmConfig, spendGuard } from "@/lib/llm/llm-config";
import { LlmError, streamText } from "@/lib/llm/openrouter";
import { replayAnswer, staticAnswer } from "@/lib/replay/replay-answer";
import { findReplayScenario } from "@/lib/replay/replay-store";
import { ndjsonResponse } from "@/lib/stream/ndjson-response";

async function* liveAnswer(prompt: string, evidence: { tool: string; args: Record<string, unknown>; text: string }[], signal: AbortSignal): AsyncGenerator<AnswerEvent> {
  const started = performance.now();
  let ttftMs: number | null = null;
  const llm = { config: llmConfig(), guard: spendGuard() };
  for await (const event of streamText(llm, answerMessages(prompt, evidence), signal)) {
    if (event.type === "delta") {
      ttftMs ??= Math.round(performance.now() - started);
      yield event;
    } else {
      yield { type: "done", ttftMs, costUsd: event.costUsd, source: "live" };
    }
  }
}

const SKIPPED_NOTE = (n: number) =>
  `You skipped ${n} paid call${n > 1 ? "s" : ""}, so no credits were spent on ${n > 1 ? "them" : "it"}. ` +
  "The cards above show only the data you approved. Run the skipped call to get the full written answer.";

export async function POST(request: Request) {
  const parsed = AnswerRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid request" }, { status: 400 });
  const { mode, prompt, scenarioId, evidence, skipped } = parsed.data;
  const onError = (error: unknown): AnswerEvent => ({
    type: "error",
    message: error instanceof LlmError ? error.message : "The answer stream failed. The data cards above are still valid.",
  });

  if (mode === "replay") {
    const scenario = scenarioId ? findReplayScenario(scenarioId) : undefined;
    if (!scenario) return ndjsonResponse(staticAnswer("No recorded answer for this question."), onError);
    if (skipped > 0) return ndjsonResponse(staticAnswer(SKIPPED_NOTE(skipped)), onError);
    return ndjsonResponse(replayAnswer(scenario.answer.chunks, scenario.answer.ttftMs), onError);
  }

  if (skipped > 0 && evidence.length === 0) return ndjsonResponse(staticAnswer(SKIPPED_NOTE(skipped)), onError);
  return ndjsonResponse(liveAnswer(prompt, evidence, request.signal), onError);
}
