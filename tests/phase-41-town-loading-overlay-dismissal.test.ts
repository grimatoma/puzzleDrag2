// Phase 41 — the Town loading overlay ("Loading Pixel Town…") must reliably
// clear once the scene has baked. Regression guard for: the overlay stayed up
// forever over an already-rendered map.
//
// Root cause: the one-shot "town.ready" listener (bound once in the boot
// effect's postBoot) dismissed the overlay only `if (!cancelled)`, where
// `cancelled` is the boot effect's per-run cleanup flag. That flag latches true
// on any BENIGN boot re-run — `active` false→true when the player opens Town
// after a hidden background pre-warm booted the scene, or `warm` toggling —
// WITHOUT tearing the game down. The effect then returns early (the game
// already exists) and never rebinds the listener, so its captured `cancelled`
// stays true forever and every subsequent "town.ready" (the pre-warm bake AND
// later tier/zone re-bakes) silently skips setLoading(false).
//
// Fix: gate the dismissal on a `mountedRef` that only flips on real unmount, so
// a boot re-run can never strand the overlay.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const townCanvas = readFileSync(
  fileURLToPath(new URL("../src/ui/TownPhaserCanvas.tsx", import.meta.url)),
  "utf8",
);

// Isolate the "town.ready" listener body so the assertions target exactly the
// overlay-dismissal handler, not other uses of `cancelled` (which still
// legitimately guards the async boot sequence against a superseded run).
const townReadyHandler = (() => {
  const start = townCanvas.indexOf('scene.events.on("town.ready"');
  expect(start).toBeGreaterThan(-1);
  // The handler ends at the matching `});` closing the requestAnimationFrame
  // callback + the on() call; grabbing a generous window is enough for regex.
  return townCanvas.slice(start, start + 900);
})();

describe("Phase 41 — Town loading overlay reliably dismisses", () => {
  it('dismisses the overlay from the "town.ready" handler', () => {
    expect(townReadyHandler).toMatch(/setLoading\(false\)/);
  });

  it("gates that dismissal on unmount (mountedRef), not on the boot run's cancelled flag", () => {
    // The dismissal must be guarded by mountedRef so a benign boot re-run
    // (active/warm toggle) can't permanently swallow it.
    expect(townReadyHandler).toMatch(/if\s*\(\s*mountedRef\.current\s*\)/);
    // ...and must NOT reintroduce the `if (!cancelled)` gate that caused the
    // stuck overlay. (`cancelled` may still appear elsewhere in the file,
    // legitimately guarding the async boot — we only forbid it as the guard
    // expression here.)
    expect(townReadyHandler).not.toMatch(/if\s*\(\s*!\s*cancelled\s*\)/);
  });

  it("only clears mountedRef on real unmount (empty-dep teardown effect)", () => {
    expect(townCanvas).toMatch(/mountedRef\.current\s*=\s*false/);
  });
});
