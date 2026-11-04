import { describe, expect, it } from "vitest";
import { buildSources } from "../../src/lib/claims/provenance";
import { ESPRESSO_STEPS } from "../../src/lib/claims/test-sources";
import { naiveFlags } from "./naive-exact-checker";

const sources = buildSources(ESPRESSO_STEPS);
const at = (text: string, needle: string, from = 0) => {
  const start = text.indexOf(needle, from);
  return { start, end: start + needle.length, text: needle };
};

describe("naiveFlags (reconstruction of the observed exact-string check)", () => {
  it("flags the creator's own score when the title cell carries *(yours)*", () => {
    const text = "| I Tried 5 Cheap Espresso Machines So You Don't Have To *(yours)* | 99 |";
    expect(naiveFlags(text, [at(text, "99")], sources)).toEqual([true]);
  });

  it("passes a title cell that matches exactly, ignoring surrounding quotes", () => {
    const text = '| "I Tested 5 Budget Espresso Machines So You Don\'t Have To" | 99 |';
    expect(naiveFlags(text, [at(text, "99")], sources)).toEqual([false]);
  });

  it("in prose without a quoted label, only checks that the number appears somewhere in the tool data", () => {
    const text = "home barista has competition 29 and gets 50,000 searches.";
    expect(naiveFlags(text, [at(text, "29"), at(text, "50,000")], sources)).toEqual([false, true]);
  });

  it("does not judge labels", () => {
    const text = "budget espresso machine has medium competition.";
    expect(naiveFlags(text, [at(text, "medium competition")], sources)).toEqual([false]);
  });
});
