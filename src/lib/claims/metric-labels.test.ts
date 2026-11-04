import { describe, expect, it } from "vitest";
import { LABEL_BANDS, labelFor, normalizeLabel } from "./metric-labels";

describe("labelFor (one threshold table, never the model)", () => {
  it("labels competition with fixed, inclusive lower bounds", () => {
    expect(labelFor("competition", 0)).toBe("low");
    expect(labelFor("competition", 39.9)).toBe("low");
    expect(labelFor("competition", 40)).toBe("medium");
    expect(labelFor("competition", 59.9)).toBe("medium");
    expect(labelFor("competition", 60)).toBe("high");
    expect(labelFor("competition", 100)).toBe("high");
  });

  it("gives the same label for the same value every time (vidIQ showed 60 as both med and high)", () => {
    expect(labelFor("competition", 60)).toBe(labelFor("competition", 60.0));
    expect(labelFor("competition", 43)).toBe("medium");
    expect(labelFor("competition", 28.5)).toBe("low");
  });

  it("labels monthly searches as counts, not as a 0-100 score", () => {
    expect(labelFor("monthlySearches", 999)).toBe("low");
    expect(labelFor("monthlySearches", 1000)).toBe("medium");
    expect(labelFor("monthlySearches", 8368)).toBe("medium");
    expect(labelFor("monthlySearches", 33475)).toBe("high");
  });

  it("returns undefined for fields without bands and for out-of-range scores", () => {
    expect(labelFor("score", 99)).toBeUndefined();
    expect(labelFor("competition", 140)).toBeUndefined();
    expect(labelFor("competition", -1)).toBeUndefined();
  });

  it("documents every band in one exported table", () => {
    expect(Object.keys(LABEL_BANDS).sort()).toEqual(["competition", "monthlySearches", "overall", "volume"]);
  });

  it("normalizes the words a model uses for a label", () => {
    expect(normalizeLabel("Med")).toBe("medium");
    expect(normalizeLabel("moderate")).toBe("medium");
    expect(normalizeLabel("HIGH")).toBe("high");
    expect(normalizeLabel("huge")).toBeUndefined();
  });
});
