"use client";

import type { Mode } from "@/lib/copilot/api-types";
import { useCopilotStore } from "@/store/copilot-store";

const MODES: { value: Mode; label: string; hint: string }[] = [
  { value: "replay", label: "Replay", hint: "Recorded real vidIQ responses. 0 credits." },
  { value: "live", label: "Live", hint: "Your own vidIQ key. Real credits." },
];

const LIVE_OFF_HINT = "Live mode runs locally with your own keys. See the README.";

export function ModeSwitch({ liveEnabled }: { liveEnabled: boolean }) {
  const mode = useCopilotStore((s) => s.mode);
  const setMode = useCopilotStore((s) => s.setMode);
  return (
    <div role="radiogroup" aria-label="Data mode" className="flex rounded-md border border-line bg-surface p-0.5 text-xs">
      {MODES.map((m) => {
        const disabled = m.value === "live" && !liveEnabled;
        return (
          <button
            key={m.value}
            type="button"
            role="radio"
            aria-checked={mode === m.value}
            disabled={disabled}
            title={disabled ? LIVE_OFF_HINT : m.hint}
            onClick={() => setMode(m.value)}
            className={`rounded px-2.5 py-1 font-medium disabled:cursor-not-allowed disabled:opacity-50 ${mode === m.value ? "bg-accent text-surface" : "text-muted enabled:hover:text-ink"}`}
          >
            {m.label}
          </button>
        );
      })}
    </div>
  );
}
