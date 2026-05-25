import { describe, it, expect } from "vitest";
import {
  assessBoss, assessAllBosses, BOSS_DIFFICULTY_TIERS, BOSS_TIER_LABEL,
} from "../balanceManager/bossBalance.js";

describe("assessBoss", () => {
  it("computes perTurnTarget as amount / windowTurns", () => {
    const r = assessBoss({ target: { amount: 30 }, modifier: { type: "freeze_columns" } });
    expect(r.perTurnTarget).toBe(3);            // 30 / 10
    expect(r.tier.id).toBe("gentle");
  });

  it("bumps a high target into the brutal tier", () => {
    const r = assessBoss({ target: { amount: 200 } });
    expect(r.perTurnTarget).toBe(20);
    expect(r.tier.id).toBe("brutal");
  });

  it("falls into the steady band for 4-6 per turn", () => {
    expect(assessBoss({ target: { amount: 40 } }).tier.id).toBe("steady"); // 4/turn
    expect(assessBoss({ target: { amount: 60 } }).tier.id).toBe("steady"); // 6/turn
  });

  it("falls into the hard band for 7-12 per turn", () => {
    expect(assessBoss({ target: { amount: 70 } }).tier.id).toBe("hard");
    expect(assessBoss({ target: { amount: 120 } }).tier.id).toBe("hard");
  });

  it("falls back gracefully when target/amount is missing", () => {
    const r = assessBoss({});
    expect(r.perTurnTarget).toBe(0);
    expect(r.tier.id).toBe("gentle");
  });

  it("recognises every modifier type listed in the catalog", () => {
    const types = ["freeze_columns", "respawn_boost", "heat_tiles", "rubble_blocks", "hide_resources", "min_chain"];
    for (const t of types) {
      const r = assessBoss({ target: { amount: 20 }, modifier: { type: t } });
      expect(r.modifier.label).not.toBe(t);    // human-readable label, not raw id
      expect(typeof r.modifier.hint).toBe("string");
    }
  });

  it("computes marginBands rounded up to integers", () => {
    const r = assessBoss({ target: { amount: 30 } });
    expect(r.marginBands.defeat).toBe(30);
    expect(r.marginBands.bonusMargin50).toBe(45);   // 30 × 1.5
    expect(r.marginBands.bonusMargin100).toBe(60);  // 30 × 2
  });

  it("honours a custom windowTurns option", () => {
    const r = assessBoss({ target: { amount: 30 } }, { windowTurns: 5 });
    expect(r.perTurnTarget).toBe(6);
    expect(r.tier.id).toBe("steady");
  });
});

describe("assessAllBosses", () => {
  it("returns one assessment per boss for the live catalog", () => {
    const out = assessAllBosses();
    expect(out.length).toBeGreaterThan(0);
    expect(out.every((a) => a.perTurnTarget >= 0)).toBe(true);
  });

  it("works on a synthetic catalog", () => {
    const out = assessAllBosses({ bosses: [
      { id: "a", target: { amount: 20 } },
      { id: "b", target: { amount: 100 } },
    ]});
    expect(out).toHaveLength(2);
    expect(out[0].perTurnTarget).toBe(2);
    expect(out[1].perTurnTarget).toBe(10);
  });
});

describe("exports", () => {
  it("BOSS_DIFFICULTY_TIERS lists every tier id", () => {
    expect(BOSS_DIFFICULTY_TIERS).toEqual(["gentle", "steady", "hard", "brutal"]);
  });
  it("BOSS_TIER_LABEL provides a human label for every tier", () => {
    expect(BOSS_TIER_LABEL.gentle).toBe("Gentle");
    expect(BOSS_TIER_LABEL.brutal).toBe("Brutal");
  });
});
