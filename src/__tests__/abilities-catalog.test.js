// Catalog invariants — every entry in `abilities.js` must be valid for the
// editor + aggregator to operate on, and the aggregator's switch must
// handle every `id`. These tests fail early if a new ability is added
// without a runtime case (or vice versa).

import { describe, it, expect } from "vitest";
import {
  ABILITIES, ABILITY_SCOPES, abilitiesForScope, getAbility, defaultParamsFor,
} from "../config/abilities.js";
import { aggregateAbilities, applyAbilityToChannels, emptyChannels } from "../config/abilitiesAggregate.js";

const KNOWN_TRIGGERS = new Set([
  "passive", "on_chain_collect", "on_chain_commit",
  "season_end", "session_end", "on_board_fill",
]);

const KNOWN_PARAM_TYPES = new Set([
  "int", "float", "resourceKey", "category", "recipe", "tool", "biome", "hazard",
]);

describe("abilities catalog", () => {
  it("every ability has the required fields", () => {
    for (const a of ABILITIES) {
      expect(typeof a.id).toBe("string");
      expect(a.id.length).toBeGreaterThan(0);
      expect(typeof a.name).toBe("string");
      expect(typeof a.desc).toBe("string");
      expect(Array.isArray(a.scope)).toBe(true);
      expect(a.scope.length).toBeGreaterThan(0);
      expect(typeof a.trigger).toBe("string");
      expect(typeof a.channel).toBe("string");
      expect(Array.isArray(a.params)).toBe(true);
    }
  });

  it("every scope value is one of building / worker / tile", () => {
    const allowed = new Set(ABILITY_SCOPES);
    for (const a of ABILITIES) {
      for (const s of a.scope) {
        expect(allowed.has(s), `${a.id} has unknown scope: ${s}`).toBe(true);
      }
    }
  });

  it("every trigger is a known lifecycle moment", () => {
    for (const a of ABILITIES) {
      expect(KNOWN_TRIGGERS.has(a.trigger), `${a.id} has unknown trigger: ${a.trigger}`).toBe(true);
    }
  });

  it("every param.type is renderable by the editor", () => {
    for (const a of ABILITIES) {
      for (const p of a.params) {
        expect(KNOWN_PARAM_TYPES.has(p.type), `${a.id}.${p.key} has unknown type: ${p.type}`).toBe(true);
        expect(typeof p.key).toBe("string");
        expect(typeof p.label).toBe("string");
      }
    }
  });

  it("ids are unique", () => {
    const ids = ABILITIES.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("getAbility returns the same entry as the array exposes", () => {
    for (const a of ABILITIES) {
      expect(getAbility(a.id)).toBe(a);
    }
  });

  it("getAbility returns null for unknown ids", () => {
    expect(getAbility("nope")).toBe(null);
  });

  it("defaultParamsFor returns one entry per param key", () => {
    for (const a of ABILITIES) {
      const params = defaultParamsFor(a.id);
      for (const p of a.params) {
        expect(p.key in params, `${a.id} missing default for ${p.key}`).toBe(true);
      }
    }
  });

  it("abilitiesForScope filters correctly", () => {
    for (const scope of ABILITY_SCOPES) {
      const filtered = abilitiesForScope(scope);
      for (const a of filtered) {
        expect(a.scope.includes(scope)).toBe(true);
      }
    }
  });

  it("emptyChannels exposes a channel for every catalog entry", () => {
    const channels = emptyChannels();
    for (const a of ABILITIES) {
      expect(a.channel in channels, `${a.id} contributes to unknown channel: ${a.channel}`).toBe(true);
    }
  });

  it("aggregator handles every ability id (round-trip with full weight)", () => {
    // Apply each ability with weight 1 + sensible default params; assert no throw.
    for (const a of ABILITIES) {
      const out = emptyChannels();
      const params = defaultParamsFor(a.id);
      // Plug in non-empty values for the editor placeholders so the runtime
      // actually writes to its channel.
      if (a.id === "threshold_reduce" || a.id === "pool_weight" || a.id === "pool_weight_legacy" || a.id === "bonus_yield") {
        params.target = "grass_hay";
      }
      if (a.id === "season_bonus") params.resource = "coins";
      if (a.id === "threshold_reduce_category") params.category = "grass";
      if (a.id === "chain_redirect_category") {
        params.fromCategory = "grain";
        params.toCategory = "vegetables";
      }
      if (a.id === "recipe_input_reduce") {
        params.recipe = "bread";
        params.input = "grain_flour";
      }
      if (a.id === "hazard_spawn_reduce") params.hazard = "rats";
      if (a.id === "hazard_coin_multiplier") params.hazard = "rats";
      if (a.id === "grant_tool") params.tool = "bomb";
      if (a.id === "preserve_board") params.biome = "farm";
      expect(() => applyAbilityToChannels(out, a, params, 1)).not.toThrow();
    }
  });
});

describe("aggregateAbilities — empty / no-op cases", () => {
  it("returns an empty channel object when sources is empty", () => {
    const out = aggregateAbilities([]);
    expect(out.thresholdReduce).toEqual({});
    expect(out.seasonEndTools).toEqual({});
    expect(out.boardPreserveBiomes.size).toBe(0);
  });

  it("ignores sources with weight 0", () => {
    const out = aggregateAbilities([
      { abilities: [{ id: "free_moves", params: { count: 5 } }], weight: 0 },
    ]);
    expect(out.freeMoves).toBe(0);
  });

  it("ignores unknown ability ids", () => {
    const out = aggregateAbilities([
      { abilities: [{ id: "nonsense", params: {} }], weight: 1 },
    ]);
    expect(out.thresholdReduce).toEqual({});
  });
});
