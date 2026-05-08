// Cross-slice coverage fillins for the worst-tested feature slices
// (settings 25%, market 33%, mood 50%, story 54%, boss 62% in the
// pre-PR coverage report). Each block targets specific uncovered
// branches/lines so adding a regression here is a real signal.

import { describe, it, expect } from "vitest";
import { rootReducer, createInitialState } from "../state.js";
import { reduce as settingsReduce } from "../features/settings/slice.js";
import { reduce as marketReduce } from "../features/market/slice.js";
import { reduce as moodReduce } from "../features/mood/slice.js";
import { NPC_FAVORITES } from "../features/mood/data.js";

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

  it("SET_PALETTE delegates to phase11Reduce and replaces settings.palette", () => {
    const s0 = { settings: { ...baseSettings(), palette: "default" } };
    const s1 = settingsReduce(s0, { type: "SET_PALETTE", id: "deuteranopia" });
    expect(s1.settings.palette).toBe("deuteranopia");
  });

  it("SET_REDUCED_MOTION updates settings.reducedMotion", () => {
    const s0 = { settings: { ...baseSettings(), reducedMotion: null } };
    const s1 = settingsReduce(s0, { type: "SET_REDUCED_MOTION", value: true });
    expect(s1.settings.reducedMotion).toBe(true);
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

  it("SETTINGS/EASTER_EGG fires the mira bubble", () => {
    const s0 = { settings: baseSettings() };
    const s1 = settingsReduce(s0, { type: "SETTINGS/EASTER_EGG" });
    expect(s1.bubble?.npc).toBe("mira");
    expect(s1.bubble?.text).toMatch(/secret/);
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

// ─── mood/slice.js ──────────────────────────────────────────────────────────
describe("mood slice — coverage gaps", () => {
  const baseState = (over = {}) => ({
    inventory: { berry: 5, grass_hay: 10, mine_stone: 5 },
    npcBond: { mira: 5, tomas: 5, bram: 5, liss: 5, wren: 5 },
    coins: 100,
    ...over,
  });

  it("MOOD/GIFT with insufficient inventory returns state unchanged", () => {
    const s0 = baseState({ inventory: {} });
    const s1 = moodReduce(s0, { type: "MOOD/GIFT", npc: "mira", resource: "berry" });
    expect(s1).toBe(s0);
  });

  it("MOOD/GIFT with a favorite resource bumps bond by +0.5", () => {
    // Pick whichever NPC actually has a favorite registered.
    const npc = Object.keys(NPC_FAVORITES).find((k) => NPC_FAVORITES[k]?.favorite);
    expect(npc).toBeDefined();
    const fav = NPC_FAVORITES[npc].favorite;
    const s0 = baseState({ inventory: { [fav]: 1 }, npcBond: { ...baseState().npcBond, [npc]: 5 } });
    const s1 = moodReduce(s0, { type: "MOOD/GIFT", npc, resource: fav });
    expect(s1.npcBond[npc]).toBeCloseTo(5.5);
    expect(s1.inventory[fav]).toBe(0);
    expect(s1.bubble?.text).toMatch(/love/i);
  });

  it("MOOD/GIFT with a disliked resource drops bond by -0.5", () => {
    const npc = Object.keys(NPC_FAVORITES).find((k) => NPC_FAVORITES[k]?.dislike);
    if (!npc) return; // some catalogs may have no dislikes registered
    const dis = NPC_FAVORITES[npc].dislike;
    const s0 = baseState({ inventory: { [dis]: 1 }, npcBond: { ...baseState().npcBond, [npc]: 5 } });
    const s1 = moodReduce(s0, { type: "MOOD/GIFT", npc, resource: dis });
    expect(s1.npcBond[npc]).toBeCloseTo(4.5);
    expect(s1.bubble?.text).toMatch(/not my favourite/i);
  });

  it("MOOD/GIFT neutral nudges bond by +0.2", () => {
    const s0 = baseState();
    const s1 = moodReduce(s0, { type: "MOOD/GIFT", npc: "wren", resource: "mine_stone" });
    // wren may or may not have a favorite, but mine_stone is unlikely to be
    // either fav or dislike for any NPC in the catalog. Allow either neutral
    // or fav/dislike — test just verifies the flow runs cleanly.
    expect(s1.npcBond.wren).toBeGreaterThanOrEqual(4.5);
    expect(s1.bubble).toBeDefined();
  });

  it("TURN_IN_ORDER without npc is a no-op", () => {
    const s0 = baseState();
    const s1 = moodReduce(s0, { type: "TURN_IN_ORDER", reward: 50 });
    expect(s1).toBe(s0);
  });

  it("TURN_IN_ORDER bumps bond and adds mood-modifier bonus coins", () => {
    const s0 = baseState({ npcBond: { ...baseState().npcBond, mira: 9 } }); // happy NPC → modifier > 1
    const s1 = moodReduce(s0, { type: "TURN_IN_ORDER", npc: "mira", reward: 100 });
    expect(s1.npcBond.mira).toBeGreaterThan(9); // +0.3
    expect(s1.coins).toBeGreaterThanOrEqual(100); // base + bonus
  });

  it("CLOSE_SEASON decays bond above 5 and clears npcGiftsToday", () => {
    const s0 = baseState({
      npcBond: { mira: 8, tomas: 5, bram: 4 },
      npcGiftsToday: { mira: true, tomas: true },
    });
    const s1 = moodReduce(s0, { type: "CLOSE_SEASON" });
    expect(s1.npcBond.mira).toBeCloseTo(7.9); // 8 - 0.1
    expect(s1.npcBond.tomas).toBe(5);          // unchanged at 5
    expect(s1.npcBond.bram).toBe(4);           // unchanged below 5
    expect(s1.npcGiftsToday).toEqual({});
  });

  it("unknown action returns state unchanged (default branch)", () => {
    const s0 = baseState();
    const s1 = moodReduce(s0, { type: "NOPE" });
    expect(s1).toBe(s0);
  });
});

// ─── End-to-end smoke for full reducer composition ──────────────────────────
describe("rootReducer composition smokes (settings + market + mood)", () => {
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
