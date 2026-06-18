import { describe, it, expect, afterEach } from "vitest";
import { migrateSave, MIGRATIONS, type SaveMigrator } from "../state/saveMigrations.js";
import { SAVE_SCHEMA_VERSION } from "../constants.js";

describe("save-migration ladder", () => {
  // Some tests install synthetic rungs into the shared MIGRATIONS object; track
  // them so we always restore the registry to its real shape afterward.
  const installed: number[] = [];
  function installRung(at: number, fn: SaveMigrator) {
    installed.push(at);
    MIGRATIONS[at] = fn;
  }
  afterEach(() => {
    while (installed.length) delete MIGRATIONS[installed.pop()!];
  });

  it("identity: a current-version save is returned deep-equal unchanged", () => {
    const input = { version: SAVE_SCHEMA_VERSION, coins: 150, nested: { a: 1 } };
    const result = migrateSave(input);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.save).toEqual(input);
  });

  it("rejects a forward (newer-than-current) version, running no migrator", () => {
    const result = migrateSave({ version: SAVE_SCHEMA_VERSION + 1 });
    expect(result).toEqual({ ok: false, reason: "forward-version" });
  });

  it("rejects a missing rung (gap) below current", () => {
    // A version far below current with no contiguous ladder of rungs.
    const result = migrateSave({ version: -5 });
    expect(result).toEqual({ ok: false, reason: "missing-migrator" });
  });

  it("rejects a save with no numeric version", () => {
    expect(migrateSave({})).toEqual({ ok: false, reason: "no-version" });
    // A stringified version (very old / hand-edited save) is not a number.
    expect(migrateSave({ version: "45" as unknown as number })).toEqual({ ok: false, reason: "no-version" });
    expect(migrateSave({ version: NaN })).toEqual({ ok: false, reason: "no-version" });
  });

  it("real 45 -> 46 rung defaults embergarden and preserves prior fields", () => {
    const input = { version: 45, coins: 999, inventory: { home: { supplies: 3 } } };
    const result = migrateSave(input);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.save.version).toBe(46);
    expect(result.save.coins).toBe(999);
    expect(result.save.inventory).toEqual({ home: { supplies: 3 } });
    expect(result.save.embergarden).toEqual({
      warmth: 0, lifetimeWarmth: 0, hearthlight: 0, levels: {}, lastTickAt: null,
    });
  });

  it("does not mutate a frozen input (migrators are pure)", () => {
    const input = Object.freeze({ version: 45, coins: 10 });
    expect(() => migrateSave(input)).not.toThrow();
    const result = migrateSave(input);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.save).not.toBe(input);
  });

  it("runs multiple rungs in order up to current", () => {
    // Install synthetic rungs BELOW the real ladder so a low version walks all
    // the way up to SAVE_SCHEMA_VERSION through both synthetic and real rungs.
    const start = 43;
    installRung(43, (s) => ({ ...s, version: 44, steps: [...(s.steps as number[] ?? []), 43] }));
    installRung(44, (s) => ({ ...s, version: 45, steps: [...(s.steps as number[] ?? []), 44] }));
    const result = migrateSave({ version: start, steps: [] });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.save.version).toBe(SAVE_SCHEMA_VERSION);
    // 43,44 synthetic then the real 45->46 rung (which adds embergarden).
    expect(result.save.steps).toEqual([43, 44]);
    expect(result.save.embergarden).toBeTruthy();
  });

  it("a migrator that forgets to bump version still terminates (force-corrected)", () => {
    installRung(40, (s) => ({ ...s })); // returns same version 40 — buggy
    installRung(41, (s) => ({ ...s, version: 42 }));
    installRung(42, (s) => ({ ...s, version: 43 }));
    installRung(43, (s) => ({ ...s, version: 44 }));
    installRung(44, (s) => ({ ...s, version: 45 }));
    const result = migrateSave({ version: 40 });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.save.version).toBe(SAVE_SCHEMA_VERSION);
  });

  it("MIGRATIONS has contiguous rungs up to the current version (no forgotten rung)", () => {
    const keys = Object.keys(MIGRATIONS).map(Number).filter((n) => Number.isFinite(n));
    if (keys.length === 0) return; // empty ladder is valid (nothing shipped above the seed)
    const min = Math.min(...keys);
    for (let v = min; v < SAVE_SCHEMA_VERSION; v++) {
      expect(MIGRATIONS[v]).toBeTypeOf("function");
    }
  });
});
