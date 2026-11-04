import { CreditMeter } from "./credit-meter";
import { ModeSwitch } from "./mode-switch";
import { ThemeToggle } from "./theme-toggle";

export function AppHeader({ liveEnabled }: { liveEnabled: boolean }) {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-bg/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <span aria-hidden="true" className="grid size-6 place-items-center rounded-md bg-accent text-[11px] font-bold text-surface">
            CC
          </span>
          <span className="font-semibold">Creator Copilot</span>
          <span className="hidden rounded border border-line px-1.5 py-0.5 text-[11px] text-muted sm:inline">
            Independent demo · not affiliated with vidIQ
          </span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <CreditMeter />
          <ModeSwitch liveEnabled={liveEnabled} />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
