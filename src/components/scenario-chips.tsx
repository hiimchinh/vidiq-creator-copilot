"use client";

import type { ScenarioSummary } from "@/lib/replay/replay-store";

export function ScenarioChips({ scenarios, onPick, disabled }: { scenarios: ScenarioSummary[]; onPick: (prompt: string) => void; disabled: boolean }) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-xs text-muted">Recorded questions · 0 credits in Replay</p>
      <ul className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
        {scenarios.map((s) => (
          <li key={s.id} className="shrink-0">
            <button
              type="button"
              disabled={disabled}
              onClick={() => onPick(s.prompt)}
              title={s.prompt}
              className="rounded-full border border-line bg-surface px-2.5 py-1 text-xs hover:border-accent hover:text-accent disabled:opacity-50"
            >
              {s.label}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
