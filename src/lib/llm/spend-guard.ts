const dayFormatter = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" });

/** Hard daily USD cap on LLM spend. The day boundary is midnight in Vietnam, where the budget owner lives. */
export class SpendGuard {
  private day = "";
  private spent = 0;
  private readonly capUsd: number;
  private readonly now: () => Date;

  constructor({ capUsd, now = () => new Date() }: { capUsd: number; now?: () => Date }) {
    this.capUsd = capUsd;
    this.now = now;
  }

  private roll(): void {
    const today = dayFormatter.format(this.now());
    if (today !== this.day) {
      this.day = today;
      this.spent = 0;
    }
  }

  canSpend(): boolean {
    this.roll();
    return this.spent < this.capUsd;
  }

  record(usd: number): void {
    this.roll();
    if (Number.isFinite(usd) && usd > 0) this.spent += usd;
  }

  spentUsd(): number {
    this.roll();
    return this.spent;
  }

  remainingUsd(): number {
    return Math.max(0, this.capUsd - this.spentUsd());
  }
}
