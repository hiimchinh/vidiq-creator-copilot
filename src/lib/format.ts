import { type Label, labelFor } from "./claims/metric-labels";

export { formatCost } from "./credits/cost-of";

const compact = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });
const full = new Intl.NumberFormat("en");

export const formatCompact = (n: number | null) => (n === null ? "—" : compact.format(n));
export const formatNumber = (n: number | null) => (n === null ? "—" : full.format(n));
export const formatPct = (n: number | null) => (n === null ? "—" : `${n > 0 ? "+" : ""}${n.toFixed(1)}%`);

export const TOOL_LABELS: Record<string, string> = {
  vidiq_keyword_research: "Keyword research",
  vidiq_score_title: "Score title",
  vidiq_generate_titles: "Title ideas",
  vidiq_outliers: "Outlier videos",
  vidiq_channel_stats: "Channel stats",
  vidiq_video_stats: "Video stats",
  vidiq_trend_categories: "Trend categories",
};

export const toolLabel = (tool: string) => TOOL_LABELS[tool] ?? tool.replace(/^vidiq_/, "").replaceAll("_", " ");

/** One-line human summary of the arguments that matter, for cost cards. */
export function argsSummary(args: Record<string, unknown>): string {
  return Object.entries(args)
    .filter(([key, value]) => key !== "userGoal" && value !== undefined && value !== "")
    .map(([key, value]) => `${key}: ${typeof value === "string" ? `“${value}”` : JSON.stringify(value)}`)
    .join(" · ");
}

export type Band = Label;

/** Labels come from the one threshold table in claims/metric-labels; a title score uses the overall bands. */
export function band(metric: "volume" | "competition" | "overall" | "score", value: number | null): Band | null {
  if (value === null) return null;
  return labelFor(metric === "score" ? "overall" : metric, value) ?? null;
}

export function bandTone(metric: "volume" | "competition" | "overall" | "score", b: Band | null): "good" | "warn" | "bad" | "none" {
  if (!b) return "none";
  const good = metric === "competition" ? b === "low" : b === "high";
  const bad = metric === "competition" ? b === "high" : b === "low";
  return good ? "good" : bad ? "bad" : "warn";
}
