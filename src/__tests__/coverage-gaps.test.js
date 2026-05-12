// Cross-slice coverage fillins for the worst-tested feature slices
// (settings 25%, market 33%, story 54%, boss 62% in the pre-PR coverage
// report). Each block targets specific uncovered branches/lines so adding
// a regression here is a real signal.

import { describe, it, expect } from "vitest";
import { rootReducer, createInitialState } from "../state.js";
import { reduce as settingsReduce } from "../features/settings/slice.js";
import { reduce as marketReduce } from "../features/market/slice.js";

// ─── settings/slice.js ──────────────────────────────────────────────────────
describe("settings slice — coverage gaps", () => {
  const baseSettings = () => ({ sfxOn: true, musicOn: true, hapticsOn: true });

  it("SETTINGS/TOGGLE flips the named key", () => {
    const s0 = { settings: baseSettings() };
    const s1 = settingsReduce(s0, { type: "SETTINGS/TOGGLE", key: "sfxOn" });
    expect(s1.settings.sfxOn).toBe(false);
    const s2 = settingsReduce(s1, { type: "SETTINGS/TOGGLE", key: "sfxOn" });
    expect(s2.settings.sfxOn).toBe(true);
  });

  it("SETTINGS/SET_TAB updates settingsTab", () => {
    const s0 = { settings: baseSettings(), settingsTab: "main" };
    const s1 = settingsReduce(s0, { type: "SETTINGS/SET_TAB", tab: "about" });
    expect(s1.settingsTab).toBe("about");
  });

  it("SETTINGS/RESET_SAVE sets pendingReload (reducer stays pure)", () => {
    const s0 = { settings: baseSettings() };
    const s1 = settingsReduce(s0, { type: "SETTINGS/RESET_SAVE" });
    expect(s1.pendingReload).toBe(true);
  });

  it("SETTINGS/LEAVE_BOARD resets turn state and shows the wren bubble", () => {
    const s0 = {
      settings: baseSettings(),
      view: "board",
      modal: "menu",
      turnsUsed: 7,
      pendingView: "town",
      seasonStats: { harvests: 99 },
    };
    const s1 = settingsReduce(s0, { type: "SETTINGS/LEAVE_BOARD" });
    expect(s1.view).toBe("town");
    expect(s1.modal).toBeNull();
    expect(s1.turnsUsed).toBe(0);
    expect(s1.pendingView).toBeNull();
    expect(s1.seasonStats).toEqual({ harvests: 0, upgrades: 0, ordersFilled: 0, coins: 0 });
    expect(s1.bubble?.npc).toBe("wren");
  });

  it("SETTINGS/SHOW_TUTORIAL replays the tutorial when the slice is present", () => {
    const s0 = {
      settings: baseSettings(),
      tutorial: { active: false, step: 5, seen: true },
    };
    const s1 = settingsReduce(s0, { type: "SETTINGS/SHOW_TUTORIAL" });
    expect(s1.modal).toBe("tutorial");
    expect(s1.tutorial).toEqual({ active: true, step: 0, seen: false });
  });

  it("SETTINGS/SHOW_TUTORIAL with no tutorial slice opens the modal only", () => {
    const s0 = { settings: baseSettings() };
    const s1 = settingsReduce(s0, { type: "SETTINGS/SHOW_TUTORIAL" });
    expect(s1.modal).toBe("tutorial");
    expect(s1.tutorial).toBeUndefined();
  });

  it("unknown action type returns state unchanged (default case)", () => {
    const s0 = { settings: baseSettings() };
    const s1 = settingsReduce(s0, { type: "NOPE" });
    expect(s1).toBe(s0);
  });
});

// ─── market/slice.js ────────────────────────────────────────────────────────
describe("market slice — coverage gaps", () => {
  const baseState = (over = {}) => ({
    built: { caravan_post: true },
    inventory: { grass_hay: 5, mine_stone: 10 },
    coins: 0,
    ...over,
  });

  it("MARKET/SELL with no resource is a no-op", () => {
    const s0 = baseState();
    const s1 = marketReduce(s0, { type: "MARKET/SELL", payload: {} });
    expect(s1).toBe(s0);
  });

  it("MARKET/SELL without caravan_post is rejected", () => {
    const s0 = baseState({ built: {} });
    const s1 = marketReduce(s0, { type: "MARKET/SELL", payload: { resource: "grass_hay" } });
    expect(s1).toBe(s0);
  });

  it("MARKET/SELL with insufficient inventory is rejected", () => {
    const s0 = baseState();
    const s1 = marketReduce(s0, { type: "MARKET/SELL", payload: { resource: "grass_hay", qty: 100 } });
    expect(s1).toBe(s0);
  });

  it("MARKET/SELL with a zero-priced resource is rejected", () => {
    const s0 = baseState({ inventory: { unknown_thing: 5 } });
    const s1 = marketReduce(s0, { type: "MARKET/SELL", payload: { resource: "unknown_thing" } });
    expect(s1).toBe(s0);
  });

  it("MARKET/SELL deducts inventory and credits coins for a crafted recipe item", () => {
    // sellPriceFor only knows about RECIPES; bread is the simplest non-zero one.
    const s0 = baseState({ inventory: { bread: 4 } });
    const s1 = marketReduce(s0, { type: "MARKET/SELL", payload: { resource: "bread", qty: 2 } });
    expect(s1.inventory.bread).toBe(2);
    expect(s1.coins).toBeGreaterThan(0);
  });

  it("non-MARKET/SELL action returns state unchanged", () => {
    const s0 = baseState();
    const s1 = marketReduce(s0, { type: "NOPE" });
    expect(s1).toBe(s0);
  });
});

// ─── End-to-end smoke for full reducer composition ──────────────────────────
describe("rootReducer composition smokes (settings + market)", () => {
  it("rootReducer dispatches SETTINGS/SET_TAB through the full slice chain", () => {
    const s0 = createInitialState();
    const s1 = rootReducer(s0, { type: "SETTINGS/SET_TAB", tab: "about" });
    expect(s1.settingsTab).toBe("about");
  });

  it("rootReducer rejects MARKET/SELL when caravan_post not built", () => {
    const s0 = { ...createInitialState(), built: {}, inventory: { grass_hay: 5 } };
    const s1 = rootReducer(s0, { type: "MARKET/SELL", payload: { resource: "grass_hay", qty: 1 } });
    expect(s1.coins).toBe(s0.coins);
  });
});
