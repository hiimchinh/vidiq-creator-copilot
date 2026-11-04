import { describe, expect, it } from "vitest";
import { decideRun } from "./run-policy";

const base = { cached: false, autoRun: false, capCredits: 20, spentCredits: 0 };

describe("decideRun", () => {
  it("serves a cached call for free, whatever the settings", () => {
    expect(decideRun({ ...base, cost: { kind: "fixed", credits: 5 }, cached: true })).toBe("cached");
  });

  it("runs free tools without asking", () => {
    expect(decideRun({ ...base, cost: { kind: "fixed", credits: 0 } })).toBe("auto");
  });

  it("asks for confirmation by default for paid tools", () => {
    expect(decideRun({ ...base, cost: { kind: "fixed", credits: 5 } })).toBe("confirm");
  });

  it("auto-runs a paid tool only while the session stays under the cap", () => {
    expect(decideRun({ ...base, autoRun: true, spentCredits: 15, cost: { kind: "fixed", credits: 5 } })).toBe("auto");
    expect(decideRun({ ...base, autoRun: true, spentCredits: 16, cost: { kind: "fixed", credits: 5 } })).toBe("confirm");
  });

  it("always asks when the cost is unknown", () => {
    expect(decideRun({ ...base, autoRun: true, cost: { kind: "unknown", reason: "ask" } })).toBe("confirm");
  });
});
