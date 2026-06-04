// Hash-based router that mirrors the navigation-relevant parts of game state
// onto the URL. Hash routing was chosen so deep links work on any static
// deployment without needing a server-side fallback to index.html.
//
// URL shape:
//   #/<view>[/<sub1>[/<sub2>]][?modal=<name>&tab=<sub>]
//
// Examples:
//   #/town
//   #/board
//   #/crafting/tools
//   #/tiles/farm/grass
//   #/cartography/orchard
//   #/town?modal=menu
//   #/town?modal=menu&tab=settings
//   #/board?conceptTiles=1   (global preview flag — preserved across navigation)
//
// The Dev Panel is a separate Vite entry served at `/b/` and has its
// own hash router (`src/balanceManager/router.js`) — it does not share this
// view space.

import { useEffect, useRef } from "react";
import type { GameState, Dispatch } from "./types/state.js";
import { appendGlobalHashFlags } from "./appQueryParams.js";

interface FeatureModuleShape { viewKey?: string }

const featureModules = import.meta.glob<FeatureModuleShape>("./features/*/index.{jsx,tsx}", { eager: true });
const FEATURE_VIEW_KEYS = Object.values(featureModules)
  .map((mod) => mod.viewKey)
  .filter((key): key is string => !!key);

// Views reachable via the URL (shell views + feature viewKey exports).
export const KNOWN_VIEWS = new Set<string>([
  "town",
  "board",
  ...FEATURE_VIEW_KEYS,
]);

// Modals that are reachable via the URL.
// Excluded from deep links (gameplay-gated only): `season`, `leaveBoard`, `runSummary`.
export const KNOWN_MODALS = new Set<string>([
  "menu",
  "boss",
  "tutorial",
  "debug",
  "festivals",
]);

// Short alias used in URLs in place of the longer camelCase view key.
const VIEW_ALIASES: Record<string, string> = {
  tiles: "tileCollection",
  wiki: "recipeWiki",
};
const VIEW_ALIASES_REVERSE: Record<string, string> = {
  tileCollection: "tiles",
  recipeWiki: "wiki",
};

// Views that accept a single `tab` segment after the view name. Each view's
// component stores its active tab in state.viewParams.tab (or, for crafting,
// in the legacy state.craftingTab field that this router projects through).
const VIEWS_WITH_TAB = new Set<string>([
  "crafting",
  "quests",
  "achievements",
  "townsfolk",
]);

function viewFromSegment(seg: string | undefined): string {
  if (!seg) return "town";
  const decoded = decodeURIComponent(seg);
  const aliased = VIEW_ALIASES[decoded] ?? decoded;
  return KNOWN_VIEWS.has(aliased) ? aliased : "town";
}

function segmentForView(view: string): string {
  return VIEW_ALIASES_REVERSE[view] ?? view;
}

export interface RouteViewParams {
  sub?: string;
  cat?: string;
  zone?: string;
  tab?: string;
  [k: string]: string | undefined;
}

export interface RouteModalParams {
  tab?: string;
  [k: string]: string | undefined;
}

export interface RouteDescriptor {
  view: string;
  modal: string | null;
  viewParams: RouteViewParams;
  modalParams: RouteModalParams;
}

/**
 * Parse a hash string (e.g. "#/tiles/farm/grass?modal=menu&tab=about") into
 * a route descriptor.
 */
export function parseHash(hash = ""): RouteDescriptor {
  const raw = String(hash || "").replace(/^#\/?/, "");
  if (!raw) return { view: "town", modal: null, viewParams: {}, modalParams: {} };
  const [pathPart, queryPart = ""] = raw.split("?");
  const segments = pathPart ? pathPart.split("/").filter(Boolean) : [];
  const view = viewFromSegment(segments[0]);
  const viewParams: RouteViewParams = {};
  if (view === "tileCollection") {
    if (segments[1]) viewParams.sub = decodeURIComponent(segments[1]);
    if (segments[2]) viewParams.cat = decodeURIComponent(segments[2]);
  } else if (view === "cartography") {
    // Cartography uses a single `zone` segment for the inspected node.
    if (segments[1]) viewParams.zone = decodeURIComponent(segments[1]);
  } else if (VIEWS_WITH_TAB.has(view)) {
    if (segments[1]) viewParams.tab = decodeURIComponent(segments[1]);
  }
  const params = new URLSearchParams(queryPart);
  const modalRaw = params.get("modal");
  const modal = modalRaw && KNOWN_MODALS.has(modalRaw) ? modalRaw : null;
  const modalParams: RouteModalParams = {};
  if (modal === "menu") {
    const tab = params.get("tab");
    if (tab) modalParams.tab = tab;
  }
  return { view, modal, viewParams, modalParams };
}

/**
 * Build a hash string from a route descriptor. The result always starts with
 * "#/" so it's safe to assign to `location.hash`.
 */
export function buildHash({ view = "town", modal = null, viewParams = {}, modalParams = {} }: Partial<RouteDescriptor> = {}): string {
  const safeView = KNOWN_VIEWS.has(view) ? view : "town";
  const segments = [segmentForView(safeView)];
  if (safeView === "tileCollection") {
    if (viewParams.sub) {
      segments.push(encodeURIComponent(viewParams.sub));
      if (viewParams.cat) segments.push(encodeURIComponent(viewParams.cat));
    }
  } else if (safeView === "cartography") {
    if (viewParams.zone) segments.push(encodeURIComponent(viewParams.zone));
  } else if (VIEWS_WITH_TAB.has(safeView)) {
    if (viewParams.tab) segments.push(encodeURIComponent(viewParams.tab));
  }
  const path = segments.join("/");
  const queryParts: string[] = [];
  if (modal && KNOWN_MODALS.has(modal)) {
    queryParts.push(`modal=${encodeURIComponent(modal)}`);
    if (modal === "menu" && modalParams.tab) {
      queryParts.push(`tab=${encodeURIComponent(modalParams.tab)}`);
    }
  }
  const withGlobals = appendGlobalHashFlags(queryParts);
  const query = withGlobals.length ? `?${withGlobals.join("&")}` : "";
  return `#/${path}${query}`;
}

interface RouterStateView {
  view?: string;
  modal?: string | null;
  viewParams?: Record<string, unknown>;
  craftingTab?: string | null;
  settingsTab?: string;
}

/**
 * Project current game state onto a route descriptor.
 */
export function routeFromState(state: RouterStateView): RouteDescriptor {
  const view = state.view ?? "town";
  const modal = state.modal ?? null;
  const viewParams: RouteViewParams = {};
  if (view === "tileCollection") {
    const tcParams = state.viewParams ?? {};
    const sub = tcParams.sub;
    const cat = tcParams.cat;
    if (typeof sub === "string") viewParams.sub = sub;
    if (typeof cat === "string") viewParams.cat = cat;
  } else if (view === "cartography") {
    const zone = state.viewParams?.zone;
    if (typeof zone === "string") viewParams.zone = zone;
  } else if (view === "crafting") {
    // craftingTab is the legacy redux home for the crafting station; if a
    // viewParams.tab override is also set (e.g. from ROUTE/APPLY) prefer it
    // since SET_VIEW carries craftingTab forward verbatim.
    const tabFromParams = state.viewParams?.tab;
    const tab = (typeof tabFromParams === "string" ? tabFromParams : null) ?? state.craftingTab ?? null;
    if (tab) viewParams.tab = tab;
  } else if (VIEWS_WITH_TAB.has(view)) {
    const tab = state.viewParams?.tab;
    if (typeof tab === "string") viewParams.tab = tab;
  }
  const modalParams: RouteModalParams = {};
  if (modal === "menu") {
    const tab = state.settingsTab && state.settingsTab !== "main" ? state.settingsTab : null;
    if (tab) modalParams.tab = tab;
  }
  return { view, modal, viewParams, modalParams };
}

/**
 * React hook that wires the browser URL to game state. On mount it applies
 * whatever route is currently in the URL (so deep links work). Subsequent
 * state changes push a new history entry; back/forward (popstate) and manual
 * hash edits dispatch a ROUTE/APPLY back into state.
 */
export function useRouter(state: GameState, dispatch: Dispatch): void {
  // Last hash we wrote — used to detect "no real change" so we don't
  // pushState on every reducer dispatch.
  const lastHashRef = useRef<string | null>(null);
  // Tracks whether we've performed the initial sync.
  const initialisedRef = useRef(false);

  // Initial mount: parse the current hash and apply it. Use replaceState so
  // we don't pollute history with a redundant entry.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const incoming = parseHash(window.location.hash);
    const desired = buildHash(incoming);
    // Normalise the URL (e.g. "" → "#/town").
    if (window.location.hash !== desired) {
      window.history.replaceState(null, "", desired);
    }
    lastHashRef.current = desired;
    initialisedRef.current = true;
    dispatch({ type: "ROUTE/APPLY", route: incoming });
  }, [dispatch]);

  // popstate — back/forward buttons. hashchange — direct hash edits in the
  // address bar. Both should sync state from URL without pushing a new entry.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = () => {
      const incoming = parseHash(window.location.hash);
      if ((state.view ?? "town") === "board" && (incoming.view ?? "town") !== "board") {
        const currentBoardHash = buildHash(routeFromState(state));
        if (window.location.hash !== currentBoardHash) {
          window.history.replaceState(null, "", currentBoardHash);
        }
        lastHashRef.current = currentBoardHash;
        dispatch({ type: "OPEN_MODAL", modal: "leaveBoard" });
        return;
      }
      const desired = buildHash(incoming);
      lastHashRef.current = desired;
      dispatch({ type: "ROUTE/APPLY", route: incoming });
    };
    window.addEventListener("popstate", handler);
    window.addEventListener("hashchange", handler);
    return () => {
      window.removeEventListener("popstate", handler);
      window.removeEventListener("hashchange", handler);
    };
  }, [dispatch, state]);

  // State → URL: when navigation-relevant fields change, push a new entry.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!initialisedRef.current) return;
    const desired = buildHash(routeFromState(state));
    if (desired === lastHashRef.current) return;
    lastHashRef.current = desired;
    window.history.pushState(null, "", desired);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: only watch the navigation-relevant slice; the broader `state` reference changes on every dispatch
  }, [state.view, state.modal, state.craftingTab, state.settingsTab, state.viewParams]);
}
