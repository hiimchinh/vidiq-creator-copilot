"use client";

import type { ScenarioSummary } from "@/lib/replay/replay-store";

/** Recorded questions as one quiet, scrollable row of pills above the composer. */
export function ScenarioChips({ scenarios, onPick, disabled }: { scenarios: ScenarioSummary[]; onPick: (prompt: string) => void; disabled: boolean }) {
  return (
    <ul aria-label="Recorded questions, 0 credits in Replay" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-0.5 [mask-image:linear-gradient(to_right,black_88%,transparent)] [scrollbar-width:none]">
      {scenarios.map((s) => (
        <li key={s.id} className="shrink-0">
          <button
            type="button"
            disabled={disabled}
            onClick={() => onPick(s.prompt)}
            title={s.prompt}
            className="rounded-full bg-surface px-3 py-1.5 text-xs text-muted hover:bg-surface-2 hover:text-ink disabled:opacity-50"
          >
            {s.label}
          </button>
        </li>
      ))}
    </ul>
  );
}
