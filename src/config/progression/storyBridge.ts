// src/config/progression/storyBridge.ts
// Bridge: translates the existing BeatTrigger vocabulary into Cond trees that
// the Phase-1 evaluate() engine can process, and builds the matching
// FactSnapshot from game-event / totals / flags data.
//
// This is the parity-gated adapter for Task 1–3 of the Phase 2a engine
// migration. The translator table lives in:
//   docs/superpowers/plans/2026-06-03-progression-phase2-engine-migration.md
//
// Import type only from story.ts to avoid a runtime import cycle.
import type { BeatTrigger } from "../../story.js";
import type { Cond, FactSnapshot } from "./types.js";

/**
 * Translate a BeatTrigger (the legacy authoring vocabulary) into a Cond tree
 * that `evaluate()` can process.  The mapping is 1-to-1 with the oracle in
 * conditionMatchesLegacy — this function must reproduce its semantics exactly.
 */
export function beatTriggerToCond(trigger: BeatTrigger): Cond {
  const t = trigger;
  switch (t.type) {
    case "resource_total": {
      const key = t.key as string;
      const amount = t.amount as number;
      return { fact: `resource.${key}.total`, op: "gte", value: amount };
    }

    case "resource_total_multi": {
      const req = (t.req ?? {}) as Record<string, number>;
      return {
        all: Object.entries(req).map(([k, v]) => ({
          fact: `resource.${k}.total`,
          op: "gte" as const,
          value: v,
        })),
      };
    }

    case "flag_set": {
      const flag = t.flag as string;
      return { fact: `flag.${flag}` };
    }

    case "flag_cleared": {
      const flag = t.flag as string;
      return { not: { fact: `flag.${flag}` } };
    }

    case "session_start":
    case "session_ended":
      return { fact: "event.type", op: "eq", value: t.type };

    case "act_entered": {
      const act = t.act as number | string;
      return {
        all: [
          { fact: "event.type", op: "eq", value: "act_entered" },
          { fact: "event.act",  op: "eq", value: act },
        ],
      };
    }

    case "craft_made": {
      const item  = t.item  as string;
      const count = (t.count as number | undefined) ?? 1;
      return {
        all: [
          { fact: "event.type",  op: "eq",  value: "craft_made" },
          { fact: "event.item",  op: "eq",  value: item },
          { fact: "event.count", op: "gte", value: count },
        ],
      };
    }

    case "building_built": {
      const id = t.id as string;
      return {
        all: [
          { fact: "event.type", op: "eq", value: "building_built" },
          { fact: "event.id",   op: "eq", value: id },
        ],
      };
    }

    case "order_fulfilled": {
      const count = (t.count as number | undefined) ?? 1;
      return {
        all: [
          { fact: "event.type",  op: "eq",  value: "order_fulfilled" },
          { fact: "event.count", op: "gte", value: count },
        ],
      };
    }

    case "keeper_confronted": {
      const zoneId = t.zoneId as string | undefined;
      const path   = t.path   as string | undefined;
      return {
        all: [
          { fact: "event.type", op: "eq", value: "keeper_confronted" },
          ...(zoneId ? [{ fact: "event.zoneId", op: "eq" as const, value: zoneId }] : []),
          ...(path   ? [{ fact: "event.path",   op: "eq" as const, value: path   }] : []),
        ],
      };
    }

    case "boss_defeated": {
      const id = t.id as string;
      return {
        all: [
          { fact: "event.type", op: "eq", value: "boss_defeated" },
          { fact: "event.id",   op: "eq", value: id },
        ],
      };
    }

    case "all_buildings_built":
      return {
        all: [
          { fact: "event.type",     op: "eq", value: "all_buildings_built" },
          { fact: "event.allBuilt", op: "eq", value: true },
        ],
      };

    default:
      // Matches the oracle's `default: return false` — always evaluates false.
      return { fact: "__never__" };
  }
}

/**
 * Build a flat FactSnapshot from the three sources the oracle reads.
 *
 * Defaults chosen to reproduce the oracle semantics exactly:
 * - `event.count` defaults to 1 (oracle: `(event.count ?? 1)`)
 */
export function buildFactSnapshot(
  event: Record<string, unknown> | null | undefined,
  totals: Record<string, number> = {},
  flags: Record<string, boolean> = {},
): FactSnapshot {
  const snap: FactSnapshot = {};

  for (const [k, v] of Object.entries(totals)) {
    snap[`resource.${k}.total`] = v;
  }

  for (const [k, v] of Object.entries(flags)) {
    snap[`flag.${k}`] = v;
  }

  if (event && typeof event === "object") {
    for (const [k, v] of Object.entries(event)) {
      snap[`event.${k}`] = v as FactSnapshot[string];
    }
    // Oracle defaults `event.count ?? 1` on the event side.
    snap["event.count"] = (event.count as number | undefined) ?? 1;
  }

  return snap;
}
