"use client";

import type { ReactNode } from "react";
import { submitPrompt } from "@/lib/copilot/turn-runner";
import type { ScenarioSummary } from "@/lib/replay/replay-store";
import { useCopilotStore } from "@/store/copilot-store";
import { CreditMeter } from "./credit-meter";

interface ChatSidebarProps {
  scenarios: ScenarioSummary[];
  /** The recorded chat open on landing, highlighted until the visitor opens another one. */
  featuredScenarioId?: string;
  /** Small print for the footer. */
  children?: ReactNode;
}

/**
 * The left sidebar at 1024 px and wider, laid out like a coach chat app: mark, New chat, the recorded
 * chats as Recents, and the session credits in the footer. Below 1024 px the pills row takes its place.
 */
export function ChatSidebar({ scenarios, featuredScenarioId, children }: ChatSidebarProps) {
  const newChat = useCopilotStore((s) => s.newChat);
  const live = useCopilotStore((s) => s.mode === "live");
  const current = useCopilotStore((s) => {
    const last = s.turns.at(-1);
    if (last) return scenarios.find((sc) => sc.id === last.scenarioId || sc.prompt === last.prompt)?.id;
    return s.featuredHidden ? undefined : featuredScenarioId;
  });

  function open(prompt: string) {
    newChat();
    void submitPrompt(prompt);
  }

  return (
    <nav aria-label="Chats" className="fixed inset-y-0 left-0 z-30 hidden w-80 flex-col gap-1 border-r border-hairline bg-rail px-4 pb-4 pt-5 lg:flex">
      <div className="flex items-center gap-2 px-2 pb-4">
        <span aria-hidden="true" className="grid size-6 place-items-center rounded-md bg-accent text-[10px] font-bold text-surface">CC</span>
        <span className="text-[15px] font-semibold">Creator Copilot</span>
      </div>
      <button
        type="button"
        onClick={newChat}
        className="flex items-center gap-2.5 rounded-lg px-2 py-2 text-left text-[15px] hover:bg-surface-2"
      >
        <svg viewBox="0 0 20 20" aria-hidden="true" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M10 4v12M4 10h12" />
        </svg>
        New chat
      </button>
      <p id="recents-heading" className="px-2 pb-1 pt-6 text-sm text-muted">Recents</p>
      <ul aria-labelledby="recents-heading" className="flex flex-col gap-0.5">
        {scenarios.map((s) => (
          <li key={s.id}>
            <button
              type="button"
              onClick={() => open(s.prompt)}
              disabled={live}
              aria-current={s.id === current ? "true" : undefined}
              title={live ? "Recorded chats open in Replay mode" : s.prompt}
              className="w-full truncate rounded-lg px-2 py-2 text-left text-sm hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-50 aria-[current=true]:bg-surface-2 aria-[current=true]:text-ink"
            >
              {s.label}
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-auto flex flex-col gap-3 px-2">
        <CreditMeter />
        {children}
      </div>
    </nav>
  );
}
