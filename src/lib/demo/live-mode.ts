import { NextResponse } from "next/server";

export const LIVE_MODE_OFF_MESSAGE = "Live mode is off on this public demo. Run it locally with your own keys: see the README.";

/**
 * Live mode is on unless the server sets LIVE_MODE=off. The public demo sets it, so it never
 * reaches OpenRouter or vidIQ with anyone's key; local runs keep Live mode as before.
 */
export function isLiveModeEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env.LIVE_MODE?.trim().toLowerCase() !== "off";
}

/** 403 for a live request when Live mode is off; undefined when the request may go on. */
export function refuseLiveMode(mode: "replay" | "live"): NextResponse | undefined {
  if (mode !== "live" || isLiveModeEnabled()) return undefined;
  return NextResponse.json({ error: LIVE_MODE_OFF_MESSAGE }, { status: 403, headers: { "Cache-Control": "no-store" } });
}
