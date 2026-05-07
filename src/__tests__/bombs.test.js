import { describe, it, expect, beforeEach } from "vitest";
import { gameReducer, initialState } from "../state.js";

beforeEach(() => global.localStorage.clear());

describe("3.4 — Bombs + Powder Store", () => {
  it("bombs start at 0 in initial state", () => {
    const s0 = initialState();
    expect(s0.tools.bomb).toBe(0);
  });

  it("CLOSE_SEASON without Powder Store → no bomb granted", () => {
    const s0 = initialState();
    const noStore = { ...s0, built: { hearth: true } };
    const after = gameReducer(noStore, { type: "CLOSE_SEASON" });
    expect(after.tools.bomb).toBe(0);
  });

  it("CLOSE_SEASON with Powder Store → +2 bombs", () => {
    const s0 = initialState();
    const withStore = { ...s0, built: { hearth: true, powder_store: true } };
    const after = gameReducer(withStore, { type: "CLOSE_SEASON" });
    expect(after.tools.bomb).toBe(2);
  });

  it("bombs accumulate across seasons", () => {
    const s0 = initialState();
    const withStore = { ...s0, built: { hearth: true, powder_store: true }, tools: { ...s0.tools, bomb: 0 } };
    const after1 = gameReducer(withStore, { type: "CLOSE_SEASON" });
    const after2 = gameReducer(after1, { type: "CLOSE_SEASON" });
    expect(after2.tools.bomb).toBe(4);
  });

  it("USE_TOOL bomb: decrements count and arms toolPending without consuming turn", () => {
    const s0 = initialState();
    const armed = { ...s0, tools: { ...s0.tools, bomb: 3 }, turnsUsed: 4 };
    const r = gameReducer(armed, { type: "USE_TOOL", payload: { key: "bomb" } });
    expect(r.tools.bomb).toBe(2);
    expect(r.toolPending).toBe("bomb");
    expect(r.turnsUsed).toBe(4);
  });

  it("USE_TOOL bomb: no-op when count=0", () => {
    const s0 = initialState();
    const empty = { ...s0, tools: { ...s0.tools, bomb: 0 } };
    const r = gameReducer(empty, { type: "USE_TOOL", payload: { key: "bomb" } });
    expect(r.toolPending).not.toBe("bomb");
  });
});
