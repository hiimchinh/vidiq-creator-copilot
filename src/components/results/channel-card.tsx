import { formatCompact, formatNumber } from "@/lib/format";
import type { ResultView } from "@/lib/schemas/view-types";

type Channel = Extract<ResultView, { kind: "channel" }>;

function Sparkline({ values, label }: { values: number[]; label: string }) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const span = Math.max(...values) - min || 1;
  const points = values.map((v, i) => `${(i / (values.length - 1)) * 100},${30 - ((v - min) / span) * 28}`).join(" ");
  return (
    <svg viewBox="0 0 100 32" preserveAspectRatio="none" className="h-10 w-full text-accent" role="img" aria-label={label}>
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export function ChannelCard({ view }: { view: Channel }) {
  const stats = [
    { label: "Subscribers", value: formatCompact(view.current.subscribers), delta: `+${formatCompact(view.growth.subscribersGained)}` },
    { label: "Views", value: formatCompact(view.current.views), delta: `+${formatCompact(view.growth.viewsGained)}` },
    { label: "Videos", value: formatNumber(view.current.videos), delta: `+${view.growth.videosPublished}` },
  ];
  const first = view.daily[0]?.date;
  const last = view.daily.at(-1)?.date;
  return (
    <div className="flex flex-col gap-3" data-testid="channel-card">
      <div className="flex items-center gap-2">
        {view.thumbnail && <img src={view.thumbnail} alt="" width={32} height={32} loading="lazy" className="size-8 rounded-full" />}
        <span className="font-semibold">{view.title}</span>
        {first && last && <span className="ml-auto text-xs text-muted">{first} → {last}</span>}
      </div>
      <dl className="grid grid-cols-3 gap-2">
        {stats.map((s) => (
          <div key={s.label} className="rounded-md bg-surface-2 p-2">
            <dt className="text-[11px] text-muted">{s.label}</dt>
            <dd className="tabular text-base font-semibold">{s.value}</dd>
            <dd className="tabular text-[11px] text-good">{s.delta}</dd>
          </div>
        ))}
      </dl>
      <Sparkline values={view.daily.map((d) => d.views)} label="Total views per day over the period" />
    </div>
  );
}
