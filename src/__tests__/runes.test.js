import { describe, it, expect, beforeEach } from "vitest";
import { gameReducer, initialState } from "../state.js";

beforeEach(() => global.localStorage.clear());

describe("3.3 — Runes currency", () => {
  it("runes and runeStash start at 0", () => {
    const s0 = initialState();
    expect(s0.runes).toBe(0);
    expect(s0.runeStash).toBe(0);
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

  it("ENTER_MINE premium: consumes 2 runes, no supplies needed", () => {
    const s0 = initialState();
    const ready = {
      ...s0,
      mapCurrent: "quarry",
      activeZone: "quarry",
      runes: 3,
      inventory: { ...s0.inventory, supplies: 0 },
      story: { flags: { mine_unlocked: true } },
      biomeKey: "farm",
    };
    const entered = gameReducer(ready, { type: "ENTER_MINE", payload: { mode: "premium" } });
    expect(entered.biomeKey).toBe("mine");
    expect(entered.runes).toBe(1);
    expect(entered.inventory.supplies ?? 0).toBe(0);
  });

  it("ENTER_MINE premium: blocked with <2 runes", () => {
    const s0 = initialState();
    const broke = {
      ...s0,
      mapCurrent: "quarry",
      activeZone: "quarry",
      runes: 1,
      inventory: { ...s0.inventory, supplies: 0 },
      story: { flags: { mine_unlocked: true } },
      biomeKey: "farm",
    };
    const blocked = gameReducer(broke, { type: "ENTER_MINE", payload: { mode: "premium" } });
    expect(blocked.biomeKey).toBe("farm");
  });

  it("ACTIVATE_RUNE_WILDCARD: decrements runeStash and arms toolPending", () => {
    const s0 = initialState();
    const stash = { ...s0, runeStash: 2, toolPending: null };
    const r = gameReducer(stash, { type: "ACTIVATE_RUNE_WILDCARD" });
    expect(r.runeStash).toBe(1);
    expect(r.toolPending).toBe("rune_wildcard");
  });

  it("ACTIVATE_RUNE_WILDCARD: no-op when runeStash=0", () => {
    const s0 = initialState();
    const stash = { ...s0, runeStash: 0, toolPending: null };
    const r = gameReducer(stash, { type: "ACTIVATE_RUNE_WILDCARD" });
    expect(r.runeStash).toBe(0);
    expect(r.toolPending).not.toBe("rune_wildcard");
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
