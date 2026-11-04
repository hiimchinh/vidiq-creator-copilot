/** "Worked for N seconds ›": the coach-style line that folds a turn's tool calls away once it is done. */
export function WorkedFor({ ms, open, onToggle, controls }: { ms: number; open: boolean; onToggle: () => void; controls: string }) {
  const seconds = Math.max(1, Math.round(ms / 1000));
  return (
    <div className="border-b border-surface-2 pb-1">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={controls}
        onClick={onToggle}
        className="inline-flex items-center gap-1.5 text-[15px] text-muted hover:text-ink"
        data-testid="worked-for"
      >
        Worked for {seconds} second{seconds === 1 ? "" : "s"}
        <svg viewBox="0 0 20 20" aria-hidden="true" className={`size-4 transition-transform ${open ? "rotate-90" : ""}`} fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="m7.5 5 5 5-5 5" />
        </svg>
      </button>
    </div>
  );
}
