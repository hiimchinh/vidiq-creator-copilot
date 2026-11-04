import { inlineMarks } from "./markdown-text";
import type { Source } from "./provenance";
import { type ClaimSegment, type Segment, verifyAnswer } from "./verify-answer";

/** What the UI renders. Text parts never contain markdown markers; claims carry their citation. */
export type InlinePart = { kind: "text"; text: string; strong?: true; em?: true } | { kind: "claim"; claim: ClaimSegment };
type Cells = InlinePart[][];

export type AnswerBlock =
  | { kind: "heading"; parts: InlinePart[] }
  | { kind: "paragraph"; parts: InlinePart[] }
  | { kind: "list"; items: InlinePart[][] }
  | { kind: "table"; header: Cells; rows: Cells[] };

type Line = Segment[];

function toLines(segments: Segment[]): Line[] {
  const lines: Line[] = [[]];
  for (const s of segments) {
    if (s.kind !== "text") {
      lines.at(-1)?.push(s);
      continue;
    }
    s.text.split("\n").forEach((piece, i) => {
      if (i > 0) lines.push([]);
      if (piece) lines.at(-1)?.push({ kind: "text", text: piece });
    });
  }
  return lines;
}

const shape = (line: Line) => line.map((s) => (s.kind === "text" ? s.text : "§")).join("");

/** Removes a block prefix such as "- " or "## " from the first text segment of a line. */
function dropPrefix(line: Line, prefix: RegExp): Line {
  const [first, ...rest] = line;
  if (first?.kind !== "text") return line;
  return [{ kind: "text", text: first.text.replace(prefix, "") }, ...rest];
}

function inline(line: Line): InlinePart[] {
  return line.flatMap((s): InlinePart[] =>
    s.kind === "text" ? inlineMarks(s.text).map((m) => ({ kind: "text", ...m })) : [{ kind: "claim", claim: s }],
  );
}

function cells(line: Line): Cells {
  const out: Line[] = [[]];
  for (const s of line) {
    if (s.kind !== "text") {
      out.at(-1)?.push(s);
      continue;
    }
    s.text.split("|").forEach((piece, i) => {
      if (i > 0) out.push([]);
      if (piece.trim()) out.at(-1)?.push({ kind: "text", text: piece.trim() });
    });
  }
  if (out[0]?.length === 0) out.shift();
  if (out.at(-1)?.length === 0) out.pop();
  return out.map(inline);
}

const HEADING = /^\s{0,3}#{1,6}\s+/;
const BULLET = /^\s*[-*•]\s+/;
const SEPARATOR = /^\s*\|?[\s:|-]+\|?\s*$/;

/** Verifies the answer and turns it into blocks of safe inline parts. */
export function buildAnswerModel(text: string, sources: Source[]): AnswerBlock[] {
  const blocks: AnswerBlock[] = [];
  const lines = toLines(verifyAnswer(text, sources).segments);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? [];
    const raw = shape(line);
    if (!raw.trim()) continue;
    if (raw.trim().startsWith("|")) {
      const rows: Line[] = [];
      while (i < lines.length && shape(lines[i] ?? []).trim().startsWith("|")) rows.push(lines[i++] ?? []);
      i--;
      const hasHeader = rows.length > 1 && SEPARATOR.test(shape(rows[1] ?? []));
      const body = rows.filter((r) => !SEPARATOR.test(shape(r)));
      blocks.push({ kind: "table", header: hasHeader ? cells(body[0] ?? []) : [], rows: body.slice(hasHeader ? 1 : 0).map(cells) });
    } else if (HEADING.test(raw)) {
      blocks.push({ kind: "heading", parts: inline(dropPrefix(line, HEADING)) });
    } else if (BULLET.test(raw)) {
      const item = inline(dropPrefix(line, BULLET));
      const prev = blocks.at(-1);
      if (prev?.kind === "list") prev.items.push(item);
      else blocks.push({ kind: "list", items: [item] });
    } else {
      blocks.push({ kind: "paragraph", parts: inline(line) });
    }
  }
  return blocks;
}
