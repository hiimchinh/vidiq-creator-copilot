import type { OutlierVideo } from "@/lib/schemas/view-types";

const breakoutTone = (x: number) => (x >= 10 ? "bg-good text-surface" : x >= 3 ? "bg-warn text-surface" : "bg-surface-2 text-muted");

export function OutlierGrid({ videos }: { videos: OutlierVideo[] }) {
  const sorted = [...videos].sort((a, b) => b.breakout - a.breakout);
  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3" data-testid="outlier-grid">
      {sorted.map((v) => (
        <li key={v.videoId} className="overflow-hidden rounded-md border border-line bg-bg">
          <a href={`https://www.youtube.com/watch?v=${v.videoId}`} target="_blank" rel="noopener noreferrer" className="group block">
            <div className="relative aspect-video bg-surface-2">
              {/* Plain img: ytimg already serves sized JPEGs; lazy + fixed box means no layout shift. */}
              <img
                src={`https://i.ytimg.com/vi/${v.videoId}/mqdefault.jpg`}
                alt=""
                width={320}
                height={180}
                loading="lazy"
                decoding="async"
                className="absolute inset-0 size-full object-cover"
              />
              <span className={`tabular absolute left-1.5 top-1.5 rounded px-1.5 py-0.5 text-[11px] font-semibold ${breakoutTone(v.breakout)}`}>
                {v.breakout}× breakout
              </span>
              <span className="tabular absolute bottom-1.5 right-1.5 rounded bg-black/75 px-1 text-[11px] text-white">{v.duration}</span>
            </div>
            <div className="flex flex-col gap-1 p-2.5">
              <span className="line-clamp-2 font-medium group-hover:underline">{v.title}</span>
              <span className="text-xs text-muted">
                {v.channel} · {v.subscribers} subs
              </span>
              <span className="tabular text-xs text-muted">
                {v.views} views · {v.vph} views/h · {v.engagementPct}% eng. · {v.publishedAt}
              </span>
            </div>
          </a>
        </li>
      ))}
    </ul>
  );
}
