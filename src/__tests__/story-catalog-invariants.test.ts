import { describe, expect, it } from "vitest";
import { STORY_FLAGS } from "../flags.js";
import { SIDE_BEATS, STORY_BEATS } from "../story.js";
import {
  STORY_BEAT_ID_VALUES,
  STORY_FLAG_ID_VALUES,
  STORY_FLAG_CATEGORY_ID_VALUES,
  STORY_TRIGGER_TYPE_VALUES,
  TUNING_KEY_VALUES,
} from "../types/catalogKeys.js";

describe("story catalog enums", () => {
  it("every main + side beat id is in StoryBeatId", () => {
    const catalog = new Set(STORY_BEAT_ID_VALUES);
    for (const b of [...STORY_BEATS, ...SIDE_BEATS]) {
      expect(catalog.has(b.id), `beat id missing from StoryBeatId: ${b.id}`).toBe(true);
    }
  });

  it("every StoryBeatId appears in STORY_BEATS or SIDE_BEATS", () => {
    const live = new Set([...STORY_BEATS, ...SIDE_BEATS].map((b) => b.id));
    for (const id of STORY_BEAT_ID_VALUES) {
      expect(live.has(id), `StoryBeatId not in story arrays: ${id}`).toBe(true);
    }
  });

  it("every STORY_FLAGS id is in StoryFlagId", () => {
    const catalog = new Set(STORY_FLAG_ID_VALUES);
    for (const f of STORY_FLAGS) {
      expect(catalog.has(f.id), `flag id missing from StoryFlagId: ${f.id}`).toBe(true);
    }
  });

  it("every StoryFlagId appears in STORY_FLAGS", () => {
    const live = new Set(STORY_FLAGS.map((f) => f.id));
    for (const id of STORY_FLAG_ID_VALUES) {
      expect(live.has(id), `StoryFlagId not in STORY_FLAGS: ${id}`).toBe(true);
    }
  });

  it("story flag categories match FLAG_CATEGORIES keys", () => {
    const allowed = new Set<string>(STORY_FLAG_CATEGORY_ID_VALUES);
    for (const f of STORY_FLAGS) {
      const cat = f.category ?? "misc";
      expect(allowed.has(cat), `unknown category: ${cat}`).toBe(true);
    }
  });

  it("no beat in STORY_BEATS or SIDE_BEATS carries the legacy trigger: field", () => {
    // The runtime evaluates beat.when only; beat.trigger is a dead path.
    // Override/draft writes when: via sanitizeCond + beatTriggerToCond; never trigger:.
    for (const b of [...STORY_BEATS, ...SIDE_BEATS]) {
      expect((b as Record<string, unknown>).trigger, `beat ${b.id} still has trigger:`).toBeUndefined();
    }
  });

  it("StoryTriggerType covers sanitizeTrigger + conditionMatches event types", () => {
    const set = new Set<string>(STORY_TRIGGER_TYPE_VALUES);
    const fromSanitizer = [
      "session_start",
      "session_ended",
      "all_buildings_built",
      "act_entered",
      "resource_total",
      "resource_total_multi",
      "craft_made",
      "building_built",
      "boss_defeated",
      "bond_at_least",
      "flag_set",
      "flag_cleared",
    ];
    for (const t of fromSanitizer) {
      expect(set.has(t), `missing trigger type: ${t}`).toBe(true);
    }
    // Event-only branches in conditionMatches (not accepted by sanitizeTrigger today)
    expect(set.has("order_fulfilled")).toBe(true);
    expect(set.has("keeper_confronted")).toBe(true);
  });

  it("TuningKey matches sanitizeTuning whitelist", () => {
    const set = new Set<string>(TUNING_KEY_VALUES);
    const expected = [
      "craftQueueHours",
      "craftGemSkipCost",
      "minExpeditionTurns",
      "foundingBaseCoins",
      "foundingGrowth",
      "homeBiome",
      "fireHazardEnabled",
    ];
    expect(set.size).toBe(expected.length);
    for (const k of expected) {
      expect(set.has(k), `missing tuning key: ${k}`).toBe(true);
    }
  });
});
