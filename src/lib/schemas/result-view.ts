import type { McpCallResult } from "../mcp/mcp-client";
import { parseKeywordMarkdown } from "./parse-keyword-markdown";
import { parseOutliersMarkdown } from "./parse-outliers-markdown";
import { ChannelStatsSchema, GeneratedTitlesSchema, type ResultView, TitleScoreSchema } from "./view-types";

const NOT_FOUND = /no (keyword|video|matching)? ?(data|results|videos)[^.]*(found|returned)|no keyword data was found/i;

function structuredOrJson(result: { text: string; structured?: unknown }): unknown {
  if (result.structured !== undefined) return result.structured;
  try {
    return JSON.parse(result.text);
  } catch {
    return undefined;
  }
}

const fallback = (raw: string, issues: string[]): ResultView => ({ kind: "fallback", raw, issues });

/**
 * Turns a raw vidIQ tool result into something a component can render. Never throws:
 * anything unexpected becomes a fallback view that shows the raw text.
 */
export function toResultView(tool: string, result: McpCallResult, args: Record<string, unknown> = {}): ResultView {
  if (!result.ok) return { kind: "error", errorKind: result.error.kind, message: result.error.message };
  const text = result.text;

  switch (tool) {
    case "vidiq_keyword_research": {
      const { rows, notes, issues } = parseKeywordMarkdown(text);
      if (rows.length > 0) return { kind: "keywords", rows, notes };
      if (NOT_FOUND.test(text)) return { kind: "empty", message: "vidIQ found no keyword data for this phrase. Try a broader seed keyword." };
      return fallback(text, issues.length ? issues : ["no keyword table in the response"]);
    }
    case "vidiq_outliers": {
      const markdown = (structuredOrJson(result) as { answer?: string } | undefined)?.answer ?? text;
      const { videos, issues } = parseOutliersMarkdown(markdown);
      if (videos.length > 0) return { kind: "outliers", videos };
      if (NOT_FOUND.test(markdown)) return { kind: "empty", message: "No breakout videos matched. Try a wider time window." };
      return fallback(text, issues.length ? issues : ["no videos in the response"]);
    }
    case "vidiq_score_title": {
      const parsed = TitleScoreSchema.safeParse(structuredOrJson(result));
      if (!parsed.success) return fallback(text, parsed.error.issues.map((i) => i.message));
      const view: ResultView = { kind: "titleScore", title: String(args.title ?? ""), score: parsed.data.score };
      return parsed.data._credits ? { ...view, creditsUsed: parsed.data._credits.used } : view;
    }
    case "vidiq_generate_titles": {
      const parsed = GeneratedTitlesSchema.safeParse(structuredOrJson(result));
      if (!parsed.success) return fallback(text, parsed.error.issues.map((i) => i.message));
      const titles = [...parsed.data.titles].sort((a, b) => b.score - a.score);
      return parsed.data._credits ? { kind: "titles", titles, creditsUsed: parsed.data._credits.used } : { kind: "titles", titles };
    }
    case "vidiq_channel_stats": {
      const parsed = ChannelStatsSchema.safeParse(structuredOrJson(result));
      if (!parsed.success) return fallback(text, parsed.error.issues.map((i) => i.message));
      const d = parsed.data;
      return { kind: "channel", title: d.title, thumbnail: d.thumbnail, current: d.currentStats, growth: d.growth, daily: d.dailyStats };
    }
    default:
      return fallback(text, [`no renderer for ${tool}`]);
  }
}
