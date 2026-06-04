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
import { factIdsIn } from "./conditions.js";

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
      // `{fact}` uses the "truthy" op, which matches the oracle's `!!flags[flag]`.
      // This is safe only because `flags` is Record<string, boolean>: a 0 or ""
      // value in the flag store would diverge from the oracle's !! cast.
      return { fact: `flag.${flag}` };
    }

    case "flag_cleared": {
      const flag = t.flag as string;
      // Intentionally drops the oracle's `!!t.flag` guard (the trigger name being
      // non-empty). Every authored flag_cleared trigger names a non-empty flag, so
      // this is always safe; the guard would only matter for a malformed trigger.
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

    case "bond_at_least": {
      const npc    = t.npc    as string;
      const amount = t.amount as number;
      // Faithful to the legacy bond_at_least semantics (which fired only at a
      // settle moment once the bond threshold held): gate the bond predicate on
      // a session_start/ended event. This is the single source of truth for the
      // bond→Cond mapping — the canonical mira_letter_1 beat and any override
      // both resolve to this exact composite.
      return {
        all: [
          { fact: `npc.${npc}.bond`, op: "gte", value: amount },
          { any: [
            { fact: "event.type", op: "eq", value: "session_start" },
            { fact: "event.type", op: "eq", value: "session_ended" },
          ]},
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
 * Build a flat FactSnapshot from the four sources the oracle reads.
 *
 * Defaults chosen to reproduce the oracle semantics exactly:
 * - `event.count` defaults to 1 (oracle: `(event.count ?? 1)`)
 * - `bonds` is optional (3-arg callers keep working unchanged); each entry
 *   adds a `npc.<id>.bond` fact with that numeric value.
 */
export function buildFactSnapshot(
  event: Record<string, unknown> | null | undefined,
  totals: Record<string, number> = {},
  flags: Record<string, boolean> = {},
  bonds: Record<string, number> = {},
): FactSnapshot {
  const snap: FactSnapshot = {};

  for (const [k, v] of Object.entries(totals)) {
    snap[`resource.${k}.total`] = v;
  }

  for (const [k, v] of Object.entries(flags)) {
    snap[`flag.${k}`] = v;
  }

  for (const [k, v] of Object.entries(bonds)) {
    snap[`npc.${k}.bond`] = v;
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

/**
 * True iff the condition references at least one fact, and every referenced
 * fact id starts with "flag." (i.e. the cond is purely about story flags and
 * nothing else).
 */
export function isFlagOnlyCond(cond: Cond): boolean {
  const ids = factIdsIn(cond);
  return ids.length > 0 && ids.every((id) => id.startsWith("flag."));
}

/**
 * True iff NO referenced fact id starts with "event." — i.e. the condition
 * is a pure state predicate (resource totals, flags, bonds, …) that can be
 * re-evaluated on any game tick without needing a specific event in scope.
 */
export function isStateCond(cond: Cond): boolean {
  return factIdsIn(cond).every((id) => !id.startsWith("event."));
}

// ─── condToTrigger helpers ────────────────────────────────────────────────────

/**
 * Attempt to match a single leaf `{ fact, op?, value? }` from an `all` array
 * and return its value, or undefined if not found.
 */
function findLeafValue(
  leaves: Extract<Cond, { all: Cond[] }>["all"],
  fact: string,
  op?: string,
): unknown {
  for (const c of leaves) {
    if ("fact" in c && c.fact === fact) {
      if (op === undefined || c.op === op) return c.value;
    }
  }
  return undefined;
}

/**
 * The inverse of `beatTriggerToCond` — reconstructs a typed `BeatTrigger`
 * from a Cond produced by `beatTriggerToCond`.
 *
 * Returns `null` for any Cond shape that:
 *  - was produced by the `default:` / sentinel path (`{ fact: "__never__" }`), or
 *  - is a composite/hand-authored Cond that doesn't correspond to any single
 *    trigger type.
 */
export function condToTrigger(cond: Cond): BeatTrigger | null {
  // ── Leaf cases ────────────────────────────────────────────────────────────
  if ("fact" in cond) {
    const { fact, op, value } = cond as { fact: string; op?: string; value?: unknown };

    // Sentinel / unknown-trigger passthrough
    if (fact === "__never__") return null;

    // resource_total: { fact: "resource.<key>.total", op: "gte", value: <n> }
    const resMatch = /^resource\.(.+)\.total$/.exec(fact);
    if (resMatch && op === "gte") {
      return { type: "resource_total", key: resMatch[1], amount: value as number };
    }

    // flag_set: { fact: "flag.<id>" }  (op defaults to "truthy")
    const flagMatch = /^flag\.(.+)$/.exec(fact);
    if (flagMatch && (op === undefined || op === "truthy")) {
      return { type: "flag_set", flag: flagMatch[1] };
    }

    // session_start / session_ended: { fact: "event.type", op: "eq", value: "<type>" }
    if (fact === "event.type" && op === "eq") {
      if (value === "session_start") return { type: "session_start" };
      if (value === "session_ended") return { type: "session_ended" };
    }

    // Any other bare leaf shape is not invertible
    return null;
  }

  // ── not case ─────────────────────────────────────────────────────────────
  if ("not" in cond) {
    const inner = (cond as { not: Cond }).not;
    // flag_cleared: { not: { fact: "flag.<id>" } }
    if ("fact" in inner) {
      const { fact, op } = inner as { fact: string; op?: string };
      const flagMatch = /^flag\.(.+)$/.exec(fact);
      if (flagMatch && (op === undefined || op === "truthy")) {
        return { type: "flag_cleared", flag: flagMatch[1] };
      }
    }
    return null;
  }

  // ── any case ─────────────────────────────────────────────────────────────
  // beatTriggerToCond never emits `any`; always return null
  if ("any" in cond) return null;

  // ── all case ─────────────────────────────────────────────────────────────
  if ("all" in cond) {
    const leaves = (cond as { all: Cond[] }).all;

    // resource_total_multi: { all: [ { fact: "resource.<k>.total", op:"gte", value:<v> }, ... ] }
    // Distinguishable because every leaf must match the resource.*.total pattern with op gte
    const allResourceLeaves = leaves.every(
      (c) => "fact" in c && /^resource\.[^.]+\.total$/.test((c as { fact: string }).fact) && (c as { op?: string }).op === "gte",
    );
    if (allResourceLeaves) {
      const req: Record<string, number> = {};
      for (const c of leaves) {
        const leaf = c as { fact: string; value: unknown };
        const m = /^resource\.(.+)\.total$/.exec(leaf.fact)!;
        req[m[1]] = leaf.value as number;
      }
      return { type: "resource_total_multi", req };
    }

    // From here on we need an event.type eq leaf to identify the trigger type
    const eventType = findLeafValue(leaves, "event.type", "eq");
    if (typeof eventType !== "string") return null;

    switch (eventType) {
      case "act_entered": {
        const act = findLeafValue(leaves, "event.act", "eq");
        if (act === undefined) return null;
        return { type: "act_entered", act: act as number | string };
      }

      case "craft_made": {
        const item  = findLeafValue(leaves, "event.item",  "eq");
        const count = findLeafValue(leaves, "event.count", "gte");
        if (typeof item !== "string") return null;
        return { type: "craft_made", item, count: count as number };
      }

      case "building_built": {
        const id = findLeafValue(leaves, "event.id", "eq");
        if (typeof id !== "string") return null;
        return { type: "building_built", id };
      }

      case "order_fulfilled": {
        const count = findLeafValue(leaves, "event.count", "gte");
        return { type: "order_fulfilled", count: count as number };
      }

      case "keeper_confronted": {
        const zoneId = findLeafValue(leaves, "event.zoneId", "eq") as string | undefined;
        const path   = findLeafValue(leaves, "event.path",   "eq") as string | undefined;
        return {
          type: "keeper_confronted",
          ...(zoneId !== undefined ? { zoneId } : {}),
          ...(path   !== undefined ? { path   } : {}),
        };
      }

      case "boss_defeated": {
        const id = findLeafValue(leaves, "event.id", "eq");
        if (typeof id !== "string") return null;
        return { type: "boss_defeated", id };
      }

      case "all_buildings_built": {
        return { type: "all_buildings_built" };
      }

      default:
        return null;
    }
  }

  return null;
}
