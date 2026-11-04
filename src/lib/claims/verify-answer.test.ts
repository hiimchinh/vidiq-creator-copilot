import { describe, expect, it } from "vitest";
import { type ClaimSegment, verifyAnswer } from "./verify-answer";
import { ESPRESSO_SOURCES, MARATHON_SOURCES } from "./test-sources";

const claims = (text: string, sources = ESPRESSO_SOURCES) =>
  verifyAnswer(text, sources).segments.filter((s): s is ClaimSegment => s.kind !== "text");
const checks = (text: string, sources = ESPRESSO_SOURCES) => claims(text, sources).map((c) => c.check);

describe("verifyAnswer: provenance, not display text", () => {
  it("verifies the creator's own 99 even when the model decorates the title with *(yours)*", () => {
    const text = "| 1 | I Tried 5 Cheap Espresso Machines So You Don't Have To *(yours)* | [[c1.score=99]] |";
    expect(checks(text)).toEqual(["verified"]);
    expect(claims(text)[0]).toMatchObject({ display: "99", citation: { callId: "call_score", path: "c1.score", value: 99 } });
  });

  it('verifies the 86 behind a "Your current:" prefix', () => {
    const text = '| — | Your current: "My First Marathon Training Week" | [[c1.score=86]] |\nYour original is fine: [[c1.score=86]] is respectable.';
    expect(checks(text, MARATHON_SOURCES)).toEqual(["verified", "verified"]);
  });

  it("fills a bare ref with the source value", () => {
    expect(claims("Your title scores [[c1.score]]/100.")[0]).toMatchObject({ display: "99", check: "verified" });
  });

  it("flags a ref whose number disagrees with the source, and says what the source holds", () => {
    const [claim] = claims("It scores [[c1.score=98]].");
    expect(claim).toMatchObject({ check: "mismatch", display: "98" });
    expect(claim?.reason).toContain("99");
  });

  it("flags a unit mix-up: competition cited as monthly searches", () => {
    expect(checks("Only [[c3.rows.budget espresso machine.monthlySearches=60]] searches a month.")).toEqual(["mismatch"]);
  });

  it("flags a ref to a call that does not exist", () => {
    expect(checks("It scores [[c9.score=95]].")).toEqual(["no-source"]);
  });

  it("flags a metric number with no provenance", () => {
    const [claim] = claims("budget espresso machine gets about 50,000 searches a month.");
    expect(claim).toMatchObject({ check: "no-source", display: "50,000" });
  });

  it("flags a bare number in a table column whose header is a metric", () => {
    expect(checks("| # | Title | Score |\n|---|---|---|\n| 4 | Espresso Machines Ranked | 95 |")).toEqual(["no-source"]);
  });

  it("does not flag numbers inside quoted titles, ordinals or plain counts", () => {
    const text = 'Try "I Tried 5 Cheap Espresso Machines" as #2, or "Week 1 of 20". Here are 3 ideas.\n1. Keep it.';
    expect(checks(text)).toEqual([]);
  });
});

describe("verifyAnswer: labels come from the threshold table", () => {
  it("flags a qualitative metric claim with no number behind it", () => {
    const text = 'Use "I Tested The Cheapest Espresso Machines On Amazon" for the high search volume of "Amazon".';
    expect(claims(text)).toMatchObject([{ kind: "label", check: "no-source", display: "high search volume" }]);
  });

  it("checks a model-written label against the computed label of the cited number", () => {
    expect(checks("budget espresso machine has medium competition ([[c3.rows.budget espresso machine.competition=60]]).")).toEqual([
      "mismatch",
      "verified",
    ]);
    expect(checks("budget espresso machine: [[c3.rows.budget espresso machine.competition=60]] (high).")).toEqual(["verified", "verified"]);
    expect(checks("home barista is low competition at [[c3.rows.home barista.competition=26]].")).toEqual(["verified", "verified"]);
  });

  it("checks labels on the overall score too", () => {
    expect(checks("home barista has a high overall score of [[c3.rows.home barista.overall=62]].")).toEqual(["verified", "verified"]);
    expect(checks("budget espresso machine has a high overall score of [[c3.rows.budget espresso machine.overall=51]].")).toEqual([
      "mismatch",
      "verified",
    ]);
  });

  it("attaches the computed label to each cited competition number", () => {
    expect(claims("[[c3.rows.budget espresso machine.competition=60]]")[0]).toMatchObject({ label: "high competition" });
  });
});

describe("verifyAnswer: streaming and summary", () => {
  it("hides an unfinished ref while the answer is still streaming", () => {
    const { segments } = verifyAnswer("It scores [[c1.sc", ESPRESSO_SOURCES);
    expect(segments).toEqual([{ kind: "text", text: "It scores " }]);
  });

  it("counts verified and flagged claims", () => {
    const { summary } = verifyAnswer("[[c1.score=99]] and [[c1.score=98]] and 50,000 searches.", ESPRESSO_SOURCES);
    expect(summary).toEqual({ verified: 1, flagged: 2 });
  });
});
