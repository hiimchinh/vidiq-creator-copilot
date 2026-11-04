import { describe, expect, it } from "vitest";
import { labelFor } from "./claims/metric-labels";
import { band } from "./format";

describe("band (keyword table labels)", () => {
  it("uses the same threshold table as answer citations, so the table and the answer never disagree", () => {
    for (const value of [0, 26, 34, 39.9, 40, 43, 59.9, 60, 61.5, 74, 100]) {
      expect(band("competition", value)).toBe(labelFor("competition", value));
      expect(band("overall", value)).toBe(labelFor("overall", value));
      expect(band("volume", value)).toBe(labelFor("volume", value));
    }
  });
});
