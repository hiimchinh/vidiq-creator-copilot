import { describe, expect, it } from "vitest";
import { ToolCache } from "./tool-cache";

describe("ToolCache", () => {
  it("misses, then hits after set", () => {
    const cache = new ToolCache<string>({ ttlMs: 1000, now: () => 0 });
    expect(cache.get("k")).toBeUndefined();
    cache.set("k", "v");
    expect(cache.get("k")).toBe("v");
  });

  it("expires entries after the TTL", () => {
    let t = 0;
    const cache = new ToolCache<string>({ ttlMs: 1000, now: () => t });
    cache.set("k", "v");
    t = 999;
    expect(cache.get("k")).toBe("v");
    t = 1001;
    expect(cache.get("k")).toBeUndefined();
  });

  it("round-trips through a snapshot so it can live in sessionStorage", () => {
    const a = new ToolCache<number>({ ttlMs: 1000, now: () => 0 });
    a.set("k", 42);
    const b = ToolCache.fromSnapshot<number>(a.snapshot(), { ttlMs: 1000, now: () => 10 });
    expect(b.get("k")).toBe(42);
  });

  it("evicts the oldest entry when full", () => {
    const cache = new ToolCache<string>({ ttlMs: 1000, now: () => 0, maxEntries: 2 });
    cache.set("a", "1");
    cache.set("b", "2");
    cache.set("c", "3");
    expect(cache.get("a")).toBeUndefined();
    expect(cache.get("c")).toBe("3");
  });
});
