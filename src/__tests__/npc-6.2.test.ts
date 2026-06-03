import { describe, it, expect, beforeEach } from "vitest";
import { inv } from "../testUtils/inventory.js";
import { applyGift, giftTier, GIFT_DELTAS } from "../features/npcs/bond.js";
import { NPC_DATA } from "../features/npcs/data.js";
import { createInitialState } from "../state.js";

beforeEach(() => global.localStorage.clear());

describe("6.2 — favorite-gift table (§14, derived from loves[0])", () => {
  it("Mira  → flour",  () => expect(NPC_DATA.mira.favoriteGift).toBe("flour"));
  it("Tomas → jam",    () => expect(NPC_DATA.tomas.favoriteGift).toBe("jam"));
  it("Bram  → ingot",  () => expect(NPC_DATA.bram.favoriteGift).toBe("iron_bar"));
  it("Liss  → jam",    () => expect(NPC_DATA.liss.favoriteGift).toBe("jam"));
  it("Wren  → plank",  () => expect(NPC_DATA.wren.favoriteGift).toBe("plank"));
});

describe("6.2 — multi-tier gift preferences", () => {
  it("every NPC has non-empty loves/likes lists, and favoriteGift === loves[0]", () => {
    for (const id of Object.keys(NPC_DATA)) {
      const d = NPC_DATA[id];
      expect(Array.isArray(d.loves) && d.loves.length > 0, `${id} loves`).toBe(true);
      expect(Array.isArray(d.likes) && d.likes.length > 0, `${id} likes`).toBe(true);
      expect(d.favoriteGift).toBe(d.loves[0]);
    }
  });
  it("loves/likes do not overlap for a given NPC", () => {
    for (const id of Object.keys(NPC_DATA)) {
      const { loves, likes } = NPC_DATA[id];
      expect(loves.some((g) => likes.includes(g)), `${id} overlap`).toBe(false);
    }
  });
  it("giftTier classifies loves / likes / neutral", () => {
    expect(giftTier("mira", "flour")).toBe("loves");
    expect(giftTier("mira", "honey")).toBe("likes");
    expect(giftTier("mira", "tile_grass_grass")).toBe("neutral");
    expect(giftTier("nobody", "anything")).toBe("neutral");
  });
});

describe("6.2 — applyGift loved gift (+0.5)", () => {
  it("accepts a loved gift and bumps bond by +0.5", () => {
    const s = createInitialState();
    inv(s).flour = 3;
    s.season = 1;
    const r = applyGift(s, "mira", "flour");
    expect(r.ok).toBe(true);
    expect(r.tier).toBe("loves");
    expect(r.isFavorite).toBe(true);
    expect(r.delta).toBe(GIFT_DELTAS.loves);
    expect(r.newState.npcs.bonds.mira).toBe(5.5);
    expect(inv(r.newState).flour).toBe(2);
    expect(r.newState.npcs.giftCooldown.mira).toBe(1);
  });
});

describe("6.2 — applyGift liked gift (+0.3)", () => {
  it("accepts a liked gift and bumps bond by +0.3", () => {
    const s = createInitialState();
    inv(s).honey = 2;
    s.season = 1;
    const r = applyGift(s, "mira", "honey");
    expect(r.ok).toBe(true);
    expect(r.tier).toBe("likes");
    expect(r.isFavorite).toBe(false);
    expect(r.delta).toBe(GIFT_DELTAS.likes);
    expect(Math.abs(r.newState.npcs.bonds.mira - 5.3)).toBeLessThan(1e-9);
  });
});

describe("6.2 — applyGift neutral gift (+0.15)", () => {
  it("accepts a neutral gift and bumps bond by +0.15", () => {
    const s = createInitialState();
    inv(s).tile_grass_grass = 4;
    s.season = 1;
    const r = applyGift(s, "mira", "tile_grass_grass");
    expect(r.ok).toBe(true);
    expect(r.tier).toBe("neutral");
    expect(r.isFavorite).toBe(false);
    expect(r.delta).toBe(GIFT_DELTAS.neutral);
    expect(Math.abs(r.newState.npcs.bonds.mira - 5.15)).toBeLessThan(1e-9);
  });
});

describe("6.2 — cooldown blocks re-gift in same season", () => {
  it("second gift returns ok:false and leaves state unchanged", () => {
    const s = createInitialState();
    inv(s).tile_grass_grass = 4;
    s.season = 1;
    const r = applyGift(s, "mira", "tile_grass_grass");
    const cooled = r.newState;

    const r2 = applyGift(cooled, "mira", "tile_grass_grass");
    expect(r2.ok).toBe(false);
    // No mutation: cooled state unchanged
    expect(inv(cooled).tile_grass_grass).toBe(3);
    expect(Math.abs(cooled.npcs.bonds.mira - 5.15)).toBeLessThan(1e-9);
  });
});

describe("6.2 — empty inventory blocks gift", () => {
  it("returns ok:false and does not set cooldown", () => {
    const s = createInitialState();
    inv(s).flour = 0;
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
    inv(s).flour = 1;
    s.npcs.bonds.mira = 9.8;
    s.season = 1;
    const r = applyGift(s, "mira", "flour");
    expect(r.newState.npcs.bonds.mira).toBe(10);
  });
});

describe("6.2 — cross-NPC gifts are independent", () => {
  it("Bram gift OK after Mira gift in the same season", () => {
    const s = createInitialState();
    inv(s).iron_bar = 1;
    inv(s).flour = 1;
    s.season = 2;
    const r3 = applyGift(s, "mira", "flour");
    const r4 = applyGift(r3.newState, "bram", "iron_bar");
    expect(r4.ok).toBe(true);
    expect(r4.newState.npcs.bonds.bram).toBe(5.5);
  });
});
