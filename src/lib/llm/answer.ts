import type { ChatMessage } from "./openrouter";

export interface ToolEvidence {
  tool: string;
  args: Record<string, unknown>;
  text: string;
  structured?: unknown;
}

const MAX_EVIDENCE_CHARS = 5000;

function compact(evidence: ToolEvidence): string {
  const body = evidence.structured === undefined ? evidence.text : JSON.stringify(evidence.structured);
  const clipped = body.length > MAX_EVIDENCE_CHARS ? `${body.slice(0, MAX_EVIDENCE_CHARS)}…(truncated)` : body;
  return `### ${evidence.tool} ${JSON.stringify(evidence.args)}\n${clipped}`;
}

export const ANSWER_SYSTEM_PROMPT = [
  "You are a YouTube growth copilot for creators.",
  "The app already renders the tool data as tables and cards, so do not repeat tables or list every row.",
  "Give a short, specific answer grounded in the numbers: lead with the single most useful finding,",
  "then 2-4 '-' bullets with concrete next steps. Quote real numbers from the data.",
  "If the data is missing or failed, say so plainly and suggest what to try. Under 140 words. No headings.",
].join(" ");

export function answerMessages(prompt: string, evidence: ToolEvidence[]): ChatMessage[] {
  const data = evidence.length > 0 ? evidence.map(compact).join("\n\n") : "(no tool data)";
  return [
    { role: "system", content: ANSWER_SYSTEM_PROMPT },
    { role: "user", content: `Creator question: ${prompt}\n\nvidIQ data:\n${data}` },
  ];
}
