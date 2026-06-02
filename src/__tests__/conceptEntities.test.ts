/**
 * Unit tests for src/balanceManager/wiki/conceptEntities.ts
 *
 * Coverage:
 *  1. Real zone entry lookup
 *  2. Real tile entry lookup
 *  3. Unknown key → null
 *  4. Unknown concept id → null
 */

import { describe, it, expect } from "vitest";
import { getEntity } from "../balanceManager/wiki/conceptEntities.js";
import { ZONES } from "../features/zones/data.js";
import { ITEMS } from "../constants.js";
import { CONCEPTS } from "../balanceManager/wiki/concepts.js";

// ─── Resolve a real zone id from the live map ─────────────────────────────────
const realZoneId = Object.keys(ZONES)[0];

// ─── Resolve a real tile key from the live ITEMS map ─────────────────────────
const tilesConcept = CONCEPTS.find((c) => c.id === "tiles")!;
const firstTileEntry = tilesConcept.getEntries()[0];
const realTileKey = firstTileEntry?.key;

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("getEntity — zones", () => {
  it("returns the zone object for a real zone id", () => {
    expect(realZoneId).toBeDefined();
    const result = getEntity("zones", realZoneId);
    expect(result).not.toBeNull();
    expect(typeof result).toBe("object");
    // Zone objects have an id field that matches the key
    expect((result as Record<string, unknown>).id).toBe(realZoneId);
  });

  it("returns null for an unknown zone key", () => {
    expect(getEntity("zones", "__does_not_exist__")).toBeNull();
  });
});

describe("getEntity — tiles", () => {
  it("returns the item object for a real tile key", () => {
    expect(realTileKey).toBeDefined();
    const result = getEntity("tiles", realTileKey!);
    expect(result).not.toBeNull();
    const item = ITEMS[realTileKey as keyof typeof ITEMS] as Record<string, unknown> | undefined;
    expect(result).toEqual(item);
  });

  it("returns null for an unknown tile key", () => {
    expect(getEntity("tiles", "__no_such_tile__")).toBeNull();
  });
});

describe("getEntity — unknown concept", () => {
  it("returns null for an unrecognised concept id", () => {
    expect(getEntity("__unknown_concept__", "anything")).toBeNull();
  });
});
