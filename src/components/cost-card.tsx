"use client";

import { argsSummary, formatCost, toolLabel } from "@/lib/format";
import type { Step } from "@/store/copilot-store";
import { useCopilotStore } from "@/store/copilot-store";

interface Props {
  step: Step;
  onRun: () => void;
  onSkip: () => void;
}

/** Shown before every paid call that is not cached and not covered by auto-run. */
export function CostCard({ step, onRun, onSkip }: Props) {
  const mode = useCopilotStore((s) => s.mode);
  const balance = useCopilotStore((s) => s.balance);
  const spent = useCopilotStore((s) => s.spentCredits);
  const cap = useCopilotStore((s) => s.capCredits);
  const credits = step.cost.kind === "fixed" ? step.cost.credits : null;
  const after = balance !== null && credits !== null ? balance - credits : null;

  return (
    <div
      role="group"
      aria-label={`Confirm ${toolLabel(step.tool)}`}
      className="flex flex-col gap-1.5 rounded-md border border-line bg-surface p-2.5 text-xs"
      data-testid="cost-card"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold">{toolLabel(step.tool)}</span>
        <span className="tabular rounded-full bg-credit-soft px-2 py-0.5 text-[11px] font-semibold text-credit">{formatCost(step.cost)}</span>
        {step.parse === "repaired" && (
          <span className="rounded border border-line px-1.5 text-[11px] text-muted" title="The model's arguments failed validation once and were corrected">
            args auto-corrected
          </span>
        )}
      </div>
      <p className="break-words text-muted">{argsSummary(step.args)}</p>
      <p className="tabular text-muted">
        {after !== null ? (
          <>
            {mode === "replay" ? "Demo balance" : "Balance"} after: <strong>{after}</strong> credits
            {mode === "replay" && " (simulated, nothing is charged in Replay)"}
          </>
        ) : step.cost.kind === "unknown" ? (
          <>The exact cost is unknown ({step.cost.reason}). Check before running.</>
        ) : (
          <>
            Session spend after: {spent + (credits ?? 0)} of {cap} cap
          </>
        )}
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          // Moving focus to the pending decision helps keyboard and screen-reader users.
          autoFocus
          onClick={onRun}
          className="rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-surface hover:opacity-90"
        >
          Run for {formatCost(step.cost)}
        </button>
        <button type="button" onClick={onSkip} className="rounded-md border border-line bg-surface px-3 py-1.5 text-xs font-medium hover:bg-surface-2">
          Skip
        </button>
      </div>
    </div>
  );
}
