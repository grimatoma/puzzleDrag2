// costColumnsStore.ts — local staging store for *user-added* Cost-matrix columns.
//
// The cost grids derive their columns from the catalogs (every resource an
// entity natively costs). To stage a cost for a resource nothing currently uses,
// the designer first adds a blank column for it; this store remembers those
// extra column keys per matrix so the column survives navigation and reloads.
//
// Like costEditsStore, this is a *staging scratch pad only* — it never touches
// the running game. An empty added column exports nothing; only a typed value
// (held in costEditsStore) becomes a change. Mirrors that store's tiny external
// store + useSyncExternalStore + localStorage pattern.

import { useSyncExternalStore } from "react";
import type { CostColumnsByMatrix, CostMatrixId } from "./costMatrix.js";

export type CostColumns = CostColumnsByMatrix;

const STORAGE_KEY = "hearth.wiki.costColumns";

const EMPTY: CostColumns = {};

let columns: CostColumns = readColumns();
const listeners = new Set<() => void>();

function readColumns(): CostColumns {
  try {
    if (typeof localStorage === "undefined") return EMPTY;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return EMPTY;
    const out: CostColumns = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (!Array.isArray(v)) continue;
      const keys = v.filter((x): x is string => typeof x === "string" && x.length > 0);
      if (keys.length) out[k as CostMatrixId] = [...new Set(keys)];
    }
    return out;
  } catch {
    return EMPTY;
  }
}

function persist(): void {
  try {
    if (typeof localStorage === "undefined") return;
    if (Object.keys(columns).length === 0) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, JSON.stringify(columns));
  } catch {
    /* storage unavailable — keep the in-memory copy */
  }
}

function emit(): void {
  for (const l of listeners) l();
}

// ─── Public store API (also usable outside React) ─────────────────────────────

export function getCostColumns(): CostColumns {
  return columns;
}

/** Add a staging column for `key` to a matrix (no-op if already present). */
export function addCostColumn(matrixId: CostMatrixId, key: string): void {
  if (!matrixId || !key) return;
  const current = columns[matrixId] ?? [];
  if (current.includes(key)) return;
  columns = { ...columns, [matrixId]: [...current, key] };
  persist();
  emit();
}

/** Drop a staging column from a matrix (the cells revert to read-only blanks). */
export function removeCostColumn(matrixId: CostMatrixId, key: string): void {
  const current = columns[matrixId];
  if (!current || !current.includes(key)) return;
  const next = current.filter((k) => k !== key);
  const updated = { ...columns };
  if (next.length) updated[matrixId] = next;
  else delete updated[matrixId];
  columns = updated;
  persist();
  emit();
}

/** Drop every staging column across all matrices. */
export function clearAllCostColumns(): void {
  if (Object.keys(columns).length === 0) return;
  columns = EMPTY;
  persist();
  emit();
}

export function subscribeCostColumns(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// ─── React hook ───────────────────────────────────────────────────────────────

export interface UseCostColumns {
  columns: CostColumns;
  addColumn: (matrixId: CostMatrixId, key: string) => void;
  removeColumn: (matrixId: CostMatrixId, key: string) => void;
  clearAll: () => void;
}

export function useCostColumns(): UseCostColumns {
  const snapshot = useSyncExternalStore(subscribeCostColumns, getCostColumns, getCostColumns);
  return {
    columns: snapshot,
    addColumn: addCostColumn,
    removeColumn: removeCostColumn,
    clearAll: clearAllCostColumns,
  };
}
