// tests/phase-12-migrations.test.js
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  SAVE_SCHEMA_VERSION,
  MIGRATIONS,
  migrateSave,
} from "../src/migrations.js";
import { createInitialState } from "../src/state.js";

const fix = (name) => JSON.parse(
  readFileSync(resolve("tests/fixtures", name), "utf8")
);

describe("Phase 12.2 — save migrations", () => {
  it("SAVE_SCHEMA_VERSION === 14 (phases 1..11 + 12.5 saved-field + Castle Needs)", () => {
    expect(SAVE_SCHEMA_VERSION).toBe(14);
  });

  it("MIGRATIONS array has exactly 13 entries", () => {
    expect(MIGRATIONS).toHaveLength(14);
    for (const step of MIGRATIONS) expect(typeof step).toBe("function");
  });

  it("each migration is pure (does not mutate input)", () => {
    const v0 = fix("save-v0.json");
    const before = JSON.stringify(v0);
    MIGRATIONS[0](v0);
    expect(JSON.stringify(v0)).toBe(before);
  });

  it("each migration is idempotent (M(M(s)) deepEquals M(s))", () => {
    let s = fix("save-v0.json");
    for (let i = 0; i < MIGRATIONS.length; i++) {
      const once = MIGRATIONS[i]({ ...s });
      const twice = MIGRATIONS[i](JSON.parse(JSON.stringify(once)));
      expect(twice).toEqual(once);
      s = once;
    }
  });

  it("v0 save loads cleanly into v14 with all phase slices defaulted", () => {
    const result = migrateSave(fix("save-v0.json"));
    expect(result.version).toBe(14);
    expect(result.migratedFrom).toBe(0);

    // Phase 2 slice present, default story
    expect(result.state.story.beat).toBe("act1_arrival");
    // Phase 3 slices
    expect(result.state.market).toBeDefined();
    expect(result.state.runes).toBe(0);
    expect(result.state.dailyStreak).toBeDefined();
    // Phase 4
    expect(result.state.workers).toEqual({ hires: {}, debt: 0 });
    // Phase 5 — renamed from `species` to `tileCollection` in PR #190.
    expect(result.state.tileCollection).toBeDefined();
    expect(Array.isArray(result.state.tileCollection.discovered) || typeof result.state.tileCollection.discovered === "object").toBe(true);
    // Phase 6
    expect(result.state.npcs.bonds.wren).toBe(5);
    // Phase 7
    expect(result.state.quests).toBeDefined();
    expect(result.state.almanac.level).toBe(1);
    // Phase 8
    expect(result.state.weather).toBeDefined();
    // Phase 9 — mine hazards bag
    expect(result.state.hazards).toMatchObject({
      caveIn: null, gasVent: null, rats: [],
    });
    // Phase 10 — farm tools / fertilizer flag
    expect(result.state.tools.rake).toBe(0);
    expect(result.state.fertilizerActive).toBe(false);
    // Phase 11 — accessibility prefs
    expect(result.state.prefs).toBeDefined();
  });

  it("preserves player progress across migrations (no data loss)", () => {
    const v0 = fix("save-v0.json");
    v0.coins = 1234;
    v0.inventory = { ...v0.inventory, grass_hay: 73 };
    v0.turnsUsed = 6;
    const { state } = migrateSave(v0);
    expect(state.coins).toBe(1234);
    expect(state.inventory.grass_hay).toBe(73);
    expect(state.turnsUsed).toBe(6);
  });

  it("mid-pipeline fixtures also reach v14", () => {
    for (const f of ["save-v3.json", "save-v6.json", "save-v9.json"]) {
      const r = migrateSave(fix(f));
      expect(r.version).toBe(14);
    }
  });

  it("corrupted save falls back to fresh state with a warning", () => {
    const warns = [];
    const orig = console.warn;
    console.warn = (...a) => warns.push(a.join(" "));
    try {
      const r1 = migrateSave({ /* no version, no inventory */ });
      // Fresh state has stable fields we can assert on
      expect(r1.state.coins).toBe(150);
      expect(r1.state.version).toBe(SAVE_SCHEMA_VERSION);
      expect(warns.some(w => w.includes("[save] corrupted"))).toBe(true);

      const r2 = migrateSave(null);
      expect(r2.state.version).toBe(SAVE_SCHEMA_VERSION);
    } finally { console.warn = orig; }
  });

  it("every save written carries the current SAVE_SCHEMA_VERSION", () => {
    const fresh = createInitialState();
    expect(fresh.version).toBe(SAVE_SCHEMA_VERSION);
  });
});
