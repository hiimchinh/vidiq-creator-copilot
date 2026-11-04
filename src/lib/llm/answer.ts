import { buildSources } from "../claims/provenance";
import { toResultView } from "../schemas/result-view";
import type { ChatMessage } from "./openrouter";

export interface ToolEvidence {
  tool: string;
  args: Record<string, unknown>;
  text: string;
  structured?: unknown;
}

const MAX_EVIDENCE_CHARS = 5000;
const clip = (body: string) => (body.length > MAX_EVIDENCE_CHARS ? `${body.slice(0, MAX_EVIDENCE_CHARS)}…(truncated)` : body);

/**
 * Numbers the evidence c1, c2, … exactly as the client does (same order, same skip rule), so a citation
 * the model writes resolves to the same tool call in the browser. Results with no typed data stay
 * visible to the model as raw text but cannot be cited.
 */
function evidenceBlocks(evidence: ToolEvidence[]): string[] {
  const steps = evidence.map((e, i) => ({
    id: String(i),
    tool: e.tool,
    args: e.args,
    view: toResultView(e.tool, { ok: true, text: e.text, structured: e.structured }, e.args),
  }));
  const sources = buildSources(steps);
  return evidence.map((e, i) => {
    const source = sources.find((s) => s.callId === String(i));
    if (!source) return `### (not citable) ${e.tool} ${JSON.stringify(e.args)}\n${clip(e.text)}`;
    return `### ${source.ref} ${e.tool} ${JSON.stringify(e.args)}\n${clip(JSON.stringify(source.data))}`;
  });
}

export const ANSWER_SYSTEM_PROMPT = [
  "You are a YouTube growth copilot for creators.",
  "The app already renders the tool data as tables and cards, so do not repeat tables or list every row.",
  "Lead with the single most useful finding, then 2-4 '-' bullets with concrete next steps.",
  "Under 140 words. No headings, no tables.",
  "Every number you take from the data must be written only as a citation token [[REF.PATH=VALUE]], for example",
  "[[c1.score=99]], [[c2.titles.0.score=97]], [[c1.rows.home barista.competition=26]] or [[c1.rows.home barista.monthlySearches=4.3K]].",
  "REF is the id in the data heading (c1, c2, …). PATH walks that JSON: object keys, array items by index, keyword rows by their keyword.",
  "VALUE is the number as the creator should read it. The app replaces each token with just that number and a link to its source,",
  "so always name the title or keyword in quotes next to it, for example:",
  "'\"Testing 5 Cheap Espresso Machines\" scores [[c2.titles.0.score=97]]' or '\"home barista\" has competition [[c1.rows.home barista.competition=26]]'.",
  "Never write a number from the data without a token, and never state a number the data does not contain.",
  "Do not call a keyword's competition, volume or demand low, medium or high: the app labels cited numbers from a fixed table.",
  "If the data is missing or failed, say so plainly and suggest what to try.",
].join(" ");

export function answerMessages(prompt: string, evidence: ToolEvidence[]): ChatMessage[] {
  const data = evidence.length > 0 ? evidenceBlocks(evidence).join("\n\n") : "(no tool data)";
  return [
    { role: "system", content: ANSWER_SYSTEM_PROMPT },
    { role: "user", content: `Creator question: ${prompt}\n\nvidIQ data:\n${data}` },
  ];
}
