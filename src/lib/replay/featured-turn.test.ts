import { describe, expect, it } from "vitest";
import { featuredTurn } from "./featured-turn";

describe("featuredTurn (the recorded espresso turn shown on landing)", () => {
  const turn = featuredTurn("title-espresso");

  it("is the recorded question with both vidIQ calls done and the recorded answer", () => {
    expect(turn?.prompt).toBe("Score this title and suggest stronger variations: 'I Tried 5 Cheap Espresso Machines So You Don't Have To'");
    expect(turn?.steps.map((s) => [s.id, s.status, s.charged])).toEqual([
      ["call_249407", "done", 5],
      ["call_249410", "done", 5],
    ]);
    expect(turn?.answer).toContain("| 1 | **I Tried 5 Cheap Espresso Machines So You Don't Have To** (yours) | [[c1.score=99]] |");
    expect(turn?.status).toBe("done");
    expect(turn?.featured).toBe(true);
  });

  it("reports the recorded answer time (last chunk at 1160 ms), not an invented one", () => {
    expect(turn?.workedMs).toBe(1160);
  });

  it("returns undefined for an unknown scenario", () => {
    expect(featuredTurn("nope")).toBeUndefined();
  });
});
