"use client";

import { type KeyboardEvent, useEffect, useId, useRef, useState } from "react";
import type { Mode } from "@/lib/copilot/api-types";
import { useCopilotStore } from "@/store/copilot-store";

interface ModeOption {
  value: Mode;
  label: string;
  hint: string;
}

const REPLAY: ModeOption = { value: "replay", label: "Replay", hint: "Recorded real vidIQ responses. 0 credits." };
const MODES: ModeOption[] = [REPLAY, { value: "live", label: "Live", hint: "Your own vidIQ key. Real credits." }];

const LIVE_OFF_HINT = "Live mode runs locally with your own keys. See the README.";

/**
 * The data mode as a compact menu in the composer's bottom row, where coach-style apps put their model menu.
 * Opens upward; arrow keys move between the options, Escape closes and returns focus to the button.
 */
export function ModeSwitch({ liveEnabled }: { liveEnabled: boolean }) {
  const mode = useCopilotStore((s) => s.mode);
  const setMode = useCopilotStore((s) => s.setMode);
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const current = MODES.find((m) => m.value === mode) ?? REPLAY;

  useEffect(() => {
    if (!open) return;
    rootRef.current?.querySelector<HTMLElement>('[role="menuitemradio"][aria-checked="true"]')?.focus();
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  function close() {
    setOpen(false);
    buttonRef.current?.focus();
  }

  function onMenuKeyDown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "Tab") {
      setOpen(false);
    } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const items = [...(rootRef.current?.querySelectorAll<HTMLElement>('[role="menuitemradio"]') ?? [])];
      const at = items.indexOf(document.activeElement as HTMLElement);
      items[(at + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length]?.focus();
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={`Data mode: ${current.label}`}
        title={current.hint}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm font-semibold text-ink hover:bg-surface-2"
      >
        {current.label}
        <svg viewBox="0 0 20 20" aria-hidden="true" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="m6 8 4 4 4-4" />
        </svg>
      </button>
      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label="Data mode"
          onKeyDown={onMenuKeyDown}
          className="absolute bottom-full right-0 z-40 mb-2 flex w-72 flex-col gap-0.5 rounded-xl border border-line bg-surface p-1 shadow-xl"
        >
          {MODES.map((m) => {
            const disabled = m.value === "live" && !liveEnabled;
            return (
              <button
                key={m.value}
                type="button"
                role="menuitemradio"
                aria-checked={mode === m.value}
                aria-disabled={disabled || undefined}
                title={disabled ? LIVE_OFF_HINT : m.hint}
                onClick={() => {
                  if (disabled) return;
                  if (m.value !== mode) setMode(m.value);
                  close();
                }}
                className="flex items-start gap-2 rounded-lg px-3 py-2 text-left hover:bg-surface-2 aria-disabled:cursor-not-allowed aria-disabled:opacity-60"
              >
                <span className="flex flex-col">
                  <span className="text-sm font-semibold">{m.label}</span>
                  <span className="text-xs text-muted">{disabled ? LIVE_OFF_HINT : m.hint}</span>
                </span>
                <span aria-hidden="true" className={`ml-auto text-sm ${mode === m.value ? "text-ink" : "invisible"}`}>✓</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
