import { describe, expect, it } from "vitest";
import { matchesSource, parseDisplayNumber } from "./display-number";

describe("parseDisplayNumber", () => {
  it("reads counts with separators and K/M suffixes", () => {
    expect(parseDisplayNumber("8,368")).toEqual({ value: 8368, step: 1, unit: "plain" });
    expect(parseDisplayNumber("8.4K")).toEqual({ value: 8400, step: 100, unit: "plain" });
    expect(parseDisplayNumber("1.2M")).toEqual({ value: 1_200_000, step: 100_000, unit: "plain" });
  });

  it("reads scores, decimals and percentages", () => {
    expect(parseDisplayNumber("99/100")).toEqual({ value: 99, step: 1, unit: "outOf100" });
    expect(parseDisplayNumber("60.0")).toEqual({ value: 60, step: 0.1, unit: "plain" });
    expect(parseDisplayNumber("-37.8%")).toEqual({ value: -37.8, step: 0.1, unit: "percent" });
    expect(parseDisplayNumber("+83.5%")).toEqual({ value: 83.5, step: 0.1, unit: "percent" });
  });

  it("rejects text that is not a number", () => {
    expect(parseDisplayNumber("high")).toBeUndefined();
    expect(parseDisplayNumber("")).toBeUndefined();
  });
});

describe("matchesSource", () => {
  it("accepts the source value at the precision the answer displays", () => {
    expect(matchesSource("99", 99, "competition")).toBe(true);
    expect(matchesSource("99/100", 99, "score")).toBe(true);
    expect(matchesSource("60.0", 60, "competition")).toBe(true);
    expect(matchesSource("8.4K", 8368, "monthlySearches")).toBe(true);
    expect(matchesSource("8,368", 8368, "monthlySearches")).toBe(true);
    expect(matchesSource("-37.8%", -37.8, "growthPct")).toBe(true);
  });

  it("rejects a different number", () => {
    expect(matchesSource("98", 99, "score")).toBe(false);
    expect(matchesSource("8.3K", 8368, "monthlySearches")).toBe(false);
    expect(matchesSource("29", 26, "competition")).toBe(false);
  });

  it("rejects a unit mix-up even when the digits are right", () => {
    expect(matchesSource("60", 8368, "monthlySearches")).toBe(false);
    expect(matchesSource("60%", 60, "competition")).toBe(false);
    expect(matchesSource("8,368/100", 8368, "monthlySearches")).toBe(false);
  });

  it("compares text sources such as outlier view counts", () => {
    expect(matchesSource("1.2M", "1.2M", "views")).toBe(true);
    expect(matchesSource("1.3M", "1.2M", "views")).toBe(false);
  });
});
