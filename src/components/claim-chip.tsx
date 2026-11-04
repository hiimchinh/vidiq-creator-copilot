"use client";

import { useId, useState } from "react";
import type { ClaimSegment } from "@/lib/claims/verify-answer";
import { quoteOnce } from "@/lib/claims/markdown-text";
import { toolLabel } from "@/lib/format";

function argsText(args: Record<string, unknown>): string {
  return Object.entries(args)
    .filter(([key, value]) => key !== "userGoal" && value !== undefined && value !== "")
    .map(([key, value]) => `${key} ${typeof value === "string" ? quoteOnce(value) : JSON.stringify(value)}`)
    .join(", ");
}

const STYLE = {
  verified: "border-accent/30 bg-accent-soft text-ink",
  mismatch: "border-bad/60 bg-bad/10 text-bad",
  "no-source": "border-dashed border-warn bg-warn/10 text-ink",
} as const;

const STATUS = { verified: "verified", mismatch: "does not match its source", "no-source": "unverified, no source" } as const;

/**
 * An inline number (or label) from the answer. Hover or focus shows where it came from: tool, args, field
 * path and raw value. Escape closes the details; the chip stays focusable for keyboard users.
 */
export function ClaimChip({ claim }: { claim: ClaimSegment }) {
  const [open, setOpen] = useState(false);
  const tipId = useId();
  const c = claim.citation;
  const plainLabel = claim.kind === "label" && claim.check === "verified";
  if (plainLabel) return <span>{claim.display}</span>;
  return (
    <span className="relative inline-block">
      <button
        type="button"
        aria-describedby={tipId}
        data-testid="claim-chip"
        data-check={claim.check}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
        className={`tabular mx-0.5 inline-flex items-baseline gap-1 rounded border px-1 font-semibold leading-snug ${STYLE[claim.check]}`}
      >
        {claim.display}
        {claim.check === "verified" && claim.label && <span className="text-[10px] font-normal text-muted">{claim.label}</span>}
        {claim.check !== "verified" && <span className="text-[10px] font-normal">{claim.check === "mismatch" ? "≠ source" : "unverified"}</span>}
        <span className="sr-only">, {STATUS[claim.check]}</span>
      </button>
      <span
        role="tooltip"
        id={tipId}
        className={`${open ? "block" : "hidden"} absolute bottom-full left-0 z-20 mb-1 w-72 rounded-md border border-line bg-surface p-2 text-xs font-normal text-ink shadow-lg`}
      >
        <span className="block font-semibold">{claim.reason}</span>
        {c && (
          <>
            <span className="block">Tool: {toolLabel(c.tool)} ({c.tool})</span>
            {argsText(c.args) && <span className="block break-words">Args: {argsText(c.args)}</span>}
            <span className="block break-words">Field: {c.path}</span>
            <span className="block">Raw value: {String(c.value)}</span>
            <span className="block text-muted">Call id: {c.callId}</span>
          </>
        )}
      </span>
    </span>
  );
}
