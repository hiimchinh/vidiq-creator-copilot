"use client";

import { useCopilotStore } from "@/store/copilot-store";

export function CreditMeter() {
  const mode = useCopilotStore((s) => s.mode);
  const spent = useCopilotStore((s) => s.spentCredits);
  const balance = useCopilotStore((s) => s.balance);
  return (
    <div className="tabular flex items-center gap-2 rounded-md border border-line bg-surface px-2.5 py-1 text-xs" aria-live="polite" data-testid="credit-meter">
      <span className="hidden text-muted sm:inline">Session</span>
      <span className="font-semibold text-credit" title="Credits spent this session">{spent} cr</span>
      {balance !== null && (
        <>
          <span className="text-line" aria-hidden="true">|</span>
          <span className="hidden text-muted sm:inline">{mode === "replay" ? "Demo balance" : "Balance"}</span>
          <span className="font-semibold" title={mode === "replay" ? "Demo balance" : "Balance"}>{balance}<span className="font-normal text-muted sm:hidden"> left</span></span>
        </>
      )}
    </div>
  );
}
