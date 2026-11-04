import { type OutlierVideo, OutlierVideoSchema } from "./view-types";

const num = (s: string | undefined) => Number((s ?? "").replace(/,/g, ""));

/** Parses the "### N. Title" blocks vidIQ outliers returns. */
export function parseOutliersMarkdown(text: string): { videos: OutlierVideo[]; issues: string[] } {
  const videos: OutlierVideo[] = [];
  const issues: string[] = [];
  const blocks = text.split(/^###\s+\d+\.\s+/m).slice(1);

  for (const block of blocks) {
    const [titleLine = "", ...rest] = block.split(/\r?\n/);
    const body = rest.join("\n");
    const channel = /\*\*Channel:\*\*\s*([^·\n]+?)\s*·\s*([\d.,]+[KMB]?)\s+subscribers/.exec(body);
    const perf = /\*\*Performance:\*\*\s*([\d.,]+[KMB]?)\s+views\s*·\s*([\d.,]+)x breakout\s*·\s*([\d.,]+)\s+views\/hour\s*·\s*([\d.,]+)%\s+engagement/.exec(body);
    const details = /\*\*Details:\*\*\s*published\s+(\d{4}-\d{2}-\d{2})[^·\n]*·\s*([\d:]+)/.exec(body);
    const video = /videoId\s+`([\w-]{11})`/.exec(body);
    const candidate = {
      title: titleLine.trim(),
      channel: channel?.[1]?.trim() ?? "",
      subscribers: channel?.[2] ?? "",
      views: perf?.[1] ?? "",
      breakout: num(perf?.[2]),
      vph: num(perf?.[3]),
      engagementPct: num(perf?.[4]),
      publishedAt: details?.[1] ?? "",
      duration: details?.[2] ?? "",
      videoId: video?.[1] ?? "",
    };
    const parsed = OutlierVideoSchema.safeParse(candidate);
    if (parsed.success) videos.push(parsed.data);
    else issues.push(`"${candidate.title.slice(0, 40)}": ${parsed.error.issues.map((i) => i.path.join(".")).join(", ")}`);
  }
  return { videos, issues };
}
