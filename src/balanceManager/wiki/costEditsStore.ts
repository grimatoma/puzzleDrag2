// costEditsStore.ts — local staging store for Cost-matrix edits.
//
// Holds a flat map of dotted edit-path → staged number, persisted to
// localStorage and shared across every Cost-matrix surface (the per-category
// sections and the unified page) via a tiny external store + useSyncExternalStore.
//
// IMPORTANT: this is a *staging scratch pad only*. It is never read by the game
// or merged into the effective config — the game always runs off the real
// constants. The Export view turns these edits into a change list the designer
// pastes into a new LLM session. Mirrors the wikiView.ts localStorage pattern.

import { useSyncExternalStore } from "react";

export type CostEdits = Record<string, number>;

const STORAGE_KEY = "hearth.wiki.costEdits";

const EMPTY: CostEdits = {};

let edits: CostEdits = readEdits();
const listeners = new Set<() => void>();

function readEdits(): CostEdits {
  try {
    if (typeof localStorage === "undefined") return EMPTY;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return EMPTY;
    const out: CostEdits = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof v === "number" && Number.isFinite(v)) out[k] = v;
    }
    return out;
  } catch {
    return EMPTY;
  }
}

function persist(): void {
  try {
    if (typeof localStorage === "undefined") return;
    if (Object.keys(edits).length === 0) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, JSON.stringify(edits));
  } catch {
    /* storage unavailable — keep the in-memory copy */
  }
}

function emit(): void {
  for (const l of listeners) l();
}

// ─── Public store API (also usable outside React) ─────────────────────────────

export function getCostEdits(): CostEdits {
  return edits;
}

/** Stage an edit. A value equal to the caller's baseline should be cleared, not set. */
export function setCostEdit(path: string, value: number): void {
  if (!path || !Number.isFinite(value)) return;
  if (edits[path] === value) return;
  edits = { ...edits, [path]: value };
  persist();
  emit();
}

/** Drop a single staged edit (revert that cell to its baseline). */
export function clearCostEdit(path: string): void {
  if (!Object.prototype.hasOwnProperty.call(edits, path)) return;
  const next = { ...edits };
  delete next[path];
  edits = next;
  persist();
  emit();
}

/** Drop every staged edit. */
export function clearAllCostEdits(): void {
  if (Object.keys(edits).length === 0) return;
  edits = EMPTY;
  persist();
  emit();
}

export function subscribeCostEdits(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// ─── React hook ───────────────────────────────────────────────────────────────

export interface UseCostEdits {
  edits: CostEdits;
  setEdit: (path: string, value: number) => void;
  clearEdit: (path: string) => void;
  clearAll: () => void;
}

export function useCostEdits(): UseCostEdits {
  const snapshot = useSyncExternalStore(subscribeCostEdits, getCostEdits, getCostEdits);
  return {
    edits: snapshot,
    setEdit: setCostEdit,
    clearEdit: clearCostEdit,
    clearAll: clearAllCostEdits,
  };
}
