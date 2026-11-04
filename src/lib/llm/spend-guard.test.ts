import { describe, expect, it } from "vitest";
import { SpendGuard } from "./spend-guard";

describe("SpendGuard", () => {
  it("allows calls until the daily USD cap is reached", () => {
    const guard = new SpendGuard({ capUsd: 0.01, now: () => new Date("2026-11-04T03:00:00Z") });
    expect(guard.canSpend()).toBe(true);
    guard.record(0.006);
    expect(guard.canSpend()).toBe(true);
    guard.record(0.005);
    expect(guard.canSpend()).toBe(false);
    expect(guard.spentUsd()).toBeCloseTo(0.011);
  });

  it("resets on a new Vietnam calendar day, not a UTC day", () => {
    let now = new Date("2026-11-04T16:30:00Z"); // 23:30 on 4 Nov in Ho Chi Minh City
    const guard = new SpendGuard({ capUsd: 0.01, now: () => now });
    guard.record(0.02);
    expect(guard.canSpend()).toBe(false);
    now = new Date("2026-11-04T17:30:00Z"); // 00:30 on 5 Nov in Ho Chi Minh City
    expect(guard.canSpend()).toBe(true);
  });
});
