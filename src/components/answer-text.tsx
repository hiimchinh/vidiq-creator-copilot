"use client";

import { Fragment, type ReactNode, useMemo } from "react";
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
      return <h3 className="mt-2 text-lg font-semibold leading-snug"><Inline parts={block.parts} /></h3>;
    case "paragraph":
      return <p><Inline parts={block.parts} /></p>;
    case "list":
      return (
        <ul className="list-disc space-y-2 pl-5">
          {block.items.map((item, i) => <li key={i}><Inline parts={item} /></li>)}
        </ul>
      );
    case "table":
      return (
        // No overflow clipping: titles wrap, and a chip's source tooltip must be able to leave the table.
        <div className="w-full max-w-[410px] border border-hairline bg-table">
          <table className="w-full text-left text-sm leading-[21px]">
            {block.header.length > 0 && (
              <thead>
                <tr>{block.header.map((cell, i) => <th key={i} scope="col" className="bg-table-head px-[18px] py-3 text-[13px] font-normal text-muted"><Inline parts={cell} /></th>)}</tr>
              </thead>
            )}
            <tbody>
              {block.rows.map((row, r) => (
                <tr key={r} className="border-t border-hairline align-top">
                  {row.map((cell, i) => (
                    <td key={i} className="px-[18px] py-2.5 break-words last:[&_[role=tooltip]]:left-auto last:[&_[role=tooltip]]:right-0"><Inline parts={cell} /></td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
  }
}

interface AnswerTextProps {
  text: string;
  streaming: boolean;
  sources: Source[];
  /** Shown right under the first table (the scores it is about), or after the last block when there is none. */
  afterTable?: ReactNode;
}

/** Safe rendering of streamed model text: no innerHTML, no raw markdown, every number bound to its source. */
export function AnswerText({ text, streaming, sources, afterTable }: AnswerTextProps) {
  const blocks = useMemo(() => buildAnswerModel(text, sources), [text, sources]);
  const firstTable = blocks.findIndex((b) => b.kind === "table");
  const slotAt = firstTable === -1 ? blocks.length - 1 : firstTable;
  return (
    <div className={`flex flex-col gap-4 text-[15px] leading-[26px] ${streaming ? "caret" : ""}`} aria-live="polite" aria-busy={streaming} data-testid="answer">
      {blocks.map((block, i) => (
        <Fragment key={i}>
          <Block block={block} />
          {i === slotAt && afterTable}
        </Fragment>
      ))}
      {blocks.length === 0 && afterTable}
    </div>
  );
}
