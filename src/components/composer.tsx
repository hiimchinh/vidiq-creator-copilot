"use client";

import { type FormEvent, useState } from "react";

export function Composer({ onSubmit, busy }: { onSubmit: (prompt: string) => void; busy: boolean }) {
  const [value, setValue] = useState("");
  function submit(event: FormEvent) {
    event.preventDefault();
    const prompt = value.trim();
    if (prompt.length < 2 || busy) return;
    onSubmit(prompt);
    setValue("");
  }
  return (
    <form onSubmit={submit} className="flex items-end gap-2 rounded-lg border border-line bg-surface p-2 shadow-sm focus-within:border-accent">
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
        placeholder="Ask about keywords, titles, outliers…"
        className="max-h-40 min-h-9 flex-1 resize-none bg-transparent px-2 py-1.5 outline-none placeholder:text-muted focus-visible:outline-none"
      />
      <button type="submit" disabled={busy || value.trim().length < 2} className="rounded-md bg-accent px-3 py-2 text-xs font-semibold text-surface disabled:opacity-40">
        Ask
      </button>
    </form>
  );
}
