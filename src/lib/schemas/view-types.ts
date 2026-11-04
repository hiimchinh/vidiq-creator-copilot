import { z } from "zod";

const nullableNumber = z.number().finite().nullable();

export const KeywordRowSchema = z.object({
  keyword: z.string().min(1),
  section: z.string(),
  volume: nullableNumber,
  competition: nullableNumber,
  overall: nullableNumber,
  monthlySearches: nullableNumber,
  growthPct: nullableNumber,
});
export type KeywordRow = z.infer<typeof KeywordRowSchema>;

export const OutlierVideoSchema = z.object({
  title: z.string().min(1),
  channel: z.string(),
  subscribers: z.string(),
  views: z.string(),
  breakout: z.number().finite(),
  vph: z.number().finite(),
  engagementPct: z.number().finite(),
  publishedAt: z.string(),
  duration: z.string(),
  videoId: z.string().regex(/^[\w-]{11}$/),
});
export type OutlierVideo = z.infer<typeof OutlierVideoSchema>;

const credits = z.object({ used: z.number() }).optional();

export const TitleScoreSchema = z.object({ score: z.number().min(0).max(100), _credits: credits });
export const GeneratedTitlesSchema = z.object({
  titles: z.array(z.object({ title: z.string().min(1), score: z.number().min(0).max(100) })),
  _credits: credits,
});

export const ChannelStatsSchema = z.object({
  title: z.string(),
  thumbnail: z.string().url().nullable().optional(),
  currentStats: z.object({ subscribers: z.number(), views: z.number(), videos: z.number() }),
  growth: z.object({ subscribersGained: z.number(), viewsGained: z.number(), videosPublished: z.number() }),
  dailyStats: z.array(z.object({ date: z.string(), subscribers: z.number(), views: z.number() })).default([]),
  _credits: credits,
});

export type ResultView =
  | { kind: "keywords"; rows: KeywordRow[]; notes: string[] }
  | { kind: "titleScore"; title: string; score: number; creditsUsed?: number }
  | { kind: "titles"; titles: { title: string; score: number }[]; creditsUsed?: number }
  | { kind: "outliers"; videos: OutlierVideo[] }
  | {
      kind: "channel";
      title: string;
      thumbnail?: string | null;
      current: { subscribers: number; views: number; videos: number };
      growth: { subscribersGained: number; viewsGained: number; videosPublished: number };
      daily: { date: string; subscribers: number; views: number }[];
    }
  | { kind: "empty"; message: string }
  | { kind: "fallback"; raw: string; issues: string[] }
  | { kind: "error"; errorKind: string; message: string };
