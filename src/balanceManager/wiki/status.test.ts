/**
 * Tests for src/balanceManager/wiki/status.ts
 *
 * Coverage:
 *  1. statusForConcept returns "WIRED" for normal, fully-implemented concepts.
 *  2. statusForConcept returns the seeded non-WIRED value for known flagged concepts.
 *  3. statusForEntity("hazards", "fire") reflects the FIRE_HAZARD_ENABLED flag.
 *  4. statusForEntity("hazards", "rats") is WIRED (RATS_HAZARD_ENABLED === true).
 *  5. WIKI_STATUS_LEGEND has all 5 keys with non-empty label + description + tone.
 *  6. statusForEntity falls back to the concept status for unknown entity keys.
 */

import { describe, it, expect } from "vitest";
import { FIRE_HAZARD_ENABLED, RATS_HAZARD_ENABLED } from "../../featureFlags.js";
import {
  statusForConcept,
  statusForEntity,
  WIKI_STATUS_LEGEND,
} from "./status.js";
import type { WikiStatus } from "./status.js";

// ─── WIKI_STATUS_LEGEND ───────────────────────────────────────────────────────

describe("WIKI_STATUS_LEGEND", () => {
  const ALL_STATUSES: WikiStatus[] = ["WIRED", "PARTIAL", "STUB", "DOC-ONLY", "PLANNED"];

  it("has all 5 status keys", () => {
    for (const s of ALL_STATUSES) {
      expect(WIKI_STATUS_LEGEND).toHaveProperty(s);
    }
  });

  it("each entry has a non-empty label, description, and tone", () => {
    for (const s of ALL_STATUSES) {
      const meta = WIKI_STATUS_LEGEND[s];
      expect(meta.label.length, `label for ${s} is empty`).toBeGreaterThan(0);
      expect(meta.description.length, `description for ${s} is empty`).toBeGreaterThan(0);
      expect(meta.tone.length, `tone for ${s} is empty`).toBeGreaterThan(0);
    }
  });
});

// ─── statusForConcept ─────────────────────────────────────────────────────────

describe("statusForConcept", () => {
  it("returns WIRED for tiles (fully-implemented concept)", () => {
    expect(statusForConcept("tiles")).toBe("WIRED");
  });

  it("returns WIRED for recipes (fully-implemented concept)", () => {
    expect(statusForConcept("recipes")).toBe("WIRED");
  });

  it("returns WIRED for resources", () => {
    expect(statusForConcept("resources")).toBe("WIRED");
  });

  it("returns WIRED for tools", () => {
    expect(statusForConcept("tools")).toBe("WIRED");
  });

  it("returns WIRED for buildings", () => {
    expect(statusForConcept("buildings")).toBe("WIRED");
  });

  it("returns PARTIAL for bosses (manually triggered only; tab is dormant)", () => {
    expect(statusForConcept("bosses")).toBe("PARTIAL");
  });

  it("returns PARTIAL for settlementBiomes (dormant Dev Panel tab)", () => {
    expect(statusForConcept("settlementBiomes")).toBe("PARTIAL");
  });

  it("returns PARTIAL for hazards (mixed wired/gated entries)", () => {
    expect(statusForConcept("hazards")).toBe("PARTIAL");
  });

  it("returns WIRED for an unknown/novel concept (safe default)", () => {
    expect(statusForConcept("__unknown_concept_xyz__")).toBe("WIRED");
  });
});

// ─── statusForEntity ──────────────────────────────────────────────────────────

describe("statusForEntity — hazards (feature-flag driven overrides)", () => {
  it("fire reflects FIRE_HAZARD_ENABLED flag", () => {
    const expected = FIRE_HAZARD_ENABLED ? "WIRED" : "STUB";
    // FIRE_HAZARD_ENABLED is currently false in src/featureFlags.ts, so fire → STUB
    expect(statusForEntity("hazards", "fire")).toBe(expected);
  });

  it("rats reflects RATS_HAZARD_ENABLED flag", () => {
    const expected = RATS_HAZARD_ENABLED ? "WIRED" : "STUB";
    // RATS_HAZARD_ENABLED is currently true in src/featureFlags.ts, so rats → WIRED
    expect(statusForEntity("hazards", "rats")).toBe(expected);
  });

  it("cave_in is WIRED (mine hazard, no flag)", () => {
    expect(statusForEntity("hazards", "cave_in")).toBe("WIRED");
  });

  it("gas_vent is WIRED (mine hazard, no flag)", () => {
    expect(statusForEntity("hazards", "gas_vent")).toBe("WIRED");
  });

  it("lava is WIRED (mine hazard, no flag)", () => {
    expect(statusForEntity("hazards", "lava")).toBe("WIRED");
  });

  it("mole is WIRED (mine hazard, no flag)", () => {
    expect(statusForEntity("hazards", "mole")).toBe("WIRED");
  });

  it("wolf is WIRED (farm hazard, not behind a flag)", () => {
    expect(statusForEntity("hazards", "wolf")).toBe("WIRED");
  });

  it("falls back to concept status for an unknown hazard entity key", () => {
    // Unknown entity key → should fall back to concept-level PARTIAL
    expect(statusForEntity("hazards", "__unknown_entity__")).toBe("PARTIAL");
  });
});

describe("statusForEntity — normal WIRED concepts", () => {
  it("returns WIRED for a tile entity", () => {
    expect(statusForEntity("tiles", "tile_grass_hay")).toBe("WIRED");
  });

  it("returns WIRED for a recipe entity", () => {
    expect(statusForEntity("recipes", "rec_bread")).toBe("WIRED");
  });

  it("returns WIRED for a building entity", () => {
    expect(statusForEntity("buildings", "bakery")).toBe("WIRED");
  });

  it("returns the concept status when no entity override exists", () => {
    // bosses concept is PARTIAL; an entity with no override inherits it
    expect(statusForEntity("bosses", "frostmaw")).toBe("PARTIAL");
  });
});
