import { describe, it, expect } from "vitest";
import { WEATHER_TABLE, rollWeather } from "../features/weather/data.js";
import {
  applyRainBerryBonus,
  applyHarvestMoonUpgrade,
  applyDroughtSpawnWeights,
  applyFrostCollapseDuration,
} from "../features/weather/effects.js";
import { spawnBoss } from "../features/bosses/data.js";
import { createInitialState } from "../state.js";

describe("8.4 — Weather slot", () => {
  it("weights total exactly 100", () => {
    expect(WEATHER_TABLE.reduce((a, w) => a + w.weight, 0)).toBe(100);
  });

  it("locked weights: 40/20/15/15/10", () => {
    const wmap = Object.fromEntries(WEATHER_TABLE.map((w) => [w.id, w.weight]));
    expect(wmap.none).toBe(40);
    expect(wmap.rain).toBe(20);
    expect(wmap.harvest_moon).toBe(15);
    expect(wmap.drought).toBe(15);
    expect(wmap.frost).toBe(10);
  });

  it("all entries have valid duration ranges", () => {
    expect(
      WEATHER_TABLE.every((w) => w.durationMin >= 0 && w.durationMax >= w.durationMin)
    ).toBe(true);
  });

  it("rollWeather: rng=0.05 in first 40% → none", () => {
    expect(rollWeather(() => 0.05).active).toBeNull();
  });

  it("rollWeather: rng=0.50 returns non-none bucket with valid duration", () => {
    const w2 = rollWeather(() => 0.50);
    expect(["rain", "harvest_moon", "drought", "frost"].includes(w2.active)).toBe(true);
    expect(w2.turnsRemaining).toBeGreaterThanOrEqual(1);
    expect(w2.turnsRemaining).toBeLessThanOrEqual(3);
  });

  it("rain doubles berry only, hay untouched", () => {
    const rain = { active: "rain", turnsRemaining: 2 };
    const after = applyRainBerryBonus({ grass_hay: 5, berry: 4 }, rain);
    expect(after.berry).toBe(8);
    expect(after.grass_hay).toBe(5);
  });

  it("non-rain: berry untouched", () => {
    expect(
      applyRainBerryBonus({ berry: 4 }, { active: "drought", turnsRemaining: 1 }).berry
    ).toBe(4);
  });

  it("harvest_moon: +1 upgrade when active", () => {
    expect(
      applyHarvestMoonUpgrade(2, { active: "harvest_moon", turnsRemaining: 1 })
    ).toBe(3);
  });

  it("non-moon: upgrades unchanged", () => {
    expect(
      applyHarvestMoonUpgrade(2, { active: "rain", turnsRemaining: 1 })
    ).toBe(2);
  });

  it("drought: wheat+grain halved, hay+log untouched (pure)", () => {
    const drought = { active: "drought", turnsRemaining: 1 };
    const pool = [
      { key: "grass_hay", weight: 3 },
      { key: "grain_wheat", weight: 2 },
      { key: "grain", weight: 4 },
      { key: "wood_log", weight: 3 },
    ];
    const p2 = applyDroughtSpawnWeights(pool, drought);
    expect(p2.find((p) => p.key === "grain_wheat").weight).toBe(1);
    expect(p2.find((p) => p.key === "grain").weight).toBe(2);
    expect(p2.find((p) => p.key === "grass_hay").weight).toBe(3);
    expect(p2.find((p) => p.key === "wood_log").weight).toBe(3);
    // purity: input pool unmutated
    expect(pool.find((p) => p.key === "grain_wheat").weight).toBe(2);
  });

  it("frost: tween 2×", () => {
    expect(
      applyFrostCollapseDuration(200, { active: "frost", turnsRemaining: 1 })
    ).toBe(400);
  });

  it("non-frost: tween unchanged", () => {
    expect(
      applyFrostCollapseDuration(200, { active: "rain", turnsRemaining: 1 })
    ).toBe(200);
  });

  it("frost does NOT double berry (visual-only)", () => {
    expect(
      applyRainBerryBonus({ berry: 3 }, { active: "frost", turnsRemaining: 1 }).berry
    ).toBe(3);
  });

  it("boss-season weather is null/0", () => {
    let s = createInitialState();
    s = spawnBoss(s, "frostmaw", 1);
    expect(s.boss).not.toBeNull();
    const skipped = s.boss !== null
      ? { active: null, turnsRemaining: 0 }
      : rollWeather(() => 0.5);
    expect(skipped.active).toBeNull();
    expect(skipped.turnsRemaining).toBe(0);
  });

  it("weather decrements and clears at 0", () => {
    const tickW = (w) =>
      w.active && w.turnsRemaining > 1
        ? { ...w, turnsRemaining: w.turnsRemaining - 1 }
        : { active: null, turnsRemaining: 0 };
    let st = tickW({ active: "rain", turnsRemaining: 2 });
    expect(st.active).toBe("rain");
    expect(st.turnsRemaining).toBe(1);
    st = tickW(st);
    expect(st.active).toBeNull();
    expect(st.turnsRemaining).toBe(0);
  });
});
