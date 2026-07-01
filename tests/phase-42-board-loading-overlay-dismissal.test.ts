// Phase 42 — the puzzle board's loading overlay (BoardSkeleton) must reliably
// clear once GameScene has baked. Regression guard for: dragging on the board
// silently did nothing because the skeleton's full-bleed pointer-events
// overlay stayed on top of the canvas forever.
//
// Root cause: the one-shot SCENE_EVENTS.BOARD_READY listener was bound only in
// Phaser.Game's postBoot callback. GameScene has no async preload, so Phaser
// finishes the whole synchronous create() — including the BOARD_READY emit —
// before postBoot even runs. Subscribing unconditionally in postBoot then
// permanently misses an event that already fired, so setLoading(false) never
// runs and the skeleton (aria-label="Loading board", pointer-events: auto)
// stays parked over the rendered board, eating every pointerdown a player
// aims at a tile.
//
// Fix: GameScene now flips a `boardReady` flag before emitting BOARD_READY;
// postBoot checks that flag first and only falls back to the listener for a
// create() that's still in flight.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const prototypeSrc = readFileSync(
  fileURLToPath(new URL("../prototype.tsx", import.meta.url)),
  "utf8",
);
const gameSceneSrc = readFileSync(
  fileURLToPath(new URL("../src/GameScene.ts", import.meta.url)),
  "utf8",
);

// Isolate the postBoot handler that decides whether to dismiss the skeleton
// immediately vs. subscribe to BOARD_READY, so assertions target exactly that
// logic and not unrelated uses of scene.events.on elsewhere in the file.
const dismissalBlock = (() => {
  const start = prototypeSrc.indexOf("const dismissBoardSkeleton = () => {");
  expect(start).toBeGreaterThan(-1);
  return prototypeSrc.slice(start, start + 600);
})();

describe("Phase 42 — Board loading overlay reliably dismisses", () => {
  it("GameScene exposes a boardReady flag set before the BOARD_READY emit", () => {
    const flagIdx = gameSceneSrc.indexOf("boardReady: boolean = false;");
    const setIdx = gameSceneSrc.indexOf("this.boardReady = true;");
    const emitIdx = gameSceneSrc.indexOf("this.events.emit(SCENE_EVENTS.BOARD_READY);");
    expect(flagIdx).toBeGreaterThan(-1);
    expect(setIdx).toBeGreaterThan(-1);
    expect(emitIdx).toBeGreaterThan(-1);
    // The flag must flip before the event fires, not after — a listener
    // reacting to the event must be able to observe boardReady === true.
    expect(setIdx).toBeLessThan(emitIdx);
  });

  it("postBoot checks scene.boardReady before falling back to the one-shot listener", () => {
    expect(prototypeSrc).toMatch(/if\s*\(\s*scene\.boardReady\s*\)\s*dismissBoardSkeleton\(\)/);
    expect(prototypeSrc).toMatch(
      /else\s+scene\.events\.on\(SCENE_EVENTS\.BOARD_READY,\s*dismissBoardSkeleton\)/,
    );
  });

  it("the dismissal handler itself still clears loading and fires onReady", () => {
    expect(dismissalBlock).toMatch(/setLoading\(false\)/);
    expect(dismissalBlock).toMatch(/onReadyRef\.current\?\.\(\)/);
  });
});
