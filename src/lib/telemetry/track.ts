type Props = Record<string, string | number | boolean | null>;

/** Fire-and-forget monitoring event. Never send prompts, keys or tool results here. */
export function track(name: "tool_call" | "answer" | "schema_fallback" | "plan" | "web_vital" | "client_error", props: Props = {}): void {
  if (typeof window === "undefined") return;
  const body = JSON.stringify({ name, props });
  if (navigator.sendBeacon?.("/api/telemetry", new Blob([body], { type: "application/json" }))) return;
  void fetch("/api/telemetry", { method: "POST", body, keepalive: true }).catch(() => {});
}
