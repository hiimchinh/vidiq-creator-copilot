/**
 * Credit prices for vidIQ MCP tools, taken from the tool catalog ("Cost: N credit(s) per call")
 * and the vidIQ help center. Prices that depend on output length are computed when the
 * arguments carry enough information; otherwise the caller must ask the user.
 */
export type Cost = { kind: "fixed"; credits: number } | { kind: "unknown"; reason: string };

const FIXED: Record<string, number> = {
  // Free utilities
  vidiq_balance: 0,
  vidiq_get_images: 0,
  vidiq_user_channels: 0,
  vidiq_trend_categories: 0,
  vidiq_submit_feedback: 0,
  vidiq_list_competitors: 0,
  vidiq_bookmarks_list: 0,
  vidiq_bookmarks_save: 0,
  vidiq_bookmarks_remove: 0,
  vidiq_update_competitors: 0,
  vidiq_voiceover_list_voices: 0,
  vidiq_jobs_list: 0,
  vidiq_job_poll: 0,
  vidiq_video_upload: 0,
  // Research, stats and scoring: 5 credits per call
  ...Object.fromEntries(
    [
      "keyword_research", "outliers", "similar_thumbnails", "channel_stats", "trending_videos",
      "channel_search", "video_earnings_estimate", "earnings_calculate", "video_stats",
      "video_change_history", "get_videos_by_ids", "youtube_search", "get_channels_by_ids",
      "user_videos", "channel_videos", "video_transcript", "video_comments",
      "channel_performance_trends", "channel_analytics", "subscriber_insights", "similar_channels",
      "score_title", "score_thumbnail", "generate_titles", "generate_video_chapters", "ig_profile",
      "ig_profile_reels", "instagram_tiktok_outlier_search",
    ].map((name) => [`vidiq_${name}`, 5]),
  ),
  vidiq_generate_comment_replies: 1,
  vidiq_generate_broll: 1,
  vidiq_voiceover_clone_start: 1,
  vidiq_watch_shortform_content: 10,
  vidiq_ig_accounts_from_outliers: 10,
  vidiq_generate_thumbnail: 22,
  vidiq_refine_thumbnail: 22,
  vidiq_video_watch: 25,
  vidiq_generate_music: 25,
  vidiq_voiceover_clone: 50,
};

const fixed = (credits: number): Cost => ({ kind: "fixed", credits });
const unknown = (reason: string): Cost => ({ kind: "unknown", reason });

type Variable = (args: Record<string, unknown>) => Cost;

const VARIABLE: Record<string, Variable> = {
  // 14 credits per 1,000 characters of script, rounded up
  vidiq_voiceover_generate: (args) =>
    typeof args.script === "string" && args.script.length > 0
      ? fixed(Math.ceil(args.script.length / 1000) * 14)
      : unknown("depends on script length"),
  // 1 credit per minute of script
  vidiq_generate_script: (args) =>
    typeof args.lengthMinutes === "number" && args.lengthMinutes > 0
      ? fixed(Math.ceil(args.lengthMinutes))
      : unknown("depends on script length"),
  // 5 credits per discover/validate/new search; raw cursor pages are free
  vidiq_comment_insights: (args) => (args.cursor ? fixed(0) : fixed(5)),
  vidiq_generate_clips: () => unknown("depends on source video duration"),
  vidiq_generate_video: () => unknown("depends on model, length and resolution"),
  vidiq_compose: () => unknown("depends on output duration"),
  vidiq_motion_graphics: () => unknown("depends on output duration"),
  vidiq_edit_media: () => unknown("depends on the number of edits"),
};

export function costOf(tool: string, args: Record<string, unknown> = {}): Cost {
  const variable = VARIABLE[tool];
  if (variable) return variable(args);
  const credits = FIXED[tool];
  return credits === undefined ? unknown("ask") : fixed(credits);
}

export function formatCost(cost: Cost): string {
  if (cost.kind === "unknown") return "unknown cost";
  return cost.credits === 1 ? "1 credit" : `${cost.credits} credits`;
}
