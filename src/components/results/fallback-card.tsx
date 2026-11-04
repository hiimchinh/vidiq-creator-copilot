/** Shown when vidIQ returned something we could not validate. The raw text is still there; nothing crashes. */
export function FallbackCard({ raw, issues }: { raw: string; issues: string[] }) {
  return (
    <div className="flex flex-col gap-2" data-testid="fallback-card">
      <p className="text-xs text-warn">The response did not match the expected shape, so it is shown as text.</p>
      <details className="text-xs">
        <summary className="cursor-pointer text-muted">Validation issues ({issues.length})</summary>
        <ul className="mt-1 list-disc pl-5 text-muted">
          {issues.slice(0, 8).map((i) => <li key={i}>{i}</li>)}
        </ul>
      </details>
      <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded bg-surface-2 p-2 font-mono text-xs">{raw}</pre>
    </div>
  );
}

export function EmptyCard({ message }: { message: string }) {
  return <p className="text-sm text-muted" data-testid="empty-card">{message}</p>;
}
