import { buildSources, type SourceStep } from "../../src/lib/claims/provenance";
import { displayText, verifyAnswer } from "../../src/lib/claims/verify-answer";
import { naiveFlags } from "../../src/lib/claims/naive-exact-checker";

/** One eval case: the tool results, the answer as the model wrote it (with citations), and the truth. */
export interface ClaimCase {
  id: string;
  kind: string;
  note: string;
  evidence?: string[];
  calls: SourceStep[];
  answer: string;
  /** Every claim a creator would read, in order, with whether it is correct and backed by the data. */
  truth: { text: string; ok: boolean }[];
}

export interface Counts {
  fp: number;
  fn: number;
  ok: number;
  bad: number;
}

export interface CaseResult {
  id: string;
  kind: string;
  naive: Counts;
  ours: Counts;
  claims: { text: string; ok: boolean; naive: boolean; ours: boolean }[];
  extraFlags: string[];
}

function count(truth: ClaimCase["truth"], flags: boolean[], extra = 0): Counts {
  const c: Counts = { fp: extra, fn: 0, ok: 0, bad: 0 };
  truth.forEach((t, i) => {
    if (t.ok) c.ok++;
    else c.bad++;
    if (t.ok && flags[i]) c.fp++;
    if (!t.ok && !flags[i]) c.fn++;
  });
  return c;
}

export function scoreCase(c: ClaimCase): CaseResult {
  const sources = buildSources(c.calls);
  const shown = displayText(verifyAnswer(c.answer, sources).segments);
  let cursor = 0;
  const spans = c.truth.map((t) => {
    const start = shown.text.indexOf(t.text, cursor);
    if (start < 0) throw new Error(`${c.id}: truth "${t.text}" not found in the displayed answer after position ${cursor}`);
    cursor = start + t.text.length;
    return { start, end: cursor, text: t.text };
  });
  const overlaps = (a: { start: number; end: number }, b: { start: number; end: number }) => a.start < b.end && b.start < a.end;
  const flaggedOurs = shown.claims.filter((x) => x.claim.check !== "verified");
  const ours = spans.map((s) => flaggedOurs.some((x) => overlaps(x, s)));
  const extra = flaggedOurs.filter((x) => !spans.some((s) => overlaps(x, s)));
  const naive = naiveFlags(shown.text, spans, sources);
  return {
    id: c.id,
    kind: c.kind,
    naive: count(c.truth, naive),
    ours: count(c.truth, ours, extra.length),
    claims: c.truth.map((t, i) => ({ ...t, naive: naive[i] ?? false, ours: ours[i] ?? false })),
    extraFlags: extra.map((x) => x.claim.display),
  };
}

export function totals(results: CaseResult[], who: "naive" | "ours"): Counts & { fpRate: number; fnRate: number } {
  const sum = results.reduce<Counts>((a, r) => ({ fp: a.fp + r[who].fp, fn: a.fn + r[who].fn, ok: a.ok + r[who].ok, bad: a.bad + r[who].bad }), {
    fp: 0,
    fn: 0,
    ok: 0,
    bad: 0,
  });
  return { ...sum, fpRate: sum.ok ? sum.fp / sum.ok : 0, fnRate: sum.bad ? sum.fn / sum.bad : 0 };
}
