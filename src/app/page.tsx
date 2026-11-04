import { AppHeader } from "@/components/app-header";
import { Copilot } from "@/components/copilot";
import { WebVitals } from "@/components/web-vitals";
import { scenarioSummaries } from "@/lib/replay/replay-store";

export default function Home() {
  return (
    <>
      <AppHeader />
      <main className="mx-auto flex max-w-5xl flex-col gap-4 px-4 pt-6">
        <section className="flex flex-col gap-2">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Grow your channel without burning credits.</h1>
          <p className="max-w-2xl text-muted">
            Ask about keywords, titles or breakout videos. Every paid vidIQ call shows its credit cost first, identical calls come
            from cache for 0 credits, and a paid call is never retried on its own.
          </p>
          <p className="text-xs text-muted">
            Independent demo built on the public{" "}
            <a className="underline underline-offset-2 hover:text-ink" href="https://support.vidiq.com/en/articles/15082430-vidiq-mcp" target="_blank" rel="noopener noreferrer">
              vidIQ MCP
            </a>
            . Not made or endorsed by vidIQ. Replay mode uses real responses recorded on 4 Nov 2026.
          </p>
        </section>
        <Copilot scenarios={scenarioSummaries()} />
      </main>
      <WebVitals />
    </>
  );
}
