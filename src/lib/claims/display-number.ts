/** How a number was written: "99/100" is a score, "60%" a percentage, "8,368" or "8.4K" a plain number. */
export type DisplayUnit = "plain" | "outOf100" | "percent";

export interface DisplayNumber {
  value: number;
  /** Smallest difference the written form can express: "8.4K" → 100, "60.0" → 0.1. */
  step: number;
  unit: DisplayUnit;
}

const NUMBER = /^([-+])?(\d[\d,]*)(?:\.(\d+))?\s*([KkMm])?\s*(%|\/\s*100)?$/;

export function parseDisplayNumber(text: string): DisplayNumber | undefined {
  const m = NUMBER.exec(text.trim());
  if (!m) return undefined;
  const [, sign, whole = "", fraction = "", suffix, tail] = m;
  const scale = !suffix ? 1 : suffix.toLowerCase() === "k" ? 1_000 : 1_000_000;
  const magnitude = Number(`${whole.replace(/,/g, "")}.${fraction || "0"}`) * scale;
  const value = Math.round((sign === "-" ? -magnitude : magnitude) * 1e6) / 1e6;
  const step = Math.round(10 ** -fraction.length * scale * 1e6) / 1e6;
  const unit: DisplayUnit = !tail ? "plain" : tail === "%" ? "percent" : "outOf100";
  return { value, step, unit };
}

/** The unit each source field is measured in. Fields not listed are plain counts. */
const FIELD_UNITS: Record<string, DisplayUnit> = {
  score: "outOf100",
  competition: "outOf100",
  volume: "outOf100",
  overall: "outOf100",
  growthPct: "percent",
  engagementPct: "percent",
};

function unitFits(written: DisplayUnit, field: string): boolean {
  if (written === "plain") return true;
  return (FIELD_UNITS[field] ?? "plain") === written;
}

/**
 * True when the written number is the source value at the precision the answer shows, in the field's unit.
 * "8.4K" matches 8368; "60" does not match monthlySearches 8368; "60%" does not match competition 60.
 */
export function matchesSource(written: string, source: number | string, field: string): boolean {
  const claimed = parseDisplayNumber(written);
  if (!claimed || !unitFits(claimed.unit, field)) return false;
  const actual = typeof source === "number" ? source : parseDisplayNumber(source)?.value;
  if (actual === undefined || !Number.isFinite(actual)) return false;
  return Math.abs(actual - claimed.value) <= claimed.step / 2 + 1e-9;
}

/** Formats a source value for a bare citation such as [[c1.score]]. */
export const formatSourceValue = (value: number | string): string =>
  typeof value === "number" ? value.toLocaleString("en-US", { maximumFractionDigits: 2 }) : value;
