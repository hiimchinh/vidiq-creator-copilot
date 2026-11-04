"use client";

import { type ReactNode, useEffect, useRef } from "react";
import { submitPrompt } from "@/lib/copilot/turn-runner";
import type { ScenarioSummary } from "@/lib/replay/replay-store";
import { track } from "@/lib/telemetry/track";
import { type Turn, useCopilotStore } from "@/store/copilot-store";
import { useKeyStore } from "@/store/key-store";
import { Composer } from "./composer";
import { ScenarioChips } from "./scenario-chips";
import { TurnView } from "./turn-view";

interface CopilotProps {
  scenarios: ScenarioSummary[];
  liveEnabled: boolean;
  /** The recorded turn shown on landing, built on the server. */
  featured?: Turn;
  /** Small print under the composer (narrow screens; the sidebar carries it from 1024 px). */
  children?: ReactNode;
}

export function Copilot({ scenarios, liveEnabled, featured, children }: CopilotProps) {
  const turns = useCopilotStore((s) => s.turns);
  const featuredHidden = useCopilotStore((s) => s.featuredHidden);
  const shownFeatured = featuredHidden ? undefined : featured;
  const mode = useCopilotStore((s) => s.mode);
  const hasKey = useKeyStore((s) => s.vidiqKey.length > 0);
  const busy = turns.some((t) => t.status === "planning" || t.status === "running" || t.status === "answering");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void Promise.resolve(useCopilotStore.persist.rehydrate()).then(() => {
      // A visitor who picked Live on an earlier visit lands in Replay when the server has Live off.
      const { mode, setMode } = useCopilotStore.getState();
      if (!liveEnabled && mode === "live") setMode("replay");
    });
    void useKeyStore.persist.rehydrate();
    const onError = (e: ErrorEvent) => track("client_error", { message: e.message.slice(0, 200) });
    window.addEventListener("error", onError);
    return () => window.removeEventListener("error", onError);
  }, [liveEnabled]);

  useEffect(() => {
    // Landing keeps the recorded turn in view; only a new question scrolls down.
    if (turns.length > 0) endRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [turns.length]);

  const blocked = busy || (mode === "live" && !hasKey);

  return (
    <div className="flex min-h-[calc(100dvh-3.5rem)] flex-col">
      <div className="flex flex-1 flex-col gap-14 pb-8" aria-label="Conversation">
        {shownFeatured && <TurnView turn={shownFeatured} />}
        {turns.map((turn) => (
          <TurnView key={turn.id} turn={turn} />
        ))}
        {!shownFeatured && turns.length === 0 && (
          <p className="m-auto text-center text-2xl font-semibold" data-testid="empty-state">What should we look into?</p>
        )}
        <div ref={endRef} />
      </div>
      <div className="sticky bottom-0 -mx-4 flex flex-col gap-2.5 bg-bg px-4 pb-3 pt-1 lg:pb-6 before:pointer-events-none before:absolute before:inset-x-0 before:-top-8 before:h-8 before:bg-gradient-to-t before:from-bg before:to-transparent">
        {mode === "replay" && (
          <div className="lg:hidden">
            <ScenarioChips scenarios={scenarios} onPick={(p) => void submitPrompt(p)} disabled={busy} />
          </div>
        )}
        {mode === "live" && !hasKey && <p className="text-xs text-warn">Add your vidIQ API key above to use Live mode.</p>}
        <Composer onSubmit={(p) => void submitPrompt(p)} busy={blocked} liveEnabled={liveEnabled} />
        {children}
      </div>
    </div>
  );
}
