// factSnapshot.ts — project a live GameState into the flat fact vocabulary the
// progression trigger engine reads (FACT_FAMILIES in facts.ts).
//
// This is the Phase-2 GameState→facts bridge the engine was waiting for: with it,
// a declarative `ProgTrigger.when` (e.g. { fact: "resource.flour.total", op:
// "gte", value: 50 }) can be evaluated against the real game state — which is what
// makes a feature gate DECLARABLE AS DATA instead of hand-wired into a reducer.
//
// PURE and read-only: it derives facts, it never mutates state. The matching
// EFFECT applier (drive unlocks from fired triggers, replacing the scattered
// hardcoded reducer gates) is a separate, behavior-preserving reducer change and
// is intentionally NOT wired here — see the progression Phase-2 notes.
//
// Semantics note: `resource.<k>.total` here is CURRENT held inventory summed
// across zones (a clean v1 reading of "have you got N of X"). A lifetime-collected
// counter is a future refinement if a gate needs "ever collected" rather than
// "currently hold".

import type { GameState } from "../../types/state.js";
import type { FactSnapshot, JsonValue } from "./types.js";

/** Build the fact snapshot for `state` (+ an optional current-tick event). */
export function factsFromGameState(
  state: GameState,
  event?: Record<string, JsonValue> | null,
): FactSnapshot {
  const snap: FactSnapshot = {};

  // resource.<k>.total — current held inventory, summed across every zone.
  for (const zoneInv of Object.values(state.inventory ?? {})) {
    for (const [k, v] of Object.entries((zoneInv ?? {}) as Record<string, number>)) {
      const key = `resource.${k}.total`;
      snap[key] = (Number(snap[key] ?? 0)) + (Number(v) || 0);
    }
  }

  // building.<id>.built — built anywhere (the `_plots` bookkeeping key is skipped).
  for (const built of Object.values(state.built ?? {})) {
    for (const [id, v] of Object.entries((built ?? {}) as Record<string, unknown>)) {
      if (id === "_plots") continue;
      if (v) snap[`building.${id}.built`] = true;
    }
  }

  // zone.<id>.founded — a settlement exists at this zone.
  for (const [zone, s] of Object.entries(state.settlements ?? {})) {
    if ((s as { founded?: boolean } | undefined)?.founded) snap[`zone.${zone}.founded`] = true;
  }

  // craft.<recId>.count — cumulative crafts.
  for (const [k, v] of Object.entries(state.craftedTotals ?? {})) {
    snap[`craft.${k}.count`] = Number(v) || 0;
  }

  // flag.<id> — story flags live under state.story.flags.
  const flags = (state.story as { flags?: Record<string, boolean> } | undefined)?.flags ?? {};
  for (const [k, v] of Object.entries(flags)) snap[`flag.${k}`] = !!v;

  // scalars
  snap["level"] = Number(state.level ?? 0);
  snap["season"] = Number(state.season ?? 0);
  snap["turn"] = Number(state.turnsUsed ?? 0);

  // event.* — the current-tick context (mirrors the oracle's `event.count ?? 1`).
  if (event && typeof event === "object") {
    for (const [k, v] of Object.entries(event)) snap[`event.${k}`] = v;
    snap["event.count"] = (event.count as number | undefined) ?? 1;
  }

  return snap;
}
