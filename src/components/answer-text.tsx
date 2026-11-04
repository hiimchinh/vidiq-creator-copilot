"use client";

import { type ReactNode, useMemo } from "react";
import { type AnswerBlock, buildAnswerModel, type InlinePart } from "@/lib/claims/answer-model";
import type { Source } from "@/lib/claims/provenance";
import { ClaimChip } from "./claim-chip";

function Inline({ parts }: { parts: InlinePart[] }): ReactNode {
  return parts.map((p, i) => {
    if (p.kind === "claim") return <ClaimChip key={i} claim={p.claim} />;
    if (p.strong) return <strong key={i}>{p.text}</strong>;
    if (p.em) return <em key={i}>{p.text}</em>;
    return <span key={i}>{p.text}</span>;
  });
}

function Block({ block }: { block: AnswerBlock }) {
  switch (block.kind) {
    case "heading":
      return <p className="font-semibold"><Inline parts={block.parts} /></p>;
    case "paragraph":
      return <p><Inline parts={block.parts} /></p>;
    case "list":
      return (
        <ul className="list-disc space-y-1 pl-5">
          {block.items.map((item, i) => <li key={i}><Inline parts={item} /></li>)}
        </ul>
      );
    case "table":
      return (
        <div className="overflow-x-auto">
          <table className="text-sm">
            {block.header.length > 0 && (
              <thead>
                <tr>{block.header.map((cell, i) => <th key={i} scope="col" className="px-2 py-1 text-left text-xs text-muted"><Inline parts={cell} /></th>)}</tr>
              </thead>
            )}
            <tbody>
              {block.rows.map((row, r) => (
                <tr key={r} className="border-t border-line">{row.map((cell, i) => <td key={i} className="px-2 py-1"><Inline parts={cell} /></td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      );
  }
}

/** Safe rendering of streamed model text: no innerHTML, no raw markdown, every number bound to its source. */
export function AnswerText({ text, streaming, sources }: { text: string; streaming: boolean; sources: Source[] }) {
  const blocks = useMemo(() => buildAnswerModel(text, sources), [text, sources]);
  return (
    <div className={`flex flex-col gap-2 leading-relaxed ${streaming ? "caret" : ""}`} aria-live="polite" aria-busy={streaming} data-testid="answer">
      {blocks.map((block, i) => <Block key={i} block={block} />)}
    </div>
  );
}
