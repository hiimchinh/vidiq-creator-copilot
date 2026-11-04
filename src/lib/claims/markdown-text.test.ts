import { describe, expect, it } from "vitest";
import { inlineMarks, quoteOnce, stripMarkdown } from "./markdown-text";

describe("stripMarkdown", () => {
  it("removes the emphasis that leaked into vidIQ's warning", () => {
    expect(stripMarkdown("I Tried 5 Cheap Espresso Machines So You Don't Have To *(yours)*")).toBe(
      "I Tried 5 Cheap Espresso Machines So You Don't Have To (yours)",
    );
  });

  it("removes bold, italics, code, headings and links", () => {
    expect(stripMarkdown("**Swap** one _word_: `Cheap`")).toBe("Swap one word: Cheap");
    expect(stripMarkdown("## Scorecard")).toBe("Scorecard");
    expect(stripMarkdown("see [vidIQ](https://vidiq.com)")).toBe("see vidIQ");
  });

  it("keeps apostrophes, arithmetic and snake_case words intact", () => {
    expect(stripMarkdown("Don't Have To")).toBe("Don't Have To");
    expect(stripMarkdown("2 * 3 = 6")).toBe("2 * 3 = 6");
    expect(stripMarkdown("score_title")).toBe("score_title");
  });
});

describe("quoteOnce", () => {
  it("never nests quotes around a title that already has them", () => {
    expect(quoteOnce('Your current: "My First Marathon Training Week"')).toBe("“Your current: ‘My First Marathon Training Week’”");
    expect(quoteOnce('"My First Marathon Training Week"')).toBe("“My First Marathon Training Week”");
    expect(quoteOnce("**Title** *(yours)*")).toBe("“Title (yours)”");
  });
});

describe("inlineMarks", () => {
  it("turns markdown emphasis into flags and keeps no markers in the text", () => {
    expect(inlineMarks("a **bold** and *soft* `code` end")).toEqual([
      { text: "a " },
      { text: "bold", strong: true },
      { text: " and " },
      { text: "soft", em: true },
      { text: " code end" },
    ]);
  });
});
