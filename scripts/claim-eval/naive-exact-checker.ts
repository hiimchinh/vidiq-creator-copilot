/**
 * Baseline for the eval: a reconstruction of the check vidIQ's AI Coach appeared to run on 4 Nov 2026.
 * It binds a number to the label written next to it (a table's title cell or a quoted title) and needs
 * that label to match a tool result exactly; without a label it only asks whether the number appears
 * anywhere in the tool data. This is a hypothesis from the observed output, not vidIQ's code.
 */
import { parseDisplayNumber } from "../../src/lib/claims/display-number";
import { sentenceStart } from "../../src/lib/claims/find-unbacked";
import type { Source } from "../../src/lib/claims/provenance";

export interface Span {
  start: number;
  end: number;
  text: string;
}

interface Item {
  name: string;
  values: number[];
}

function index(sources: Source[]): { items: Item[]; numbers: Set<number> } {
  const items: Item[] = [];
  const numbers = new Set<number>();
  const walk = (node: unknown) => {
    if (typeof node === "number") return void numbers.add(node);
    if (Array.isArray(node)) return node.forEach(walk);
    if (!node || typeof node !== "object") return;
    const record = node as Record<string, unknown>;
    const name = typeof record.keyword === "string" ? record.keyword : typeof record.title === "string" ? record.title : undefined;
    if (name) items.push({ name, values: Object.values(record).filter((v): v is number => typeof v === "number") });
    Object.values(record).forEach(walk);
  };
  sources.forEach((s) => walk(s.data));
  return { items, numbers };
}

const unquote = (s: string) => s.trim().replace(/^["“](.*)["”]$/, "$1");
const letters = (s: string) => s.replace(/[^a-z]/gi, "").length;

function labelFor(text: string, span: Span): string | undefined {
  const lineStart = text.lastIndexOf("\n", span.start - 1) + 1;
  const lineEnd = text.indexOf("\n", span.start);
  const line = text.slice(lineStart, lineEnd < 0 ? undefined : lineEnd);
  if (line.trim().startsWith("|")) {
    const cells = line.split("|").map((c) => c.trim()).filter(Boolean);
    return unquote(cells.reduce((best, c) => (letters(c) > letters(best) ? c : best), ""));
  }
  const sentence = text.slice(sentenceStart(text, span.start), span.start);
  const quoted = [...sentence.matchAll(/"([^"\n]+)"|“([^”\n]+)”/g)].at(-1);
  return quoted ? (quoted[1] ?? quoted[2]) : undefined;
}

/** One flag per span: true means the baseline would mark that number as unverified. */
export function naiveFlags(text: string, spans: Span[], sources: Source[]): boolean[] {
  const { items, numbers } = index(sources);
  return spans.map((span) => {
    const value = parseDisplayNumber(span.text)?.value;
    if (value === undefined) return false; // labels are not checked at all
    const label = labelFor(text, span);
    if (label === undefined) return !numbers.has(value);
    const item = items.find((i) => i.name === label);
    return !item || !item.values.includes(value);
  });
}
