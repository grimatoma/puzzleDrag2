import { describe, it, expect, beforeEach } from "vitest";
import { gameReducer, initialState } from "../state.js";
import { dayKeyForDate, DAILY_REWARDS } from "../constants.js";

beforeEach(() => global.localStorage.clear());

describe("3.5 — Daily login streak", () => {
  it("DAILY_REWARDS ladder matches GAME_SPEC §16", () => {
    expect(DAILY_REWARDS[1].coins).toBe(25);
    expect(DAILY_REWARDS[2].coins).toBe(50);
    expect(DAILY_REWARDS[3].tool).toBe("basic");
    expect(DAILY_REWARDS[4].coins).toBe(75);
    expect(DAILY_REWARDS[5].tool).toBe("rare");
    expect(DAILY_REWARDS[7].coins).toBe(150);
    expect(DAILY_REWARDS[7].tool).toBe("shuffle");
    expect(DAILY_REWARDS[14].coins).toBe(300);
    expect(DAILY_REWARDS[14].runes).toBe(1);
    expect(DAILY_REWARDS[30].coins).toBe(1000);
    expect(DAILY_REWARDS[30].runes).toBe(3);
  });

  it("dailyStreak starts at day 0 in initial state", () => {
    const s0 = initialState();
    expect(s0.dailyStreak.currentDay).toBe(0);
    expect(s0.dailyStreak.lastClaimedDate).toBeNull();
  });

  it("LOGIN_TICK: first login → day 1, 25 coins credited", () => {
    const s0 = initialState();
    const today = "2026-01-01";
    const s1 = gameReducer(s0, { type: "LOGIN_TICK", payload: { today } });
    expect(s1.dailyStreak.currentDay).toBe(1);
    expect(s1.dailyStreak.lastClaimedDate).toBe(today);
    expect(s1.coins).toBe(s0.coins + 25);
  });

  it("LOGIN_TICK: same-day re-open is idempotent", () => {
    const s0 = initialState();
    const today = "2026-01-01";
    const s1 = gameReducer(s0, { type: "LOGIN_TICK", payload: { today } });
    const s2 = gameReducer(s1, { type: "LOGIN_TICK", payload: { today } });
    expect(s2.coins).toBe(s1.coins);
    expect(s2.dailyStreak.currentDay).toBe(1);
  });

  it("LOGIN_TICK: consecutive day advances streak", () => {
    const s0 = initialState();
    const s1 = gameReducer(s0, { type: "LOGIN_TICK", payload: { today: "2026-01-01" } });
    const s2 = gameReducer(s1, { type: "LOGIN_TICK", payload: { today: "2026-01-02" } });
    expect(s2.dailyStreak.currentDay).toBe(2);
    expect(s2.coins).toBe(s1.coins + 50); // day 2 = +50
  });

  it("LOGIN_TICK: gap of 2+ days resets to day 1", () => {
    const s0 = initialState();
    const s1 = gameReducer(s0, { type: "LOGIN_TICK", payload: { today: "2026-01-01" } });
    const s4 = gameReducer(s1, { type: "LOGIN_TICK", payload: { today: "2026-01-04" } });
    expect(s4.dailyStreak.currentDay).toBe(1);
  });

  it("LOGIN_TICK: day 30 milestone grants 1000 coins + 3 runes", () => {
    const s0 = initialState();
    const at29 = { ...s0, dailyStreak: { lastClaimedDate: "2026-01-29", currentDay: 29 } };
    const at30 = gameReducer(at29, { type: "LOGIN_TICK", payload: { today: "2026-01-30" } });
    expect(at30.dailyStreak.currentDay).toBe(30);
    expect(at30.coins).toBe(at29.coins + 1000);
    expect(at30.runes).toBe(at29.runes + 3);
  });

  it("LOGIN_TICK: day 7 grants 150 coins + shuffle tool", () => {
    const s0 = initialState();
    const at6 = { ...s0, dailyStreak: { lastClaimedDate: "2026-01-06", currentDay: 6 } };
    const at7 = gameReducer(at6, { type: "LOGIN_TICK", payload: { today: "2026-01-07" } });
    expect(at7.dailyStreak.currentDay).toBe(7);
    expect(at7.coins).toBe(at6.coins + 150);
    expect(at7.tools.shuffle).toBeGreaterThan(at6.tools.shuffle ?? 0);
  });

  it("dayKeyForDate returns local YYYY-MM-DD", () => {
    const d = new Date("2026-05-06T03:30:00");
    expect(dayKeyForDate(d)).toBe("2026-05-06");
  });
});
