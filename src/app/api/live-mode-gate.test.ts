import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { POST as answer } from "./answer/route";
import { POST as balance } from "./balance/route";
import { POST as plan } from "./plan/route";
import { POST as tool } from "./tool/route";

const REPLAY_PROMPT = "Find outlier videos in budget travel from the last three months.";

const post = (url: string, body: unknown, headers: Record<string, string> = {}) =>
  new Request(`http://localhost${url}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });

// No vidIQ key and no OpenRouter key: with the gate off, every request below fails locally
// (401 or a missing-key error) before any network call, so the suite never leaves the process.
const liveRequests = () => [
  { name: "plan", handler: plan, request: post("/api/plan", { mode: "live", prompt: REPLAY_PROMPT }) },
  {
    name: "tool",
    handler: tool,
    request: post("/api/tool", { mode: "live", tool: "vidiq_channel_stats", args: { channelId: "@veritasium" } }),
  },
  {
    name: "answer",
    handler: answer,
    request: post("/api/answer", { mode: "live", prompt: REPLAY_PROMPT, evidence: [], skipped: 0 }),
  },
  { name: "balance", handler: balance, request: post("/api/balance", {}) },
];

describe("LIVE_MODE=off (public Replay-only demo)", () => {
  let saved: { live?: string; openrouter?: string };
  beforeEach(() => {
    saved = { live: process.env.LIVE_MODE, openrouter: process.env.OPENROUTER_API_KEY };
    delete process.env.OPENROUTER_API_KEY;
  });
  afterEach(() => {
    if (saved.live === undefined) delete process.env.LIVE_MODE;
    else process.env.LIVE_MODE = saved.live;
    if (saved.openrouter !== undefined) process.env.OPENROUTER_API_KEY = saved.openrouter;
  });

  it.each(liveRequests().map((r) => [r.name, r] as const))("refuses a live %s request with 403 and points to the README", async (_, r) => {
    process.env.LIVE_MODE = "off";
    const response = await r.handler(r.request);
    expect(response.status).toBe(403);
    const body = (await response.json()) as { error: string };
    expect(body.error).toBe("Live mode is off on this public demo. Run it locally with your own keys: see the README.");
  });

  it("still serves a Replay plan", async () => {
    process.env.LIVE_MODE = "off";
    const response = await plan(post("/api/plan", { mode: "replay", prompt: REPLAY_PROMPT }));
    expect(response.status).toBe(200);
    expect(((await response.json()) as { scenarioId?: string }).scenarioId).toBe("outliers-budget-travel");
  });

  it("still serves a recorded Replay tool result", async () => {
    process.env.LIVE_MODE = "off";
    const response = await tool(post("/api/tool", { mode: "replay", tool: "vidiq_channel_stats", args: { channelId: "@veritasium" } }));
    expect(response.status).toBe(200);
    expect(((await response.json()) as { result: { ok: boolean } }).result.ok).toBe(true);
  });

  it.each(liveRequests().map((r) => [r.name, r] as const))("leaves live %s untouched when LIVE_MODE is unset", async (_, r) => {
    delete process.env.LIVE_MODE;
    const response = await r.handler(r.request);
    expect(response.status).not.toBe(403);
  });
});
