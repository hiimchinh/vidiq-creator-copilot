import type { Source } from "@/lib/claims/provenance";
import { verifyAnswer } from "@/lib/claims/verify-answer";

/** One line under a finished answer: how many of its numbers are bound to a tool result. */
export function ClaimSummary({ text, sources }: { text: string; sources: Source[] }) {
  const { verified, flagged } = verifyAnswer(text, sources).summary;
  if (verified + flagged === 0) return null;
  return (
    <p className="mt-2 text-[11px] text-muted" data-testid="claim-summary">
      {verified} of {verified + flagged} figures verified against vidIQ tool results
      {flagged > 0 && <span className="font-semibold text-warn"> · {flagged} flagged</span>}. Hover or focus a figure to see its source.
    </p>
  );
}
