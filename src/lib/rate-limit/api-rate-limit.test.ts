import { describe, expect, it } from "vitest";
import { type RateLimiter, rateLimitApi } from "./api-rate-limit";

/**
 * Stand-in for the Cloudflare Workers Rate Limiting binding (the external boundary):
 * a fixed window of `limit` calls per key, like the binding configured with period 60.
 */
function windowLimiter(limit: number) {
  const counts = new Map<string, number>();
  const keys: string[] = [];
  const limiter: RateLimiter = {
    async limit({ key }) {
      keys.push(key);
      const n = (counts.get(key) ?? 0) + 1;
      counts.set(key, n);
      return { success: n <= limit };
    },
  };
  return { limiter, keys };
}

const req = (path: string, headers: Record<string, string> = {}) =>
  new Request(`https://vidiq-demo.example${path}`, { method: "POST", headers });

describe("rateLimitApi", () => {
  it("lets 30 API requests a minute through, then answers 429 with Retry-After", async () => {
    const { limiter } = windowLimiter(30);
    const ip = { "cf-connecting-ip": "203.0.113.7" };
    for (let i = 0; i < 30; i++) expect(await rateLimitApi(req("/api/plan", ip), limiter)).toBeNull();
    const blocked = await rateLimitApi(req("/api/plan", ip), limiter);
    expect(blocked?.status).toBe(429);
    expect(blocked?.headers.get("Retry-After")).toBe("60");
    expect(((await blocked?.json()) as { error: string }).error).toBe("Too many requests. Try again in a minute.");
  });

  it("counts every /api/* route against the same per-IP budget", async () => {
    const { limiter, keys } = windowLimiter(30);
    const ip = { "cf-connecting-ip": "203.0.113.7" };
    for (const path of ["/api/plan", "/api/tool", "/api/answer", "/api/balance", "/api/telemetry"]) {
      await rateLimitApi(req(path, ip), limiter);
    }
    expect(keys).toEqual(Array(5).fill("203.0.113.7"));
  });

  it("keys on cf-connecting-ip only, so a spoofed X-Forwarded-For does not buy a fresh budget", async () => {
    const { limiter, keys } = windowLimiter(1);
    await rateLimitApi(req("/api/plan", { "cf-connecting-ip": "203.0.113.7", "x-forwarded-for": "198.51.100.1" }), limiter);
    const second = await rateLimitApi(req("/api/plan", { "cf-connecting-ip": "203.0.113.7", "x-forwarded-for": "198.51.100.2" }), limiter);
    expect(keys).toEqual(["203.0.113.7", "203.0.113.7"]);
    expect(second?.status).toBe(429);
  });

  it("gives each IP its own budget", async () => {
    const { limiter } = windowLimiter(1);
    await rateLimitApi(req("/api/plan", { "cf-connecting-ip": "203.0.113.7" }), limiter);
    expect(await rateLimitApi(req("/api/plan", { "cf-connecting-ip": "203.0.113.8" }), limiter)).toBeNull();
  });

  it("never limits the page or static assets", async () => {
    const { limiter, keys } = windowLimiter(0);
    expect(await rateLimitApi(req("/", { "cf-connecting-ip": "203.0.113.7" }), limiter)).toBeNull();
    expect(await rateLimitApi(req("/_next/static/chunks/app.js", { "cf-connecting-ip": "203.0.113.7" }), limiter)).toBeNull();
    expect(await rateLimitApi(req("/apiary", { "cf-connecting-ip": "203.0.113.7" }), limiter)).toBeNull();
    expect(keys).toEqual([]);
  });

  it("does nothing when no limiter is bound (local next start)", async () => {
    expect(await rateLimitApi(req("/api/plan", { "cf-connecting-ip": "203.0.113.7" }), undefined)).toBeNull();
  });
});
