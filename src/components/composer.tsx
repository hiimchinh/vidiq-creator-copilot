"use client";

import { type FormEvent, useState } from "react";
import { ModeSwitch } from "./mode-switch";

interface ComposerProps {
  onSubmit: (prompt: string) => void;
  busy: boolean;
  liveEnabled: boolean;
}

/** The chat input: a rounded card pinned under the conversation; the data mode menu and an icon send button on its bottom row. */
export function Composer({ onSubmit, busy, liveEnabled }: ComposerProps) {
  const [value, setValue] = useState("");
  function submit(event: FormEvent) {
    event.preventDefault();
    const prompt = value.trim();
    if (prompt.length < 2 || busy) return;
    onSubmit(prompt);
    setValue("");
  }
  return (
    <form
      onSubmit={submit}
      data-testid="composer"
      className="flex flex-col gap-1 rounded-3xl border border-line bg-surface px-5 pb-4 pt-5 focus-within:border-muted/50 sm:gap-3"
    >
      <label htmlFor="prompt" className="sr-only">Ask the copilot</label>
      <textarea
        id="prompt"
        rows={1}
        value={value}
        maxLength={600}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) submit(e);
        }}
        placeholder="How can I help you grow?"
        className="max-h-40 min-h-7 resize-none bg-transparent text-[15px] leading-7 outline-none placeholder:text-muted focus-visible:outline-none"
      />
      <div className="flex items-center justify-end gap-2">
        <ModeSwitch liveEnabled={liveEnabled} />
        <button
          type="submit"
          aria-label="Ask"
          title="Ask"
          disabled={busy || value.trim().length < 2}
          className="grid size-9 place-items-center rounded-full bg-ink text-bg disabled:bg-surface-2 disabled:text-muted"
        >
          <svg viewBox="0 0 20 20" aria-hidden="true" className="size-4" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10 16V4M5 9l5-5 5 5" />
          </svg>
        </button>
      </div>
    </form>
  );
}
