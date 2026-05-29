import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { gameReducer, createInitialState } from "../state.js";

// gameReducer persists state to localStorage on every change. In jsdom that
// save survives between tests in this file, so a prior reducer call would leak
// its biomeKey into the next createInitialState(). Clear it between tests so
// each starts from a true fresh state.
beforeEach(() => { try { localStorage.clear(); } catch { /* no storage */ } });
afterEach(() => { try { localStorage.clear(); } catch { /* no storage */ } });

// Regression: starting a new puzzle must regenerate the board. The Phaser
// scene only re-creates tiles when `biomeKey` changes, but FARM/ENTER keeps
// biomeKey === "farm", so a same-biome re-entry never triggered a regen and
// the board stayed on the hardcoded init layout. A board-regen nonce gives the
// scene an unambiguous "generate a fresh board now" signal independent of
// biomeKey.
describe("board regeneration nonce", () => {
  it("FARM/ENTER bumps _boardNonce even though biomeKey stays 'farm'", () => {
    const s0 = createInitialState();
    expect(s0.biomeKey).toBe("farm");
    const before = s0._boardNonce ?? 0;
    const s1 = gameReducer(s0, { type: "FARM/ENTER", payload: { selectedTiles: [] } });
    // FARM/ENTER must have succeeded (entered the board view).
    expect(s1.view).toBe("board");
    expect(s1.biomeKey).toBe("farm");
    // Even though biomeKey did not change, the nonce advances so the scene
    // knows to regenerate.
    expect(s1._boardNonce ?? 0).toBe(before + 1);
  });

  it("each FARM/ENTER advances the nonce", () => {
    let s = createInitialState();
    const n0 = s._boardNonce ?? 0;
    s = gameReducer(s, { type: "FARM/ENTER", payload: { selectedTiles: [] } });
    const n1 = s._boardNonce ?? 0;
    s = gameReducer(s, { type: "FARM/ENTER", payload: { selectedTiles: [] } });
    const n2 = s._boardNonce ?? 0;
    expect(n1).toBe(n0 + 1);
    expect(n2).toBe(n1 + 1);
  });

  it("SWITCH_BIOME to a fresh field (no saved board) bumps the nonce", () => {
    const s0 = { ...createInitialState(), level: 5, activeZone: "quarry", mapCurrent: "quarry" };
    const before = s0._boardNonce ?? 0;
    const s1 = gameReducer(s0, { type: "SWITCH_BIOME", key: "mine" });
    expect(s1.biomeKey).toBe("mine");
    expect(s1._boardNonce ?? 0).toBe(before + 1);
  });

  it("SWITCH_BIOME that restores a saved field does NOT bump the nonce", () => {
    const tiles = Array.from({ length: 6 }, () =>
      Array.from({ length: 6 }, () => ({ key: "tile_mine_stone" })),
    );
    const s0 = {
      ...createInitialState(),
      level: 5,
      activeZone: "quarry",
      mapCurrent: "quarry",
      mine: { savedField: { tiles } },
    };
    const before = s0._boardNonce ?? 0;
    const s1 = gameReducer(s0, { type: "SWITCH_BIOME", key: "mine" });
    expect(s1.biomeKey).toBe("mine");
    expect(s1._biomeRestored).toBe(true);
    // Restored boards must not be clobbered by a regen.
    expect(s1._boardNonce ?? 0).toBe(before);
  });
});
