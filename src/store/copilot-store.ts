import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Mode } from "@/lib/copilot/api-types";
import type { Cost } from "@/lib/credits/cost-of";
import type { RejectedCall } from "@/lib/llm/planner";
import type { ResultView } from "@/lib/schemas/view-types";

export type StepStatus = "planned" | "awaiting" | "running" | "done" | "skipped" | "error";

export interface Step {
  id: string;
  tool: string;
  args: Record<string, unknown>;
  cost: Cost;
  parse: "ok" | "repaired";
  status: StepStatus;
  cached: boolean;
  charged: number;
  view?: ResultView;
  resultText?: string;
}

export interface Turn {
  id: string;
  prompt: string;
  mode: Mode;
  scenarioId?: string;
  status: "planning" | "running" | "answering" | "done" | "error";
  note: string;
  rejected: RejectedCall[];
  steps: Step[];
  answer: string;
  ttftMs: number | null;
  error?: string;
}

/** Demo balance for Replay mode, so the cost card can show "balance after" without a real account. */
export const REPLAY_BALANCE = 150;

interface CopilotState {
  mode: Mode;
  autoRun: boolean;
  capCredits: number;
  spentCredits: number;
  balance: number | null;
  turns: Turn[];
  setMode: (mode: Mode) => void;
  setAutoRun: (on: boolean) => void;
  setCap: (credits: number) => void;
  setBalance: (balance: number | null) => void;
  addSpent: (credits: number) => void;
  addTurn: (turn: Turn) => void;
  updateTurn: (id: string, patch: Partial<Turn> | ((turn: Turn) => Partial<Turn>)) => void;
  updateStep: (turnId: string, stepId: string, patch: Partial<Step>) => void;
  clearTurns: () => void;
}

export const useCopilotStore = create<CopilotState>()(
  persist(
    (set) => ({
      mode: "replay",
      autoRun: false,
      capCredits: 20,
      spentCredits: 0,
      balance: REPLAY_BALANCE,
      turns: [],
      setMode: (mode) => set({ mode, balance: mode === "replay" ? REPLAY_BALANCE : null, spentCredits: 0 }),
      setAutoRun: (autoRun) => set({ autoRun }),
      setCap: (capCredits) => set({ capCredits: Math.max(0, Math.min(500, Math.round(capCredits))) }),
      setBalance: (balance) => set({ balance }),
      addSpent: (credits) =>
        set((s) => ({ spentCredits: s.spentCredits + credits, balance: s.balance === null ? null : s.balance - credits })),
      addTurn: (turn) => set((s) => ({ turns: [...s.turns, turn] })),
      updateTurn: (id, patch) =>
        set((s) => ({
          turns: s.turns.map((t) => (t.id === id ? { ...t, ...(typeof patch === "function" ? patch(t) : patch) } : t)),
        })),
      updateStep: (turnId, stepId, patch) =>
        set((s) => ({
          turns: s.turns.map((t) =>
            t.id === turnId ? { ...t, steps: t.steps.map((st) => (st.id === stepId ? { ...st, ...patch } : st)) } : t,
          ),
        })),
      clearTurns: () => set({ turns: [] }),
    }),
    {
      name: "copilot-settings",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ mode: s.mode, autoRun: s.autoRun, capCredits: s.capCredits }),
      skipHydration: true,
      onRehydrateStorage: () => (state) => {
        if (state?.mode === "live") state.setBalance(null);
      },
    },
  ),
);
