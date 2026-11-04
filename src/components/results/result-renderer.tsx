import type { ResultView } from "@/lib/schemas/view-types";
import { ChannelCard } from "./channel-card";
import { EmptyCard, FallbackCard } from "./fallback-card";
import { KeywordTable } from "./keyword-table";
import { OutlierGrid } from "./outlier-grid";
import { TitleIdeasList, TitleScoreCard } from "./title-score-card";

export function ResultRenderer({ view }: { view: ResultView }) {
  switch (view.kind) {
    case "keywords":
      return <KeywordTable rows={view.rows} notes={view.notes} />;
    case "titleScore":
      return <TitleScoreCard title={view.title} score={view.score} />;
    case "titles":
      return <TitleIdeasList titles={view.titles} />;
    case "outliers":
      return <OutlierGrid videos={view.videos} />;
    case "channel":
      return <ChannelCard view={view} />;
    case "empty":
      return <EmptyCard message={view.message} />;
    case "fallback":
      return <FallbackCard raw={view.raw} issues={view.issues} />;
    case "error":
      return <p className="text-sm text-bad">{view.message}</p>;
  }
}
