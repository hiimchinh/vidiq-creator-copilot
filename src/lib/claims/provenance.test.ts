import { describe, expect, it } from "vitest";
import { buildSources, resolveRef, sourceData } from "./provenance";
import { ESPRESSO_SOURCES, ESPRESSO_STEPS } from "./test-sources";

describe("buildSources", () => {
  it("gives each tool call a short ref in call order and keeps call id, tool and args", () => {
    expect(ESPRESSO_SOURCES.map((s) => [s.ref, s.callId, s.tool])).toEqual([
      ["c1", "call_score", "vidiq_score_title"],
      ["c2", "call_titles", "vidiq_generate_titles"],
      ["c3", "call_keywords", "vidiq_keyword_research"],
    ]);
    expect(ESPRESSO_SOURCES[0]?.args).toEqual({ title: "I Tried 5 Cheap Espresso Machines So You Don't Have To" });
  });

  it("skips steps whose view carries no data", () => {
    const sources = buildSources([
      { id: "x", tool: "vidiq_outliers", args: {}, view: { kind: "empty", message: "none" } },
      ...ESPRESSO_STEPS.slice(0, 1),
    ]);
    expect(sources.map((s) => s.ref)).toEqual(["c1"]);
  });
});

describe("resolveRef", () => {
  it("binds a title score to its call, tool, args and field path", () => {
    const hit = resolveRef(ESPRESSO_SOURCES, "c1", "score");
    expect(hit).toMatchObject({ value: 99, path: "c1.score", field: "score", source: { callId: "call_score", tool: "vidiq_score_title" } });
  });

  it("walks array items by index or by keyword, case-insensitively", () => {
    expect(resolveRef(ESPRESSO_SOURCES, "c2", "titles.0.score")?.value).toBe(99);
    expect(resolveRef(ESPRESSO_SOURCES, "c3", "rows.Home Barista.competition")?.value).toBe(26);
    expect(resolveRef(ESPRESSO_SOURCES, "c3", "rows.budget espresso machine.monthlySearches")).toMatchObject({
      value: 8368,
      field: "monthlySearches",
    });
  });

  it("returns undefined for an unknown ref, a missing row or a non-scalar value", () => {
    expect(resolveRef(ESPRESSO_SOURCES, "c9", "score")).toBeUndefined();
    expect(resolveRef(ESPRESSO_SOURCES, "c3", "rows.espresso grinder.competition")).toBeUndefined();
    expect(resolveRef(ESPRESSO_SOURCES, "c3", "rows")).toBeUndefined();
  });
});

describe("sourceData", () => {
  it("exposes only the typed fields a claim can cite", () => {
    expect(sourceData({ kind: "titleScore", title: "T", score: 50, creditsUsed: 5 })).toEqual({ title: "T", score: 50 });
    expect(sourceData({ kind: "fallback", raw: "x", issues: [] })).toBeUndefined();
  });
});
