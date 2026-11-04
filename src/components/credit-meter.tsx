"use client";

import { useCopilotStore } from "@/store/copilot-store";

export function CreditMeter() {
  const mode = useCopilotStore((s) => s.mode);
  const spent = useCopilotStore((s) => s.spentCredits);
  const balance = useCopilotStore((s) => s.balance);
  return (
    <div className="tabular flex items-center gap-2 rounded-md border border-line bg-surface px-2.5 py-1 text-xs" aria-live="polite" data-testid="credit-meter">
      <span className="text-muted">Session</span>
      <span className="font-semibold text-credit">{spent} cr</span>
      {balance !== null && (
        <>
          <span className="text-line" aria-hidden="true">|</span>
          <span className="text-muted">{mode === "replay" ? "Demo balance" : "Balance"}</span>
          <span className="font-semibold">{balance}</span>
        </>
      )}
    </div>
  );
}
