// Phase 40 — Town canvas must not route window-level pointer events into the
// TownScene. Regression guard for: the Start Farming / biome-entry modal popped
// when a menu (inventory, quests, build picker, any modal) was open on top of
// the town map, because a tap on the React overlay above the canvas leaked into
// the scene's input pipeline and fired a board's pointerup. The fix mirrors the
// main game board: `windowEvents: false` so Phaser only listens on the canvas.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const townCanvas = readFileSync(
  fileURLToPath(new URL("../src/ui/TownPhaserCanvas.tsx", import.meta.url)),
  "utf8",
);
const boardMount = readFileSync(
  fileURLToPath(new URL("../prototype.tsx", import.meta.url)),
  "utf8",
);

describe("Phase 40 — town canvas suppresses window-level input", () => {
  it("TownPhaserCanvas boots Phaser with windowEvents: false", () => {
    expect(townCanvas).toMatch(/windowEvents:\s*false/);
  });

  it("main game board still boots with windowEvents: false (shared rationale)", () => {
    expect(boardMount).toMatch(/windowEvents:\s*false/);
  });
});
