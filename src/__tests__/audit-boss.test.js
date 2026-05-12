// Phase 3a — audit-boss cadence: Frostmaw (and the rotation) reappears on a
// real-day cooldown once the `frostmaw_active` story flag is set, replacing
// the old "every 4th season" climax.
import { describe, it, expect, beforeEach } from "vitest";
import { reduce as bossReduce, initial as bossInitial } from "../features/boss/slice.js";
import { gameReducer, createInitialState } from "../state.js";
import { AUDIT_BOSS_COOLDOWN_DAYS } from "../constants.js";

beforeEach(() => global.localStorage.clear());

const DAY = 24 * 60 * 60 * 1000;

describe("boss slice — audit cooldown state", () => {
  it("ships lastAuditBossAt=0 / auditBossSeq=0 in the initial slice", () => {
    expect(bossInitial.lastAuditBossAt).toBe(0);
    expect(bossInitial.auditBossSeq).toBe(0);
  });

  const base = (over = {}) => ({
    boss: null, bossPending: false, bossMinimized: false, bossesDefeated: 0,
    _bossSeasonCount: 0, _bossResolvedThisSeason: false,
    lastAuditBossAt: 0, auditBossSeq: 0, inventory: {}, modal: null,
    story: { flags: {} },
    ...over,
  });

  it("does nothing when the frostmaw_active flag is unset", () => {
    const s1 = bossReduce(base({ lastAuditBossAt: 1 }), { type: "CLOSE_SEASON" });
    expect(s1.boss).toBeNull();
    expect(s1.lastAuditBossAt).toBe(1); // untouched
  });

  it("arms the clock (no boss) the first season after the flag is set", () => {
    const s1 = bossReduce(base({ story: { flags: { frostmaw_active: true } } }), { type: "CLOSE_SEASON" });
    expect(s1.boss).toBeNull();
    expect(s1.lastAuditBossAt).toBeGreaterThan(0);
  });

  it("does not fire while the cooldown is still running", () => {
    const recent = Date.now() - (AUDIT_BOSS_COOLDOWN_DAYS - 1) * DAY;
    const s1 = bossReduce(base({ story: { flags: { frostmaw_active: true } }, lastAuditBossAt: recent }), { type: "CLOSE_SEASON" });
    expect(s1.boss).toBeNull();
    expect(s1.lastAuditBossAt).toBe(recent); // untouched
  });

  it("fires the next rotation boss once the cooldown has elapsed and bumps the sequence", () => {
    const old = Date.now() - (AUDIT_BOSS_COOLDOWN_DAYS + 1) * DAY;
    const s1 = bossReduce(base({ story: { flags: { frostmaw_active: true } }, lastAuditBossAt: old, auditBossSeq: 0 }), { type: "CLOSE_SEASON" });
    expect(s1.boss?.key).toBe("frostmaw"); // rotation[0]
    expect(s1.modal).toBe("boss");
    expect(s1.auditBossSeq).toBe(1);
    expect(s1.lastAuditBossAt).toBeGreaterThan(old);
  });

  it("does not fire if a boss is already active", () => {
    const old = Date.now() - (AUDIT_BOSS_COOLDOWN_DAYS + 1) * DAY;
    const active = { key: "frostmaw", resource: "wood_log", targetCount: 30, progress: 1, turnsLeft: 5 };
    const s1 = bossReduce(base({ story: { flags: { frostmaw_active: true } }, lastAuditBossAt: old, boss: active }), { type: "CLOSE_SEASON" });
    // turnsLeft decremented (the boss-turn path), but no new boss spawn / clock reset.
    expect(s1.boss.key).toBe("frostmaw");
    expect(s1.boss.turnsLeft).toBe(4);
    expect(s1.lastAuditBossAt).toBe(old);
  });
});

describe("audit boss through the full reducer", () => {
  it("CLOSE_SEASON with frostmaw_active armed + cooldown elapsed spawns the audit boss", () => {
    let s = createInitialState();
    s = {
      ...s,
      story: { ...s.story, flags: { ...s.story.flags, frostmaw_active: true } },
      lastAuditBossAt: Date.now() - (AUDIT_BOSS_COOLDOWN_DAYS + 1) * DAY,
      auditBossSeq: 0,
    };
    s = gameReducer(s, { type: "CLOSE_SEASON" });
    expect(s.boss?.key).toBe("frostmaw");
    expect(s.auditBossSeq).toBe(1);
  });

  it("a fresh game (no frostmaw_active) does not spawn audit bosses across many seasons", () => {
    let s = createInitialState();
    for (let i = 0; i < 12; i++) s = gameReducer(s, { type: "CLOSE_SEASON" });
    expect(s.boss).toBeNull();
  });
});
