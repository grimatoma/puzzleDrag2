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
//
// The Balance Manager is a separate Vite entry served at `/b/` and has its
// own hash router (`src/balanceManager/router.js`) — it does not share this
// view space.

import { useEffect, useRef } from "react";

// Views that are reachable via the URL. Anything not listed here is treated
// as "town" when parsing — guards against stale hashes or typos.
export const KNOWN_VIEWS = new Set([
  "town",
  "board",
  "inventory",
  "quests",
  "crafting",
  "cartography",
  "townsfolk",
  "tileCollection",
  "achievements",
  "portal",
  "orders",
]);

// Modals that are reachable via the URL. The transient `season` modal is
// intentionally excluded — it's gated by gameplay state, not navigation, and
// linking directly to it would put the player in an invalid run.
export const KNOWN_MODALS = new Set([
  "menu",
  "boss",
  "tutorial",
]);

// Short alias used in URLs in place of the longer camelCase view key.
const VIEW_ALIASES = {
  tiles: "tileCollection",
};
const VIEW_ALIASES_REVERSE = {
  tileCollection: "tiles",
};

// Views that accept a single `tab` segment after the view name. Each view's
// component stores its active tab in state.viewParams.tab (or, for crafting,
// in the legacy state.craftingTab field that this router projects through).
const VIEWS_WITH_TAB = new Set([
  "crafting",
  "quests",
  "achievements",
  "townsfolk",
]);

function viewFromSegment(seg) {
  if (!seg) return "town";
  const decoded = decodeURIComponent(seg);
  const aliased = VIEW_ALIASES[decoded] ?? decoded;
  return KNOWN_VIEWS.has(aliased) ? aliased : "town";
}

function segmentForView(view) {
  return VIEW_ALIASES_REVERSE[view] ?? view;
}

/**
 * Parse a hash string (e.g. "#/tiles/farm/grass?modal=menu&tab=about") into
 * a route descriptor.
 */
export function parseHash(hash = "") {
  const raw = String(hash || "").replace(/^#\/?/, "");
  if (!raw) return { view: "town", modal: null, viewParams: {}, modalParams: {} };
  const [pathPart, queryPart = ""] = raw.split("?");
  const segments = pathPart ? pathPart.split("/").filter(Boolean) : [];
  const view = viewFromSegment(segments[0]);
  const viewParams = {};
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
  const modalParams = {};
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
export function buildHash({ view = "town", modal = null, viewParams = {}, modalParams = {} } = {}) {
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
  const queryParts = [];
  if (modal && KNOWN_MODALS.has(modal)) {
    queryParts.push(`modal=${encodeURIComponent(modal)}`);
    if (modal === "menu" && modalParams.tab) {
      queryParts.push(`tab=${encodeURIComponent(modalParams.tab)}`);
    }
  }
  const query = queryParts.length ? `?${queryParts.join("&")}` : "";
  return `#/${path}${query}`;
}

/**
 * Project current game state onto a route descriptor.
 */
export function routeFromState(state) {
  const view = state.view ?? "town";
  const modal = state.modal ?? null;
  const viewParams = {};
  if (view === "tileCollection") {
    const tcParams = state.viewParams ?? {};
    if (tcParams.sub) viewParams.sub = tcParams.sub;
    if (tcParams.cat) viewParams.cat = tcParams.cat;
  } else if (view === "cartography") {
    const zone = state.viewParams?.zone;
    if (zone) viewParams.zone = zone;
  } else if (view === "crafting") {
    // craftingTab is the legacy redux home for the crafting station; if a
    // viewParams.tab override is also set (e.g. from ROUTE/APPLY) prefer it
    // since SET_VIEW carries craftingTab forward verbatim.
    const tab = state.viewParams?.tab ?? state.craftingTab ?? null;
    if (tab) viewParams.tab = tab;
  } else if (VIEWS_WITH_TAB.has(view)) {
    if (state.viewParams?.tab) viewParams.tab = state.viewParams.tab;
  }
  const modalParams = {};
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
export function useRouter(state, dispatch) {
  // Last hash we wrote — used to detect "no real change" so we don't
  // pushState on every reducer dispatch.
  const lastHashRef = useRef(null);
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
  }, [dispatch]);

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
