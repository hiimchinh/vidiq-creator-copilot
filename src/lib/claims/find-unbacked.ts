/**
 * Finds the parts of an answer that state a metric without a citation: bare numbers next to a metric
 * word or under a metric column, and model-written labels such as "high search volume".
 * Runs on text whose citation tokens are already masked out.
 */
export type LabelMetric = "competition" | "volume" | "overall";

export interface Span {
  start: number;
  end: number;
  text: string;
}

export interface LabelMention extends Span {
  word: string;
  /** Which metric "high competition" talks about; undefined for a bare "(high)" after a number. */
  metric?: LabelMetric;
}

const QUOTED = /"[^"\n]*"|“[^”\n]*”|‘[^’\n]*’/g;
const NUMBER = /(?<![\w#./,])[-+]?\d[\d,]*(?:\.\d+)?(?:\s?[KkMm](?![a-zA-Z]))?%?(?![\w])/g;
const CUE_BEFORE =
  /(scores?|scored|scoring|competition|volume|searches|overall|growth|views|subscribers|vph|engagement)\s*(?:of|is|at|was|=|:|\()?\s*(?:about|around|roughly|only|just|a|an)?\s*$/i;
const CUE_AFTER =
  /^\s*(?:\/\s*100|×|x\b|(?:monthly\s+)?search(?:es)?\b|\/mo\b|per month|a month|views\b|subscribers\b|subs\b|competition\b|overall\b|score\b|vph\b|breakout\b)/i;
const CUE_HEADER = /score|competition|volume|search|overall|views|subscribers|growth|vph|breakout|engagement/i;
const LABEL_BEFORE = /\b(low|medium|med|moderate|high)[\s-]+(competition|search volume|volume|demand|overall score)\b/gi;
const LABEL_AFTER = /\b(competition|search volume)\s+(?:is\s+|of\s+)?(low|medium|med|moderate|high)\b/gi;
const LABEL_PAREN = /\((low|medium|med|moderate|high)\)/gi;

export function quotedRanges(text: string): [number, number][] {
  return [...text.matchAll(QUOTED)].map((m) => [m.index ?? 0, (m.index ?? 0) + m[0].length]);
}

const inside = (ranges: [number, number][], at: number) => ranges.some(([a, b]) => at >= a && at < b);

/** Start of the sentence that contains `at`. Decimal points do not end a sentence. */
export function sentenceStart(text: string, at: number): number {
  const before = text.slice(0, at);
  const m = /[\s\S]*(?:[.!?](?=\s)|\n)/.exec(before);
  return m ? m[0].length : 0;
}

const cells = (line: string) => line.trim().replace(/^\||\|$/g, "").split("|");
const isRow = (line: string) => line.trim().startsWith("|");
const isSeparator = (line: string) => /^\|?[\s:|-]+\|?$/.test(line.trim()) && line.includes("-");

/** Column header of every table cell, keyed by line index. Rows without a header map to nothing. */
function tableHeaders(lines: string[]): Map<number, string[]> {
  const headers = new Map<number, string[]>();
  let header: string[] | undefined;
  lines.forEach((line, i) => {
    if (!isRow(line)) return void (header = undefined);
    if (isSeparator(line)) return;
    if (!header && isSeparator(lines[i + 1] ?? "")) header = cells(line);
    else if (header) headers.set(i, header);
  });
  return headers;
}

function isMetricNumber(text: string, m: Span, quoted: [number, number][], lineInfo: { header?: string[]; lineStart: number; table: boolean }): boolean {
  if (inside(quoted, m.start)) return false;
  if (lineInfo.table) {
    if (!lineInfo.header) return false;
    const column = (text.slice(lineInfo.lineStart, m.start).match(/\|/g)?.length ?? 1) - 1;
    return CUE_HEADER.test(lineInfo.header[column] ?? "");
  }
  if (m.text.endsWith("%")) return true;
  if (/^\s*\d+[.)]$/.test(text.slice(lineInfo.lineStart, m.end)) && /^[.)]\s/.test(text.slice(m.end, m.end + 2))) return false;
  const from = Math.max(sentenceStart(text, m.start), m.start - 30);
  return CUE_BEFORE.test(text.slice(from, m.start)) || CUE_AFTER.test(text.slice(m.end, m.end + 30));
}

export function bareMetricNumbers(text: string): Span[] {
  const quoted = quotedRanges(text);
  const lines = text.split("\n");
  const headers = tableHeaders(lines);
  const lineStarts = lines.reduce<number[]>((acc, line, i) => [...acc, i === 0 ? 0 : (acc[i - 1] ?? 0) + (lines[i - 1]?.length ?? 0) + 1], []);
  const out: Span[] = [];
  for (const m of text.matchAll(NUMBER)) {
    const span = { start: m.index ?? 0, end: (m.index ?? 0) + m[0].length, text: m[0].trim() };
    const lineIndex = lineStarts.findLastIndex((s) => s <= span.start);
    const line = lines[lineIndex] ?? "";
    const info = { header: headers.get(lineIndex), lineStart: lineStarts[lineIndex] ?? 0, table: isRow(line) };
    if (isMetricNumber(text, span, quoted, info)) out.push(span);
  }
  return out;
}

export function labelMentions(text: string): LabelMention[] {
  const quoted = quotedRanges(text);
  const metricOf = (noun: string): LabelMetric => (/competition/i.test(noun) ? "competition" : /overall/i.test(noun) ? "overall" : "volume");
  const found: LabelMention[] = [];
  const add = (m: RegExpMatchArray, word: string, metric?: LabelMetric) => {
    const start = m.index ?? 0;
    if (inside(quoted, start) || found.some((f) => start < f.end && start + m[0].length > f.start)) return;
    found.push({ start, end: start + m[0].length, text: m[0], word, metric });
  };
  for (const m of text.matchAll(LABEL_BEFORE)) add(m, m[1] ?? "", metricOf(m[2] ?? ""));
  for (const m of text.matchAll(LABEL_AFTER)) add(m, m[2] ?? "", metricOf(m[1] ?? ""));
  for (const m of text.matchAll(LABEL_PAREN)) add(m, m[1] ?? "");
  return found.sort((a, b) => a.start - b.start);
}
