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

export function startAutoReload(): () => void {
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
  window.location.reload();
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
