// Polls /b/index.html and signals when a new build is deployed.
// The /b/ route is excluded from the service worker (see vite.config.js
// denylist), so SW-based updates never fire here — this fills that gap.
//
// Strategy: on load, capture the <script type="module"> src from the live
// DOM (Vite embeds a content-hash in the filename). Periodically re-fetch
// /b/index.html and extract the same attribute. A changed src means a new
// build was deployed — surface a banner instead of silently reloading.

import { useSyncExternalStore } from "react";

const POLL_MS = 60_000;

type Listener = () => void;

let updateReady = false;
const listeners = new Set<Listener>();

function emit(): void {
  for (const l of listeners) l();
}

function setReady(): void {
  if (updateReady) return;
  updateReady = true;
  emit();
}

function currentScriptSrc(): string {
  const s = document.querySelector<HTMLScriptElement>('script[type="module"]');
  return s?.src ?? "";
}

async function fetchLatestScriptSrc(): Promise<string> {
  const res = await fetch("/b/", { cache: "no-store" });
  const text = await res.text();
  const m = text.match(/src="([^"]*balanceEntry[^"]*)"/);
  return m ? m[1] : text; // fall back to full HTML if pattern misses
}

// Query param appended by applyAutoReload() to bypass the browser's HTML cache.
// Stripped on startup so the URL stays clean after the reload lands.
const RELOAD_PARAM = "_reload";

export function startAutoReload(): () => void {
  // If we just reloaded via the banner, strip the cache-busting param from
  // the URL so it doesn't persist in the address bar or history entry.
  const startUrl = new URL(window.location.href);
  if (startUrl.searchParams.has(RELOAD_PARAM)) {
    startUrl.searchParams.delete(RELOAD_PARAM);
    history.replaceState(null, "", startUrl.toString());
  }

  const initial = currentScriptSrc();
  let destroyed = false;

  async function check() {
    if (destroyed) return;
    try {
      const latest = await fetchLatestScriptSrc();
      if (latest && latest !== initial) {
        setReady();
      }
    } catch {
      // offline or transient — try again next tick
    }
  }

  const id = window.setInterval(check, POLL_MS);
  window.addEventListener("focus", check);
  document.addEventListener("visibilitychange", check);

  return () => {
    destroyed = true;
    window.clearInterval(id);
    window.removeEventListener("focus", check);
    document.removeEventListener("visibilitychange", check);
  };
}

export function applyAutoReload(): void {
  // Navigate with a unique cache-busting query param rather than calling
  // reload(), which can serve a browser-cached /b/index.html and land the
  // user on the old build. The param is stripped by startAutoReload() on
  // the next page load so the URL stays clean.
  const url = new URL(window.location.href);
  url.searchParams.set(RELOAD_PARAM, String(Date.now()));
  window.location.replace(url.toString());
}

export function useAutoReloadReady(): boolean {
  return useSyncExternalStore(
    (onStoreChange) => {
      listeners.add(onStoreChange);
      return () => listeners.delete(onStoreChange);
    },
    () => updateReady,
    () => false,
  );
}
