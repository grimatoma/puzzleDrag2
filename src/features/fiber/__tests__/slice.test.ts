import { describe, expect, test } from "vitest";
import { rootReducer, createFreshState } from "../../../state.js";
import { zoneInventory } from "../../../state/zoneInventory.js";
import { inventoryQty } from "../../../types/inventory.js";
import { fiberLevelById } from "../../../game/fiber/levels.js";
import type { GameState } from "../../../types/state.js";

const L1 = fiberLevelById("L1")!;

// Mark the tutorial "seen" so its first-action auto-start doesn't add noise to
// the referential-no-op assertions below (it's unrelated to Fiber).
function fresh(): GameState {
  return { ...createFreshState(), tutorial: { active: false, step: 0, seen: true } };
}

describe("fiber slice — registration (the footgun guard)", () => {
  test("FIBER/START_LEVEL is NOT a silent no-op: it mutates state.fiber.active", () => {
    const state = fresh();
    expect(state.fiber.active).toBeNull();
    const next = rootReducer(state, { type: "FIBER/START_LEVEL", levelId: "L1" });
    // If this fails, the action is missing from SLICE_PRIMARY_ACTIONS or the
    // slice is missing from the `slices` array in src/state.ts.
    expect(next.fiber.active).not.toBeNull();
    expect(next.fiber.active?.levelId).toBe("L1");
    expect(next.fiber.active?.movesLeft).toBe(L1.moves);
    expect(next.fiber.active?.status).toBe("playing");
  });

  test("cannot start a level that is still locked", () => {
    const state = fresh(); // unlockedLevel = 1, so L2/L3 are locked
    const next = rootReducer(state, { type: "FIBER/START_LEVEL", levelId: "L3" });
    expect(next.fiber.active).toBeNull();
    expect(next).toBe(state); // referential no-op
  });
});

describe("fiber slice — RESOLVE_MOVE accumulates progress and flips status", () => {
  test("clearing enough wool wins L1", () => {
    let state = rootReducer(fresh(), { type: "FIBER/START_LEVEL", levelId: "L1" });
    // 40 cleared in one (generous) move satisfies "collect wool ×40".
    state = rootReducer(state, {
      type: "FIBER/RESOLVE_MOVE",
      payload: { cleared: { white: 40 }, created: { loom: 0 }, movesSpent: 1 },
    });
    expect(state.fiber.active?.progress.cleared).toBe(40);
    expect(state.fiber.active?.movesUsed).toBe(1);
    expect(state.fiber.active?.status).toBe("won");
  });

  test("running out of moves with the goal unmet sets status 'lost'", () => {
    let state = rootReducer(fresh(), { type: "FIBER/START_LEVEL", levelId: "L1" });
    for (let i = 0; i < L1.moves; i++) {
      state = rootReducer(state, {
        type: "FIBER/RESOLVE_MOVE",
        payload: { cleared: { white: 1 }, movesSpent: 1 },
      });
    }
    expect(state.fiber.active?.status).toBe("lost");
  });
});

describe("fiber slice — COMPLETE_LEVEL lands rewards in the REAL economy", () => {
  test("a win credits coins + zone inventory and unlocks the next level", () => {
    const state = fresh();
    const coinsBefore = state.coins;
    const woolBefore = inventoryQty(zoneInventory(state), "wool");

    const next = rootReducer(state, {
      type: "FIBER/COMPLETE_LEVEL",
      levelId: "L1",
      won: true,
      stars: 3,
    });

    expect(next.coins).toBe(coinsBefore + L1.reward.coins); // +120
    expect(inventoryQty(zoneInventory(next), "wool")).toBe(woolBefore + L1.reward.resources.wool); // +20
    expect(next.fiber.unlockedLevel).toBe(2);
    expect(next.fiber.stars.L1).toBe(3);
  });

  test("a loss with no active run is a referential no-op (credits nothing)", () => {
    const state = fresh();
    const next = rootReducer(state, { type: "FIBER/COMPLETE_LEVEL", levelId: "L1", won: false });
    expect(next).toBe(state);
    expect(next.coins).toBe(state.coins);
  });

  test("re-completing an already-cleared level grants stars only (no coin farming)", () => {
    let state = rootReducer(fresh(), { type: "FIBER/COMPLETE_LEVEL", levelId: "L1", won: true, stars: 1 });
    const coinsAfterFirst = state.coins;
    const woolAfterFirst = inventoryQty(zoneInventory(state), "wool");
    // Second completion of the same (now-cleared) level.
    state = rootReducer(state, { type: "FIBER/COMPLETE_LEVEL", levelId: "L1", won: true, stars: 3 });
    expect(state.coins).toBe(coinsAfterFirst); // no extra coins
    expect(inventoryQty(zoneInventory(state), "wool")).toBe(woolAfterFirst); // no extra wool
    expect(state.fiber.stars.L1).toBe(3); // stars upgraded
  });

  test("a won fiber resource (cloth) is immediately spendable via MARKET/SELL", () => {
    // Win L1 (credits wool), then prove fiber goods flow into the *real* market:
    // seed a few cloth (as a higher level would award) + a caravan post and sell.
    const zone = "home";
    let state: GameState = { ...fresh(), built: { home: { caravan_post: true } } };
    state = rootReducer(state, { type: "FIBER/COMPLETE_LEVEL", levelId: "L1", won: true, stars: 3 });
    expect(inventoryQty(zoneInventory(state, zone), "wool")).toBeGreaterThan(0); // L1 reward landed
    state = { ...state, inventory: { ...state.inventory, [zone]: { ...zoneInventory(state, zone), cloth: 3 } } };
    const coinsBeforeSell = state.coins;
    const sold = rootReducer(state, { type: "MARKET/SELL", payload: { resource: "cloth", qty: 3 } });
    expect(sold.coins).toBeGreaterThan(coinsBeforeSell); // real coins from the real market
    expect(inventoryQty(zoneInventory(sold, zone), "cloth")).toBe(0);
  });
});
