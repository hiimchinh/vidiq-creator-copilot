"use client";

import { useId, useMemo, useState } from "react";
import { answerSources } from "@/lib/copilot/answer-sources";
import { toolLabel } from "@/lib/format";
import type { Turn } from "@/store/copilot-store";
import { AnswerText } from "./answer-text";
import { ClaimCheckPanel } from "./claim-check-panel";
import { StepCard } from "./step-card";
import { WorkedFor } from "./worked-for";

/** One question and its answer, laid out like a coach chat: prompt bubble, "Worked for", prose, check note. */
export function TurnView({ turn }: { turn: Turn }) {
  const streaming = turn.status === "answering";
  const done = turn.status === "done";
  const sources = useMemo(() => answerSources(turn.steps), [turn.steps]);
  const [open, setOpen] = useState(!turn.featured);
  const stepsId = useId();
  const showWorked = done && turn.workedMs !== null && turn.steps.length > 0;
  return (
    <article className="flex flex-col gap-4" data-testid="turn">
      <div className="max-w-[85%] self-end rounded-2xl bg-surface-2 px-4 py-3 text-[15px] leading-7 text-ink" data-testid="prompt">
        {turn.prompt}
      </div>
      {turn.status === "planning" && (
        <p className="text-sm text-muted" role="status">Planning which vidIQ tools to use…</p>
      )}
      {turn.rejected.length > 0 && (
        <p className="rounded-md border border-line bg-surface p-2 text-xs text-muted" data-testid="rejected-calls">
          Blocked {turn.rejected.length} call{turn.rejected.length > 1 ? "s" : ""} that failed validation or are outside the read-only
          allowlist ({turn.rejected.map((r) => toolLabel(r.tool)).join(", ")}). No credits were spent on {turn.rejected.length > 1 ? "them" : "it"}.
        </p>
      )}
      {showWorked && <WorkedFor ms={turn.workedMs ?? 0} open={open} onToggle={() => setOpen((o) => !o)} controls={stepsId} />}
      {(!showWorked || open) && turn.steps.length > 0 && (
        <div id={stepsId} className="flex flex-col gap-3">
          {turn.steps.map((step) => (
            <StepCard key={step.id} turnId={turn.id} step={step} replay={turn.mode === "replay"} />
          ))}
        </div>
      )}
      {(turn.answer || streaming) && (
        <div className="flex flex-col gap-4">
          <AnswerText text={turn.answer} streaming={streaming} sources={sources} />
          {done && <ClaimCheckPanel text={turn.answer} sources={sources} />}
          {turn.ttftMs !== null && done && <p className="tabular text-[11px] text-muted">First token in {turn.ttftMs} ms</p>}
        </div>
      )}
      {done && turn.steps.length === 0 && turn.note && !turn.answer && (
        <p className="rounded-lg border border-line bg-surface p-3" data-testid="note">{turn.note}</p>
      )}
      {turn.error && <p className="text-sm text-bad" role="alert">{turn.error}</p>}
    </article>
  );
}
