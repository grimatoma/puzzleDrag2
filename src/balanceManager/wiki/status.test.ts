/**
 * Tests for src/balanceManager/wiki/status.ts
 *
 * Coverage:
 *  1. statusForConcept returns "WIRED" for normal, fully-implemented concepts.
 *  2. statusForConcept returns the seeded non-WIRED value for known flagged concepts.
 *  3. statusForEntity for mine hazards (cave_in/gas_vent/lava/mole) → WIRED.
 *  4. WIKI_STATUS_LEGEND has all 5 keys with non-empty label + description + tone.
 *  5. statusForEntity falls back to the concept status for unknown entity keys.
 *  6. Drift-guard: every entity-level override key resolves to a real wiki entity.
 */

import { describe, it, expect } from "vitest";
import {
  statusForConcept,
  statusForEntity,
  WIKI_STATUS_LEGEND,
  ENTITY_STATUS,
} from "./status.js";
import type { WikiStatus } from "./status.js";
import { getEntity } from "./conceptEntities.js";

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

describe("statusForEntity — hazards (mine hazard overrides)", () => {
  it("cave_in is WIRED (mine hazard, fully implemented)", () => {
    expect(statusForEntity("hazards", "cave_in")).toBe("WIRED");
  });

  it("gas_vent is WIRED (mine hazard, fully implemented)", () => {
    expect(statusForEntity("hazards", "gas_vent")).toBe("WIRED");
  });

  it("lava is WIRED (mine hazard, fully implemented)", () => {
    expect(statusForEntity("hazards", "lava")).toBe("WIRED");
  });

  it("mole is WIRED (mine hazard, fully implemented)", () => {
    expect(statusForEntity("hazards", "mole")).toBe("WIRED");
  });

  it("falls back to concept status for an unknown hazard entity key", () => {
    // Unknown entity key → should fall back to concept-level PARTIAL
    expect(statusForEntity("hazards", "__unknown_entity__")).toBe("PARTIAL");
  });
});

// ─── Drift-guard ──────────────────────────────────────────────────────────────
//
// For every concept that has entity-level overrides, every override key must
// resolve to a real wiki entity. This guarantees no override is dead code and
// would have caught the original fire/rats/wolf defect (those are farm hazards
// not surfaced in the wiki's hazardEntries(), so getEntity("hazards","fire")
// returns null).

describe("drift-guard: entity override keys must resolve to real wiki entities", () => {
  // Iterates the REAL ENTITY_STATUS map exported from status.ts so that any new
  // dead override added to the map is caught automatically — no manual list to update.
  for (const [conceptId, overrides] of Object.entries(ENTITY_STATUS)) {
    for (const key of Object.keys(overrides ?? {})) {
      it(`override "${conceptId}:${key}" resolves to a real wiki entity`, () => {
        expect(getEntity(conceptId, key), `getEntity("${conceptId}","${key}") returned null — dead override`).not.toBeNull();
      });
    }
  }
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
