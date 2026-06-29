import { describe, it, expect, beforeEach } from "vitest";
import { gameReducer, initialState } from "../state.js";

beforeEach(() => global.localStorage.clear());

describe("3.3 — Runes currency", () => {
  it("runes start at 0", () => {
    const s0 = initialState();
    expect(s0.runes).toBe(0);
  });

  it("GRANT_RUNES: adds to runes from mysterious_ore", () => {
    const s0 = initialState();
    const s1 = gameReducer(s0, { type: "GRANT_RUNES", payload: { amount: 1, source: "mysterious_ore" } });
    expect(s1.runes).toBe(1);
  });

  it("GRANT_RUNES: cumulative from boss", () => {
    const s0 = initialState();
    const s1 = gameReducer(s0, { type: "GRANT_RUNES", payload: { amount: 1, source: "mysterious_ore" } });
    const s2 = gameReducer(s1, { type: "GRANT_RUNES", payload: { amount: 1, source: "boss" } });
    expect(s2.runes).toBe(2);
  });

  it("Magic Portal BUILD: blocked with <5 runes", () => {
    const s0 = initialState();
    const tryPortal = { ...s0, coins: 5000, runes: 4, built: { hearth: true } };
    const noBuild = gameReducer(tryPortal, { type: "BUILD", payload: { id: "portal" } });
    expect(noBuild.built.portal).toBeFalsy();
  });

  it("Magic Portal BUILD: succeeds with 5 runes and deducts them", () => {
    const s0 = initialState();
    const okPortal = { ...s0, coins: 5000, runes: 5, built: { hearth: true } };
    const result = gameReducer(okPortal, { type: "BUILD", payload: { id: "portal" } });
    const loc = result.mapCurrent ?? "home";
    expect(result.built[loc]?.portal).toBe(true);
    expect(result.runes).toBe(0);
  });
});
