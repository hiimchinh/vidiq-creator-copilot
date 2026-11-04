export type SortDir = "asc" | "desc";
export const SORT_KEYS = ["keyword", "volume", "competition", "overall"] as const;
export type SortKey = (typeof SORT_KEYS)[number];
export const METRIC_KEYS = ["volume", "competition", "overall"] as const;
export type MetricKey = (typeof METRIC_KEYS)[number];
export const PAGE_SIZES = [10, 25, 50] as const;

export interface TableState {
  sort: SortKey;
  dir: SortDir;
  page: number;
  pageSize: number;
  /** Which metric column is visible on narrow screens. */
  mobileColumn: MetricKey;
}

export const DEFAULT_TABLE_STATE: TableState = { sort: "volume", dir: "desc", page: 1, pageSize: 10, mobileColumn: "volume" };
export const STORAGE_KEY = "kw-table-state";

const isSortKey = (v: unknown): v is SortKey => SORT_KEYS.includes(v as SortKey);
const isMetric = (v: unknown): v is MetricKey => METRIC_KEYS.includes(v as MetricKey);
const isDir = (v: unknown): v is SortDir => v === "asc" || v === "desc";
const toPage = (v: unknown): number | undefined => {
  const n = Number(v);
  return Number.isInteger(n) && n >= 1 ? n : undefined;
};

export function sortRows<T extends Record<SortKey, string | number | null>>(rows: readonly T[], key: SortKey, dir: SortDir): T[] {
  const sign = dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const x = a[key];
    const y = b[key];
    if (x === y) return 0;
    if (x === null) return 1; // missing values always last
    if (y === null) return -1;
    if (typeof x === "number" && typeof y === "number") return (x - y) * sign;
    return String(x).localeCompare(String(y)) * sign;
  });
}

export const pageCount = (total: number, pageSize: number) => Math.max(1, Math.ceil(total / pageSize));

export function paginate<T>(rows: readonly T[], page: number, pageSize: number): T[] {
  const safePage = Math.min(Math.max(1, page), pageCount(rows.length, pageSize));
  return rows.slice((safePage - 1) * pageSize, safePage * pageSize);
}

function parseStored(stored: string | null): Partial<TableState> {
  if (!stored) return {};
  try {
    const raw = JSON.parse(stored) as Record<string, unknown>;
    const out: Partial<TableState> = {};
    if (isSortKey(raw.sort)) out.sort = raw.sort;
    if (isDir(raw.dir)) out.dir = raw.dir;
    if (toPage(raw.page)) out.page = toPage(raw.page);
    if (PAGE_SIZES.includes(raw.pageSize as 10)) out.pageSize = raw.pageSize as number;
    if (isMetric(raw.mobileColumn)) out.mobileColumn = raw.mobileColumn;
    return out;
  } catch {
    return {};
  }
}

/** URL wins (shareable link), then localStorage (last visit), then defaults. */
export function readTableState(params: URLSearchParams, stored: string | null): TableState {
  const fromUrl: Partial<TableState> = {};
  const sort = params.get("kw_sort");
  const dir = params.get("kw_dir");
  const page = toPage(params.get("kw_page"));
  if (isSortKey(sort)) fromUrl.sort = sort;
  if (isDir(dir)) fromUrl.dir = dir;
  if (page) fromUrl.page = page;
  return { ...DEFAULT_TABLE_STATE, ...parseStored(stored), ...fromUrl };
}

export function writeTableState(params: URLSearchParams, state: Pick<TableState, "sort" | "dir" | "page">): URLSearchParams {
  const next = new URLSearchParams(params);
  next.set("kw_sort", state.sort);
  next.set("kw_dir", state.dir);
  next.set("kw_page", String(state.page));
  return next;
}
