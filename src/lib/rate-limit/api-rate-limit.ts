/** The shape of the Cloudflare Workers Rate Limiting binding (`env.API_RATE_LIMITER`). */
export interface RateLimiter {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

/** Must match the binding's `simple` config in wrangler.jsonc: 30 requests per 60 s per key. */
export const API_RATE_LIMIT = { limit: 30, periodSeconds: 60 } as const;

/** Cloudflare sets this on every request and overwrites any client-sent value. */
const CLIENT_IP_HEADER = "cf-connecting-ip";

/**
 * Per-IP limit on every /api/* route, run before Next.js. Returns the 429 response, or null
 * when the request may go on. Without a bound limiter (local `next start`) it never limits.
 */
export async function rateLimitApi(request: Request, limiter: RateLimiter | undefined): Promise<Response | null> {
  if (!limiter || !new URL(request.url).pathname.startsWith("/api/")) return null;
  const key = request.headers.get(CLIENT_IP_HEADER) ?? "no-client-ip";
  const { success } = await limiter.limit({ key });
  if (success) return null;
  return Response.json(
    { error: "Too many requests. Try again in a minute." },
    { status: 429, headers: { "Retry-After": String(API_RATE_LIMIT.periodSeconds), "Cache-Control": "no-store" } },
  );
}
