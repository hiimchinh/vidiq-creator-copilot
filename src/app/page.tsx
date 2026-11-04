import { AppHeader } from "@/components/app-header";
import { ChatSidebar } from "@/components/chat-sidebar";
import { Copilot } from "@/components/copilot";
import { WebVitals } from "@/components/web-vitals";
import { isLiveModeEnabled } from "@/lib/demo/live-mode";
import { FEATURED_SCENARIO_ID, featuredTurn } from "@/lib/replay/featured-turn";
import { scenarioSummaries } from "@/lib/replay/replay-store";

const README_RUN_LOCALLY = "https://github.com/hiimchinh/vidiq-creator-copilot#run-it-locally-one-command-no-keys";
const VIDIQ_MCP_DOCS = "https://support.vidiq.com/en/articles/15082430-vidiq-mcp";
const LINK = "underline underline-offset-2 hover:text-ink";

function IndependentDemo() {
  return (
    <>
      Independent demo on the public{" "}
      <a className={LINK} href={VIDIQ_MCP_DOCS} target="_blank" rel="noopener noreferrer">
        vidIQ MCP
      </a>
      . Not made or endorsed by vidIQ.
    </>
  );
}

export default function Home() {
  // Read at build time: the page stays static. The API routes check LIVE_MODE again on every request.
  const liveEnabled = isLiveModeEnabled();
  const scenarios = scenarioSummaries();
  return (
    <>
      <ChatSidebar scenarios={scenarios} featuredScenarioId={FEATURED_SCENARIO_ID}>
        <p className="text-[11px] leading-relaxed text-muted">
          <IndependentDemo /> Replay uses real responses recorded on 4 Nov 2026.
          {!liveEnabled && (
            <span data-testid="live-off-note" className="block">
              Live mode runs locally with your own keys: see the{" "}
              <a className={LINK} href={README_RUN_LOCALLY} target="_blank" rel="noopener noreferrer">
                README
              </a>
              .
            </span>
          )}
        </p>
      </ChatSidebar>
      <div className="lg:pl-80">
        <AppHeader />
        <main className="mx-auto max-w-[800px] px-4 pt-3">
          <h1 className="sr-only">Creator Copilot: grow your channel without burning credits</h1>
          <Copilot scenarios={scenarios} liveEnabled={liveEnabled} featured={featuredTurn()}>
            <p className="text-center text-[11px] leading-relaxed text-muted lg:hidden">
              <IndependentDemo />
            </p>
          </Copilot>
        </main>
      </div>
      <WebVitals />
    </>
  );
}
