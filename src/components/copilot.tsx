"use client";

import { useEffect, useRef } from "react";
import { submitPrompt } from "@/lib/copilot/turn-runner";
import type { ScenarioSummary } from "@/lib/replay/replay-store";
import { track } from "@/lib/telemetry/track";
import { useCopilotStore } from "@/store/copilot-store";
import { useKeyStore } from "@/store/key-store";
import { Composer } from "./composer";
import { ScenarioChips } from "./scenario-chips";
import { SettingsPanel } from "./settings-panel";
import { TurnView } from "./turn-view";

export function Copilot({ scenarios, liveEnabled }: { scenarios: ScenarioSummary[]; liveEnabled: boolean }) {
  const turns = useCopilotStore((s) => s.turns);
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
    endRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [turns.length]);

  const blocked = busy || (mode === "live" && !hasKey);

  return (
    <div className="flex flex-col gap-4">
      <SettingsPanel />
      <div className="flex flex-col gap-6" aria-label="Conversation">
        {turns.map((turn) => (
          <TurnView key={turn.id} turn={turn} />
        ))}
        <div ref={endRef} />
      </div>
      <div className="sticky bottom-0 -mx-4 flex flex-col gap-2 border-t border-line bg-bg/95 px-4 pb-4 pt-3 backdrop-blur">
        {mode === "replay" && <ScenarioChips scenarios={scenarios} onPick={(p) => void submitPrompt(p)} disabled={busy} />}
        {mode === "live" && !hasKey && <p className="text-xs text-warn">Add your vidIQ API key above to use Live mode.</p>}
        <Composer onSubmit={(p) => void submitPrompt(p)} busy={blocked} />
      </div>
    </div>
  );
}
