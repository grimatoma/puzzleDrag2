import { describe, expect, test } from "vitest";
import { migrateSave, MIGRATIONS } from "../state/saveMigrations.js";
import { SAVE_SCHEMA_VERSION } from "../constants.js";
import v45PreBump from "./fixtures/saves/v45-pre-bump.json";
import v46Current from "./fixtures/saves/v46-current.json";

describe("saveMigrations.migrateSave", () => {
  test("identity: a current-version save is returned deep-equal and unchanged", () => {
    const input = { version: SAVE_SCHEMA_VERSION, coins: 200, inventory: { home: { flour: 3 } } };
    const result = migrateSave(input);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.save).toEqual(input);
  });

  test("identity does not mutate a frozen input (purity)", () => {
    const input = Object.freeze({ version: SAVE_SCHEMA_VERSION, coins: 1 });
    expect(() => migrateSave(input as Record<string, unknown>)).not.toThrow();
    const result = migrateSave(input as Record<string, unknown>);
    expect(result.ok).toBe(true);
  });

  test("rejects a forward (newer-than-current) version, running no migrator", () => {
    const result = migrateSave({ version: SAVE_SCHEMA_VERSION + 100 });
    expect(result).toEqual({ ok: false, reason: "forward-version" });
  });

  test("rejects a version below current with no migrator rung (missing-migrator)", () => {
    // Version 1 will never have a migration rung → fail safe, do not half-migrate.
    const result = migrateSave({ version: 1, coins: 5 });
    expect(result).toEqual({ ok: false, reason: "missing-migrator" });
  });

  test("rejects a save with no numeric version", () => {
    expect(migrateSave({}).ok).toBe(false);
    expect(migrateSave({})).toEqual({ ok: false, reason: "no-version" });
    expect(migrateSave({ version: "45" } as unknown as Record<string, unknown>))
      .toEqual({ ok: false, reason: "no-version" });
  });

  test("each registered migrator advances version by exactly one and is callable", () => {
    for (const [fromStr, migrator] of Object.entries(MIGRATIONS)) {
      const from = Number(fromStr);
      const out = migrator({ version: from });
      expect(out.version).toBe(from + 1);
    }
  });

  test("the ladder is contiguous up to the current version (no forgotten rung)", () => {
    const keys = Object.keys(MIGRATIONS).map(Number);
    if (keys.length === 0) return; // empty ladder is valid (nothing to migrate yet)
    const min = Math.min(...keys);
    for (let v = min; v < SAVE_SCHEMA_VERSION; v++) {
      expect(MIGRATIONS[v], `missing migrator rung for version ${v}`).toBeTypeOf("function");
    }
  });
});

describe("saveMigrations — v45 walks the full ladder to current", () => {
  test("upgrades a real v45 save to current, seeding fiber and preserving progress", () => {
    const result = migrateSave({ ...v45PreBump });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.save.version).toBe(SAVE_SCHEMA_VERSION); // 45 → 46 → 47
    expect(result.save.fiber).toEqual({ unlockedLevel: 1, stars: {}, active: null }); // 45→46 rung
    // 46→47 is a no-op bump (the idle layer was removed) — no embergarden seeded.
    expect(result.save.embergarden).toBeUndefined();
    // Pre-existing progress is untouched.
    expect(result.save.coins).toBe(1234);
    expect(result.save.level).toBe(7);
    expect(result.save.inventory).toEqual({ home: { flour: 5, plank: 12 } });
    expect(result.save.settlements).toEqual({ home: { founded: true, tier: 2 } });
  });

  test("does not mutate the source v45 save (purity)", () => {
    const input = { ...v45PreBump };
    migrateSave(input);
    expect(input.version).toBe(45);
    expect((input as Record<string, unknown>).fiber).toBeUndefined();
  });
});

describe("saveMigrations — 46 → 47 (idle layer removed; no-op bump)", () => {
  test("a v46 save bumps to current, preserving the fiber slice and adding no embergarden", () => {
    const result = migrateSave({ ...v46Current });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.save.version).toBe(SAVE_SCHEMA_VERSION); // bumped 46 → 47
    expect(result.save.embergarden).toBeUndefined(); // idle layer removed
    // The v46-era `fiber` slice (with progress) survives untouched.
    expect(result.save.fiber).toEqual({ unlockedLevel: 2, stars: { L1: 3 }, active: null });
    expect(result.save.coins).toBe(1234);
  });

  test("strips a leftover embergarden field from an idle-layer-era save", () => {
    // A save written by the removed idle-layer build (version 46 with an
    // embergarden field) loads and gets the dead field stripped on the bump.
    const idleEra = { ...v46Current, embergarden: { warmth: 500, hearthlight: 3 } };
    const result = migrateSave(idleEra);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.save.version).toBe(SAVE_SCHEMA_VERSION);
    expect(result.save.embergarden).toBeUndefined();
  });

  test("does not mutate the source v46 save (purity)", () => {
    const input = { ...v46Current };
    migrateSave(input);
    expect(input.version).toBe(46);
  });
});
