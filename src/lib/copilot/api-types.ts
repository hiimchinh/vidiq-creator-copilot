import { z } from "zod";
import type { McpCallResult } from "../mcp/mcp-client";
import type { PlannedCall, RejectedCall } from "../llm/planner";
import type { ResultView } from "../schemas/view-types";

export const ModeSchema = z.enum(["replay", "live"]);
export type Mode = z.infer<typeof ModeSchema>;

export { VIDIQ_KEY_HEADER, VIDIQ_MCP_URL } from "./api-constants";

export const PlanRequestSchema = z.object({ mode: ModeSchema, prompt: z.string().trim().min(2).max(600) });
export interface PlanResponse {
  scenarioId?: string;
  calls: PlannedCall[];
  rejected: RejectedCall[];
  note: string;
}

export const ToolRequestSchema = z.object({
  mode: ModeSchema,
  tool: z.string().min(1).max(80),
  args: z.record(z.string(), z.unknown()),
});
/** The server validates vidIQ output and sends a typed view, so zod never ships to the browser. */
export interface ToolResponse {
  result: McpCallResult;
  view: ResultView;
}

export const EvidenceSchema = z.object({
  tool: z.string(),
  args: z.record(z.string(), z.unknown()),
  text: z.string().max(60_000),
});

export const AnswerRequestSchema = z.object({
  mode: ModeSchema,
  prompt: z.string().trim().min(2).max(600),
  scenarioId: z.string().max(80).optional(),
  evidence: z.array(EvidenceSchema).max(3),
  skipped: z.number().int().min(0).max(3).default(0),
});

export type AnswerEvent =
  | { type: "delta"; text: string }
  | { type: "done"; ttftMs: number | null; costUsd: number; source: "replay" | "live" }
  | { type: "error"; message: string };

export interface BalanceResponse {
  totalCredits: number | null;
  simulated: boolean;
}
