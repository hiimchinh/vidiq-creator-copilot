import { type Step, type Turn, useCopilotStore } from "@/store/copilot-store";
import { useKeyStore } from "@/store/key-store";
import { costOf } from "../credits/cost-of";
import { decideRun } from "../credits/run-policy";
import { toResultView } from "../schemas/result-view";
import { track } from "../telemetry/track";
import { postPlan, postTool, streamAnswer } from "./api-client";
import { getCached, putCached } from "./session-cache";

const store = () => useCopilotStore.getState();
const turnOf = (id: string): Turn | undefined => store().turns.find((t) => t.id === id);
const newId = () => Math.random().toString(36).slice(2, 10);

export async function submitPrompt(prompt: string): Promise<void> {
  const { mode, addTurn, updateTurn } = store();
  const id = newId();
  addTurn({ id, prompt, mode, status: "planning", note: "", rejected: [], steps: [], answer: "", ttftMs: null });
  try {
    const plan = await postPlan(mode, prompt);
    const steps: Step[] = plan.calls.map((call) => ({
      id: call.id || newId(),
      tool: call.tool,
      args: call.args,
      parse: call.parse,
      cost: costOf(call.tool, call.args),
      status: "planned",
      cached: false,
      charged: 0,
    }));
    track("plan", { mode, calls: steps.length, rejected: plan.rejected.length, repaired: steps.filter((s) => s.parse === "repaired").length });
    updateTurn(id, { scenarioId: plan.scenarioId, note: plan.note, rejected: plan.rejected, steps, status: steps.length ? "running" : "done" });
    if (steps.length) await advance(id);
  } catch (error) {
    updateTurn(id, { status: "error", error: (error as Error).message });
  }
}

/** Moves a turn forward until it needs the user (a cost card) or every step is settled. */
async function advance(turnId: string): Promise<void> {
  for (;;) {
    const turn = turnOf(turnId);
    if (!turn) return;
    if (turn.steps.some((s) => s.status === "awaiting" || s.status === "running")) return;
    const next = turn.steps.find((s) => s.status === "planned");
    if (!next) return answer(turnId);

    const { autoRun, capCredits, spentCredits, updateStep } = store();
    const cached = getCached(turn.mode, next.tool, next.args);
    const decision = decideRun({ cost: next.cost, cached: cached !== undefined, autoRun, capCredits, spentCredits });
    if (decision === "cached" && cached) {
      updateStep(turnId, next.id, {
        status: "done",
        cached: true,
        charged: 0,
        view: toResultView(next.tool, cached, next.args),
        resultText: cached.ok ? cached.text : undefined,
      });
      track("tool_call", { tool: next.tool, credits: 0, cached: true, outcome: "ok", mode: turn.mode });
      continue;
    }
    if (decision === "confirm") {
      updateStep(turnId, next.id, { status: "awaiting" });
      return;
    }
    await runStep(turnId, next);
  }
}

async function runStep(turnId: string, step: Step): Promise<void> {
  const turn = turnOf(turnId);
  if (!turn) return;
  const { updateStep, addSpent } = store();
  updateStep(turnId, step.id, { status: "running" });
  const started = performance.now();
  try {
    const { result } = await postTool(turn.mode, step.tool, step.args, useKeyStore.getState().vidiqKey);
    const view = toResultView(step.tool, result, step.args);
    const estimate = step.cost.kind === "fixed" ? step.cost.credits : 0;
    // vidIQ refunds failed calls automatically, and reports the real charge in `_credits.used` when it can.
    const reported = "creditsUsed" in view && typeof view.creditsUsed === "number" ? view.creditsUsed : undefined;
    const charged = result.ok ? (reported ?? estimate) : 0;
    if (result.ok) putCached(turn.mode, step.tool, step.args, result);
    addSpent(charged);
    updateStep(turnId, step.id, { status: result.ok ? "done" : "error", charged, view, resultText: result.ok ? result.text : undefined });
    if (view.kind === "fallback") track("schema_fallback", { tool: step.tool });
    track("tool_call", {
      tool: step.tool,
      credits: charged,
      cached: false,
      outcome: result.ok ? "ok" : result.error.kind,
      ms: Math.round(performance.now() - started),
      mode: turn.mode,
    });
  } catch (error) {
    updateStep(turnId, step.id, { status: "error", view: { kind: "error", errorKind: "network", message: (error as Error).message } });
  }
}

export async function confirmStep(turnId: string, stepId: string): Promise<void> {
  const step = turnOf(turnId)?.steps.find((s) => s.id === stepId);
  if (!step || (step.status !== "awaiting" && step.status !== "error")) return;
  await runStep(turnId, step);
  await advance(turnId);
}

export async function skipStep(turnId: string, stepId: string): Promise<void> {
  store().updateStep(turnId, stepId, { status: "skipped" });
  await advance(turnId);
}

async function answer(turnId: string): Promise<void> {
  const turn = turnOf(turnId);
  if (!turn || turn.status === "answering" || turn.status === "done") return;
  const { updateTurn } = store();
  updateTurn(turnId, { status: "answering", answer: "" });
  const evidence = turn.steps
    .filter((s) => s.status === "done" && s.resultText !== undefined)
    .map((s) => ({ tool: s.tool, args: s.args, text: s.resultText ?? "" }));
  const skipped = turn.steps.filter((s) => s.status === "skipped").length;
  const started = performance.now();
  let firstTokenMs: number | null = null;
  try {
    for await (const event of streamAnswer({ mode: turn.mode, prompt: turn.prompt, scenarioId: turn.scenarioId, evidence, skipped })) {
      if (event.type === "delta") {
        firstTokenMs ??= Math.round(performance.now() - started);
        updateTurn(turnId, (t) => ({ answer: t.answer + event.text }));
      } else if (event.type === "error") {
        updateTurn(turnId, { error: event.message });
      } else {
        track("answer", { mode: turn.mode, ttft_ms: firstTokenMs, server_ttft_ms: event.ttftMs, usd: event.costUsd });
      }
    }
    updateTurn(turnId, { status: "done", ttftMs: firstTokenMs });
  } catch (error) {
    updateTurn(turnId, { status: "done", error: (error as Error).message });
  }
}
