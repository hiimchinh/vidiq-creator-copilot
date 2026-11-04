import { describe, expect, it } from "vitest";
import { pageCount, paginate, readTableState, sortRows, writeTableState } from "./keyword-table-state";

const rows = [
  { keyword: "b", volume: 10, competition: 50, overall: 40 },
  { keyword: "a", volume: 30, competition: 20, overall: 80 },
  { keyword: "c", volume: 20, competition: 90, overall: 10 },
];

describe("sortRows", () => {
  it("sorts numbers descending and ascending without mutating input", () => {
    expect(sortRows(rows, "volume", "desc").map((r) => r.keyword)).toEqual(["a", "c", "b"]);
    expect(sortRows(rows, "volume", "asc").map((r) => r.keyword)).toEqual(["b", "c", "a"]);
    expect(rows[0]?.keyword).toBe("b");
  });

  it("sorts strings alphabetically", () => {
    expect(sortRows(rows, "keyword", "asc").map((r) => r.keyword)).toEqual(["a", "b", "c"]);
  });
});

describe("paginate", () => {
  const many = Array.from({ length: 23 }, (_, i) => i);
  it("returns the requested page and clamps out-of-range pages", () => {
    expect(paginate(many, 1, 10)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(paginate(many, 3, 10)).toEqual([20, 21, 22]);
    expect(paginate(many, 9, 10)).toEqual([20, 21, 22]);
    expect(pageCount(23, 10)).toBe(3);
    expect(pageCount(0, 10)).toBe(1);
  });
});

describe("table state persistence", () => {
  it("reads sort and page from the URL first", () => {
    const s = readTableState(new URLSearchParams("kw_sort=competition&kw_dir=asc&kw_page=2"), null);
    expect(s).toMatchObject({ sort: "competition", dir: "asc", page: 2 });
  });

  it("falls back to localStorage, then to defaults", () => {
    const stored = JSON.stringify({ sort: "overall", dir: "desc", page: 3, pageSize: 25, mobileColumn: "competition" });
    expect(readTableState(new URLSearchParams(), stored)).toEqual({
      sort: "overall",
      dir: "desc",
      page: 3,
      pageSize: 25,
      mobileColumn: "competition",
    });
    expect(readTableState(new URLSearchParams(), null)).toEqual({
      sort: "volume",
      dir: "desc",
      page: 1,
      pageSize: 10,
      mobileColumn: "volume",
    });
  });

  it("ignores invalid or hostile values", () => {
    const s = readTableState(new URLSearchParams("kw_sort=__proto__&kw_dir=up&kw_page=-4"), "{not json");
    expect(s).toMatchObject({ sort: "volume", dir: "desc", page: 1 });
  });

  it("writes sort and page into URL params without dropping other params", () => {
    const params = writeTableState(new URLSearchParams("mode=replay"), { sort: "overall", dir: "asc", page: 2 });
    expect(params.toString()).toBe("mode=replay&kw_sort=overall&kw_dir=asc&kw_page=2");
  });
});
