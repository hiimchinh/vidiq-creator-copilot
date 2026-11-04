import { formatSourceValue, matchesSource, parseDisplayNumber } from "./display-number";
import { bareMetricNumbers, labelMentions, sentenceStart } from "./find-unbacked";
import { labelFor, labelText, normalizeLabel } from "./metric-labels";
import { type Citation, citationOf, resolveRef, type Source } from "./provenance";

export type Check = "verified" | "mismatch" | "no-source";

/** A number or a label the answer states, with the verdict and, when bound, its citation. */
export interface ClaimSegment {
  kind: "claim" | "label";
  display: string;
  check: Check;
  reason: string;
  citation?: Citation;
  /** Computed label for the cited value, e.g. "high competition". Never written by the model. */
  label?: string;
  field?: string;
  start: number;
  end: number;
}

export type Segment = { kind: "text"; text: string } | ClaimSegment;

export interface AnswerCheck {
  segments: Segment[];
  summary: { verified: number; flagged: number };
}

/** [[c1.score=99]], [[c3.rows.home barista.competition=26]] or the bare form [[c1.score]]. */
const TOKEN = /\[\[\s*(c\d+)\.([^\]=]+?)\s*(?:=\s*([^\]]+?))?\s*\]\]/g;
const PARTIAL = /\[\[[^\]]*\]?$/;

function citedClaim(sources: Source[], m: RegExpMatchArray): ClaimSegment {
  const [raw, ref = "", path = "", written] = m;
  const start = m.index ?? 0;
  const base = { kind: "claim" as const, start, end: start + raw.length };
  const resolved = resolveRef(sources, ref, path);
  if (!resolved) {
    return { ...base, display: written ?? "?", check: "no-source", reason: `No tool result has ${ref}.${path.trim()}.` };
  }
  const citation = citationOf(resolved);
  const numeric = typeof resolved.value === "number" ? resolved.value : parseDisplayNumber(resolved.value)?.value;
  const label = numeric === undefined ? undefined : labelText(resolved.field, numeric);
  const display = written ?? formatSourceValue(resolved.value);
  const ok = written === undefined || matchesSource(written, resolved.value, resolved.field);
  const reason = ok ? "Matches the tool result." : `The tool result says ${formatSourceValue(resolved.value)}, not ${written}.`;
  return { ...base, display, check: ok ? "verified" : "mismatch", reason, citation, label, field: resolved.field };
}

const METRIC_FIELDS = { competition: ["competition"], volume: ["volume", "monthlySearches"] } as const;

function labelClaim(mention: ReturnType<typeof labelMentions>[number], claims: ClaimSegment[], text: string): ClaimSegment | undefined {
  const sentence = sentenceStart(text, mention.start);
  const near = claims.filter((c) => c.citation && c.field && sentenceStart(text, c.start) === sentence);
  let target: ClaimSegment | undefined;
  if (mention.metric) {
    const fields: readonly string[] = METRIC_FIELDS[mention.metric];
    target = near.filter((c) => fields.includes(c.field ?? "")).sort((a, b) => Math.abs(a.start - mention.start) - Math.abs(b.start - mention.start))[0];
  } else {
    // "(high)" directly after a cited number labels that number; elsewhere it is not a metric claim.
    target = near.filter((c) => c.end <= mention.start && /^\s*$/.test(text.slice(c.end, mention.start))).at(-1);
    if (!target) return undefined;
  }
  const base = { kind: "label" as const, display: mention.text, start: mention.start, end: mention.end };
  if (!target?.citation) return { ...base, check: "no-source", reason: `No cited number backs "${mention.text}".` };
  const value = target.citation.value;
  const computed = typeof value === "number" ? labelFor(target.field ?? "", value) : undefined;
  if (!computed) return undefined;
  const ok = computed === normalizeLabel(mention.word);
  return { ...base, check: ok ? "verified" : "mismatch", reason: ok ? "Matches the threshold table." : `${target.display} is ${target.label} by the threshold table.`, citation: target.citation };
}

/** Binds every number in the answer to the tool result it cites, and flags whatever is not bound. */
export function verifyAnswer(input: string, sources: Source[]): AnswerCheck {
  const text = input.replace(PARTIAL, "");
  const cited = [...text.matchAll(TOKEN)].map((m) => citedClaim(sources, m));
  let masked = text;
  for (const c of cited) masked = masked.slice(0, c.start) + " ".repeat(c.end - c.start) + masked.slice(c.end);

  const bare: ClaimSegment[] = bareMetricNumbers(masked).map((n) => ({
    kind: "claim",
    display: n.text,
    check: "no-source",
    reason: "No tool result is cited for this number.",
    start: n.start,
    end: n.end,
  }));
  const labels = labelMentions(masked).flatMap((m) => labelClaim(m, cited, masked) ?? []);
  const claims = [...cited, ...bare, ...labels].sort((a, b) => a.start - b.start);

  const segments: Segment[] = [];
  let last = 0;
  for (const claim of claims) {
    if (claim.start > last) segments.push({ kind: "text", text: text.slice(last, claim.start) });
    segments.push(claim);
    last = claim.end;
  }
  if (last < text.length) segments.push({ kind: "text", text: text.slice(last) });
  const verified = claims.filter((c) => c.check === "verified").length;
  return { segments, summary: { verified, flagged: claims.length - verified } };
}

/** The answer as plain display text, with each claim's position in it. Used by the eval. */
export function displayText(segments: Segment[]): { text: string; claims: { claim: ClaimSegment; start: number; end: number }[] } {
  let text = "";
  const claims: { claim: ClaimSegment; start: number; end: number }[] = [];
  for (const s of segments) {
    const piece = s.kind === "text" ? s.text : s.display;
    if (s.kind !== "text") claims.push({ claim: s, start: text.length, end: text.length + piece.length });
    text += piece;
  }
  return { text, claims };
}
