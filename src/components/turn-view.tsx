"use client";

import { toolLabel } from "@/lib/format";
import type { Turn } from "@/store/copilot-store";
import { AnswerText } from "./answer-text";
import { StepCard } from "./step-card";

export function TurnView({ turn }: { turn: Turn }) {
  const streaming = turn.status === "answering";
  return (
    <article className="flex flex-col gap-3" data-testid="turn">
      <div className="self-end rounded-lg bg-accent-soft px-3 py-2 text-ink sm:max-w-[80%]">{turn.prompt}</div>
      {turn.status === "planning" && (
        <p className="text-xs text-muted" role="status">Planning which vidIQ tools to use…</p>
      )}
      {turn.rejected.length > 0 && (
        <p className="rounded-md border border-line bg-surface p-2 text-xs text-muted" data-testid="rejected-calls">
          Blocked {turn.rejected.length} call{turn.rejected.length > 1 ? "s" : ""} that failed validation or are outside the read-only
          allowlist ({turn.rejected.map((r) => toolLabel(r.tool)).join(", ")}). No credits were spent on {turn.rejected.length > 1 ? "them" : "it"}.
        </p>
      )}
      {turn.steps.map((step) => (
        <StepCard key={step.id} turnId={turn.id} step={step} replay={turn.mode === "replay"} />
      ))}
      {(turn.answer || streaming) && (
        <div className="rounded-lg border border-line bg-surface p-3">
          <AnswerText text={turn.answer} streaming={streaming} />
          {turn.ttftMs !== null && !streaming && (
            <p className="tabular mt-2 text-[11px] text-muted">First token in {turn.ttftMs} ms</p>
          )}
        </div>
      )}
      {turn.status === "done" && turn.steps.length === 0 && turn.note && !turn.answer && (
        <p className="rounded-lg border border-line bg-surface p-3" data-testid="note">{turn.note}</p>
      )}
      {turn.error && <p className="text-sm text-bad" role="alert">{turn.error}</p>}
    </article>
  );
}
