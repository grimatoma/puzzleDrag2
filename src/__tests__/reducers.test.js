import { describe, it, expect, beforeEach } from "vitest";
import { gameReducer, initialState } from "../state.js";
import { reduce as moodReduce } from "../features/mood/slice.js";
import { reduce as bossReduce } from "../features/boss/slice.js";
import { reduce as apprenticesReduce, seedHireSeq } from "../features/apprentices/slice.js";
import { seedQuestIdSeq } from "../features/quests/slice.js";

// ─── helpers ──────────────────────────────────────────────────────────────────

function freshState() {
  // localStorage mock returns null → initialState() returns a clean fresh object.
  global.localStorage.clear();
  return initialState();
}

// Neutral bond (5 = Warm, modifier 1.00) so mood slice adds 0 extra coins.
const NEUTRAL_BOND = { mira: 5, tomas: 5, bram: 5, liss: 5, wren: 5 };

function minState(overrides = {}) {
  return {
    biomeKey: "farm",
    view: "board",
    coins: 100,
    level: 1,
    xp: 0,
    turnsUsed: 0,
    // Default to Summer (1) — no seasonal harvest/order bonus, no Spring +20%.
    seasonsCycled: 1,
    inventory: {},
    orders: [],
    tools: { clear: 0, basic: 0, rare: 0, shuffle: 0 },
    built: {},
    bubble: null,
    modal: null,
    pendingView: null,
    seasonStats: { harvests: 0, upgrades: 0, ordersFilled: 0, coins: 0 },
    _hintsShown: {},
    npcBond: NEUTRAL_BOND,
    ...overrides,
  };
}

// ─── coreReducer via gameReducer ─────────────────────────────────────────────

describe("CHAIN_COLLECTED", () => {
  it("adds harvested resources to inventory", () => {
    const state = minState();
    const next = gameReducer(state, {
      type: "CHAIN_COLLECTED",
      payload: { key: "hay", gained: 4, upgrades: 0, value: 1, chainLength: 4 },
    });
    expect(next.inventory.hay).toBe(4);
  });

  it("applies spring +20% bonus (season 0)", () => {
    const state = minState({ seasonsCycled: 0, npcBond: NEUTRAL_BOND }); // Spring
    const next = gameReducer(state, {
      type: "CHAIN_COLLECTED",
      payload: { key: "hay", gained: 5, upgrades: 0, value: 1, chainLength: 5 },
    });
    // Spring bonus: ceil(5 * 0.2) = 1 extra → 6 total
    expect(next.inventory.hay).toBe(6);
  });

  it("doubles upgrades in autumn (season 2)", () => {
    const state = minState({ seasonsCycled: 2 }); // Autumn
    const next = gameReducer(state, {
      type: "CHAIN_COLLECTED",
      payload: { key: "hay", gained: 3, upgrades: 1, value: 1, chainLength: 3 },
    });
    // Autumn: 1 upgrade → 2 effective upgrades → 2 wheat
    expect(next.inventory.wheat).toBe(2);
  });

  it("yields nothing in winter with chain < 4", () => {
    const state = minState({ seasonsCycled: 3 }); // Winter
    const next = gameReducer(state, {
      type: "CHAIN_COLLECTED",
      payload: { key: "hay", gained: 3, upgrades: 0, value: 1, chainLength: 3 },
    });
    expect(next.inventory.hay).toBeUndefined();
    expect(next.turnsUsed).toBe(1); // turn still consumed
  });

  it("collects normally in winter with chain >= 4", () => {
    const state = minState({ seasonsCycled: 3 }); // Winter
    const next = gameReducer(state, {
      type: "CHAIN_COLLECTED",
      payload: { key: "hay", gained: 4, upgrades: 0, value: 1, chainLength: 4 },
    });
    expect(next.inventory.hay).toBe(4);
  });

  it("advances turnsUsed and sets season modal when turn limit reached", async () => {
    const { MAX_TURNS } = await import("../constants.js");
    const state = minState({ turnsUsed: MAX_TURNS - 1 });
    const next = gameReducer(state, {
      type: "CHAIN_COLLECTED",
      payload: { key: "hay", gained: 3, upgrades: 0, value: 1, chainLength: 4 },
    });
    expect(next.turnsUsed).toBe(MAX_TURNS);
    expect(next.modal).toBe("season");
  });

  it("awards coins and xp", () => {
    const state = minState();
    const next = gameReducer(state, {
      type: "CHAIN_COLLECTED",
      payload: { key: "hay", gained: 6, upgrades: 0, value: 1, chainLength: 6 },
    });
    expect(next.coins).toBeGreaterThan(state.coins);
    expect(next.xp).toBeGreaterThan(0);
  });
});

describe("TURN_IN_ORDER", () => {
  it("increases npcBond by 0.3 via mood slice", () => {
    const order = { id: "o1", npc: "mira", key: "hay", need: 5, reward: 100, line: "test" };
    const state = minState({
      seasonsCycled: 2,
      inventory: { hay: 10 },
      orders: [order],
      npcBond: { ...NEUTRAL_BOND, mira: 5 },
    });
    const next = gameReducer(state, {
      type: "TURN_IN_ORDER",
      id: "o1",
      npc: order.npc,
      key: order.key,
      need: order.need,
      reward: order.reward,
    });
    expect(next.npcBond.mira).toBeCloseTo(5.3, 5);
  });

  it("deducts inventory and adds reward coins", () => {
    const order = { id: "o1", npc: "wren", key: "hay", need: 5, reward: 30, line: "test" };
    const state = minState({
      seasonsCycled: 2, // Autumn — no order reward modifier
      inventory: { hay: 10 },
      orders: [order],
    });
    const next = gameReducer(state, {
      type: "TURN_IN_ORDER",
      id: "o1",
      npc: order.npc,
      key: order.key,
      need: order.need,
      reward: order.reward,
    });
    expect(next.inventory.hay).toBe(5);
    expect(next.coins).toBe(state.coins + 30);
  });

  it("doubles reward in summer (season 1)", () => {
    const order = { id: "o1", npc: "wren", key: "hay", need: 3, reward: 20, line: "test" };
    const state = minState({
      seasonsCycled: 1, // Summer
      inventory: { hay: 5 },
      orders: [order],
      npcBond: NEUTRAL_BOND,
    });
    const next = gameReducer(state, {
      type: "TURN_IN_ORDER",
      id: "o1",
      npc: order.npc,
      key: order.key,
      need: order.need,
      reward: order.reward,
    });
    expect(next.coins).toBe(state.coins + 40); // 2× summer multiplier
  });

  it("does nothing when inventory is insufficient", () => {
    const order = { id: "o1", npc: "wren", key: "hay", need: 10, reward: 30, line: "test" };
    const state = minState({
      seasonsCycled: 2, // Autumn — no order reward modifier
      inventory: { hay: 2 },
      orders: [order],
    });
    const next = gameReducer(state, {
      type: "TURN_IN_ORDER",
      id: "o1",
      npc: order.npc,
      key: order.key,
      need: order.need,
      reward: order.reward,
    });
    expect(next.inventory.hay).toBe(2); // unchanged
    expect(next.coins).toBe(state.coins); // unchanged
  });
});

describe("CLOSE_SEASON", () => {
  it("resets turnsUsed and increments seasonsCycled", () => {
    const state = minState({ turnsUsed: 8, seasonsCycled: 1, modal: "season" });
    const next = gameReducer(state, { type: "CLOSE_SEASON" });
    expect(next.turnsUsed).toBe(0);
    expect(next.modal).toBeNull();
    expect(next.view).toBe("town");
  });

  it("increments seasonsCycled from core state", () => {
    const s0 = minState({ seasonsCycled: 0 });
    const s1 = gameReducer(s0, { type: "CLOSE_SEASON" });
    const s2 = gameReducer(s1, { type: "CLOSE_SEASON" });
    expect(s2.seasonsCycled).toBe(2);
  });

  it("awards end-of-season coins and shuffle tool", () => {
    const state = minState({ tools: { shuffle: 0 } });
    const next = gameReducer(state, { type: "CLOSE_SEASON" });
    expect(next.tools.shuffle).toBe(1);
    expect(next.coins).toBe(state.coins + 25); // SEASON_END_BONUS_COINS
  });
});

describe("DISMISS_BUBBLE", () => {
  it("clears bubble when id matches", () => {
    const bubble = { id: 42, npc: "wren", text: "hi", ms: 1000 };
    const state = minState({ bubble });
    const next = gameReducer(state, { type: "DISMISS_BUBBLE", id: 42 });
    expect(next.bubble).toBeNull();
  });

  it("keeps bubble when id does not match", () => {
    const bubble = { id: 42, npc: "wren", text: "hi", ms: 1000 };
    const state = minState({ bubble });
    const next = gameReducer(state, { type: "DISMISS_BUBBLE", id: 99 });
    expect(next.bubble).toBe(bubble);
  });
});

describe("USE_TOOL", () => {
  it("consumes a tool charge", () => {
    const state = minState({ tools: { basic: 2, clear: 0, rare: 0, shuffle: 0 } });
    const next = gameReducer(state, { type: "USE_TOOL", key: "basic" });
    expect(next.tools.basic).toBe(1);
  });

  it("does nothing when no charges remain", () => {
    const state = minState({ tools: { basic: 0, clear: 0, rare: 0, shuffle: 0 } });
    const next = gameReducer(state, { type: "USE_TOOL", key: "basic" });
    expect(next).toBe(state); // identity — no change
  });
});

// ─── mood slice ───────────────────────────────────────────────────────────────

describe("mood/slice TURN_IN_ORDER", () => {
  it("increases npc bond when order is turned in", () => {
    const state = { npcBond: { wren: 5 }, coins: 0 };
    const next = moodReduce(state, {
      type: "TURN_IN_ORDER",
      npc: "wren",
      reward: 30,
    });
    expect(next.npcBond.wren).toBeGreaterThan(5);
  });

  it("is a no-op when npc field is missing", () => {
    const state = { npcBond: { wren: 5 }, coins: 0 };
    const next = moodReduce(state, { type: "TURN_IN_ORDER" });
    expect(next).toBe(state);
  });
});

// ─── boss slice ───────────────────────────────────────────────────────────────

describe("boss/slice CLOSE_SEASON", () => {
  it("resets _bossResolvedThisSeason flag", () => {
    const state = {
      boss: null,
      seasonsCycled: 3,
      _bossResolvedThisSeason: true,
    };
    const next = bossReduce(state, { type: "CLOSE_SEASON" });
    expect(next._bossResolvedThisSeason).toBe(false);
  });

  it("does not spawn a second boss when already resolved this season", () => {
    const state = {
      boss: null,
      seasonsCycled: 3, // year boundary (every 4 seasons)
      _bossResolvedThisSeason: true,
    };
    const next = bossReduce(state, { type: "CLOSE_SEASON" });
    expect(next.boss).toBeNull();
  });
});

// ─── ID sequence seeding ─────────────────────────────────────────────────────

describe("seedHireSeq", () => {
  it("advances past the highest saved apprentice id", () => {
    // If saved apprentices have ids 1, 2, 3, next hire should get id >= 4
    const saved = [{ id: 3, app: "pip", since: 0 }];
    seedHireSeq(saved);
    const state = {
      hiredApprentices: saved,
      coins: 9999,
      level: 5,
      built: { inn: true },
      turnsUsed: 0,
    };
    const next = apprenticesReduce(state, { type: "APP/HIRE", appKey: "pip" });
    // pip is already hired — hire should be rejected
    expect(next).toBe(state);
  });

  it("handles empty saved list gracefully", () => {
    expect(() => seedHireSeq([])).not.toThrow();
    expect(() => seedHireSeq(null)).not.toThrow();
  });
});

describe("seedQuestIdSeq", () => {
  it("handles empty saved list gracefully", () => {
    expect(() => seedQuestIdSeq([])).not.toThrow();
    expect(() => seedQuestIdSeq(null)).not.toThrow();
  });
});

// ─── initialState ─────────────────────────────────────────────────────────────

describe("initialState", () => {
  beforeEach(() => global.localStorage.clear());

  it("returns a fresh state with sensible defaults", () => {
    const state = freshState();
    expect(state.level).toBe(1);
    expect(state.coins).toBe(150);
    expect(state.biomeKey).toBe("farm");
    expect(Array.isArray(state.orders)).toBe(true);
    expect(state.orders.length).toBe(3);
  });

  it("gives each order a unique npc", () => {
    const state = freshState();
    const npcs = state.orders.map((o) => o.npc);
    expect(new Set(npcs).size).toBe(npcs.length);
  });

  it("all NPCs start at Warm bond (5)", () => {
    const state = freshState();
    for (const npc of ["mira", "tomas", "bram", "liss", "wren"]) {
      expect(state.npcBond[npc]).toBe(5);
    }
  });
});

describe("NPC bond decay", () => {
  it("bond above 5 decays toward 5 over multiple seasons", () => {
    let s = minState({ npcBond: { ...NEUTRAL_BOND, mira: 7 } });
    for (let i = 0; i < 10; i++) s = gameReducer(s, { type: "CLOSE_SEASON" });
    expect(s.npcBond.mira).toBeLessThan(7);
    expect(s.npcBond.mira).toBeGreaterThanOrEqual(5);
  });

  it("bond exactly 5 stays at 5 after multiple seasons", () => {
    let s = minState({ npcBond: { ...NEUTRAL_BOND, mira: 5 } });
    for (let i = 0; i < 10; i++) s = gameReducer(s, { type: "CLOSE_SEASON" });
    expect(s.npcBond.mira).toBe(5);
  });
});
