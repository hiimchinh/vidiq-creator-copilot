import { describe, expect, it } from "vitest";
import { cacheKey } from "../cache/cache-key";
import { findReplayResult, matchScenario, scenarioSummaries } from "./replay-store";

describe("replay store", () => {
  it("matches a recorded prompt exactly", () => {
    expect(matchScenario("Find outlier videos in budget travel from the last three months.")?.id).toBe("outliers-budget-travel");
  });

  it("matches a close paraphrase", () => {
    expect(matchScenario("keyword research for home espresso")?.id).toBe("keyword-home-espresso");
  });

  it("does not guess for an unrelated question", () => {
    expect(matchScenario("How do I edit a vlog in DaVinci Resolve?")).toBeUndefined();
  });

  it("serves a recorded vidIQ result by cache key", () => {
    const result = findReplayResult(cacheKey("vidiq_channel_stats", { channelId: "@veritasium" }));
    expect(result?.ok).toBe(true);
  });

  it("lists scenarios for the chips without the heavy payloads", () => {
    const list = scenarioSummaries();
    expect(list.length).toBeGreaterThanOrEqual(5);
    expect(Object.keys(list[0] ?? {})).toEqual(["id", "label", "prompt"]);
  });
});
