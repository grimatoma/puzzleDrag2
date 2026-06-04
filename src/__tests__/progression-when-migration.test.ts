// Migration gate (Phase 2b — native `when:` beats).
//
// Proves that the `trigger:` → `when:` data migration in `src/story.ts` is an
// exact transcription of `beatTriggerToCond` for every standard beat, that the
// `bond_at_least` beats use the hand-written settle-composite, and that no beat
// ENTRY carries a `trigger:` field any more. Also verifies the bond beat's
// firing behaviour through the runtime (settle-gated, threshold-gated).

import { describe, it, expect } from "vitest";
import { STORY_BEATS, SIDE_BEATS, evaluateSideBeats } from "../story.js";
import { beatTriggerToCond } from "../config/progression/storyBridge.js";
import type { BeatTrigger } from "../story.js";

// ─── Fixture: every migrated beat id → its ORIGINAL trigger ──────────────────
// Captured from the pre-migration `STORY_BEATS`/`SIDE_BEATS` data (git HEAD).
// Non-bond beats assert `beat.when` deep-equals `beatTriggerToCond(trigger)`.
const ORIGINAL_TRIGGERS: Record<string, BeatTrigger> = {
  // STORY_BEATS
  act1_arrival: { type: "session_start" },
  act1_first_harvest: { type: "resource_total", key: "tile_grass_grass", amount: 1 },
  act1_light_hearth: { type: "resource_total", key: "tile_grass_grass", amount: 20 },
  act1_first_order: { type: "order_fulfilled", count: 1 },
  act1_build_granary: { type: "building_built", id: "granary" },
  act1_keeper_trial: { type: "keeper_confronted", zoneId: "home" },
  act2_bram_arrives: { type: "act_entered", act: 2 },
  act2_first_hinge: { type: "craft_made", item: "iron_hinge", count: 1 },
  act2_frostmaw: { type: "resource_total", key: "tile_mine_stone", amount: 20 },
  act2_liss_arrives: { type: "resource_total_multi", req: { tile_mine_stone: 20, tile_fruit_blackberry: 10 } },
  act3_mine_found: { type: "act_entered", act: 3 },
  act3_mine_opened: { type: "resource_total_multi", req: { tile_mine_stone: 20, tile_mine_coal: 10 } },
  act3_caravan: { type: "building_built", id: "caravan_post" },
  act3_festival: { type: "all_buildings_built" },
  act3_win: {
    type: "resource_total_multi",
    req: { tile_grass_grass: 50, tile_grain_wheat: 50, flour: 50, tile_fruit_blackberry: 50, tile_tree_oak: 50 },
  },
  // SIDE_BEATS
  tutorial_beat_4: { type: "resource_total", key: "tile_grass_grass", amount: 5 },
};

// `bond_at_least` beats: id → npc/amount → expected composite `when:`.
const BOND_BEATS: Record<string, { npc: string; amount: number }> = {
  mira_letter_1: { npc: "mira", amount: 8 },
};

function bondComposite(npc: string, amount: number) {
  return {
    all: [
      { fact: `npc.${npc}.bond`, op: "gte", value: amount },
      {
        any: [
          { fact: "event.type", op: "eq", value: "session_start" },
          { fact: "event.type", op: "eq", value: "session_ended" },
        ],
      },
    ],
  };
}

const ALL_BEATS = [...STORY_BEATS, ...SIDE_BEATS];
const beatById = (id: string) => ALL_BEATS.find((b) => b.id === id)!;

describe("Phase 2b migration — no beat ENTRY carries a trigger:", () => {
  it("every beat in STORY_BEATS + SIDE_BEATS has `trigger` undefined", () => {
    for (const b of ALL_BEATS) {
      expect(b.trigger, `${b.id} should have no trigger`).toBeUndefined();
    }
  });
});

describe("Phase 2b migration — standard beats: when === beatTriggerToCond(orig)", () => {
  for (const [id, trigger] of Object.entries(ORIGINAL_TRIGGERS)) {
    it(`${id}: when deep-equals beatTriggerToCond(${trigger.type})`, () => {
      const beat = beatById(id);
      expect(beat, `beat ${id} must exist`).toBeTruthy();
      expect(beat.when).toEqual(beatTriggerToCond(trigger));
      expect(beat.trigger).toBeUndefined();
    });
  }
});

describe("Phase 2b migration — bond_at_least beats use the settle-composite", () => {
  for (const [id, { npc, amount }] of Object.entries(BOND_BEATS)) {
    it(`${id}: when is the npc.${npc}.bond ≥ ${amount} ∧ (session_start ∨ session_ended) composite`, () => {
      const beat = beatById(id);
      expect(beat, `beat ${id} must exist`).toBeTruthy();
      expect(beat.when).toEqual(bondComposite(npc, amount));
      expect(beat.trigger).toBeUndefined();
    });
  }
});

// ─── Part C — bond beat firing behaviour through the runtime ─────────────────
describe("Phase 2b migration — bond beat fires only at settle moments above threshold", () => {
  const mk = (bond: number, flags: Record<string, boolean> = {}) => ({
    npcs: { bonds: { mira: bond } },
    story: { flags },
  });

  it("FIRES on session_start when mira bond ≥ 8", () => {
    const r = evaluateSideBeats(mk(8), { type: "session_start" });
    expect(r?.firedBeat?.id).toBe("mira_letter_1");
  });

  it("FIRES on session_ended when mira bond ≥ 8", () => {
    const r = evaluateSideBeats(mk(8), { type: "session_ended" });
    expect(r?.firedBeat?.id).toBe("mira_letter_1");
  });

  it("does NOT fire on a non-settle event even with the bond met", () => {
    expect(evaluateSideBeats(mk(10), { type: "building_built", id: "mill" })).toBeNull();
    expect(evaluateSideBeats(mk(10), { type: "craft_made", item: "bread", count: 1 })).toBeNull();
  });

  it("does NOT fire on a settle event when the bond is below threshold", () => {
    expect(evaluateSideBeats(mk(7.5), { type: "session_start" })).toBeNull();
    expect(evaluateSideBeats(mk(7.5), { type: "session_ended" })).toBeNull();
  });
});
