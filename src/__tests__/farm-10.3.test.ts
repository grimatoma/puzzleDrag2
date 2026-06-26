/**
 * Phase 10.3 — Late-game Forge recipes + sellPriceFor
 * Tests written FIRST (red phase).
 */
import { describe, it, expect } from "vitest";
import { inv, patchInventory } from "../testUtils/inventory.js";
import { RECIPES } from "../constants.js";
import { createInitialState, rootReducer } from "../state.js";
import { sellPriceFor } from "../features/market/pricing.js";

// Helper: lookup recipe by either snake_case or camelCase
function recipe(id) {
  return RECIPES[id];
}

// ── Recipe registration (both snake_case and camelCase) ───────────────────────

describe("10.3 — §11 forge recipe registration", () => {
  it("iron_frame: 2 beam + 1 ingot", () => {
    expect(recipe("iron_frame").inputs.plank).toBe(2);
    expect(recipe("iron_frame").inputs.iron_bar).toBe(1);
  });

  it("iron_frame value 275◉", () => {
    expect(recipe("iron_frame").coins).toBe(275);
  });

  it("stonework: 2 block + 1 coke", () => {
    expect(recipe("stonework").inputs.block).toBe(2);
    expect(recipe("stonework").inputs.coke).toBe(1);
  });

  it("gem_crown: 1 cutgem + 1 gold", () => {
    expect(recipe("gem_crown").inputs.cut_gem).toBe(1);
    expect(recipe("gem_crown").inputs.gold_bar).toBe(1);
  });

  it("gold_ring: 1 gold + 2 ingot", () => {
    expect(recipe("gold_ring").inputs.gold_bar).toBe(1);
    expect(recipe("gold_ring").inputs.iron_bar).toBe(2);
  });

  it("camelCase aliases still work: ironframe", () => {
    expect(recipe("ironframe")).toBeDefined();
    expect(recipe("ironframe").inputs.plank).toBe(2);
  });

  it("camelCase aliases still work: gemcrown", () => {
    expect(recipe("gemcrown")).toBeDefined();
  });

  it("camelCase aliases still work: goldring", () => {
    expect(recipe("goldring")).toBeDefined();
  });
});

// ── CRAFT action (Forge) ──────────────────────────────────────────────────────

describe("10.3 — CRAFT iron_frame via CRAFT action", () => {
  function forgeState(inventoryOverrides = {}) {
    const s = createInitialState();
    const withForge = {
      ...s,
      built: { ...s.built, home: { ...(s.built.home as object), forge: true } },
    };
    return { ...withForge, ...patchInventory(withForge, { ...inventoryOverrides }) };
  }

  it("crafts iron_frame: debits 2 beam + 1 ingot, adds 1 iron_frame", () => {
    const s0 = forgeState({ plank: 3, iron_bar: 3 });
    const s1 = rootReducer(s0, { type: "CRAFT", payload: { id: "iron_frame" } });
    expect(inv(s1).plank).toBe(1);
    expect(inv(s1).iron_bar).toBe(2);
    expect(inv(s1).iron_frame ?? 0).toBe(1);
  });

  it("insufficient inputs = no-op (inventory and iron_frame unchanged)", () => {
    const s0 = forgeState({ plank: 1, iron_bar: 1 });
    const s1 = rootReducer(s0, { type: "CRAFT", payload: { id: "iron_frame" } });
    // Core state should be unchanged: inventory not debited, no iron_frame added
    expect(inv(s1).plank).toBe(1);
    expect(inv(s1).iron_bar).toBe(1);
    expect(inv(s1).iron_frame ?? 0).toBe(0);
  });

  it("no forge = no craft", () => {
    const s0 = createInitialState();
    const s1 = rootReducer(
      { ...s0, ...patchInventory(s0, { plank: 5, iron_bar: 5 }) },
      { type: "CRAFT", payload: { id: "iron_frame" } },
    );
    expect(inv(s1).iron_frame ?? 0).toBe(0);
  });

  it("crafts stonework", () => {
    const s0 = forgeState({ block: 3, coke: 2 });
    const s1 = rootReducer(s0, { type: "CRAFT", payload: { id: "stonework" } });
    expect(inv(s1).stonework ?? 0).toBe(1);
    expect(inv(s1).block).toBe(1);
    expect(inv(s1).coke).toBe(1);
  });

  it("crafts gem_crown", () => {
    const s0 = forgeState({ cut_gem: 2, gold_bar: 3 });
    const s1 = rootReducer(s0, { type: "CRAFT", payload: { id: "gem_crown" } });
    expect(inv(s1).gem_crown ?? 0).toBe(1);
  });

  it("crafts gold_ring", () => {
    const s0 = forgeState({ gold_bar: 2, iron_bar: 3 });
    const s1 = rootReducer(s0, { type: "CRAFT", payload: { id: "gold_ring" } });
    expect(inv(s1).gold_ring ?? 0).toBe(1);
  });
});

// ── sellPriceFor ──────────────────────────────────────────────────────────────

describe("10.3 — sellPriceFor (10% half-up)", () => {
  it("iron_frame sells for 28◉", () => expect(sellPriceFor("iron_frame")).toBe(28));
  it("stonework sells for 30◉",  () => expect(sellPriceFor("stonework")).toBe(30));
  it("gem_crown sells for 33◉",  () => expect(sellPriceFor("gem_crown")).toBe(33));
  it("gold_ring sells for 23◉",  () => expect(sellPriceFor("gold_ring")).toBe(23));
});

// ── SELL_ITEM ─────────────────────────────────────────────────────────────────

describe("10.3 — SELL_ITEM iron_frame", () => {
  it("sells 1 iron_frame: inventory -1, coins +28", () => {
    const s0 = { ...createInitialState(), ...patchInventory(createInitialState(), { iron_frame: 2 }), coins: 100 };
    const s1 = rootReducer(s0, { type: "SELL_ITEM", id: "iron_frame", qty: 1 });
    expect(inv(s1).iron_frame).toBe(1);
    expect(s1.coins).toBe(128);
  });

  it("sells 1 stonework: coins +30", () => {
    const s0 = { ...createInitialState(), ...patchInventory(createInitialState(), { stonework: 1 }), coins: 0 };
    const s1 = rootReducer(s0, { type: "SELL_ITEM", id: "stonework", qty: 1 });
    expect(s1.coins).toBe(30);
  });
});
