/**
 * wikiView.ts — Wiki view-mode context: "developer" | "player".
 *
 * Wraps the entire wiki shell so any descendant can read (or switch)
 * the current view. Persisted to localStorage so the selection survives
 * page reloads.
 *
 * Default view: "developer" (the wiki doubles as living documentation).
 *
 * Usage:
 *   // Wrap the root shell:
 *   <WikiViewProvider>…</WikiViewProvider>
 *
 *   // Read in any descendant:
 *   const { view, setView } = useWikiView();
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useState,
} from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type WikiViewMode = "developer" | "player";

export interface WikiViewContextValue {
  view: WikiViewMode;
  setView: (v: WikiViewMode) => void;
}

// ─── localStorage helpers (mirror the SIDEBAR_COLLAPSED_KEY pattern) ──────────

const VIEW_KEY = "hearth.wiki.view";

function readView(): WikiViewMode {
  try {
    if (typeof localStorage === "undefined") return "developer";
    const raw = localStorage.getItem(VIEW_KEY);
    if (raw === "player" || raw === "developer") return raw;
  } catch {
    /* storage unavailable */
  }
  return "developer";
}

function writeView(v: WikiViewMode): void {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(VIEW_KEY, v);
  } catch {
    /* storage unavailable */
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────

const WikiViewContext = createContext<WikiViewContextValue>({
  view: "developer",
  setView: () => {},
});

// ─── Provider ─────────────────────────────────────────────────────────────────

export function WikiViewProvider({ children }: { children: React.ReactNode }) {
  const [view, setViewState] = useState<WikiViewMode>(readView);

  const setView = useCallback((v: WikiViewMode) => {
    writeView(v);
    setViewState(v);
  }, []);

  return React.createElement(
    WikiViewContext.Provider,
    { value: { view, setView } },
    children,
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useWikiView(): WikiViewContextValue {
  return useContext(WikiViewContext);
}
