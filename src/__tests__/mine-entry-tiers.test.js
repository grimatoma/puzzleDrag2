import { describe, it, expect, beforeEach } from "vitest";
import { rootReducer, createInitialState } from "../state.js";
import { MINE_ENTRY_TIERS } from "../constants.js";
import { ZONES } from "../features/zones/data.js";

beforeEach(() => global.localStorage.clear());

function mineReady(over = {}) {
  return {
    ...createInitialState(),
    mapCurrent: "quarry",
    activeZone: "quarry",
    settlements: { home: { founded: true }, quarry: { founded: true, biome: "mountain" } },
    story: { ...createInitialState().story, flags: { ...createInitialState().story.flags, mine_unlocked: true } },
    ...over,
  };
}

describe("Phase 3.6 — Mine entry tiers", () => {
  it("MINE_ENTRY_TIERS lists three tiers in spec order", () => {
    expect(MINE_ENTRY_TIERS.map((t) => t.id)).toEqual(["free", "better", "premium"]);
  });

  it("rejects MINE/ENTER without mine_unlocked flag", () => {
    const s = { ...createInitialState(), inventory: { supplies: 5 } };
    const r = rootReducer(s, { type: "MINE/ENTER", payload: { tier: "free" } });
    expect(r.biomeKey).toBe("farm");
  });

  it("free tier consumes 3 supplies and switches biome", () => {
    const s = {
      ...mineReady(),
      inventory: { supplies: 5 },
    };
    const r = rootReducer(s, { type: "MINE/ENTER", payload: { tier: "free" } });
    expect(r.biomeKey).toBe("mine");
    expect(r.inventory.supplies).toBe(2);
  });

  it("better tier consumes 100 coins and extends session by 2 turns", () => {
    const s = {
      ...mineReady(),
      coins: 150,
    };
    const r = rootReducer(s, { type: "MINE/ENTER", payload: { tier: "better" } });
    expect(r.biomeKey).toBe("mine");
    expect(r.coins).toBe(50);
    expect(r.farmRun.turnBudget).toBe(ZONES.quarry.baseTurns + 2);
  });

  it("better tier rejected when coins short", () => {
    const s = {
      ...mineReady(),
      coins: 50,
    };
    const r = rootReducer(s, { type: "MINE/ENTER", payload: { tier: "better" } });
    expect(r.biomeKey).toBe("farm");
  });

  it("premium tier consumes 2 runes only, no supplies/coins", () => {
    const s = {
      ...mineReady(),
      runes: 3,
      coins: 0,
      inventory: { supplies: 0 },
    };
    const r = rootReducer(s, { type: "MINE/ENTER", payload: { tier: "premium" } });
    expect(r.biomeKey).toBe("mine");
    expect(r.runes).toBe(1);
  });

  it("CLOSE_SEASON clears the active farm run", () => {
    const s = {
      ...createInitialState(),
      farmRun: { zoneId: "quarry", turnBudget: 12, turnsRemaining: 6, startedAt: 1 },
    };
    const r = rootReducer(s, { type: "CLOSE_SEASON" });
    expect(r.farmRun).toBeNull();
  });
});
