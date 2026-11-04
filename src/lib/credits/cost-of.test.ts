import { describe, expect, it } from "vitest";
import { costOf } from "./cost-of";

// Expected values come from the vidIQ help center cost list
// (https://support.vidiq.com/en/articles/15082430-vidiq-mcp) and the MCP tool catalog.
describe("costOf", () => {
  it("charges 5 credits for research tools", () => {
    expect(costOf("vidiq_keyword_research", { keyword: "home espresso" })).toEqual({ kind: "fixed", credits: 5 });
    expect(costOf("vidiq_outliers", { keyword: "budget travel" })).toEqual({ kind: "fixed", credits: 5 });
    expect(costOf("vidiq_score_title", { title: "x", type: "long" })).toEqual({ kind: "fixed", credits: 5 });
  });

  it("knows the free utility tools", () => {
    expect(costOf("vidiq_balance", {})).toEqual({ kind: "fixed", credits: 0 });
    expect(costOf("vidiq_trend_categories", {})).toEqual({ kind: "fixed", credits: 0 });
  });

  it("knows the expensive analysis and generation tools", () => {
    expect(costOf("vidiq_video_watch", { videoId: "abc" })).toEqual({ kind: "fixed", credits: 25 });
    expect(costOf("vidiq_watch_shortform_content", {})).toEqual({ kind: "fixed", credits: 10 });
    expect(costOf("vidiq_generate_thumbnail", {})).toEqual({ kind: "fixed", credits: 22 });
  });

  it("prices voiceovers at 14 credits per started 1,000 characters", () => {
    expect(costOf("vidiq_voiceover_generate", { script: "a".repeat(2500) })).toEqual({ kind: "fixed", credits: 42 });
    expect(costOf("vidiq_voiceover_generate", { script: "a".repeat(1000) })).toEqual({ kind: "fixed", credits: 14 });
  });

  it("prices scripts at 1 credit per minute", () => {
    expect(costOf("vidiq_generate_script", { lengthMinutes: 8 })).toEqual({ kind: "fixed", credits: 8 });
  });

  it("does not charge for comment-insights cursor pages", () => {
    expect(costOf("vidiq_comment_insights", { cursor: "next" })).toEqual({ kind: "fixed", credits: 0 });
    expect(costOf("vidiq_comment_insights", { videoId: "abc" })).toEqual({ kind: "fixed", credits: 5 });
  });

  it("returns unknown for duration-priced tools without enough input", () => {
    expect(costOf("vidiq_generate_video", { prompt: "x" }).kind).toBe("unknown");
    expect(costOf("vidiq_voiceover_generate", {}).kind).toBe("unknown");
  });

  it("returns unknown, ask, for a tool it has never seen", () => {
    expect(costOf("vidiq_brand_new_tool", {})).toEqual({ kind: "unknown", reason: "ask" });
  });
});
