"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useCopilotStore } from "@/store/copilot-store";
import { useKeyStore } from "@/store/key-store";
import { SettingsPanel } from "./settings-panel";

/**
 * The credit pitch and settings, out of the conversation column. Opens on its own when Live mode
 * still needs the visitor's key; Escape closes it and returns focus to the button.
 */
export function SettingsMenu() {
  const [open, setOpen] = useState(false);
  const live = useCopilotStore((s) => s.mode === "live");
  const hasKey = useKeyStore((s) => s.vidiqKey.length > 0);
  const needsKey = live && !hasKey;
  const panelId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (needsKey) setOpen(true);
  }, [needsKey]);

  return (
    <div
      className="relative"
      onKeyDown={(e) => {
        if (e.key !== "Escape" || !open) return;
        setOpen(false);
        buttonRef.current?.focus();
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label="Credit settings"
        title="Credit settings"
        onClick={() => setOpen((o) => !o)}
        className={`grid size-8 place-items-center rounded-md border border-line hover:text-ink ${open ? "bg-surface-2 text-ink" : "bg-surface text-muted"}`}
      >
        <svg viewBox="0 0 20 20" aria-hidden="true" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M3 6h9M15 6h2M3 14h3M9 14h8" />
          <circle cx="13.5" cy="6" r="1.8" />
          <circle cx="7.5" cy="14" r="1.8" />
        </svg>
      </button>
      {open && (
        <div id={panelId} className="absolute right-0 top-full z-40 mt-2 flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-3 rounded-xl border border-line bg-surface p-4 shadow-xl">
          <p className="text-sm leading-relaxed text-muted">
            Every paid vidIQ call shows its credit cost first, identical calls come from cache for 0 credits, and a paid call is never
            retried on its own.
          </p>
          <SettingsPanel />
        </div>
      )}
    </div>
  );
}
