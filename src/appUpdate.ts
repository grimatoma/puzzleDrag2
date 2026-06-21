// App-update watcher for the installed PWA.
//
// The service worker (vite-plugin-pwa, `registerType: "prompt"`) precaches the
// build for offline play. In `prompt` mode a freshly deployed SW *installs but
// waits* instead of silently taking over — so we can surface a "refresh" button
// rather than yanking the board out from under the player mid-run.
//
// An installed PWA that's kept resident (resumed from the background) rarely
// re-checks for a new deploy on its own, which is how players get stranded on a
// stale build with no easy way to update. This module fixes that by:
//   1. polling `registration.update()` on an interval and whenever the app
//      returns to the foreground, and
//   2. flipping an `updateReady` flag once a new SW is installed + waiting.
//
// `applyUpdate()` tells the waiting SW to `skipWaiting()`; the resulting
// `controllerchange` then reloads the page once onto the new build.
//
// This is a module-level singleton exposed to React via `useSyncExternalStore`
// so the banner and the Settings menu share one watcher (one interval, one set
// of listeners) instead of each spinning up their own.

import { useSyncExternalStore } from "react";

// How often to ask the SW to check for a new deploy while the app stays open.
const POLL_MS = 60 * 1000;

type Listener = () => void;

let updateReady = false;
let registration: ServiceWorkerRegistration | null = null;
let started = false;
const listeners = new Set<Listener>();

function emit(): void {
  for (const l of listeners) l();
}

function setReady(value: boolean): void {
  if (updateReady === value) return;
  updateReady = value;
  emit();
}

// True once a new SW has finished installing and is waiting to activate. We gate
// on `controller` so the very first SW install (no previous build) doesn't count
// as an "update" — there's nothing to refresh away from.
function waitingIsUpdate(reg: ServiceWorkerRegistration): boolean {
  return !!reg.waiting && !!navigator.serviceWorker.controller;
}

// Idempotent: wires up the SW listeners + polling exactly once, on first use.
function start(): void {
  if (started) return;
  started = true;
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

  // When the waiting SW takes control (after applyUpdate's skipWaiting), reload
  // once onto the fresh build. Guard against the double-reload some browsers do.
  let reloaded = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (reloaded) return;
    reloaded = true;
    window.location.reload();
  });

  navigator.serviceWorker
    .getRegistration()
    .then((reg) => {
      if (!reg) return;
      registration = reg;

      // A SW may already be waiting from a check that completed before we mounted.
      if (waitingIsUpdate(reg)) setReady(true);

      // A new SW started installing — watch it cross into the `installed` state.
      reg.addEventListener("updatefound", () => {
        const installing = reg.installing;
        if (!installing) return;
        installing.addEventListener("statechange", () => {
          if (installing.state === "installed" && navigator.serviceWorker.controller) {
            setReady(true);
          }
        });
      });

      // Poll for a new deploy, and check again whenever the app is refocused /
      // brought back to the foreground (covers resumed installed PWAs).
      const check = () => {
        reg.update().catch(() => {
          /* offline or transient — try again next tick */
        });
      };
      window.setInterval(check, POLL_MS);
      window.addEventListener("focus", check);
      document.addEventListener("visibilitychange", () => {
        if (!document.hidden) check();
      });
    })
    .catch(() => {
      /* no registration available (e.g. SW disabled in dev) */
    });
}

// Activate the waiting build. The SW (prompt mode) listens for SKIP_WAITING;
// once it activates, the controllerchange handler above reloads the page.
export function applyUpdate(): void {
  const waiting = registration?.waiting;
  if (waiting) {
    waiting.postMessage({ type: "SKIP_WAITING" });
  } else {
    // No waiting worker (shouldn't normally happen when updateReady) — a plain
    // reload still pulls the latest precache.
    window.location.reload();
  }
}

// Manually poke the SW to check for a new deploy right now.
export function checkForUpdate(): void {
  registration?.update().catch(() => {
    /* offline or transient */
  });
}

// React binding: returns whether a new build is installed and waiting.
export function useAppUpdateReady(): boolean {
  return useSyncExternalStore(
    (onStoreChange) => {
      start();
      listeners.add(onStoreChange);
      return () => listeners.delete(onStoreChange);
    },
    () => updateReady,
    () => false,
  );
}
