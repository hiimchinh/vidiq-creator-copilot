import { type KeywordRow, KeywordRowSchema } from "./view-types";

const COLUMN_MAP: Record<string, keyof KeywordRow> = {
  keyword: "keyword",
  question: "keyword",
  volume: "volume",
  competition: "competition",
  overall: "overall",
  estimatedmonthlysearch: "monthlySearches",
  searchdemandgrowthpct: "growthPct",
};

const cells = (line: string) => line.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());

/** "null", "", "none" → null; "-37.8%" → -37.8; "4,836" → 4836. Anything else that is not a number → NaN (fails validation). */
function toNumber(cell: string): number | null {
  if (/^(null|none|n\/a|-|)$/i.test(cell)) return null;
  return Number(cell.replace(/[%,+\s]/g, ""));
}

/** Parses the markdown tables vidIQ keyword_research returns. Rows that fail validation are reported as issues. */
export function parseKeywordMarkdown(text: string): { rows: KeywordRow[]; notes: string[]; issues: string[] } {
  const rows: KeywordRow[] = [];
  const issues: string[] = [];
  let section = "results";
  let header: (keyof KeywordRow | undefined)[] | undefined;

  for (const line of text.split(/\r?\n/)) {
    const heading = /^###\s+(\w+)/.exec(line);
    if (heading?.[1]) {
      section = heading[1];
      header = undefined;
      continue;
    }
    if (!line.trim().startsWith("|")) {
      header = undefined;
      continue;
    }
    if (/^\|\s*-/.test(line.trim())) continue;
    const values = cells(line);
    if (!header) {
      header = values.map((name) => COLUMN_MAP[name.toLowerCase().replace(/[^a-z]/g, "")]);
      continue;
    }
    const raw: Record<string, unknown> = { section };
    header.forEach((field, i) => {
      if (!field) return;
      raw[field] = field === "keyword" ? values[i] : toNumber(values[i] ?? "");
    });
    const parsed = KeywordRowSchema.safeParse(raw);
    if (parsed.success) rows.push(parsed.data);
    else issues.push(`row "${values[0] ?? "?"}": ${parsed.error.issues.map((i) => i.path.join(".")).join(", ")}`);
  }

  const notes = text.split(/\r?\n/).filter((l) => /^Note:/.test(l)).map((l) => l.replace(/^Note:\s*/, ""));
  return { rows, notes, issues };
}
