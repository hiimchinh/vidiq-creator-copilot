"use client";

import { confirmStep, skipStep } from "@/lib/copilot/turn-runner";
import { formatCost, toolLabel } from "@/lib/format";
import type { Step } from "@/store/copilot-store";
import { CostCard } from "./cost-card";
import { ResultRenderer } from "./results/result-renderer";

function ChargeBadge({ step, replay }: { step: Step; replay: boolean }) {
  if (step.status === "skipped") return <span className="text-[11px] text-muted">Skipped · 0 credits</span>;
  if (step.cached) {
    return (
      <span className="rounded-full bg-good/15 px-2 py-0.5 text-[11px] font-semibold text-good" data-testid="cached-badge">
        0 credits, cached
      </span>
    );
  }
  if (step.status !== "done") return null;
  const label = step.charged === 1 ? "1 credit" : `${step.charged} credits`;
  return (
    <span className="tabular rounded-full bg-credit-soft px-2 py-0.5 text-[11px] font-semibold text-credit" data-testid="charge-badge">
      {label}
      {replay ? " · simulated" : ""}
    </span>
  );
}

export function StepCard({ turnId, step, replay }: { turnId: string; step: Step; replay: boolean }) {
  if (step.status === "awaiting") {
    return <CostCard step={step} onRun={() => void confirmStep(turnId, step.id)} onSkip={() => void skipStep(turnId, step.id)} />;
  }
  return (
    <section aria-label={toolLabel(step.tool)} className="flex flex-col gap-3 rounded-md border border-line bg-surface p-3" data-testid="step-card">
      <header className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted">{toolLabel(step.tool)}</span>
        <span className="ml-auto">
          <ChargeBadge step={step} replay={replay} />
        </span>
      </header>
      {step.status === "planned" && <p className="text-xs text-muted">Queued. Waits for the step above.</p>}
      {step.status === "running" && (
        <div className="flex items-center gap-2 text-xs text-muted" role="status">
          <span className="size-3 animate-spin rounded-full border-2 border-line border-t-accent" aria-hidden="true" />
          Calling vidIQ…
        </div>
      )}
      {step.view && <ResultRenderer view={step.view} />}
      {step.status === "error" && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-muted">Not retried automatically. vidIQ refunds failed calls.</span>
          <button
            type="button"
            onClick={() => void confirmStep(turnId, step.id)}
            className="rounded border border-line px-2 py-1 font-medium hover:bg-surface-2"
          >
            Retry for {formatCost(step.cost)}
          </button>
        </div>
      )}
    </section>
  );
}
