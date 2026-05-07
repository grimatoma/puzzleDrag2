import { describe, it, expect, beforeEach } from "vitest";
import { applyGift } from "../features/npcs/bond.js";
import { NPC_DATA } from "../features/npcs/data.js";
import { createInitialState } from "../state.js";

beforeEach(() => global.localStorage.clear());

describe("6.2 — favorite-gift table (§14)", () => {
  it("Mira  → flour",  () => expect(NPC_DATA.mira.favoriteGift).toBe("flour"));
  it("Tomas → jam",    () => expect(NPC_DATA.tomas.favoriteGift).toBe("jam"));
  it("Bram  → ingot",  () => expect(NPC_DATA.bram.favoriteGift).toBe("ingot"));
  it("Liss  → jam",    () => expect(NPC_DATA.liss.favoriteGift).toBe("jam"));
  it("Wren  → plank",  () => expect(NPC_DATA.wren.favoriteGift).toBe("plank"));
});

describe("6.2 — applyGift favorite (+0.5)", () => {
  it("accepts a favorite gift and bumps bond by +0.5", () => {
    const s = createInitialState();
    s.inventory.flour = 3;
    s.season = 1;
    const r = applyGift(s, "mira", "flour");
    expect(r.ok).toBe(true);
    expect(r.isFavorite).toBe(true);
    expect(r.delta).toBe(0.5);
    expect(r.newState.npcs.bonds.mira).toBe(5.5);
    expect(r.newState.inventory.flour).toBe(2);
    expect(r.newState.npcs.giftCooldown.mira).toBe(1);
  });
});

describe("6.2 — applyGift non-favorite (+0.2)", () => {
  it("accepts a non-favorite gift and bumps bond by +0.2", () => {
    const s = createInitialState();
    s.inventory.hay = 4;
    s.season = 1;
    const r = applyGift(s, "mira", "hay");
    expect(r.ok).toBe(true);
    expect(r.isFavorite).toBe(false);
    expect(r.delta).toBe(0.2);
    expect(Math.abs(r.newState.npcs.bonds.mira - 5.2)).toBeLessThan(1e-9);
  });
});

describe("6.2 — cooldown blocks re-gift in same season", () => {
  it("second gift returns ok:false and leaves state unchanged", () => {
    const s = createInitialState();
    s.inventory.hay = 4;
    s.season = 1;
    const r = applyGift(s, "mira", "hay");
    const cooled = r.newState;

    const r2 = applyGift(cooled, "mira", "hay");
    expect(r2.ok).toBe(false);
    // No mutation: cooled state unchanged
    expect(cooled.inventory.hay).toBe(3);
    expect(Math.abs(cooled.npcs.bonds.mira - 5.2)).toBeLessThan(1e-9);
  });
});

describe("6.2 — empty inventory blocks gift", () => {
  it("returns ok:false and does not set cooldown", () => {
    const s = createInitialState();
    s.inventory.flour = 0;
    s.season = 1;
    const r = applyGift(s, "mira", "flour");
    expect(r.ok).toBe(false);
    expect(s.npcs.bonds.mira).toBe(5);
    expect(s.npcs.giftCooldown.mira).toBe(0);
  });
});

describe("6.2 — bond clamps at 10", () => {
  it("clamps from 9.8 + 0.5 to 10", () => {
    const s = createInitialState();
    s.inventory.flour = 1;
    s.npcs.bonds.mira = 9.8;
    s.season = 1;
    const r = applyGift(s, "mira", "flour");
    expect(r.newState.npcs.bonds.mira).toBe(10);
  });
});

describe("6.2 — cross-NPC gifts are independent", () => {
  it("Bram gift OK after Mira gift in the same season", () => {
    const s = createInitialState();
    s.inventory.ingot = 1;
    s.inventory.flour = 1;
    s.season = 2;
    const r3 = applyGift(s, "mira", "flour");
    const r4 = applyGift(r3.newState, "bram", "ingot");
    expect(r4.ok).toBe(true);
    expect(r4.newState.npcs.bonds.bram).toBe(5.5);
  });
});
