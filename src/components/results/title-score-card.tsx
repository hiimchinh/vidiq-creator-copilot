import { band, bandTone } from "@/lib/format";

const BAR = { good: "bg-good", warn: "bg-warn", bad: "bg-bad", none: "bg-line" } as const;
const TEXT = { good: "text-good", warn: "text-warn", bad: "text-bad", none: "text-muted" } as const;

function ScoreBar({ score, label }: { score: number; label: string }) {
  const tone = bandTone("score", band("score", score));
  return (
    <div className="flex items-center gap-3">
      <div
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={score}
        className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2"
      >
        <div className={`h-full rounded-full ${BAR[tone]}`} style={{ width: `${score}%` }} />
      </div>
      <span className={`tabular w-14 text-right text-sm font-semibold ${TEXT[tone]}`}>{score}/100</span>
    </div>
  );
}

export function TitleScoreCard({ title, score }: { title: string; score: number }) {
  return (
    <div className="flex flex-col gap-2" data-testid="title-score">
      <p className="text-xs text-muted">Click-through potential of your title</p>
      <p className="font-medium">“{title}”</p>
      <ScoreBar score={score} label={`Score for ${title}`} />
    </div>
  );
}

export function TitleIdeasList({ titles }: { titles: { title: string; score: number }[] }) {
  return (
    <div className="flex flex-col gap-2" data-testid="title-ideas">
      <p className="text-xs text-muted">Scored alternatives, best first</p>
      <ol className="flex flex-col gap-3">
        {titles.map((t) => (
          <li key={t.title} className="flex flex-col gap-1">
            <div className="flex items-start justify-between gap-2">
              <span>{t.title}</span>
              <button
                type="button"
                onClick={() => void navigator.clipboard?.writeText(t.title)}
                className="shrink-0 rounded border border-line px-1.5 py-0.5 text-[11px] text-muted hover:text-ink"
                aria-label={`Copy title: ${t.title}`}
              >
                Copy
              </button>
            </div>
            <ScoreBar score={t.score} label={`Score for ${t.title}`} />
          </li>
        ))}
      </ol>
    </div>
  );
}
