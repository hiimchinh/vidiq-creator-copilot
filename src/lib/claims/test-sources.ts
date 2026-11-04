import type { KeywordRow } from "../schemas/view-types";
import { buildSources, type SourceStep } from "./provenance";

const row = (keyword: string, competition: number, monthlySearches: number, overall: number): KeywordRow => ({
  keyword,
  section: "relatedKeywords",
  volume: 55,
  competition,
  overall,
  monthlySearches,
  growthPct: null,
});

/** Tool results rebuilt from the vidIQ AI Coach screenshots of 4 Nov 2026 and our own recordings. */
export const ESPRESSO_STEPS: SourceStep[] = [
  {
    id: "call_score",
    tool: "vidiq_score_title",
    args: { title: "I Tried 5 Cheap Espresso Machines So You Don't Have To" },
    view: { kind: "titleScore", title: "I Tried 5 Cheap Espresso Machines So You Don't Have To", score: 99 },
  },
  {
    id: "call_titles",
    tool: "vidiq_generate_titles",
    args: { title: "I Tried 5 Cheap Espresso Machines So You Don't Have To" },
    view: { kind: "titles", titles: [{ title: "I Tested 5 Budget Espresso Machines So You Don't Have To", score: 99 }] },
  },
  {
    id: "call_keywords",
    tool: "vidiq_keyword_research",
    args: { keyword: "home espresso" },
    view: {
      kind: "keywords",
      notes: [],
      rows: [row("home espresso", 29, 4836, 61), row("home barista", 26, 4341, 62), row("budget espresso machine", 60, 8368, 51)],
    },
  },
];

export const ESPRESSO_SOURCES = buildSources(ESPRESSO_STEPS);

export const MARATHON_SOURCES = buildSources([
  {
    id: "call_marathon",
    tool: "vidiq_score_title",
    args: { title: "My First Marathon Training Week" },
    view: { kind: "titleScore", title: "My First Marathon Training Week", score: 86 },
  },
]);
