import { CreditMeter } from "./credit-meter";
import { ModeSwitch } from "./mode-switch";
import { SettingsMenu } from "./settings-menu";
import { ThemeToggle } from "./theme-toggle";

export function AppHeader({ liveEnabled }: { liveEnabled: boolean }) {
  return (
    <header className="sticky top-0 z-20 bg-bg/95 backdrop-blur">
      <div className="flex items-center gap-x-2 px-4 py-3 sm:gap-x-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-2">
          <span aria-hidden="true" className="grid size-7 place-items-center rounded-md bg-accent text-[11px] font-bold text-surface">
            CC
          </span>
          <span className="hidden font-semibold sm:inline">Creator Copilot</span>
          <span className="hidden rounded border border-line px-1.5 py-0.5 text-[11px] text-muted lg:inline">
            Independent demo · not affiliated with vidIQ
          </span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <CreditMeter />
          <ModeSwitch liveEnabled={liveEnabled} />
          <SettingsMenu />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
