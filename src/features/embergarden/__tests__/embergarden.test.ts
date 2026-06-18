import { describe, it, expect, beforeEach } from "vitest";
import { gameReducer, initialState } from "../../../state.js";
import { mergeTestState } from "../../../testUtils/testState.js";
import { STORAGE_KEYS, SAVE_SCHEMA_VERSION } from "../../../constants.js";
import {
  GENERATORS,
  generatorById,
  generatorCost,
  generatorRate,
  totalWarmthPerSec,
  hearthlightMult,
  hearthlightFromLifetime,
  hearthlightBoardCoinBonus,
  HEARTHLIGHT_BOARD_COIN_CAP,
  OFFLINE_CAP_SECONDS,
  REKINDLE_MIN_LIFETIME_WARMTH,
} from "../data.js";
import { reduce as embergardenReduce, type EmbergardenState } from "../slice.js";
import { viewKey } from "../index.js";
import { KNOWN_VIEWS } from "../../../router.js";
import { ITEMS } from "../../../constants.js";
import { producedResource } from "../../../game/producedResource.js";
import type { Action, GameState } from "../../../types/state.js";
import v45Fixture from "../../../__tests__/fixtures/saves/v45-pre-embergarden.json";

beforeEach(() => global.localStorage.clear());

const KINDLING = generatorById("kindling")!;
const KILN = generatorById("kiln")!;

/** Build a GameState whose embergarden sub-state is exactly `eg`. */
function withEg(eg: Partial<EmbergardenState>): GameState {
  return mergeTestState({
    embergarden: {
      warmth: 0, lifetimeWarmth: 0, hearthlight: 0, levels: {}, lastTickAt: null,
      ...eg,
    },
  });
}

function tick(state: GameState, now: number): GameState {
  return embergardenReduce(state, { type: "EMBERGARDEN/TICK", payload: { now } } as Action);
}

// ── Pure data/math ──────────────────────────────────────────────────────────

describe("embergarden data — curves & bounds", () => {
  it("cost curve is geometric and strictly increasing", () => {
    let prev = -1;
    for (let lvl = 0; lvl < 10; lvl++) {
      const cost = generatorCost(KINDLING, lvl);
      expect(cost).toBeGreaterThan(prev);
      prev = cost;
    }
    // baseCost 10, growth 1.15: level 0 -> ceil(10) = 10, level 1 -> ceil(11.5) = 12
    expect(generatorCost(KINDLING, 0)).toBe(10);
    expect(generatorCost(KINDLING, 1)).toBe(12);
  });

  it("diminishing returns: past the soft cap, rate grows sub-linearly", () => {
    const lvl = KINDLING.softCapLevel + 4;
    const linear = KINDLING.baseRatePerSec * lvl;
    expect(generatorRate(KINDLING, lvl)).toBeLessThan(linear);
    // exactly base * (softCap + sqrt(4))
    expect(generatorRate(KINDLING, lvl)).toBeCloseTo(
      KINDLING.baseRatePerSec * (KINDLING.softCapLevel + 2), 6,
    );
  });

  it("idle production multiplier is hard-capped at 2.0", () => {
    expect(hearthlightMult(0)).toBe(1);
    expect(hearthlightMult(10)).toBeCloseTo(1.5, 6); // +5% * 10 = +50%
    expect(hearthlightMult(1000)).toBe(2.0);         // capped, not 51x
  });

  it("board-coin bonus is hard-capped at 0.15 and zero for non-idle players", () => {
    expect(hearthlightBoardCoinBonus(0)).toBe(0);
    expect(hearthlightBoardCoinBonus(5)).toBeCloseTo(0.05, 6);
    expect(hearthlightBoardCoinBonus(1000)).toBe(HEARTHLIGHT_BOARD_COIN_CAP);
    expect(hearthlightBoardCoinBonus(1000)).toBe(0.15);
  });

  it("prestige conversion uses a cube-root curve, gated by minimum lifetime", () => {
    expect(hearthlightFromLifetime(REKINDLE_MIN_LIFETIME_WARMTH - 1)).toBe(0);
    expect(hearthlightFromLifetime(10000)).toBe(Math.floor(Math.cbrt(10))); // 2
    expect(hearthlightFromLifetime(1_000_000)).toBe(10); // cbrt(1000) = 10
  });
});

// ── Accrual (pure slice) ──────────────────────────────────────────────────────

describe("embergarden slice — accrual", () => {
  it("basic accrual: one Kindling at L1 for 100s adds 5 Warmth", () => {
    const s = withEg({ levels: { kindling: 1 }, lastTickAt: 0 });
    const next = tick(s, 100_000);
    expect(next.embergarden.warmth).toBeCloseTo(5, 6);
    expect(next.embergarden.lifetimeWarmth).toBeCloseTo(5, 6);
    expect(next.embergarden.lastTickAt).toBe(100_000);
  });

  it("first tick only stamps the clock (adds 0 Warmth)", () => {
    const s = withEg({ levels: { kindling: 1 }, lastTickAt: null });
    const next = tick(s, 100_000);
    expect(next.embergarden.warmth).toBe(0);
    expect(next.embergarden.lastTickAt).toBe(100_000);
  });

  it("offline cap: 24h away credits only 8h of production", () => {
    const s = withEg({ levels: { kindling: 1 }, lastTickAt: 0 });
    const next = tick(s, 24 * 3600 * 1000);
    const rate = totalWarmthPerSec({ kindling: 1 }, 0);
    expect(next.embergarden.warmth).toBeCloseTo(OFFLINE_CAP_SECONDS * rate, 4);
    // Sanity: that is strictly less than the uncapped 24h figure.
    expect(next.embergarden.warmth).toBeLessThan(24 * 3600 * rate);
  });

  it("idempotent / clock skew: same now or earlier now never adds Warmth", () => {
    const s = withEg({ levels: { kindling: 1 }, lastTickAt: 100_000, warmth: 5 });
    const same = tick(s, 100_000);
    expect(same).toBe(s); // referential-equality no-op
    const back = tick(s, 50_000); // clock set backward
    expect(back).toBe(s);
    expect(back.embergarden.warmth).toBe(5);
    expect(back.embergarden.lastTickAt).toBe(100_000);
  });

  it("rejects a non-finite / missing now", () => {
    const s = withEg({ levels: { kindling: 1 }, lastTickAt: 0 });
    expect(embergardenReduce(s, { type: "EMBERGARDEN/TICK", payload: {} } as Action)).toBe(s);
    expect(embergardenReduce(s, { type: "EMBERGARDEN/TICK", payload: { now: NaN } } as Action)).toBe(s);
  });
});

// ── Buy generator (pure slice) ────────────────────────────────────────────────

describe("embergarden slice — buy generator", () => {
  it("affordable purchase increments the level and deducts the geometric cost", () => {
    const s = withEg({ warmth: 100, lastTickAt: 1000 });
    const next = embergardenReduce(
      s, { type: "EMBERGARDEN/BUY_GENERATOR", payload: { id: "kindling", now: 1000 } } as Action,
    );
    expect(next.embergarden.levels.kindling).toBe(1);
    expect(next.embergarden.warmth).toBe(100 - generatorCost(KINDLING, 0)); // 100 - 10
  });

  it("unaffordable purchase is a referential no-op", () => {
    const s = withEg({ warmth: 5, lastTickAt: 1000 });
    const next = embergardenReduce(
      s, { type: "EMBERGARDEN/BUY_GENERATOR", payload: { id: "kindling", now: 1000 } } as Action,
    );
    expect(next).toBe(s);
  });

  it("a generator below its lifetime-Warmth milestone cannot be bought", () => {
    // Kiln unlocks at 500 lifetime Warmth. Plenty of spendable Warmth but no
    // lifetime progress → gated.
    const s = withEg({ warmth: 100_000, lifetimeWarmth: 0, lastTickAt: 1000 });
    const next = embergardenReduce(
      s, { type: "EMBERGARDEN/BUY_GENERATOR", payload: { id: "kiln", now: 1000 } } as Action,
    );
    expect(next).toBe(s);
    expect(KILN.unlockAtWarmthLifetime).toBe(500);
  });

  it("accrues pending Warmth before charging, so buying never drops production", () => {
    // 0 warmth now, but 200s of pending production at L1 kindling = +10 Warmth,
    // enough to afford the next level (cost 12 at L1? no — at L1 cost = 12).
    const s = withEg({ levels: { kindling: 1 }, warmth: 0, lifetimeWarmth: 50, lastTickAt: 0 });
    const next = embergardenReduce(
      s, { type: "EMBERGARDEN/BUY_GENERATOR", payload: { id: "kindling", now: 400_000 } } as Action,
    );
    // 400s * 0.05 = 20 Warmth accrued; cost at L1 = ceil(10*1.15) = 12 → affordable.
    expect(next.embergarden.levels.kindling).toBe(2);
    expect(next.embergarden.warmth).toBeCloseTo(20 - 12, 5);
  });
});

// ── Rekindle (pure slice) ─────────────────────────────────────────────────────

describe("embergarden slice — rekindle (prestige)", () => {
  it("is gated below the minimum lifetime Warmth", () => {
    const s = withEg({ lifetimeWarmth: REKINDLE_MIN_LIFETIME_WARMTH - 1, warmth: 5, lastTickAt: 1000 });
    const next = embergardenReduce(s, { type: "EMBERGARDEN/REKINDLE", payload: {} } as Action);
    expect(next).toBe(s);
  });

  it("grants Hearthlight, resets the cycle, and never resets Hearthlight", () => {
    const s = withEg({
      warmth: 5000, lifetimeWarmth: 1_000_000, hearthlight: 3,
      levels: { kindling: 10 }, lastTickAt: 1000,
    });
    const next = embergardenReduce(s, { type: "EMBERGARDEN/REKINDLE", payload: {} } as Action);
    expect(next.embergarden.hearthlight).toBe(3 + hearthlightFromLifetime(1_000_000)); // 3 + 10
    expect(next.embergarden.warmth).toBe(0);
    expect(next.embergarden.lifetimeWarmth).toBe(0);
    expect(next.embergarden.levels).toEqual({});
    expect(next.embergarden.lastTickAt).toBe(1000); // clock preserved

    // A second Rekindle preserves the accumulated Hearthlight.
    const s2 = withEg({
      ...next.embergarden, lifetimeWarmth: 1_000_000,
    });
    const next2 = embergardenReduce(s2, { type: "EMBERGARDEN/REKINDLE", payload: {} } as Action);
    expect(next2.embergarden.hearthlight).toBe(next.embergarden.hearthlight + 10);
  });
});

// ── The footgun: prove the slice actually fires through gameReducer ────────────

describe("embergarden — wired through gameReducer (SLICE_PRIMARY_ACTIONS proof)", () => {
  it("EMBERGARDEN/BUY_GENERATOR mutates state when dispatched through the root reducer", () => {
    // Drive the REAL reducer end-to-end (not the slice directly). If EMBERGARDEN/*
    // were missing from SLICE_PRIMARY_ACTIONS, coreReducer's `default: return state`
    // would short-circuit slices and this would no-op — that is the whole point.
    const s0 = mergeTestState({
      embergarden: { warmth: 100, lifetimeWarmth: 0, hearthlight: 0, levels: {}, lastTickAt: 1000 },
    });
    const s1 = gameReducer(s0, { type: "EMBERGARDEN/BUY_GENERATOR", payload: { id: "kindling", now: 1000 } });
    expect(s1).not.toBe(s0);
    expect(s1.embergarden.levels.kindling).toBe(1);
    expect(s1.embergarden.warmth).toBe(90);
  });

  it("a zero-delta TICK through gameReducer is a true no-op (same state reference)", () => {
    const s0 = mergeTestState({
      embergarden: { warmth: 0, lifetimeWarmth: 0, hearthlight: 0, levels: { kindling: 1 }, lastTickAt: 5000 },
    });
    const s1 = gameReducer(s0, { type: "EMBERGARDEN/TICK", payload: { now: 5000 } });
    expect(s1).toBe(s0);
  });

  it("a real-delta TICK through gameReducer accrues Warmth", () => {
    const s0 = mergeTestState({
      embergarden: { warmth: 0, lifetimeWarmth: 0, hearthlight: 0, levels: { kindling: 1 }, lastTickAt: 0 },
    });
    const s1 = gameReducer(s0, { type: "EMBERGARDEN/TICK", payload: { now: 100_000 } });
    expect(s1.embergarden.warmth).toBeCloseTo(5, 6);
  });
});

// ── Save migration: a v45 save upgrades cleanly to the embergarden shape ───────

describe("embergarden — v45 save migrates without data loss", () => {
  it("loads the v45 fixture through initialState, defaulting embergarden and keeping progress", () => {
    expect((v45Fixture as { version: number }).version).toBe(45);
    expect((v45Fixture as { embergarden?: unknown }).embergarden).toBeUndefined();
    global.localStorage.setItem(STORAGE_KEYS.save, JSON.stringify(v45Fixture));
    const s = initialState();
    expect(s.version).toBe(SAVE_SCHEMA_VERSION); // 46
    expect(s.coins).toBe(999);                   // pre-existing progress survived
    expect(s.embergarden).toEqual({
      warmth: 0, lifetimeWarmth: 0, hearthlight: 0, levels: {}, lastTickAt: null,
    });
  });
});

// ── The single board buff: capped, and a no-op for non-idle players ───────────

describe("embergarden — board coin buff", () => {
  function boardState(hearthlight: number): GameState {
    return mergeTestState({
      view: "board",
      biomeKey: "mine",
      coins: 100,
      embergarden: { warmth: 0, lifetimeWarmth: 0, hearthlight, levels: {}, lastTickAt: null },
    });
  }
  function chainCoins(state: GameState, chainLength: number): number {
    const next = gameReducer(state, {
      type: "CHAIN_COLLECTED",
      payload: {
        key: "tile_coin_golden",
        gained: chainLength,
        upgrades: 0,
        value: ITEMS.tile_coin_golden.value,
        chainLength,
        resourceKey: producedResource({ key: "tile_coin_golden" }) ?? undefined,
      },
    });
    return next.seasonStats.coins; // isolated chain payout, before later rewards
  }

  it("hearthlight 0 → identical payout (no board behaviour change)", () => {
    const p0a = chainCoins(boardState(0), 3);
    const p0b = chainCoins(boardState(0), 3);
    expect(p0a).toBe(p0b); // deterministic baseline
    expect(hearthlightBoardCoinBonus(0)).toBe(0);
  });

  it("hearthlight applies a hard-capped (+15%) bump to chain coins", () => {
    const base = chainCoins(boardState(0), 4);
    const buffed = chainCoins(boardState(1000), 4); // well past the cap
    expect(hearthlightBoardCoinBonus(1000)).toBe(0.15);
    expect(buffed).toBe(Math.floor(base * 1.15));
    expect(buffed).toBeGreaterThan(base);
  });
});

// ── Sanity: every generator is referenced and the catalog is non-empty ────────

describe("embergarden — generator catalog", () => {
  it("has at least one generator and stable ids", () => {
    expect(GENERATORS.length).toBeGreaterThan(0);
    expect(GENERATORS.map((g) => g.id)).toEqual(["kindling", "kiln", "ashgarden"]);
  });
});

describe("embergarden — view registration", () => {
  it("auto-registers its viewKey in KNOWN_VIEWS (so #/embergarden mounts the screen)", () => {
    expect(viewKey).toBe("embergarden");
    // Auto-collected by router.ts's import.meta.glob over feature index modules;
    // proves a deep link to #/embergarden routes to the screen, not the town fallback.
    expect(KNOWN_VIEWS.has("embergarden")).toBe(true);
  });
});
