import type { z } from "zod";

export type Parsed<T> =
  | { status: "ok"; data: T }
  | { status: "repaired"; data: T; issues: string[] }
  | { status: "fallback"; raw: string; issues: string[] };

/** Second chance for invalid output, usually the model re-asked with the issues. Called at most once. */
export type RepairFn = (raw: string, issues: string[]) => Promise<string>;

type Attempt<T> = { ok: true; data: T } | { ok: false; issues: string[] };

/** Pulls the JSON payload out of fences or surrounding prose. */
export function extractJson(text: string): string {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(text);
  const body = (fenced?.[1] ?? text).trim();
  const start = body.search(/[[{]/);
  if (start < 0) return body;
  const open = body[start];
  const end = body.lastIndexOf(open === "{" ? "}" : "]");
  return end > start ? body.slice(start, end + 1) : body.slice(start);
}

/** Cheap, deterministic fixes for the most common model slips. */
function localRepair(json: string): string {
  return json
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/,\s*([}\]])/g, "$1");
}

function attempt<T>(json: string, schema: z.ZodType<T>): Attempt<T> {
  let value: unknown;
  try {
    value = JSON.parse(json);
  } catch (error) {
    return { ok: false, issues: [`invalid JSON: ${(error as Error).message}`] };
  }
  const result = schema.safeParse(value);
  if (result.success) return { ok: true, data: result.data };
  return {
    ok: false,
    issues: result.error.issues.map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`),
  };
}

/**
 * Validates model output against a zod schema. Never throws.
 * ok → valid as given; repaired → valid after a local fix or one repair call; fallback → show raw text.
 */
export async function parseStructured<T>(
  text: string,
  schema: z.ZodType<T>,
  options: { repair?: RepairFn } = {},
): Promise<Parsed<T>> {
  const json = extractJson(text);
  const first = attempt(json, schema);
  if (first.ok) return { status: "ok", data: first.data };

  const fixed = localRepair(json);
  if (fixed !== json) {
    const local = attempt(fixed, schema);
    if (local.ok) return { status: "repaired", data: local.data, issues: first.issues };
  }

  if (!options.repair) return { status: "fallback", raw: text, issues: first.issues };
  try {
    const repairedText = await options.repair(text, first.issues);
    const second = attempt(localRepair(extractJson(repairedText)), schema);
    if (second.ok) return { status: "repaired", data: second.data, issues: first.issues };
    return { status: "fallback", raw: text, issues: [...first.issues, ...second.issues] };
  } catch (error) {
    return { status: "fallback", raw: text, issues: [...first.issues, `repair failed: ${(error as Error).message}`] };
  }
}
