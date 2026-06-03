// @vitest-environment node
/**
 * conceptAccent.test.ts — Unit tests for the Phase 3 per-concept accent helper.
 *
 * Verifies:
 *  1. Representative concepts from each section return different (section-colored)
 *     accents, not the default ember.
 *  2. boardKind concepts (farm/mine/fish) return biome-derived colors that
 *     differ from one another (config-synced).
 *  3. An unknown concept id returns the ember fallback.
 *  4. entityAccent() returns biome-derived color for boardKinds entity keys.
 *  5. All accents are valid CSS color strings (start with # or rgb…).
 */

import { describe, it, expect } from "vitest";
import { conceptAccent, entityAccent, ACCENT_EMBER } from "./conceptAccent.js";

// ─── Helper ────────────────────────────────────────────────────────────────────

function isCssColor(s: string): boolean {
  return s.startsWith("#") || s.startsWith("rgb") || s.startsWith("hsl");
}

// ─── 1. Section accents differ from ember and from each other ─────────────────

describe("conceptAccent — section representative concepts", () => {
  it("tiles (board section) returns a valid color, not ember", () => {
    const accent = conceptAccent("tiles");
    expect(isCssColor(accent)).toBe(true);
    expect(accent).not.toBe(ACCENT_EMBER);
  });

  it("resources (economy section) returns a valid color, not ember", () => {
    const accent = conceptAccent("resources");
    expect(isCssColor(accent)).toBe(true);
    expect(accent).not.toBe(ACCENT_EMBER);
  });

  it("npcs (world section) returns a valid color, not ember", () => {
    const accent = conceptAccent("npcs");
    expect(isCssColor(accent)).toBe(true);
    expect(accent).not.toBe(ACCENT_EMBER);
  });

  it("boons (progression section) returns a valid color, not ember", () => {
    const accent = conceptAccent("boons");
    expect(isCssColor(accent)).toBe(true);
    expect(accent).not.toBe(ACCENT_EMBER);
  });

  it("views (screens section) returns a valid color, not ember", () => {
    const accent = conceptAccent("views");
    expect(isCssColor(accent)).toBe(true);
    expect(accent).not.toBe(ACCENT_EMBER);
  });

  it("all five section accents are distinct from each other", () => {
    const accents = [
      conceptAccent("tiles"),      // board
      conceptAccent("resources"),  // economy
      conceptAccent("npcs"),       // world
      conceptAccent("boons"),      // progression
      conceptAccent("views"),      // screens
    ];
    const unique = new Set(accents);
    expect(unique.size).toBe(5);
  });
});

// ─── 2. boardKinds → biome-derived accents ────────────────────────────────────

describe("conceptAccent — biome-tied boardKind concepts", () => {
  it("farm returns a valid color derived from the farm biome config", () => {
    const accent = conceptAccent("farm");
    expect(isCssColor(accent)).toBe(true);
    expect(accent).not.toBe(ACCENT_EMBER);
  });

  it("mine returns a valid color derived from the mine biome config", () => {
    const accent = conceptAccent("mine");
    expect(isCssColor(accent)).toBe(true);
    expect(accent).not.toBe(ACCENT_EMBER);
  });

  it("fish returns a valid color derived from the fish biome config", () => {
    const accent = conceptAccent("fish");
    expect(isCssColor(accent)).toBe(true);
    expect(accent).not.toBe(ACCENT_EMBER);
  });

  it("farm / mine / fish biome accents are all distinct", () => {
    const unique = new Set([
      conceptAccent("farm"),
      conceptAccent("mine"),
      conceptAccent("fish"),
    ]);
    expect(unique.size).toBe(3);
  });
});

// ─── 3. Unknown concept → ember fallback ─────────────────────────────────────

describe("conceptAccent — unknown concept id", () => {
  it("returns the ember fallback for a completely unknown concept id", () => {
    expect(conceptAccent("totally_unknown_concept_xyz")).toBe(ACCENT_EMBER);
  });

  it("returns the ember fallback for an empty string", () => {
    expect(conceptAccent("")).toBe(ACCENT_EMBER);
  });
});

// ─── 4. entityAccent for boardKinds ──────────────────────────────────────────

describe("entityAccent — boardKinds entity keys", () => {
  it("entityAccent('boardKinds', 'farm') returns the farm biome color", () => {
    const accent = entityAccent("boardKinds", "farm");
    expect(isCssColor(accent)).toBe(true);
    expect(accent).toBe(conceptAccent("farm"));
  });

  it("entityAccent('boardKinds', 'mine') returns the mine biome color", () => {
    expect(entityAccent("boardKinds", "mine")).toBe(conceptAccent("mine"));
  });

  it("entityAccent('boardKinds', 'fish') returns the fish biome color", () => {
    expect(entityAccent("boardKinds", "fish")).toBe(conceptAccent("fish"));
  });

  it("entityAccent for non-boardKinds concept falls back to conceptAccent", () => {
    expect(entityAccent("resources", "bread")).toBe(conceptAccent("resources"));
    expect(entityAccent("npcs", "edda")).toBe(conceptAccent("npcs"));
  });
});

// ─── 5. All returned values are valid CSS colors ─────────────────────────────

describe("conceptAccent — valid CSS color strings", () => {
  const SAMPLE_CONCEPTS = [
    "tiles", "boardKinds", "zones", "seasons",
    "resources", "recipes", "buildings", "tools",
    "npcs", "workers", "bosses", "hazards", "abilities",
    "boons", "dailyRewards", "achievements",
    "views", "modals",
  ];

  for (const id of SAMPLE_CONCEPTS) {
    it(`conceptAccent("${id}") returns a CSS color string`, () => {
      expect(isCssColor(conceptAccent(id))).toBe(true);
    });
  }
});
