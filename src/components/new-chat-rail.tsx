"use client";

import { useCopilotStore } from "@/store/copilot-store";

/** A thin left rail with one action, as in coach-style chat apps: start a new, empty chat. */
export function NewChatRail() {
  const newChat = useCopilotStore((s) => s.newChat);
  return (
    <nav aria-label="Chats" className="fixed inset-y-0 left-0 z-30 hidden w-16 flex-col items-center bg-rail py-3 md:flex">
      <button
        type="button"
        onClick={newChat}
        aria-label="New chat"
        title="New chat"
        className="grid size-10 place-items-center rounded-xl bg-surface-2 text-muted hover:text-ink"
      >
        <svg viewBox="0 0 20 20" aria-hidden="true" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M10 4v12M4 10h12" />
        </svg>
      </button>
    </nav>
  );
}
