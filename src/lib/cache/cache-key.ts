/** Fields whose meaning does not depend on letter case (search terms, not titles). */
const CASE_INSENSITIVE = new Set(["keyword", "niche", "includeKeyword", "excludeKeyword"]);
/** Fields the model writes for analytics; they do not change the result. */
const IGNORED = new Set(["userGoal"]);
/** Documented defaults, so `{mode: "research"}` and `{}` share one cache entry. */
const DEFAULTS: Record<string, Record<string, unknown>> = {
  vidiq_keyword_research: { mode: "research" },
  vidiq_outliers: { limit: 20, requireAllTitleTerms: false },
};

function normalizeValue(field: string, value: unknown): unknown {
  if (typeof value === "string") {
    const collapsed = value.trim().replace(/\s+/g, " ");
    return CASE_INSENSITIVE.has(field) ? collapsed.toLowerCase() : collapsed;
  }
  if (Array.isArray(value)) return value.map((item) => normalizeValue(field, item));
  return value;
}

function isEmpty(value: unknown): boolean {
  return value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0);
}

export function normalizeArgs(tool: string, args: Record<string, unknown>): Record<string, unknown> {
  const merged = { ...DEFAULTS[tool], ...args };
  const out: Record<string, unknown> = {};
  for (const field of Object.keys(merged).sort()) {
    if (IGNORED.has(field)) continue;
    const value = normalizeValue(field, merged[field]);
    if (!isEmpty(value)) out[field] = value;
  }
  return out;
}

/** Stable key for "the same question to the same tool". */
export function cacheKey(tool: string, args: Record<string, unknown>): string {
  return `${tool}:${JSON.stringify(normalizeArgs(tool, args))}`;
}
