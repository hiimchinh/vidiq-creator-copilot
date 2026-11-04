import { ToolCache } from "../cache/tool-cache";
import { cacheKey } from "../cache/cache-key";
import type { McpCallResult } from "../mcp/mcp-client";
import type { ResultView } from "../schemas/view-types";

export interface CachedCall {
  result: McpCallResult;
  view: ResultView;
}
import type { Mode } from "./api-types";

const STORAGE_KEY = "copilot-tool-cache";
const OPTIONS = { ttlMs: 6 * 60 * 60 * 1000, maxEntries: 100 };
let cache: ToolCache<CachedCall> | undefined;

function load(): ToolCache<CachedCall> {
  if (cache) return cache;
  let snapshot: unknown = [];
  try {
    snapshot = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    // Private mode or corrupted entry: start empty.
  }
  cache = ToolCache.fromSnapshot<CachedCall>(snapshot, OPTIONS);
  return cache;
}

/** Replay and Live answers never mix, even for identical arguments. */
const key = (mode: Mode, tool: string, args: Record<string, unknown>) => `${mode}|${cacheKey(tool, args)}`;

export function getCached(mode: Mode, tool: string, args: Record<string, unknown>): CachedCall | undefined {
  return typeof window === "undefined" ? undefined : load().get(key(mode, tool, args));
}

export function putCached(mode: Mode, tool: string, args: Record<string, unknown>, entry: CachedCall): void {
  if (typeof window === "undefined" || !entry.result.ok) return; // never cache failures
  const c = load();
  c.set(key(mode, tool, args), entry);
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(c.snapshot()));
  } catch {
    // Quota exceeded: the in-memory cache still works for this tab.
  }
}
