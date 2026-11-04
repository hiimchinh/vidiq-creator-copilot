import { describe, expect, it } from "vitest";
import { ANSWER_SYSTEM_PROMPT, answerMessages } from "./answer";

const title = "I Tried 5 Cheap Espresso Machines So You Don't Have To";

describe("answerMessages", () => {
  it("labels each citable tool result with the ref the client will verify against", () => {
    const [, user] = answerMessages("Score this", [
      { tool: "vidiq_score_title", args: { title }, text: '{"score":99,"_credits":{"used":5}}' },
      { tool: "vidiq_keyword_research", args: { keyword: "x" }, text: "no keyword data was found" },
      { tool: "vidiq_generate_titles", args: { title }, text: '{"titles":[{"title":"A","score":97}]}' },
    ]);
    expect(user?.content).toContain(`### c1 vidiq_score_title`);
    expect(user?.content).toContain(`{"title":"${title}","score":99}`);
    expect(user?.content).toContain("### c2 vidiq_generate_titles");
    expect(user?.content).toContain("(not citable) vidiq_keyword_research");
  });

  it("asks for [[ref.path=value]] citations and forbids model-written labels", () => {
    expect(ANSWER_SYSTEM_PROMPT).toContain("[[c1.score=99]]");
    expect(ANSWER_SYSTEM_PROMPT).toMatch(/low, medium or high/);
  });
});
