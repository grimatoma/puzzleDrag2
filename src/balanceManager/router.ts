// Hash-based router for the Dev Panel (`/b/`).
// URL shape: #/<tab> or #/<tab>/<focusId>

import { useEffect, useRef } from "react";

function decodeSeg(seg: any) {
  if (!seg) return null;
  try {
    return decodeURIComponent(seg);
  } catch {
    return null;
  }
}

export function parseHash(hash: any, validTabs: any) {
  const raw = String(hash || "").replace(/^#\/?/, "");
  if (!raw) return { tab: null, focus: null };
  const parts = raw.split("/").filter(Boolean);
  const tabSeg = parts[0];
  if (!tabSeg) return { tab: null, focus: null };
  const tab = decodeSeg(tabSeg);
  if (!Array.isArray(validTabs) || !validTabs.includes(tab)) return { tab: null, focus: null };
  const focus = parts[1] ? decodeSeg(parts[1]) : null;
  return { tab, focus };
}

export function buildHash({ tab, focus }: { tab?: string | null; focus?: string | null } = {}) {
  if (!tab) return "#/";
  const base = `#/${encodeURIComponent(tab)}`;
  if (focus) return `${base}/${encodeURIComponent(focus)}`;
  return base;
}

export function useBalanceRouter(tab: any, setTab: any, focus: any, setFocus: any, validTabs: any) {
  const lastWrittenRef = useRef(null);
  const initialisedRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const incoming = parseHash(window.location.hash, validTabs);
    const resolvedTab = incoming.tab ?? tab;
    const resolvedFocus = incoming.tab ? (incoming.focus ?? null) : null;
    const desired = buildHash({ tab: resolvedTab, focus: resolvedFocus });
    if (window.location.hash !== desired) {
      window.history.replaceState(null, "", desired);
    }
    lastWrittenRef.current = desired;
    initialisedRef.current = true;
    if (incoming.tab && incoming.tab !== tab) setTab(incoming.tab);
    if (resolvedFocus !== focus) setFocus(resolvedFocus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = () => {
      const incoming = parseHash(window.location.hash, validTabs);
      const resolvedTab = incoming.tab ?? tab;
      const resolvedFocus = incoming.tab ? (incoming.focus ?? null) : null;
      lastWrittenRef.current = buildHash({ tab: resolvedTab, focus: resolvedFocus });
      if (incoming.tab && incoming.tab !== tab) setTab(incoming.tab);
      if (resolvedFocus !== focus) setFocus(resolvedFocus);
    };
    window.addEventListener("popstate", handler);
    window.addEventListener("hashchange", handler);
    return () => {
      window.removeEventListener("popstate", handler);
      window.removeEventListener("hashchange", handler);
    };
  }, [tab, setTab, focus, setFocus, validTabs]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!initialisedRef.current) return;
    const desired = buildHash({ tab, focus: focus || null });
    if (desired === lastWrittenRef.current) return;
    lastWrittenRef.current = desired;
    window.history.pushState(null, "", desired);
  }, [tab, focus]);
}
