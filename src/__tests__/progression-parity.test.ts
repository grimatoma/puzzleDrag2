// src/__tests__/progression-parity.test.ts
// Parity gate: proves that `evaluate(beatTriggerToCond(t), buildFactSnapshot(event, totals, flags))`
// reproduces `conditionMatchesLegacy` (the original switch in conditionMatches) for every real
// trigger from STORY_BEATS + SIDE_BEATS + STORY_FLAGS, across a matrix of true and false probes.
//
// RULES:
//   - conditionMatchesLegacy is a verbatim copy of the oracle (src/story.ts:441-477).
//     DO NOT edit it.
//   - Any mismatch means storyBridge.ts diverges from the oracle — fix the bridge, not this test.

import { describe, it, expect } from "vitest";
import { evaluate } from "../config/progression/conditions.js";
import { beatTriggerToCond, buildFactSnapshot } from "../config/progression/storyBridge.js";
import { STORY_BEATS, SIDE_BEATS } from "../story.js";
import { STORY_FLAGS } from "../flags.js";

// ─── Oracle (verbatim copy — DO NOT EDIT) ────────────────────────────────────

/* eslint-disable @typescript-eslint/no-explicit-any */
function conditionMatchesLegacy(t: any, event: any, totals: any = {}, flags: any = {}): boolean {
  if (!t) return false;
  switch (t.type) {
    case "resource_total":       return (totals[t.key] ?? 0) >= t.amount;
    case "resource_total_multi": return Object.entries(t.req ?? {}).every(([k, v]) => (totals[k as string] ?? 0) >= (v as number));
    case "flag_set":             return !!flags[t.flag];
    case "flag_cleared":         return !!t.flag && !flags[t.flag];
    default: break;
  }
  if (t.type !== event?.type) return false;
  switch (t.type) {
    case "session_start":
    case "session_ended":       return true;
    case "act_entered":         return event.act === t.act;
    case "craft_made":          return event.item === t.item && ((event.count ?? 1) >= (t.count ?? 1));
    case "building_built":      return event.id === t.id;
    case "order_fulfilled":     return (event.count ?? 1) >= (t.count ?? 1);
    case "keeper_confronted":   return (!t.zoneId || event.zoneId === t.zoneId) && (!t.path || event.path === t.path);
    case "boss_defeated":       return event.id === t.id;
    case "all_buildings_built": return event.allBuilt === true;
    default:                    return false;
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// ─── Collect all real triggers ────────────────────────────────────────────────

type TriggerEntry = { beatId: string; trigger: Record<string, unknown> };

const TRIGGERS: TriggerEntry[] = [];

// STORY_BEATS triggers
for (const beat of STORY_BEATS) {
  if (beat.trigger) TRIGGERS.push({ beatId: beat.id, trigger: beat.trigger as Record<string, unknown> });
}

// SIDE_BEATS triggers
for (const beat of SIDE_BEATS) {
  if (beat.trigger) TRIGGERS.push({ beatId: beat.id, trigger: beat.trigger as Record<string, unknown> });
}

// STORY_FLAGS triggers (each flag can have multiple triggers)
for (const flag of STORY_FLAGS) {
  if (flag.triggers && Array.isArray(flag.triggers)) {
    for (const trigger of flag.triggers) {
      TRIGGERS.push({ beatId: `flag:${flag.id}`, trigger: trigger as Record<string, unknown> });
    }
  }
}

// ─── Probe matrix ────────────────────────────────────────────────────────────
// Each probe is labeled true/false to indicate what the ORACLE should return.
// We test BOTH directions for each trigger type.

type Probe = {
  label: string;
  event: Record<string, unknown> | null;
  totals: Record<string, number>;
  flags: Record<string, boolean>;
};

// A cross-type probe to exercise the t.type !== event.type guard
const CROSS_TYPE_EVENT = { type: "craft_made", item: "bread", count: 1 };

function buildProbes(trigger: Record<string, unknown>): Probe[] {
  const type = trigger.type as string;
  const probes: Probe[] = [];

  switch (type) {
    case "resource_total": {
      const key = trigger.key as string;
      const amount = trigger.amount as number;
      probes.push(
        { label: "at-threshold (true)",    event: null, totals: { [key]: amount },        flags: {} },
        { label: "above-threshold (true)", event: null, totals: { [key]: amount + 10 },   flags: {} },
        { label: "below-threshold (false)", event: null, totals: { [key]: amount - 1 },   flags: {} },
        { label: "absent-key (false)",     event: null, totals: {},                        flags: {} },
        { label: "cross-event (false)",    event: CROSS_TYPE_EVENT, totals: { [key]: amount }, flags: {} },
      );
      break;
    }
    case "resource_total_multi": {
      const req = (trigger.req ?? {}) as Record<string, number>;
      const entries = Object.entries(req);
      if (entries.length === 0) {
        // Empty req → oracle returns true (every of empty)
        probes.push({ label: "empty-req (true)", event: null, totals: {}, flags: {} });
      } else {
        const [firstKey, firstVal] = entries[0];
        const fullTotals: Record<string, number> = {};
        for (const [k, v] of entries) fullTotals[k] = v;
        probes.push(
          { label: "all-at-threshold (true)",   event: null, totals: { ...fullTotals },                          flags: {} },
          { label: "all-above-threshold (true)", event: null, totals: Object.fromEntries(entries.map(([k, v]) => [k, v + 5])), flags: {} },
          { label: "first-key-below (false)",   event: null, totals: { ...fullTotals, [firstKey]: firstVal - 1 }, flags: {} },
          { label: "absent-keys (false)",       event: null, totals: {},                                           flags: {} },
        );
      }
      break;
    }
    case "flag_set": {
      const flag = trigger.flag as string;
      probes.push(
        { label: "flag-true (true)",   event: null, totals: {}, flags: { [flag]: true } },
        { label: "flag-false (false)", event: null, totals: {}, flags: { [flag]: false } },
        { label: "flag-absent (false)", event: null, totals: {}, flags: {} },
      );
      break;
    }
    case "flag_cleared": {
      const flag = trigger.flag as string;
      probes.push(
        { label: "flag-false (true)",   event: null, totals: {}, flags: { [flag]: false } },
        { label: "flag-absent (true)",  event: null, totals: {}, flags: {} },
        { label: "flag-true (false)",   event: null, totals: {}, flags: { [flag]: true } },
      );
      break;
    }
    case "session_start":
    case "session_ended": {
      probes.push(
        { label: "matching-event (true)",    event: { type }, totals: {}, flags: {} },
        { label: "wrong-event-type (false)", event: { type: "building_built", id: "x" }, totals: {}, flags: {} },
        { label: "null-event (false)",       event: null, totals: {}, flags: {} },
      );
      break;
    }
    case "act_entered": {
      const act = trigger.act as number | string;
      probes.push(
        { label: "matching-act (true)",      event: { type: "act_entered", act },        totals: {}, flags: {} },
        { label: "wrong-act (false)",        event: { type: "act_entered", act: 99 },    totals: {}, flags: {} },
        { label: "wrong-event-type (false)", event: { type: "session_start" },            totals: {}, flags: {} },
        { label: "null-event (false)",       event: null, totals: {}, flags: {} },
      );
      break;
    }
    case "craft_made": {
      const item = trigger.item as string;
      const count = ((trigger.count as number | undefined) ?? 1);
      probes.push(
        { label: "matching-item-at-count (true)",  event: { type: "craft_made", item, count },        totals: {}, flags: {} },
        { label: "matching-item-above-count (true)",event: { type: "craft_made", item, count: count + 5 }, totals: {}, flags: {} },
        { label: "wrong-item (false)",             event: { type: "craft_made", item: "__wrong__", count }, totals: {}, flags: {} },
        { label: "count-below (false)",            event: { type: "craft_made", item, count: count - 1 > 0 ? count - 1 : 0 }, totals: {}, flags: {} },
        { label: "wrong-event-type (false)",       event: { type: "building_built", id: "x" },         totals: {}, flags: {} },
        { label: "null-event (false)",             event: null, totals: {}, flags: {} },
      );
      break;
    }
    case "building_built": {
      const id = trigger.id as string;
      probes.push(
        { label: "matching-id (true)",       event: { type: "building_built", id },         totals: {}, flags: {} },
        { label: "wrong-id (false)",         event: { type: "building_built", id: "__x__" }, totals: {}, flags: {} },
        { label: "wrong-event-type (false)", event: { type: "session_start" },               totals: {}, flags: {} },
        { label: "null-event (false)",       event: null, totals: {}, flags: {} },
      );
      break;
    }
    case "order_fulfilled": {
      const count = ((trigger.count as number | undefined) ?? 1);
      probes.push(
        { label: "at-count (true)",          event: { type: "order_fulfilled", count },         totals: {}, flags: {} },
        { label: "above-count (true)",       event: { type: "order_fulfilled", count: count + 3 }, totals: {}, flags: {} },
        { label: "below-count (false)",      event: { type: "order_fulfilled", count: count - 1 > 0 ? count - 1 : 0 }, totals: {}, flags: {} },
        { label: "wrong-event-type (false)", event: { type: "building_built", id: "x" },        totals: {}, flags: {} },
        { label: "null-event (false)",       event: null, totals: {}, flags: {} },
      );
      break;
    }
    case "keeper_confronted": {
      const zoneId = trigger.zoneId as string | undefined;
      const path   = trigger.path   as string | undefined;
      // Matching event: provide exactly the right zoneId/path if the trigger requires them
      const matchingEvent: Record<string, unknown> = { type: "keeper_confronted" };
      if (zoneId) matchingEvent["zoneId"] = zoneId;
      if (path)   matchingEvent["path"]   = path;
      probes.push(
        { label: "matching-event (true)",        event: matchingEvent,                                     totals: {}, flags: {} },
        { label: "wrong-event-type (false)",     event: { type: "building_built", id: "x" },              totals: {}, flags: {} },
        { label: "null-event (false)",           event: null,                                              totals: {}, flags: {} },
      );
      if (zoneId) {
        probes.push({ label: "wrong-zoneId (false)", event: { type: "keeper_confronted", zoneId: "__bad__", ...(path ? { path } : {}) }, totals: {}, flags: {} });
      }
      if (path) {
        probes.push({ label: "wrong-path (false)", event: { type: "keeper_confronted", ...(zoneId ? { zoneId } : {}), path: "__bad__" }, totals: {}, flags: {} });
      }
      break;
    }
    case "boss_defeated": {
      const id = trigger.id as string;
      probes.push(
        { label: "matching-id (true)",       event: { type: "boss_defeated", id },         totals: {}, flags: {} },
        { label: "wrong-id (false)",         event: { type: "boss_defeated", id: "__x__" }, totals: {}, flags: {} },
        { label: "wrong-event-type (false)", event: { type: "session_start" },              totals: {}, flags: {} },
        { label: "null-event (false)",       event: null, totals: {}, flags: {} },
      );
      break;
    }
    case "all_buildings_built": {
      probes.push(
        { label: "allBuilt-true (true)",     event: { type: "all_buildings_built", allBuilt: true },  totals: {}, flags: {} },
        { label: "allBuilt-false (false)",   event: { type: "all_buildings_built", allBuilt: false }, totals: {}, flags: {} },
        { label: "allBuilt-absent (false)",  event: { type: "all_buildings_built" },                  totals: {}, flags: {} },
        { label: "wrong-event-type (false)", event: { type: "session_start" },                        totals: {}, flags: {} },
        { label: "null-event (false)",       event: null, totals: {}, flags: {} },
      );
      break;
    }
    default: {
      // Unknown trigger type — oracle returns false, bridge maps to __never__ (also false)
      probes.push(
        { label: "unknown-type-null-event (false)",  event: null, totals: {}, flags: {} },
        { label: "unknown-type-any-event (false)",   event: { type: "session_start" }, totals: {}, flags: {} },
      );
      break;
    }
  }

  return probes;
}

// ─── Run parity ──────────────────────────────────────────────────────────────

describe("Parity: bridge vs oracle — all real triggers", () => {
  if (TRIGGERS.length === 0) {
    it("should find at least one trigger (sanity)", () => {
      expect(TRIGGERS.length).toBeGreaterThan(0);
    });
    return;
  }

  for (const { beatId, trigger } of TRIGGERS) {
    const probes = buildProbes(trigger);

    describe(`[${beatId}] type=${trigger.type}`, () => {
      for (const probe of probes) {
        it(`probe: ${probe.label}`, () => {
          const oracle = conditionMatchesLegacy(trigger, probe.event, probe.totals, probe.flags);
          const bridge = evaluate(
            beatTriggerToCond(trigger as Parameters<typeof beatTriggerToCond>[0]),
            buildFactSnapshot(
              probe.event as Record<string, unknown> | null,
              probe.totals,
              probe.flags,
            ),
          );
          expect(bridge).toBe(oracle);
        });
      }
    });
  }
});

// Extra: cross-type event against a building_built trigger (explicit type-guard check)
describe("Parity: cross-type event guard", () => {
  const bbTrigger = { type: "building_built", id: "granary" };
  const wrongEvents = [
    { label: "craft_made event vs building_built trigger",     event: { type: "craft_made", item: "bread", count: 1 } },
    { label: "order_fulfilled event vs building_built trigger", event: { type: "order_fulfilled", count: 1 } },
    { label: "session_start event vs building_built trigger",  event: { type: "session_start" } },
  ];

  for (const { label, event } of wrongEvents) {
    it(label, () => {
      const oracle = conditionMatchesLegacy(bbTrigger, event, {}, {});
      const bridge = evaluate(
        beatTriggerToCond(bbTrigger as Parameters<typeof beatTriggerToCond>[0]),
        buildFactSnapshot(event, {}, {}),
      );
      expect(bridge).toBe(oracle);
    });
  }
});

// Extra: null trigger short-circuit — oracle: if(!t) return false
describe("Parity: null trigger returns false", () => {
  it("null trigger → false (bridge handles at conditionMatches level, but bridge Cond never sees null)", () => {
    // conditionMatchesLegacy handles null at the top; the bridge is called with non-null by conditionMatches.
    // This test just documents the oracle behavior.
    expect(conditionMatchesLegacy(null, { type: "session_start" }, {}, {})).toBe(false);
  });
});
