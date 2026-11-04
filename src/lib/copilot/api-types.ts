import { z } from "zod";
import type { McpCallResult } from "../mcp/mcp-client";
import type { PlannedCall, RejectedCall } from "../llm/planner";

export const ModeSchema = z.enum(["replay", "live"]);
export type Mode = z.infer<typeof ModeSchema>;

/** The visitor's vidIQ key travels only in this header, only to our own routes. */
export const VIDIQ_KEY_HEADER = "x-vidiq-key";
export const VIDIQ_MCP_URL = "https://mcp.vidiq.com/mcp";

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
export interface ToolResponse {
  result: McpCallResult;
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
