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
  test("upgrades a real v45 save to current, seeding embergarden and preserving progress", () => {
    const result = migrateSave({ ...v45PreBump });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.save.version).toBe(SAVE_SCHEMA_VERSION); // 45 → 46 → 47
    // The 45→46 rung is now a pure version bump (the old Fiber Crush slice was removed).
    expect(result.save.fiber).toBeUndefined();
    expect(result.save.embergarden).toEqual({
      warmth: 0, lifetimeWarmth: 0, hearthlight: 0, levels: {}, lastTickAt: null,
    }); // 46→47 rung
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
    expect((input as Record<string, unknown>).embergarden).toBeUndefined();
  });
});

describe("saveMigrations — 46 → 47 (Hearthkeeping / embergarden)", () => {
  test("a v46 save upgrades to current, seeding embergarden and carrying any orphan field harmlessly", () => {
    const result = migrateSave({ ...v46Current });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.save.version).toBe(SAVE_SCHEMA_VERSION); // bumped 46 → 47
    expect(result.save.embergarden).toEqual({
      warmth: 0, lifetimeWarmth: 0, hearthlight: 0, levels: {}, lastTickAt: null,
    });
    // An orphan `fiber` field from the removed minigame (present on real
    // fiber-window saves) is carried through untouched — nothing reads it now.
    expect(result.save.fiber).toEqual({ unlockedLevel: 2, stars: { L1: 3 }, active: null });
    expect(result.save.coins).toBe(1234);
  });

  test("does not mutate the source v46 save (purity)", () => {
    const input = { ...v46Current };
    migrateSave(input);
    expect(input.version).toBe(46);
    expect((input as Record<string, unknown>).embergarden).toBeUndefined();
  });
});
