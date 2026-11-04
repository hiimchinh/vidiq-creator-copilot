"use client";

import { useId, useMemo, useState } from "react";
import { compareClaimChecks } from "@/lib/claims/claim-checks";
import type { Source } from "@/lib/claims/provenance";

type Checker = "exact" | "provenance";

const OPTIONS: { value: Checker; label: string }[] = [
  { value: "exact", label: "Exact-text check (as AI Coach today)" },
  { value: "provenance", label: "Provenance check (this fix)" },
];

/**
 * Where the coach UI puts its "Heads up" note: the same answer and tool results run through both checks,
 * so the creator can flip between today's false alarm and the provenance result.
 */
export function ClaimCheckPanel({ text, sources }: { text: string; sources: Source[] }) {
  const [checker, setChecker] = useState<Checker>("provenance");
  const name = useId();
  const checks = useMemo(() => compareClaimChecks(text, sources), [text, sources]);
  if (checks.provenance.total === 0) return null;
  const exact = checker === "exact";
  const clean = exact ? checks.exact.flags.length === 0 : checks.provenance.verified === checks.provenance.total;
  return (
    <div className="flex flex-col gap-2.5" data-testid="claim-check">
      <div role="radiogroup" aria-label="Claim check" className="grid w-fit max-w-full grid-cols-2 rounded-lg border border-line bg-surface p-0.5 text-xs">
        {OPTIONS.map((o) => (
          <label
            key={o.value}
            className={`cursor-pointer rounded-md px-2.5 py-1.5 text-center font-medium has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-[var(--focus)] ${checker === o.value ? "bg-surface-2 text-ink" : "text-muted hover:text-ink"}`}
          >
            <input type="radio" name={name} value={o.value} checked={checker === o.value} onChange={() => setChecker(o.value)} className="sr-only" />
            {o.label}
          </label>
        ))}
      </div>
      <p aria-live="polite" data-testid="claim-check-note" data-checker={checker} className={`text-[15px] leading-7 ${exact ? "italic" : ""}`}>
        {!exact && clean && <span aria-hidden="true" className="mr-1.5 not-italic text-good">✓</span>}
        {exact ? checks.exact.note : checks.provenance.note}
      </p>
    </div>
  );
}
