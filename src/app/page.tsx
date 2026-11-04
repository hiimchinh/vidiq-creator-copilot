import { AppHeader } from "@/components/app-header";
import { Copilot } from "@/components/copilot";
import { NewChatRail } from "@/components/new-chat-rail";
import { WebVitals } from "@/components/web-vitals";
import { isLiveModeEnabled } from "@/lib/demo/live-mode";
import { featuredTurn } from "@/lib/replay/featured-turn";
import { scenarioSummaries } from "@/lib/replay/replay-store";

const README_RUN_LOCALLY = "https://github.com/hiimchinh/vidiq-creator-copilot#run-it-locally-one-command-no-keys";
const VIDIQ_MCP_DOCS = "https://support.vidiq.com/en/articles/15082430-vidiq-mcp";

export default function Home() {
  // Read at build time: the page stays static. The API routes check LIVE_MODE again on every request.
  const liveEnabled = isLiveModeEnabled();
  return (
    <>
      <NewChatRail />
      <div className="md:pl-16">
        <AppHeader liveEnabled={liveEnabled} />
        <main className="mx-auto max-w-[800px] px-4 pt-3">
          <h1 className="sr-only">Creator Copilot: grow your channel without burning credits</h1>
          <Copilot scenarios={scenarioSummaries()} liveEnabled={liveEnabled} featured={featuredTurn()}>
            <p className="text-center text-[11px] leading-relaxed text-muted">
              Independent demo on the public{" "}
              <a className="underline underline-offset-2 hover:text-ink" href={VIDIQ_MCP_DOCS} target="_blank" rel="noopener noreferrer">
                vidIQ MCP
              </a>
              . Not made or endorsed by vidIQ.<span className="hidden sm:inline"> Replay uses real responses recorded on 4 Nov 2026.</span>
              {!liveEnabled && (
                <span data-testid="live-off-note" className="hidden sm:block">
                  Live mode runs locally with your own keys: see the{" "}
                  <a className="underline underline-offset-2 hover:text-ink" href={README_RUN_LOCALLY} target="_blank" rel="noopener noreferrer">
                    README
                  </a>
                  .
                </span>
              )}
            </p>
          </Copilot>
        </main>
      </div>
      <WebVitals />
    </>
  );
}
