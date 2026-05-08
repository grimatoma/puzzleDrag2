/**
 * Phase 7.2 — 5-tier almanac with structural reward at tier 5
 * Tests run RED first; implementation in src/features/almanac/data.js
 */
import { describe, it, expect } from "vitest";
import { XP_PER_LEVEL, ALMANAC_TIERS, awardXp, claimAlmanacTier } from "../features/almanac/data.js";
import { createInitialState } from "../state.js";

function freshState() {
  global.localStorage.clear();
  return createInitialState();
}

// ── 7.2.1 Constants ───────────────────────────────────────────────────────────
describe("7.2 XP_PER_LEVEL", () => {
  it("is locked at 150 per §17", () => {
    expect(XP_PER_LEVEL).toBe(150);
  });
});

describe("7.2 ALMANAC_TIERS", () => {
  it("Phase 7 ships exactly 5 tiers", () => {
    expect(ALMANAC_TIERS.length).toBe(5);
  });

  it("tier 1 = +50 coins at level 1", () => {
    expect(ALMANAC_TIERS[0].tier).toBe(1);
    expect(ALMANAC_TIERS[0].level).toBe(1);
    expect(ALMANAC_TIERS[0].reward.coins).toBe(50);
  });

  it("tier 2 = +1 Seedpack at level 2", () => {
    expect(ALMANAC_TIERS[1].tier).toBe(2);
    expect(ALMANAC_TIERS[1].level).toBe(2);
    expect(ALMANAC_TIERS[1].reward.tools?.basic).toBe(1);
  });

  it("tier 3 = +75 coins + 1 Lockbox at level 3", () => {
    expect(ALMANAC_TIERS[2].tier).toBe(3);
    expect(ALMANAC_TIERS[2].level).toBe(3);
    expect(ALMANAC_TIERS[2].reward.coins).toBe(75);
    expect(ALMANAC_TIERS[2].reward.tools?.rare).toBe(1);
  });

  it("tier 4 = +1 Reshuffle Horn at level 4", () => {
    expect(ALMANAC_TIERS[3].tier).toBe(4);
    expect(ALMANAC_TIERS[3].level).toBe(4);
    expect(ALMANAC_TIERS[3].reward.tools?.shuffle).toBe(1);
  });

  it("tier 5 = structural startingExtraScythe at level 5", () => {
    expect(ALMANAC_TIERS[4].tier).toBe(5);
    expect(ALMANAC_TIERS[4].level).toBe(5);
    expect(ALMANAC_TIERS[4].reward.structural).toBe("startingExtraScythe");
  });
});

// ── 7.2.2 Fresh state almanac ─────────────────────────────────────────────────
describe("7.2 initialState almanac", () => {
  it("fresh state xp = 0", () => {
    const s = freshState();
    expect(s.almanac.xp).toBe(0);
  });

  it("fresh state level = 1", () => {
    const s = freshState();
    expect(s.almanac.level).toBe(1);
  });

  it("all tiers unclaimed on fresh state", () => {
    const s = freshState();
    expect(s.almanac.claimed[1]).toBe(false);
    expect(s.almanac.claimed[2]).toBe(false);
    expect(s.almanac.claimed[3]).toBe(false);
    expect(s.almanac.claimed[4]).toBe(false);
    expect(s.almanac.claimed[5]).toBe(false);
  });
});

// ── 7.2.3 awardXp ─────────────────────────────────────────────────────────────
describe("7.2 awardXp", () => {
  it("awards 1 XP and stays at level 1", () => {
    const s = freshState();
    const r = awardXp(s, 1);
    expect(r.newState.almanac.xp).toBe(1);
    expect(r.newState.almanac.level).toBe(1);
    expect(r.leveledTo).toBe(null);
  });

  it("crossing 150 XP flips level 1 → 2", () => {
    const s = freshState();
    const r = awardXp(s, 150);
    expect(r.newState.almanac.xp).toBe(150);
    expect(r.newState.almanac.level).toBe(2);
    expect(r.leveledTo).toBe(2);
  });

  it("300 XP → level 3 (linear curve)", () => {
    const s = freshState();
    const r = awardXp(s, 300);
    expect(r.newState.almanac.level).toBe(3);
  });

  it("149 XP stays at level 1", () => {
    const s = freshState();
    const r = awardXp(s, 149);
    expect(r.newState.almanac.level).toBe(1);
    expect(r.leveledTo).toBe(null);
  });

  it("is pure — original state unchanged", () => {
    const s = freshState();
    awardXp(s, 200);
    expect(s.almanac.xp).toBe(0);
  });

  it("accumulates XP over multiple calls", () => {
    const s = freshState();
    const r1 = awardXp(s, 100);
    const r2 = awardXp(r1.newState, 100);
    expect(r2.newState.almanac.xp).toBe(200);
    expect(r2.newState.almanac.level).toBe(2);
    expect(r2.leveledTo).toBe(2);
  });
});

// ── 7.2.4 claimAlmanacTier ────────────────────────────────────────────────────
describe("7.2 claimAlmanacTier", () => {
  it("tier 1 claim at level 2 pays 50 coins", () => {
    const s = { ...freshState(), almanac: { ...freshState().almanac, level: 2 }, coins: 0 };
    const c = claimAlmanacTier(s, 1);
    expect(c.ok).toBe(true);
    expect(c.newState.coins).toBe(50);
    expect(c.newState.almanac.claimed[1]).toBe(true);
  });

  it("re-claim of tier 1 is a no-op — no double-pay", () => {
    const s0 = { ...freshState(), almanac: { ...freshState().almanac, level: 2 }, coins: 0 };
    const c1 = claimAlmanacTier(s0, 1);
    const c2 = claimAlmanacTier(c1.newState, 1);
    expect(c2.ok).toBe(false);
    expect(c2.newState.coins).toBe(50);
  });

  it("claiming tier above current level is blocked", () => {
    const s = freshState(); // level 1
    const c = claimAlmanacTier(s, 3);
    expect(c.ok).toBe(false);
    expect(c.newState.almanac.claimed[3]).toBe(false);
  });

  it("tier 2 reward adds 1 basic-tile (Seedpack) to tools", () => {
    const s = { ...freshState(), almanac: { ...freshState().almanac, level: 2 },
      tools: { ...freshState().tools, basic: 0 } };
    // First claim tier 1 to not double test
    const c = claimAlmanacTier(s, 2);
    expect(c.ok).toBe(true);
    expect(c.newState.tools.basic).toBe(1);
  });

  it("tier 3 reward adds 75 coins and 1 rare-tile (Lockbox)", () => {
    const s = { ...freshState(), coins: 0,
      almanac: { xp: 450, level: 3,
        claimed: { 1: true, 2: true, 3: false, 4: false, 5: false } },
      tools: { ...freshState().tools, rare: 0 } };
    const c = claimAlmanacTier(s, 3);
    expect(c.ok).toBe(true);
    expect(c.newState.coins).toBe(75);
    expect(c.newState.tools.rare).toBe(1);
  });

  it("tier 4 reward adds 1 Reshuffle Horn (shuffle) tool", () => {
    const s = { ...freshState(), coins: 0,
      almanac: { xp: 600, level: 4,
        claimed: { 1: true, 2: true, 3: true, 4: false, 5: false } },
      tools: { ...freshState().tools, shuffle: 0 } };
    const c = claimAlmanacTier(s, 4);
    expect(c.ok).toBe(true);
    expect(c.newState.tools.shuffle).toBe(1);
  });

  it("tier 5 claim sets startingExtraScythe structural flag", () => {
    const s = {
      ...freshState(),
      almanac: { xp: 750, level: 5,
        claimed: { 1: true, 2: true, 3: true, 4: true, 5: false } },
      tools: { ...freshState().tools, startingExtraScythe: false },
    };
    const c = claimAlmanacTier(s, 5);
    expect(c.ok).toBe(true);
    expect(c.newState.tools.startingExtraScythe).toBe(true);
    expect(c.newState.almanac.claimed[5]).toBe(true);
  });

  it("tier 6 does not exist — returns ok:false", () => {
    const s = freshState();
    const c = claimAlmanacTier(s, 6);
    expect(c.ok).toBe(false);
  });

  it("is pure — original state unchanged", () => {
    const s = { ...freshState(), almanac: { ...freshState().almanac, level: 2 }, coins: 0 };
    claimAlmanacTier(s, 1);
    expect(s.coins).toBe(0);
    expect(s.almanac.claimed[1]).toBe(false);
  });
});

// ── 7.2.5 startingExtraScythe session init bonus ───────────────────────────────
describe("7.2 startingExtraScythe session bonus", () => {
  it("createInitialState with flag=true gives +1 Scythe (clear)", () => {
    global.localStorage.clear();
    const reborn = createInitialState({
      tools: { startingExtraScythe: true },
    });
    // Default fresh state seeds clear=2, structural flag adds +1 → 3.
    expect(reborn.tools.clear).toBe(3);
  });

  it("createInitialState with flag=false gives 0 Scythe bonus", () => {
    global.localStorage.clear();
    const noBonus = createInitialState({
      tools: { startingExtraScythe: false },
    });
    expect(noBonus.tools.clear).toBe(2);
  });

  it("createInitialState without flag gives 0 Scythe bonus", () => {
    global.localStorage.clear();
    const s = createInitialState({ tools: {} });
    expect(s.tools.clear).toBe(2);
  });
});
