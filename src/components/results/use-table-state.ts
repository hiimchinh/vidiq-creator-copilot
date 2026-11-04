"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_TABLE_STATE,
  STORAGE_KEY,
  type TableState,
  readTableState,
  writeTableState,
} from "@/lib/table/keyword-table-state";

/** Table state persisted in the URL (shareable) and localStorage (survives a plain reload). */
export function useTableState(): [TableState, (patch: Partial<TableState>) => void] {
  const [state, setState] = useState<TableState>(DEFAULT_TABLE_STATE);

  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(STORAGE_KEY);
    } catch {
      // Storage may be blocked; the URL still works.
    }
    setState(readTableState(new URLSearchParams(window.location.search), stored));
  }, []);

  const update = useCallback((patch: Partial<TableState>) => {
    setState((prev) => {
      const next = { ...prev, ...patch };
      const params = writeTableState(new URLSearchParams(window.location.search), next);
      window.history.replaceState(window.history.state, "", `${window.location.pathname}?${params}`);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Ignore quota errors.
      }
      return next;
    });
  }, []);

  return [state, update];
}
