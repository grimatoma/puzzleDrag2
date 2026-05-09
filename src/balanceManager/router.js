// Hash-based router for the Balance Manager. Separate from the main game's
// router (`src/router.js`) — the Balance Manager is its own Vite entry served
// at `/b/`, so it needs its own URL-state binding.
//
// URL shape (within /b/):
//   #/<tab>
//
// Examples:
//   #/tiles
//   #/recipes
//   #/zones
//
// `parseHash` and `buildHash` are pure helpers that round-trip cleanly and
// gracefully fall back to the default tab when the hash is empty or refers to
// an unknown tab. `useBalanceRouter` is the React hook that wires
// browser URL ↔ component state via `popstate` and `hashchange`.

import { useEffect, useRef } from "react";

/**
 * Parse a hash string into a route descriptor.
 * Unknown tabs and empty hashes resolve to `null`, leaving the caller free to
 * decide on a default.
 */
export function parseHash(hash, validTabs) {
  const raw = String(hash || "").replace(/^#\/?/, "");
  if (!raw) return { tab: null };
  const seg = raw.split("/")[0];
  if (!seg) return { tab: null };
  let decoded;
  try { decoded = decodeURIComponent(seg); }
  catch { return { tab: null }; }
  if (!Array.isArray(validTabs) || !validTabs.includes(decoded)) return { tab: null };
  return { tab: decoded };
}

/**
 * Build a hash string from a route descriptor. Always starts with `#/` so it
 * can be assigned directly to `location.hash`.
 */
export function buildHash({ tab } = {}) {
  if (!tab) return "#/";
  return `#/${encodeURIComponent(tab)}`;
}

/**
 * React hook that binds the Balance Manager's tab state to the URL hash.
 *
 *   - On mount: parses the current hash; if it points at a valid tab, calls
 *     `setTab(parsed)`. Then writes the resolved tab back with `replaceState`
 *     so the URL is normalized (e.g. `""` → `#/tiles`).
 *   - On state change: pushes a new history entry whenever `tab` changes.
 *   - On `popstate` / `hashchange`: re-reads the hash and calls `setTab` so
 *     back/forward and manual edits stay in sync.
 */
export function useBalanceRouter(tab, setTab, validTabs) {
  const lastWrittenRef = useRef(null);
  const initialisedRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const incoming = parseHash(window.location.hash, validTabs);
    const resolvedTab = incoming.tab ?? tab;
    const desired = buildHash({ tab: resolvedTab });
    if (window.location.hash !== desired) {
      window.history.replaceState(null, "", desired);
    }
    lastWrittenRef.current = desired;
    initialisedRef.current = true;
    if (incoming.tab && incoming.tab !== tab) setTab(incoming.tab);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: initial sync only runs once on mount
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = () => {
      const incoming = parseHash(window.location.hash, validTabs);
      lastWrittenRef.current = buildHash({ tab: incoming.tab ?? tab });
      if (incoming.tab && incoming.tab !== tab) setTab(incoming.tab);
    };
    window.addEventListener("popstate", handler);
    window.addEventListener("hashchange", handler);
    return () => {
      window.removeEventListener("popstate", handler);
      window.removeEventListener("hashchange", handler);
    };
  }, [tab, setTab, validTabs]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!initialisedRef.current) return;
    const desired = buildHash({ tab });
    if (desired === lastWrittenRef.current) return;
    lastWrittenRef.current = desired;
    window.history.pushState(null, "", desired);
  }, [tab]);
}
