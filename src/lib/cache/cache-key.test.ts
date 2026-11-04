import { describe, expect, it } from "vitest";
import { cacheKey } from "./cache-key";

describe("cacheKey", () => {
  it("ignores argument order", () => {
    expect(cacheKey("vidiq_outliers", { keyword: "budget travel", limit: 20 })).toBe(
      cacheKey("vidiq_outliers", { limit: 20, keyword: "budget travel" }),
    );
  });

  it("trims and collapses whitespace in strings", () => {
    expect(cacheKey("vidiq_keyword_research", { keyword: "  home   espresso " })).toBe(
      cacheKey("vidiq_keyword_research", { keyword: "home espresso" }),
    );
  });

  it("treats keyword-like fields as case-insensitive", () => {
    expect(cacheKey("vidiq_keyword_research", { keyword: "Home Espresso" })).toBe(
      cacheKey("vidiq_keyword_research", { keyword: "home espresso" }),
    );
  });

  it("keeps titles case-sensitive because casing changes the score", () => {
    expect(cacheKey("vidiq_score_title", { title: "I Tried It", type: "long" })).not.toBe(
      cacheKey("vidiq_score_title", { title: "i tried it", type: "long" }),
    );
  });

  it("drops the model-written userGoal and empty values", () => {
    expect(
      cacheKey("vidiq_outliers", { keyword: "budget travel", userGoal: "grow a channel", channelCountry: "", x: null }),
    ).toBe(cacheKey("vidiq_outliers", { keyword: "budget travel" }));
  });

  it("applies documented defaults so explicit and implicit defaults match", () => {
    expect(cacheKey("vidiq_keyword_research", { keyword: "sourdough", mode: "research" })).toBe(
      cacheKey("vidiq_keyword_research", { keyword: "sourdough" }),
    );
  });

  it("separates tools and different arguments", () => {
    expect(cacheKey("vidiq_outliers", { keyword: "a" })).not.toBe(cacheKey("vidiq_keyword_research", { keyword: "a" }));
    expect(cacheKey("vidiq_outliers", { keyword: "a" })).not.toBe(cacheKey("vidiq_outliers", { keyword: "b" }));
  });
});
