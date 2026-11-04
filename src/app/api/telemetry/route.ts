import { z } from "zod";

const EventSchema = z.object({
  name: z.enum(["tool_call", "answer", "schema_fallback", "plan", "web_vital", "client_error"]),
  props: z.record(z.string(), z.union([z.string().max(200), z.number(), z.boolean(), z.null()])).default({}),
});

/**
 * Monitoring sink. Writes one structured JSON line per event to stdout, where any log
 * pipeline (Datadog, Grafana Loki, Cloud Logging) can pick it up. Never receives keys or prompts.
 */
export async function POST(request: Request) {
  const text = await request.text();
  if (text.length > 2048) return new Response(null, { status: 413 });
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return new Response(null, { status: 400 });
  }
  const parsed = EventSchema.safeParse(json);
  if (!parsed.success) return new Response(null, { status: 400 });
  console.info(JSON.stringify({ at: new Date().toISOString(), event: parsed.data.name, ...parsed.data.props }));
  return new Response(null, { status: 204 });
}
