import { describe, expect, it } from "vitest";
import { type AnswerBlock, buildAnswerModel, type InlinePart } from "./answer-model";
import { ESPRESSO_SOURCES } from "./test-sources";

const NASTY = [
  "## Scorecard",
  "Your title **already** scores [[c1.score=99]]/100 — *don't* chase it.",
  "| # | Title | Score |",
  "|---|---|---|",
  "| 1 | I Tried 5 Cheap Espresso Machines So You Don't Have To *(yours)* | [[c1.score=99]] |",
  "- Swap `Cheap` for __Budget__ ([[c3.rows.budget espresso machine.monthlySearches=8,368]] searches).",
  "Heads up: \"Your current: \"My First Marathon Training Week\"\" is _fine_. See [docs](https://example.com).",
  "Still typing [[c1.sco",
].join("\n");

function texts(blocks: AnswerBlock[]): string[] {
  const out: string[] = [];
  const visit = (parts: InlinePart[]) => {
    for (const p of parts) out.push(p.kind === "text" ? p.text : p.claim.display);
  };
  for (const b of blocks) {
    if (b.kind === "table") [b.header, ...b.rows].forEach((row) => row.forEach(visit));
    else if (b.kind === "list") b.items.forEach(visit);
    else visit(b.parts);
  }
  return out;
}

describe("buildAnswerModel", () => {
  it("leaks no raw markdown or citation syntax into any UI text", () => {
    const all = texts(buildAnswerModel(NASTY, ESPRESSO_SOURCES)).join("\n");
    expect(all).not.toMatch(/\*|`|__|\[\[|\]\]|^#{1,6}[ \t]|\]\(|\|/m);
    expect(all).toContain("I Tried 5 Cheap Espresso Machines So You Don't Have To \n(yours)");
  });

  it("builds headings, paragraphs, a table and a list", () => {
    expect(buildAnswerModel(NASTY, ESPRESSO_SOURCES).map((b) => b.kind)).toEqual(["heading", "paragraph", "table", "list", "paragraph", "paragraph"]);
  });

  it("keeps verified claims as claim parts that carry their citation", () => {
    const table = buildAnswerModel(NASTY, ESPRESSO_SOURCES).find((b) => b.kind === "table");
    const cell = table?.kind === "table" ? table.rows[0]?.[2]?.[0] : undefined;
    expect(cell).toMatchObject({ kind: "claim", claim: { check: "verified", citation: { tool: "vidiq_score_title" } } });
  });
});
