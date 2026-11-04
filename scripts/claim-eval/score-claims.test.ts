import { describe, expect, it } from "vitest";
import { type ClaimCase, scoreCase } from "./score-claims";

const base: Omit<ClaimCase, "answer" | "truth"> = {
  id: "t",
  kind: "test",
  note: "",
  calls: [{ id: "call_a", tool: "vidiq_score_title", args: { title: "T" }, view: { kind: "titleScore", title: "T", score: 99 } }],
};

describe("scoreCase", () => {
  it("counts false positives and false negatives for both checkers against the truth", () => {
    const result = scoreCase({
      ...base,
      answer: "| T *(yours)* | [[c1.score=99]] |\nIt gets 50,000 searches.",
      truth: [
        { text: "99", ok: true },
        { text: "50,000", ok: false },
      ],
    });
    expect(result.naive).toEqual({ fp: 1, fn: 0, ok: 1, bad: 1 });
    expect(result.ours).toEqual({ fp: 0, fn: 0, ok: 1, bad: 1 });
  });

  it("counts a flag on something that is not a claim as a false positive", () => {
    const result = scoreCase({ ...base, answer: "Score [[c1.score=99]] and 7 searches.", truth: [{ text: "99", ok: true }] });
    expect(result.ours.fp).toBe(1);
  });

  it("refuses a truth entry it cannot find in the answer", () => {
    expect(() => scoreCase({ ...base, answer: "nothing", truth: [{ text: "42", ok: true }] })).toThrow(/42/);
  });
});
