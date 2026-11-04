import { z } from "zod";

const goal = z.string().max(300).optional().describe("The creator's goal in one short sentence, in your own words.");

/**
 * The read-only vidIQ tools the copilot may call. The model sees JSON Schemas generated from
 * these zod schemas, and every tool call it makes is validated against the same schemas.
 */
export const TOOL_ARGS = {
  vidiq_keyword_research: z.object({
    keyword: z.string().min(1).max(150).describe("Seed keyword, e.g. 'home espresso'."),
    mode: z
      .enum(["research", "questions", "matching_terms"])
      .optional()
      .describe("research = volume, competition and related keywords; questions = question searches; matching_terms = long-tail variations."),
    limit: z.number().int().min(1).max(50).optional().describe("Rows to return. Default 20."),
    userGoal: goal,
  }),
  vidiq_score_title: z.object({
    title: z.string().min(1).max(200).describe("The exact title to score."),
    type: z.enum(["long", "short"]).describe("long-form video or a Short."),
    userGoal: goal,
  }),
  vidiq_generate_titles: z.object({
    title: z.string().min(1).max(500).describe("The creator's working title."),
    description: z.string().min(1).max(2000).optional().describe("What the video is about."),
    numTitles: z.number().int().min(1).max(10).optional().describe("How many suggestions. Default 3."),
    type: z.enum(["long", "short"]).optional(),
  }),
  vidiq_outliers: z.object({
    keyword: z.string().min(1).max(500).describe("Topic, e.g. 'budget travel'."),
    contentType: z.enum(["long", "short"]).optional(),
    publishedWithin: z
      .enum(["thisWeek", "thisMonth", "threeMonths", "sixMonths", "oneYear"])
      .optional()
      .describe("Only when the creator asks for a time window."),
    limit: z.number().int().min(1).max(24).optional().describe("Videos to return. Default 12."),
    userGoal: goal,
  }),
  vidiq_channel_stats: z.object({
    channelId: z.string().min(1).describe("Channel ID (UC...) or handle like '@veritasium'."),
    from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("Start date YYYY-MM-DD. Default 30 days ago."),
    to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    userGoal: goal,
  }),
  vidiq_video_stats: z.object({
    videoId: z.string().min(1).describe("YouTube video ID or URL."),
    granularity: z.enum(["hourly", "daily", "monthly"]),
    userGoal: goal,
  }),
  vidiq_trend_categories: z.object({}),
} as const;

export type CopilotTool = keyof typeof TOOL_ARGS;
export const COPILOT_TOOLS = Object.keys(TOOL_ARGS) as CopilotTool[];

export const isCopilotTool = (name: string): name is CopilotTool => Object.hasOwn(TOOL_ARGS, name);

const DESCRIPTIONS: Record<CopilotTool, string> = {
  vidiq_keyword_research:
    "YouTube keyword research: search volume, competition, overall score and related keywords. Use for keyword or topic demand questions.",
  vidiq_score_title: "Score one YouTube title for click-through potential (0-100).",
  vidiq_generate_titles: "Suggest stronger scored YouTube titles from a working title.",
  vidiq_outliers: "Find videos that got far more views than their channel's usual video (breakout hits) for a topic.",
  vidiq_channel_stats: "A channel's subscribers, views and growth over a date range.",
  vidiq_video_stats: "A video's views, likes, comments and views-per-hour over time.",
  vidiq_trend_categories: "List video format categories (tier lists, reactions...). Free.",
};

export interface OpenAiTool {
  type: "function";
  function: { name: string; description: string; parameters: Record<string, unknown> };
}

export function toolDefinitions(): OpenAiTool[] {
  return COPILOT_TOOLS.map((name) => {
    const { $schema: _ignored, ...parameters } = z.toJSONSchema(TOOL_ARGS[name]) as Record<string, unknown>;
    return { type: "function", function: { name, description: DESCRIPTIONS[name], parameters } };
  });
}
