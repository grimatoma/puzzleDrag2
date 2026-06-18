import { expect, test, describe, vi, beforeEach, afterEach } from "vitest";
import { inv } from "../testUtils/inventory.js";
import { loadSavedState, persistStateNow, clearSave } from "../state/persistence.js";
import { initialState } from "../state.js";
import { STORAGE_KEYS, SAVE_SCHEMA_VERSION } from "../constants.js";
import type { GameState } from "../types/state.js";

describe("persistence", () => {
  const SAVE_KEY = STORAGE_KEYS.save;
  let originalGetItem: typeof localStorage.getItem;

  beforeEach(() => {
    localStorage.clear();
    originalGetItem = localStorage.getItem;
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    localStorage.getItem = originalGetItem;
    vi.restoreAllMocks();
  });

  test("loadSavedState returns null when no data is saved", () => {
    expect(loadSavedState()).toBeNull();
  });

  test("loadSavedState returns parsed state for valid data", () => {
    const validData = { version: SAVE_SCHEMA_VERSION, something: "else" };
    localStorage.setItem(SAVE_KEY, JSON.stringify(validData));
    const state = loadSavedState();
    expect(state).toEqual(validData);
  });

  test("loadSavedState returns null and clears save when version has no migration path", () => {
    // version -1 is below current with no migrator rung → discard (new contract).
    const oldData = { version: -1, something: "else" };
    localStorage.setItem(SAVE_KEY, JSON.stringify(oldData));
    const state = loadSavedState();
    expect(state).toBeNull();
    expect(localStorage.getItem(SAVE_KEY)).toBeNull();
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining("cannot migrate version")
    );
  });

  test("loadSavedState UPGRADES a laddered old version instead of wiping it", () => {
    // The headline non-destructive guarantee: a v45 save (one below current)
    // now migrates to current and is NOT removed from storage.
    const v45 = { version: 45, coins: 999, inventory: { home: { flour: 3 } } };
    localStorage.setItem(SAVE_KEY, JSON.stringify(v45));
    const state = loadSavedState();
    expect(state).not.toBeNull();
    expect(state?.version).toBe(SAVE_SCHEMA_VERSION); // bumped to 46
    expect((state as Record<string, unknown>).fiber).toBeTruthy(); // fiber seeded
    expect(state?.coins).toBe(999); // progress preserved
    expect(localStorage.getItem(SAVE_KEY)).not.toBeNull(); // save NOT wiped
  });

  test("loadSavedState returns null when data is not an object", () => {
    localStorage.setItem(SAVE_KEY, JSON.stringify("string instead of object"));
    const state = loadSavedState();
    expect(state).toBeNull();
  });

  test("loadSavedState returns null when data is corrupt (JSON.parse fails)", () => {
    localStorage.setItem(SAVE_KEY, "{ corrupted json");
    const state = loadSavedState();
    expect(state).toBeNull();
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining("[hearth] save data corrupt"),
      expect.any(Error)
    );
  });

  test("loadSavedState returns null when localStorage.getItem throws", () => {
    localStorage.getItem = vi.fn().mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });

    const state = loadSavedState();
    expect(state).toBeNull();
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining("[hearth] save data corrupt"),
      expect.any(Error)
    );
  });

  test("persistStateNow strips unknown inventory keys", () => {
    const mockState = {
      version: SAVE_SCHEMA_VERSION,
      inventory: { home: { flour: 2, totally_fake_resource: 99 } },
    } as GameState;
    persistStateNow(mockState);
    const saved = JSON.parse(localStorage.getItem(SAVE_KEY)!);
    expect(saved.inventory).toEqual({ home: { flour: 2 } });
    expect(inv(saved as GameState).totally_fake_resource).toBeUndefined();
  });

  test("initialState strips unknown inventory keys from saves", () => {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      version: SAVE_SCHEMA_VERSION,
      inventory: { home: { supplies: 1, junk_tile_key: 5 } },
      coins: 200,
    }));
    const state = initialState();
    expect(inv(state).supplies).toBe(1);
    expect(inv(state).junk_tile_key).toBeUndefined();
  });

  test("persistStateNow ignores VOLATILE fields", () => {
    const mockState = {
      version: SAVE_SCHEMA_VERSION,
      resources: { wood: 10 },
      modal: "should be ignored",
      view: "should be ignored",
    } as GameState;
    persistStateNow(mockState);

    const savedRaw = localStorage.getItem(SAVE_KEY);
    expect(savedRaw).toBeTruthy();
    const saved = JSON.parse(savedRaw!);

    expect(saved).toEqual({
      version: SAVE_SCHEMA_VERSION,
      resources: { wood: 10 }
    });
    expect(saved.modal).toBeUndefined();
    expect(saved.view).toBeUndefined();
  });

  test("clearSave removes the save item", () => {
    localStorage.setItem(SAVE_KEY, "something");
    clearSave();
    expect(localStorage.getItem(SAVE_KEY)).toBeNull();
  });

  test("loadSavedState prevents prototype pollution", () => {
    // Malicious payload aiming to pollute the prototype
    const maliciousPayload = `{"__proto__": {"polluted": true}, "constructor": {"prototype": {"polluted": true}}, "version": ${SAVE_SCHEMA_VERSION}}`;
    localStorage.setItem(SAVE_KEY, maliciousPayload);

    const state = loadSavedState();

    // Check that state doesn't have __proto__ property accessible (it shouldn't be added)
    expect(state).toEqual({ version: SAVE_SCHEMA_VERSION });

    // Additionally verify object prototypes are not polluted
    const emptyObj = {} as Record<string, unknown>;
    expect(emptyObj.polluted).toBeUndefined();
    expect((state as Record<string, unknown>).polluted).toBeUndefined();
  });
});
