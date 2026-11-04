import { band, bandTone, formatNumber } from "@/lib/format";

const TONE = { good: "bg-good", warn: "bg-warn", bad: "bg-bad", none: "bg-line" } as const;
const TEXT = { good: "text-good", warn: "text-warn", bad: "text-bad", none: "text-muted" } as const;

/** A 0-100 score with a small bar and a vidIQ-style band label (High / Medium / Low). */
export function MetricCell({ metric, value }: { metric: "volume" | "competition" | "overall"; value: number | null }) {
  const b = band(metric, value);
  const tone = bandTone(metric, b);
  if (value === null) return <span className="text-muted" title="Unknown, not zero">—</span>;
  return (
    <span className="inline-flex items-center gap-2">
      <span className="tabular w-6 text-right font-medium">{formatNumber(value)}</span>
      <span className="hidden h-1.5 w-12 overflow-hidden rounded-full bg-surface-2 md:block" aria-hidden="true">
        <span className={`block h-full ${TONE[tone]}`} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
      </span>
      <span className={`text-[11px] capitalize ${TEXT[tone]}`}>{b}</span>
    </span>
  );
}
