import type { ResultView } from "../schemas/view-types";

/** A tool call that finished with a typed view. Step ids are the planner's call ids. */
export interface SourceStep {
  id: string;
  tool: string;
  args: Record<string, unknown>;
  view?: ResultView;
}

export type SourceData = Record<string, unknown>;

/** One citable tool result. `ref` is the short id the model writes in [[c1.score=99]]. */
export interface Source {
  ref: string;
  callId: string;
  tool: string;
  args: Record<string, unknown>;
  data: SourceData;
}

/** Where a cited number came from: the call, the tool, its args, the field path and the raw value. */
export interface Citation {
  ref: string;
  callId: string;
  tool: string;
  args: Record<string, unknown>;
  path: string;
  value: number | string;
}

export interface Resolved {
  value: number | string;
  path: string;
  /** Last path segment, e.g. "competition"; decides the unit and the label. */
  field: string;
  source: Source;
}

/** The typed fields of a result that a claim may cite. Views with no data return undefined. */
export function sourceData(view: ResultView): SourceData | undefined {
  switch (view.kind) {
    case "titleScore":
      return { title: view.title, score: view.score };
    case "titles":
      return { titles: view.titles };
    case "keywords":
      return { rows: view.rows };
    case "outliers":
      return { videos: view.videos };
    case "channel":
      return { title: view.title, current: view.current, growth: view.growth };
    default:
      return undefined;
  }
}

/** Numbers sources c1, c2, … in call order. The answer prompt and the verifier must use the same order. */
export function buildSources(steps: SourceStep[]): Source[] {
  const sources: Source[] = [];
  for (const step of steps) {
    const data = step.view ? sourceData(step.view) : undefined;
    if (!data) continue;
    sources.push({ ref: `c${sources.length + 1}`, callId: step.id, tool: step.tool, args: step.args, data });
  }
  return sources;
}

const itemName = (item: unknown): string | undefined => {
  if (!item || typeof item !== "object") return undefined;
  const { keyword, title } = item as { keyword?: unknown; title?: unknown };
  const name = typeof keyword === "string" ? keyword : typeof title === "string" ? title : undefined;
  return name?.trim().toLowerCase();
};

function step(current: unknown, segment: string): unknown {
  if (Array.isArray(current)) {
    if (/^\d+$/.test(segment)) return current[Number(segment)];
    const wanted = segment.trim().toLowerCase();
    return current.find((item) => itemName(item) === wanted);
  }
  if (current && typeof current === "object") return (current as Record<string, unknown>)[segment];
  return undefined;
}

/** Resolves "rows.home barista.competition" against source `ref`. Only numbers and strings resolve. */
export function resolveRef(sources: Source[], ref: string, path: string): Resolved | undefined {
  const source = sources.find((s) => s.ref === ref);
  if (!source) return undefined;
  const segments = path.split(".").map((s) => s.trim());
  let current: unknown = source.data;
  for (const segment of segments) current = step(current, segment);
  if (typeof current !== "number" && typeof current !== "string") return undefined;
  return { value: current, path: `${ref}.${path.trim()}`, field: segments.at(-1) ?? "", source };
}

export const citationOf = (resolved: Resolved): Citation => ({
  ref: resolved.source.ref,
  callId: resolved.source.callId,
  tool: resolved.source.tool,
  args: resolved.source.args,
  path: resolved.path,
  value: resolved.value,
});
