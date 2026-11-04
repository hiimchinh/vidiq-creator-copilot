import { describe, expect, it } from "vitest";
import { toResultView } from "./result-view";

const KEYWORDS = `## Keyword research — mode: research

### seedKeyword (1)
| keyword | volume | competition | overall | estimatedMonthlySearch | searchDemandGrowthPct | topMarkets (top 3) |
|---|---|---|---|---|---|---|
| home espresso | 55 | 29 | 61 | 4836 | null | none |

### relatedKeywords (2)
| keyword | volume | competition | overall | estimatedMonthlySearch | searchDemandGrowthPct | topMarkets (top 3) |
|---|---|---|---|---|---|---|
| espresso machine | 66 | 62 | 55 | 24767 | -37.8% | none |
| espresso | 85 | 74 | 61 | 460746 | -18.6% | IN 23%, VN 8%, US 8% |

Note: Null or missing values are unknown, not 0: report those rows separately and keep real zeros and negative changes.`;

const OUTLIER = `Found 1 breakout long-form videos for "budget travel".

### 1. The Cheapest Way to Do Paris Nobody Is Talking About
- **Channel:** Les Frenchies · 483K subscribers · US · channelId \`UC5m1fPLNTZCgLjIzO5iy-Ng\`
- **Performance:** 182.1K views · 1x breakout · 13.9 views/hour · 2.8% engagement
- **Details:** published 2026-08-21 (2 months ago) · 24:17
- **Video:** videoId \`NqbUACgFjgM\` · thumbnail https://i.ytimg.com/vi/NqbUACgFjgM/maxresdefault.jpg`;

describe("toResultView", () => {
  it("turns a keyword markdown table into typed rows, keeping null as unknown", () => {
    const view = toResultView("vidiq_keyword_research", { ok: true, text: KEYWORDS });
    expect(view.kind).toBe("keywords");
    if (view.kind !== "keywords") return;
    expect(view.rows).toHaveLength(3);
    expect(view.rows[0]).toEqual({
      keyword: "home espresso", section: "seedKeyword", volume: 55, competition: 29, overall: 61, monthlySearches: 4836, growthPct: null,
    });
    expect(view.rows[1]).toMatchObject({ keyword: "espresso machine", growthPct: -37.8 });
    expect(view.notes[0]).toContain("Null or missing values are unknown");
  });

  it("reads question tables, whose first column is called question", () => {
    const text = "### questions (1)\n| question | volume | competition | overall | estimatedMonthlySearch | searchDemandGrowthPct |\n|---|---|---|---|---|---|\n| how to use a sourdough starter | 54 | 32 | 60 | 4469 | null |";
    const view = toResultView("vidiq_keyword_research", { ok: true, text });
    expect(view.kind === "keywords" && view.rows[0]?.keyword).toBe("how to use a sourdough starter");
  });

  it("shows an empty state when vidIQ found nothing", () => {
    const view = toResultView("vidiq_keyword_research", { ok: true, text: "## Keyword research\n\nNo keyword data was found.\n" });
    expect(view).toMatchObject({ kind: "empty" });
  });

  it("parses outlier videos from the markdown list", () => {
    const view = toResultView("vidiq_outliers", { ok: true, text: OUTLIER, structured: { answer: OUTLIER } });
    expect(view.kind).toBe("outliers");
    if (view.kind !== "outliers") return;
    expect(view.videos[0]).toEqual({
      title: "The Cheapest Way to Do Paris Nobody Is Talking About",
      channel: "Les Frenchies",
      subscribers: "483K",
      views: "182.1K",
      breakout: 1,
      vph: 13.9,
      engagementPct: 2.8,
      publishedAt: "2026-08-21",
      duration: "24:17",
      videoId: "NqbUACgFjgM",
    });
  });

  it("validates structured title scores", () => {
    expect(toResultView("vidiq_score_title", { ok: true, text: "", structured: { score: 99, _credits: { used: 5 } } }, { title: "My title" }))
      .toEqual({ kind: "titleScore", title: "My title", score: 99, creditsUsed: 5 });
    const titles = toResultView("vidiq_generate_titles", { ok: true, text: "", structured: { titles: [{ title: "A", score: 97 }] } });
    expect(titles).toMatchObject({ kind: "titles", titles: [{ title: "A", score: 97 }] });
  });

  it("falls back with the raw text when the shape is not what we expect", () => {
    const view = toResultView("vidiq_score_title", { ok: true, text: '{"score":"very high"}', structured: { score: "very high" } }, { title: "x" });
    expect(view).toMatchObject({ kind: "fallback", raw: '{"score":"very high"}' });
    expect(toResultView("vidiq_outliers", { ok: true, text: "Something changed upstream" })).toMatchObject({ kind: "fallback" });
  });

  it("maps a failed call to an error view", () => {
    const view = toResultView("vidiq_outliers", { ok: false, error: { kind: "credits", message: "Not enough vidIQ credits", retryable: false } });
    expect(view).toEqual({ kind: "error", errorKind: "credits", message: "Not enough vidIQ credits" });
  });
});
