import { describe, expect, it, vi } from "vitest";
import { planToolCalls } from "./planner";
import type { Completion } from "./openrouter";

const call = (name: string, args: string) => ({ id: `c-${name}`, type: "function" as const, function: { name, arguments: args } });
const reply = (tool_calls: ReturnType<typeof call>[], content = ""): Completion => ({
  message: { role: "assistant", content, tool_calls },
  costUsd: 0.0001,
});

describe("planToolCalls", () => {
  it("returns validated calls from the model", async () => {
    const complete = vi.fn().mockResolvedValue(reply([call("vidiq_keyword_research", '{"keyword":"home espresso"}')]));
    const plan = await planToolCalls("keyword research for home espresso", { complete });
    expect(plan.calls).toEqual([
      expect.objectContaining({ tool: "vidiq_keyword_research", args: { keyword: "home espresso" }, parse: "ok" }),
    ]);
    expect(plan.rejected).toEqual([]);
  });

  it("re-asks the model once when arguments break the schema", async () => {
    const complete = vi
      .fn()
      .mockResolvedValueOnce(reply([call("vidiq_score_title", '{"title":"My title","type":"video"}')]))
      .mockResolvedValueOnce({ message: { role: "assistant", content: '{"title":"My title","type":"long"}' }, costUsd: 0 });
    const plan = await planToolCalls("score my title", { complete });
    expect(complete).toHaveBeenCalledTimes(2);
    expect(plan.calls[0]).toMatchObject({ tool: "vidiq_score_title", args: { type: "long" }, parse: "repaired" });
  });

  it("rejects tools outside the read-only allowlist, even if the model names them", async () => {
    const complete = vi.fn().mockResolvedValue(reply([call("vidiq_generate_thumbnail", '{"prompt":"x"}')]));
    const plan = await planToolCalls("make me a thumbnail", { complete });
    expect(plan.calls).toEqual([]);
    expect(plan.rejected[0]).toMatchObject({ tool: "vidiq_generate_thumbnail" });
  });

  it("keeps the model's text when it answers without tools", async () => {
    const complete = vi.fn().mockResolvedValue(reply([], "Hi! Ask me about keywords, titles or outliers."));
    const plan = await planToolCalls("hello", { complete });
    expect(plan.calls).toEqual([]);
    expect(plan.note).toContain("keywords");
  });

  it("caps the number of tool calls per question", async () => {
    const many = Array.from({ length: 6 }, (_, i) => call("vidiq_keyword_research", JSON.stringify({ keyword: `k${i}` })));
    const complete = vi.fn().mockResolvedValue(reply(many));
    const plan = await planToolCalls("lots", { complete });
    expect(plan.calls).toHaveLength(3);
  });

  it("re-asks when the model changes a quoted title, so credits are not spent scoring the wrong text", async () => {
    const prompt = "Score this title: 'I Tried 5 Cheap Espresso Machines So You Don't Have To'";
    const complete = vi
      .fn()
      .mockResolvedValueOnce(reply([call("vidiq_score_title", '{"title":"I Tried 5 Cheap Cheap Espresso Machines So You Don\'t Have To","type":"long"}')]))
      .mockResolvedValueOnce({
        message: { role: "assistant", content: '{"title":"I Tried 5 Cheap Espresso Machines So You Don\'t Have To","type":"long"}' },
        costUsd: 0,
      });
    const plan = await planToolCalls(prompt, { complete });
    expect(complete).toHaveBeenCalledTimes(2);
    expect(plan.calls[0]).toMatchObject({ args: { title: "I Tried 5 Cheap Espresso Machines So You Don't Have To" }, parse: "repaired" });
  });
});

