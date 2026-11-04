import { parseStructured } from "../structured/parse-structured";
import { type CopilotTool, isCopilotTool, toolDefinitions } from "./copilot-tools";
import { groundedSchema } from "./grounding";
import type { ChatMessage, Completion, CompletionRequest } from "./openrouter";

export const MAX_CALLS_PER_QUESTION = 3;

export interface PlannedCall {
  id: string;
  tool: CopilotTool;
  args: Record<string, unknown>;
  parse: "ok" | "repaired";
}

export interface RejectedCall {
  tool: string;
  raw: string;
  issues: string[];
}

export interface Plan {
  calls: PlannedCall[];
  rejected: RejectedCall[];
  note: string;
  costUsd: number;
}

export interface PlannerDeps {
  complete: (request: CompletionRequest) => Promise<Completion>;
  today?: string;
}

export function plannerSystemPrompt(today: string): string {
  return [
    "You are a YouTube creator copilot that uses vidIQ tools.",
    `Today is ${today}.`,
    "Pick the fewest tool calls that answer the creator. Most questions need one call; never more than three.",
    "Every paid call costs the creator credits, so never call the same tool twice with the same arguments.",
    "Use the creator's own words for keywords and titles. Do not invent video or channel IDs.",
    "If no tool fits, answer briefly in text and call nothing.",
  ].join("\n");
}

export async function planToolCalls(prompt: string, { complete, today = new Date().toISOString().slice(0, 10) }: PlannerDeps): Promise<Plan> {
  const messages: ChatMessage[] = [
    { role: "system", content: plannerSystemPrompt(today) },
    { role: "user", content: prompt },
  ];
  const first = await complete({ messages, tools: toolDefinitions() });
  let costUsd = first.costUsd;
  const calls: PlannedCall[] = [];
  const rejected: RejectedCall[] = [];

  for (const toolCall of (first.message.tool_calls ?? []).slice(0, MAX_CALLS_PER_QUESTION)) {
    const { name, arguments: raw } = toolCall.function;
    if (!isCopilotTool(name)) {
      rejected.push({ tool: name, raw, issues: ["tool is not in the read-only allowlist"] });
      continue;
    }
    const schema = groundedSchema(name, prompt);
    const parsed = await parseStructured(raw || "{}", schema, {
      repair: async (badRaw, issues) => {
        const fix = await complete({
          messages: [
            ...messages,
            {
              role: "user",
              content: `Your arguments for ${name} were invalid: ${issues.join("; ")}.\nInvalid arguments: ${badRaw}\nReply with only the corrected JSON arguments object.`,
            },
          ],
        });
        costUsd += fix.costUsd;
        return fix.message.content ?? "";
      },
    });
    if (parsed.status === "fallback") rejected.push({ tool: name, raw, issues: parsed.issues });
    else calls.push({ id: toolCall.id, tool: name, args: parsed.data, parse: parsed.status });
  }

  return { calls, rejected, note: first.message.content ?? "", costUsd };
}
