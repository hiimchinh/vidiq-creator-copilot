import { CreditMeter } from "./credit-meter";
import { SettingsMenu } from "./settings-menu";
import { ThemeToggle } from "./theme-toggle";

/** Minimal, like the coach UI: credit settings and theme at top right. The credit meter sits here only below 1024 px. */
export function AppHeader() {
  return (
    <header className="sticky top-0 z-20 bg-bg/95 backdrop-blur">
      <div className="flex items-center gap-2 px-4 py-3 sm:px-5">
        <div className="lg:hidden">
          <CreditMeter />
        </div>
        <div className="ml-auto flex items-center gap-2">
          <SettingsMenu />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
