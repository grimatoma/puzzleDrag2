// @ts-check
import { describe, expect, it } from "vitest";
import {
  CAPPED_INVENTORY_RESOURCES,
  CAPPED_TILES,
  ITEMS,
} from "../constants.js";
import {
  ALL_ITEM_KEY_VALUES,
  ITEM_ALIAS_VALUES,
  RESOURCE_KEY_VALUES,
} from "../types/catalogKeys.js";
import { isInventoryKey, isItemKey } from "../types/catalogKeys.js";

describe("catalog key invariants", () => {
  it("every enum item key exists in ITEMS (or alias)", () => {
    const live = new Set(Object.keys(ITEMS));
    for (const k of ITEM_ALIAS_VALUES) live.add(k);
    for (const k of ALL_ITEM_KEY_VALUES) {
      expect(live.has(k), `enum key missing from ITEMS: ${k}`).toBe(true);
    }
  });

  it("every ITEMS key is in the enum catalog", () => {
    const catalog = new Set(ALL_ITEM_KEY_VALUES);
    for (const k of Object.keys(ITEMS)) {
      expect(catalog.has(k), `ITEMS key missing from enums: ${k}`).toBe(true);
    }
  });

  it("ALL_ITEM_KEY_VALUES matches ITEMS plus aliases", () => {
    const live = new Set(Object.keys(ITEMS));
    for (const k of ITEM_ALIAS_VALUES) live.add(k);
    expect(new Set(ALL_ITEM_KEY_VALUES)).toEqual(live);
  });

  it("every ITEMS entry has a known kind", () => {
    for (const key of Object.keys(ITEMS)) {
      expect(isItemKey(key)).toBe(true);
      const kind = ITEMS[key]?.kind;
      expect(["tile", "resource", "tool"]).toContain(kind);
    }
  });

  it("capped inventory lists are inventory keys", () => {
    for (const k of [...CAPPED_INVENTORY_RESOURCES, ...CAPPED_TILES]) {
      expect(isInventoryKey(k)).toBe(true);
    }
  });

  it("every resource key is an inventory key", () => {
    for (const k of RESOURCE_KEY_VALUES) {
      expect(isInventoryKey(k)).toBe(true);
    }
  });
});
