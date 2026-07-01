// Minimal localStorage mock so slice modules can load in Node without errors.
import { beforeEach } from "vitest";

const store: Record<string, string> = {};
globalThis.localStorage = {
  getItem: (k: string) => store[k] ?? null,
  setItem: (k: string, v: string) => {
    store[k] = String(v);
  },
  removeItem: (k: string) => {
    delete store[k];
  },
  clear: () => {
    Object.keys(store).forEach((k) => {
      delete store[k];
    });
  },
  key: (index: number) => Object.keys(store)[index] ?? null,
  get length() {
    return Object.keys(store).length;
  },
} as Storage;

// jsdom leaves HTMLCanvasElement.getContext unimplemented and routes every call
// to console.error ("Not implemented: HTMLCanvasElement.prototype.getContext"),
// flooding the console across the ~52 jsdom component tests (Icon.tsx calls
// getContext on mount) and burying any real React act()/key/prop-type warning a
// future test would emit. jsdom already returns null here, and Icon.tsx tolerates
// a null context — so stubbing it to null is behaviourally identical, it only
// reopens the warning channel. No-op under the default `node` environment where
// HTMLCanvasElement is undefined. See health review §9.
if (typeof HTMLCanvasElement !== "undefined") {
  HTMLCanvasElement.prototype.getContext =
    (() => null) as unknown as typeof HTMLCanvasElement.prototype.getContext;
}

// Reset persisted state between tests so no test can pass by reading another
// test's leftover save. Catches the order-dependent / shared-pollution class
// of failure (a test that asserts a reducer path that never actually runs).
// Guarded: some tests swap in their own localStorage stub that omits clear().
beforeEach(() => {
  globalThis.localStorage?.clear?.();
});
