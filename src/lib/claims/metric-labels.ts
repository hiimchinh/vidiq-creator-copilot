/**
 * The only place a low/medium/high label is decided. The model never writes labels; the UI and the
 * verifier read them from this table, so one value always gets one label.
 *
 * Each band is [lower bound inclusive, label]. Scores are vidIQ's 0-100 scales; monthlySearches is a count.
 * These are this demo's bands, chosen once and documented here; a production build would take vidIQ's own.
 */
export type Label = "low" | "medium" | "high";

interface Bands {
  /** What the label describes, for UI text such as "high competition". */
  noun: string;
  min: number;
  max: number;
  bands: readonly (readonly [number, Label])[];
}

export const LABEL_BANDS = {
  competition: { noun: "competition", min: 0, max: 100, bands: [[0, "low"], [40, "medium"], [60, "high"]] },
  volume: { noun: "search volume", min: 0, max: 100, bands: [[0, "low"], [40, "medium"], [60, "high"]] },
  overall: { noun: "overall score", min: 0, max: 100, bands: [[0, "low"], [40, "medium"], [60, "high"]] },
  monthlySearches: { noun: "search volume", min: 0, max: Number.POSITIVE_INFINITY, bands: [[0, "low"], [1_000, "medium"], [10_000, "high"]] },
} as const satisfies Record<string, Bands>;

export type LabeledField = keyof typeof LABEL_BANDS;

export const isLabeledField = (field: string): field is LabeledField => Object.hasOwn(LABEL_BANDS, field);

export function labelFor(field: string, value: number): Label | undefined {
  if (!isLabeledField(field) || !Number.isFinite(value)) return undefined;
  const table: Bands = LABEL_BANDS[field];
  if (value < table.min || value > table.max) return undefined;
  let label: Label | undefined;
  for (const [lower, name] of table.bands) if (value >= lower) label = name;
  return label;
}

/** "high competition", or undefined when the field has no bands. */
export function labelText(field: string, value: number): string | undefined {
  const label = labelFor(field, value);
  return label && isLabeledField(field) ? `${label} ${LABEL_BANDS[field].noun}` : undefined;
}

const WORDS: Record<string, Label> = { low: "low", med: "medium", medium: "medium", moderate: "medium", high: "high" };

export const normalizeLabel = (word: string): Label | undefined => WORDS[word.toLowerCase()];
