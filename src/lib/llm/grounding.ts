import type { z } from "zod";
import { type CopilotTool, TOOL_ARGS } from "./copilot-tools";

/** Text the creator put in quotes. Single quotes run first-to-last so apostrophes inside survive. */
export function quotedSpans(prompt: string): string[] {
  const spans = [...prompt.matchAll(/"([^"]+)"|“([^”]+)”/g)].map((m) => (m[1] ?? m[2] ?? "").trim());
  const single = /'(.+)'/.exec(prompt)?.[1]?.trim();
  if (single) spans.push(single);
  return spans.filter(Boolean);
}

/** Fields that must be copied verbatim from the creator's quotes when quotes are present. */
const VERBATIM: Partial<Record<CopilotTool, string>> = {
  vidiq_score_title: "title",
  vidiq_generate_titles: "title",
};

/**
 * Schema for one planned call: the tool's zod schema plus checks against the creator's own words.
 * A title the model paraphrased would still pass the schema, and scoring it would waste credits.
 */
export function groundedSchema(tool: CopilotTool, prompt: string): z.ZodType<Record<string, unknown>> {
  const base: z.ZodType<Record<string, unknown>> = TOOL_ARGS[tool];
  const field = VERBATIM[tool];
  const spans = quotedSpans(prompt);
  if (!field || spans.length === 0) return base;
  return base.superRefine((args, ctx) => {
    const value = typeof args[field] === "string" ? (args[field] as string).trim() : "";
    if (!spans.includes(value)) {
      ctx.addIssue({ code: "custom", path: [field], message: `must be copied exactly from the creator's quotes: ${JSON.stringify(spans[0])}` });
    }
  });
}
