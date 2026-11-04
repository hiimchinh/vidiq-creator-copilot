"use client";

import { useState } from "react";
import { fetchBalance } from "@/lib/copilot/api-client";
import { useCopilotStore } from "@/store/copilot-store";
import { useKeyStore } from "@/store/key-store";

export function SettingsPanel() {
  const { mode, autoRun, capCredits, setAutoRun, setCap, setBalance } = useCopilotStore();
  const { vidiqKey, setKey } = useKeyStore();
  const [status, setStatus] = useState<string>("");

  async function checkKey() {
    setStatus("Checking…");
    try {
      const { totalCredits } = await fetchBalance(vidiqKey);
      setBalance(totalCredits);
      setStatus(totalCredits === null ? "Key works (unlimited plan)." : `Key works. Balance: ${totalCredits} credits.`);
    } catch (error) {
      setStatus(`Key check failed: ${(error as Error).message}`);
    }
  }

  return (
    <section aria-label="Credit options" className="flex flex-col gap-3 text-xs">
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={autoRun} onChange={(e) => setAutoRun(e.target.checked)} className="size-4 accent-[var(--accent)]" />
        <span>Auto-run paid calls up to</span>
        <input
          type="number"
          min={0}
          max={500}
          step={5}
          value={capCredits}
          onChange={(e) => setCap(Number(e.target.value))}
          aria-label="Session credit cap"
          className="tabular w-16 rounded border border-line bg-bg px-1.5 py-0.5"
        />
        <span>credits this session</span>
      </label>
      {mode === "live" && (
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="vidiq-key" className="text-muted">
            Your vidIQ API key
          </label>
          <input
            id="vidiq-key"
            type="password"
            autoComplete="off"
            value={vidiqKey}
            onChange={(e) => setKey(e.target.value)}
            placeholder="Kept in this tab only"
            className="min-w-0 flex-1 rounded border border-line bg-bg px-2 py-1"
          />
          <button type="button" onClick={checkKey} disabled={!vidiqKey} className="rounded border border-line px-2 py-1 font-medium hover:bg-surface-2 disabled:opacity-50">
            Check (free)
          </button>
          {status && <span role="status" className="w-full text-muted">{status}</span>}
        </div>
      )}
    </section>
  );
}
