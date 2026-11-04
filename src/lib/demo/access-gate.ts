/** Cookie that remembers a visitor who opened a valid access link. */
const ACCESS_COOKIE = "vidiq_demo_access";
const COOKIE_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;
const PRIVATE_MESSAGE = "This demo is private. Ask Chinh Hoang for an access link.";

const PRIVATE_PAGE = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>Private demo</title></head>
<body style="font:16px/1.5 system-ui,sans-serif;max-width:36rem;margin:15vh auto;padding:0 1.5rem;color:#111">
<h1 style="font-size:1.25rem">This demo is private</h1>
<p>Ask Chinh Hoang for an access link. The code is public:
<a href="https://github.com/hiimchinh/vidiq-creator-copilot">github.com/hiimchinh/vidiq-creator-copilot</a>.</p>
</body></html>`;

/**
 * Parses `DEMO_ACCESS_KEYS`: comma-separated `recipient:key` pairs, one key per person the demo
 * is shown to, so each can be revoked alone. Only the part after the colon is a key.
 */
function accessKeys(raw: string | undefined): Set<string> {
  const keys = (raw ?? "")
    .split(",")
    .map((entry) => entry.slice(entry.indexOf(":") + 1).trim())
    .filter(Boolean);
  return new Set(keys);
}

function cookieValue(request: Request, name: string): string | undefined {
  for (const part of (request.headers.get("cookie") ?? "").split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return rest.join("=");
  }
  return undefined;
}

/**
 * Gate in front of the whole demo. Returns the response to send (redirect that sets the access
 * cookie, 401, or 503 when unconfigured), or null when the request may go on.
 */
export function checkDemoAccess(request: Request, rawKeys: string | undefined): Response | null {
  const keys = accessKeys(rawKeys);
  if (keys.size === 0) {
    return new Response("Demo access is not configured.", { status: 503, headers: { "Cache-Control": "no-store" } });
  }

  const url = new URL(request.url);
  const linkKey = url.searchParams.get("key");
  if (linkKey !== null && keys.has(linkKey)) {
    url.searchParams.delete("key");
    return new Response(null, {
      status: 302,
      headers: {
        Location: url.toString(),
        "Set-Cookie": `${ACCESS_COOKIE}=${linkKey}; Path=/; Max-Age=${COOKIE_MAX_AGE_SECONDS}; HttpOnly; Secure; SameSite=Lax`,
        "Cache-Control": "no-store",
      },
    });
  }

  const cookieKey = cookieValue(request, ACCESS_COOKIE);
  if (cookieKey !== undefined && keys.has(cookieKey)) return null;

  if (url.pathname.startsWith("/api/")) {
    return Response.json({ error: PRIVATE_MESSAGE }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }
  return new Response(PRIVATE_PAGE, {
    status: 401,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex" },
  });
}
