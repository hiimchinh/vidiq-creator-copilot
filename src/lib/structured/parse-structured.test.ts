import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { parseStructured } from "./parse-structured";

const Score = z.object({ score: z.number().min(0).max(100), title: z.string() });

describe("parseStructured", () => {
  it("returns ok for valid JSON", async () => {
    const r = await parseStructured('{"score": 71, "title": "x"}', Score);
    expect(r).toEqual({ status: "ok", data: { score: 71, title: "x" } });
  });

  it("returns ok for JSON wrapped in a markdown fence with prose around it", async () => {
    const r = await parseStructured('Here you go:\n```json\n{"score": 71, "title": "x"}\n```\nDone.', Score);
    expect(r.status).toBe("ok");
  });

  it("repairs trailing commas without calling the model", async () => {
    const repair = vi.fn();
    const r = await parseStructured('{"score": 71, "title": "x",}', Score, { repair });
    expect(r).toEqual({ status: "repaired", data: { score: 71, title: "x" }, issues: expect.any(Array) });
    expect(repair).not.toHaveBeenCalled();
  });

  it("asks the repair function exactly once for a schema violation", async () => {
    const repair = vi.fn().mockResolvedValue('{"score": 64, "title": "x"}');
    const r = await parseStructured('{"score": "high", "title": "x"}', Score, { repair });
    expect(r.status).toBe("repaired");
    expect(repair).toHaveBeenCalledTimes(1);
    expect(repair.mock.calls[0]?.[1]).toEqual(expect.arrayContaining([expect.stringContaining("score")]));
  });

  it("falls back with the raw text when the repair also fails", async () => {
    const repair = vi.fn().mockResolvedValue("still not json");
    const r = await parseStructured("The score is high!", Score, { repair });
    expect(r.status).toBe("fallback");
    if (r.status === "fallback") expect(r.raw).toBe("The score is high!");
    expect(repair).toHaveBeenCalledTimes(1);
  });

  it("falls back instead of throwing when the repair function throws", async () => {
    const repair = vi.fn().mockRejectedValue(new Error("network"));
    const r = await parseStructured("{bad", Score, { repair });
    expect(r.status).toBe("fallback");
  });

  it("falls back when there is no repair function and the data is invalid", async () => {
    const r = await parseStructured('{"score": 140, "title": "x"}', Score);
    expect(r.status).toBe("fallback");
  });
});
