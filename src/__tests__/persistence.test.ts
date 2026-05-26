import { expect, test, describe, vi, beforeEach, afterEach } from "vitest";
import { loadSavedState, persistStateNow, clearSave } from "../state/persistence.js";
import { STORAGE_KEYS, SAVE_SCHEMA_VERSION } from "../constants.js";

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

  test("loadSavedState returns null and clears save when version mismatches", () => {
    const oldData = { version: -1, something: "else" };
    localStorage.setItem(SAVE_KEY, JSON.stringify(oldData));
    const state = loadSavedState();
    expect(state).toBeNull();
    expect(localStorage.getItem(SAVE_KEY)).toBeNull();
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining("discarding save: schema version")
    );
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

  test("persistStateNow ignores VOLATILE fields", () => {
    const mockState: any = {
      version: SAVE_SCHEMA_VERSION,
      resources: { wood: 10 },
      modal: "should be ignored",
      view: "should be ignored"
    };
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
});
