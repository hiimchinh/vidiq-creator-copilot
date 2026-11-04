"use client";

import { formatCompact, formatPct } from "@/lib/format";
import type { KeywordRow } from "@/lib/schemas/view-types";
import { METRIC_KEYS, type MetricKey, PAGE_SIZES, type SortKey, pageCount, paginate, sortRows } from "@/lib/table/keyword-table-state";
import { MetricCell } from "./metric-cell";
import { useTableState } from "./use-table-state";

const LABELS: Record<SortKey, string> = { keyword: "Keyword", volume: "Volume", competition: "Competition", overall: "Overall" };

export function KeywordTable({ rows, notes }: { rows: KeywordRow[]; notes: string[] }) {
  const [state, update] = useTableState();
  const pages = pageCount(rows.length, state.pageSize);
  const page = Math.min(state.page, pages);
  const visible = paginate(sortRows(rows, state.sort, state.dir), page, state.pageSize);

  const metricClass = (key: MetricKey) => (key === state.mobileColumn ? "table-cell" : "hidden sm:table-cell");
  const sortBy = (key: SortKey) =>
    update({ sort: key, dir: state.sort === key && state.dir === "desc" ? "asc" : "desc", page: 1 });
  const ariaSort = (key: SortKey) => (state.sort === key ? (state.dir === "asc" ? "ascending" : "descending") : "none");

  return (
    <div className="flex flex-col gap-2" data-testid="keyword-table">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
        <span>{rows.length} keywords</span>
        <label className="ml-auto flex items-center gap-1.5 sm:hidden">
          <span>Column</span>
          <select
            aria-label="Metric column"
            value={state.mobileColumn}
            onChange={(e) => update({ mobileColumn: e.target.value as MetricKey })}
            className="rounded border border-line bg-bg px-1.5 py-1 text-ink"
          >
            {METRIC_KEYS.map((k) => (
              <option key={k} value={k}>{LABELS[k]}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="overflow-x-auto rounded-md border border-line">
        <table className="w-full border-collapse text-left text-[13px]">
          <thead className="bg-surface-2 text-xs text-muted">
            <tr>
              {(["keyword", ...METRIC_KEYS] as SortKey[]).map((key) => (
                <th key={key} scope="col" aria-sort={ariaSort(key)} className={`px-3 py-2 font-medium ${key === "keyword" ? "" : metricClass(key as MetricKey)}`}>
                  <button type="button" onClick={() => sortBy(key)} className="inline-flex items-center gap-1 hover:text-ink">
                    {LABELS[key]}
                    <span aria-hidden="true" className={state.sort === key ? "text-accent" : "opacity-30"}>
                      {state.sort === key && state.dir === "asc" ? "▲" : "▼"}
                    </span>
                  </button>
                </th>
              ))}
              <th scope="col" className="hidden px-3 py-2 font-medium lg:table-cell">Monthly searches</th>
              <th scope="col" className="hidden px-3 py-2 font-medium lg:table-cell">Trend</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <tr key={`${row.section}-${row.keyword}`} className="border-t border-line">
                <th scope="row" className="max-w-[16rem] px-3 py-2 font-normal">
                  <span className="break-words">{row.keyword}</span>
                  {row.section === "seedKeyword" && <span className="ml-1.5 rounded bg-accent-soft px-1 text-[10px] text-accent">seed</span>}
                </th>
                {METRIC_KEYS.map((key) => (
                  <td key={key} className={`px-3 py-2 ${metricClass(key)}`}>
                    <MetricCell metric={key} value={row[key]} />
                  </td>
                ))}
                <td className="tabular hidden px-3 py-2 lg:table-cell">{formatCompact(row.monthlySearches)}</td>
                <td className={`tabular hidden px-3 py-2 lg:table-cell ${row.growthPct === null ? "text-muted" : row.growthPct >= 0 ? "text-good" : "text-bad"}`}>
                  {formatPct(row.growthPct)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <nav aria-label="Keyword pages" className="flex flex-wrap items-center gap-2 text-xs">
        <button type="button" disabled={page <= 1} onClick={() => update({ page: page - 1 })} className="rounded border border-line px-2 py-1 disabled:opacity-40">
          Previous
        </button>
        <span className="tabular text-muted" aria-live="polite">Page {page} of {pages}</span>
        <button type="button" disabled={page >= pages} onClick={() => update({ page: page + 1 })} className="rounded border border-line px-2 py-1 disabled:opacity-40">
          Next
        </button>
        <label className="ml-auto flex items-center gap-1.5 text-muted">
          Rows
          <select value={state.pageSize} onChange={(e) => update({ pageSize: Number(e.target.value), page: 1 })} className="rounded border border-line bg-bg px-1.5 py-1 text-ink">
            {PAGE_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
      </nav>
      {notes.map((n) => <p key={n} className="text-[11px] text-muted">{n}</p>)}
    </div>
  );
}
