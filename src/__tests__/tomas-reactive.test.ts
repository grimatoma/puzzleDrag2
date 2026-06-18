import { describe, it, expect } from "vitest";
import { DIALOG_POOLS, pickDialog } from "../features/npcs/dialog.js";
import type { GameState } from "../types/state.js";

// Regression guard for the orphaned Tomas reactive line: the
// `tomas_first_order` line used to be nested INSIDE the `winter` seasonal
// pool, so `pickDialog` (which reads reactive lines only from the NPC top
// level) could never surface it. The fix moves it to a sibling of the
// seasons. These assertions fail against the pre-fix nesting.
describe("Tomas reactive line is reachable (un-orphaned)", () => {
  it("DIALOG_POOLS.tomas.reactive is a top-level array", () => {
    expect(Array.isArray(DIALOG_POOLS.tomas.reactive)).toBe(true);
  });

  it("the line is no longer nested inside the winter pool", () => {
    const winter = DIALOG_POOLS.tomas.winter as Record<string, unknown> | undefined;
    expect(winter?.reactive).toBeUndefined();
  });

  it("pickDialog can return the tomas_first_order line when the flag is set", () => {
    const state = { story: { flags: { first_order: true } } } as unknown as GameState;
    // rng = () => 0 forces the reactive branch (roll < 0.35) and picks index 0.
    const line = pickDialog("tomas", "winter", 6, () => 0, state);
    expect(line).toContain("The Vale is talking");
  });
});
