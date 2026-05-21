/**
 * Auto-deselect — leaving the board (or loading a save) should disarm any
 * armed tool. Pairs with the existing "select another tool" path covered by
 * disarm-other-tools.test.js. Charge accounting matches CANCEL_TOOL + the
 * fertilizer self-disarm: tap-target arms had no charge to refund; instant /
 * rune / fertilizer arms get their charge back so the player isn't out a
 * tool just for navigating away.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { rootReducer, createInitialState, initialState } from "../state.js";

function baseState(overrides = {}) {
  const s = createInitialState();
  return {
    ...s,
    view: "board",
    tools: { ...s.tools, bomb: 1, fertilizer: 1, clear: 1, rake: 1 },
    runeStash: 1,
    ...overrides,
  };
}

describe("auto-deselect — SET_VIEW away from board disarms armed tools", () => {
  it("tap-target arm clears toolPending with no refund (charge was never spent)", () => {
    const s0 = { ...baseState(), toolPending: "bomb" };
    const s1 = rootReducer(s0, { type: "SET_VIEW", view: "town" });
    expect(s1.view).toBe("town");
    expect(s1.toolPending).toBeNull();
    expect(s1.tools.bomb).toBe(1);
  });

  it("rake (tap-target) clears toolPending with no refund", () => {
    const s0 = { ...baseState(), toolPending: "rake" };
    const s1 = rootReducer(s0, { type: "SET_VIEW", view: "inventory" });
    expect(s1.toolPending).toBeNull();
    expect(s1.tools.rake).toBe(1);
  });

  it("fertilizerActive flag clears and refunds the charge on leave-board", () => {
    const s0 = { ...baseState(), fertilizerActive: true, tools: { ...baseState().tools, fertilizer: 0 } };
    const s1 = rootReducer(s0, { type: "SET_VIEW", view: "town" });
    expect(s1.fertilizerActive).toBe(false);
    expect(s1.tools.fertilizer).toBe(1);
  });

  it("rune_wildcard pending refunds to runeStash on leave-board", () => {
    const s0 = { ...baseState(), toolPending: "rune_wildcard", runeStash: 0 };
    const s1 = rootReducer(s0, { type: "SET_VIEW", view: "crafting" });
    expect(s1.toolPending).toBeNull();
    expect(s1.runeStash).toBe(1);
  });

  it("navigating from board to board does NOT disarm (no leave-board transition)", () => {
    const s0 = { ...baseState(), toolPending: "bomb" };
    const s1 = rootReducer(s0, { type: "SET_VIEW", view: "board" });
    expect(s1.toolPending).toBe("bomb");
  });

  it("dual-armed (bomb + fertilizer) collapses to clean state on leave-board", () => {
    const s0 = {
      ...baseState(),
      toolPending: "bomb",
      fertilizerActive: true,
      tools: { ...baseState().tools, fertilizer: 0 },
    };
    const s1 = rootReducer(s0, { type: "SET_VIEW", view: "town" });
    expect(s1.toolPending).toBeNull();
    expect(s1.fertilizerActive).toBe(false);
    expect(s1.tools.bomb).toBe(1);       // tap-target arms refund nothing
    expect(s1.tools.fertilizer).toBe(1); // fertilizer refunds
  });

  it("nothing armed → SET_VIEW is a clean no-op for tool state", () => {
    const s0 = baseState();
    const s1 = rootReducer(s0, { type: "SET_VIEW", view: "town" });
    expect(s1.toolPending).toBeNull();
    expect(s1.fertilizerActive).toBeFalsy();
    expect(s1.tools).toEqual(s0.tools);
  });
});

describe("auto-deselect — ROUTE/APPLY (hash navigation) mirrors SET_VIEW", () => {
  it("hash-driven nav to non-board disarms a bomb arm", () => {
    const s0 = { ...baseState(), toolPending: "bomb" };
    const s1 = rootReducer(s0, { type: "ROUTE/APPLY", route: { view: "town" } });
    expect(s1.view).toBe("town");
    expect(s1.toolPending).toBeNull();
  });

  it("hash-driven nav to board leaves armed tool intact", () => {
    const s0 = { ...baseState(), view: "town", toolPending: "bomb", farmRun: { turnsRemaining: 5 } };
    const s1 = rootReducer(s0, { type: "ROUTE/APPLY", route: { view: "board" } });
    expect(s1.view).toBe("board");
    expect(s1.toolPending).toBe("bomb");
  });

  it("safety redirect (board → town when no run) still disarms", () => {
    // farmRun has no turns, so ROUTE/APPLY downgrades view to "town" — the
    // disarm should still fire because the resolved view is not "board".
    const s0 = { ...baseState(), toolPending: "bomb", farmRun: null };
    const s1 = rootReducer(s0, { type: "ROUTE/APPLY", route: { view: "board" } });
    expect(s1.view).toBe("town");
    expect(s1.toolPending).toBeNull();
  });
});

describe("auto-deselect — save load drops any armed tool", () => {
  const SAVE_KEY = "hearth.save.v1";

  beforeEach(() => {
    localStorage.removeItem(SAVE_KEY);
  });

  function persistSave(saved) {
    localStorage.setItem(SAVE_KEY, JSON.stringify(saved));
  }

  it("save with toolPending=bomb hydrates with toolPending=null and bomb count preserved", async () => {
    const { SAVE_SCHEMA_VERSION } = await import("../constants.js");
    persistSave({
      version: SAVE_SCHEMA_VERSION,
      view: "board",
      tools: { bomb: 2 },
      toolPending: "bomb",
    });
    const loaded = initialState();
    expect(loaded.toolPending).toBeNull();
    expect(loaded.tools.bomb).toBe(2);
  });

  it("save with fertilizerActive hydrates disarmed with charge refunded", async () => {
    const { SAVE_SCHEMA_VERSION } = await import("../constants.js");
    persistSave({
      version: SAVE_SCHEMA_VERSION,
      view: "board",
      tools: { fertilizer: 0 },
      fertilizerActive: true,
    });
    const loaded = initialState();
    expect(loaded.fertilizerActive).toBe(false);
    expect(loaded.tools.fertilizer).toBe(1);
  });

  it("save with instant tool pending refunds the charge", async () => {
    const { SAVE_SCHEMA_VERSION } = await import("../constants.js");
    persistSave({
      version: SAVE_SCHEMA_VERSION,
      view: "board",
      tools: { clear: 0 },
      toolPending: "clear",
    });
    const loaded = initialState();
    expect(loaded.toolPending).toBeNull();
    expect(loaded.tools.clear).toBe(1);
  });

  it("save with rune_wildcard pending refunds to runeStash", async () => {
    const { SAVE_SCHEMA_VERSION } = await import("../constants.js");
    persistSave({
      version: SAVE_SCHEMA_VERSION,
      view: "board",
      tools: {},
      runeStash: 0,
      toolPending: "rune_wildcard",
    });
    const loaded = initialState();
    expect(loaded.toolPending).toBeNull();
    expect(loaded.runeStash).toBe(1);
  });
});
