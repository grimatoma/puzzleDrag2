// src/config/progression/types.ts
// Pure, framework-free schema types for the configurable-trigger engine.
// No imports from the reducer — Phase 1 is decoupled from GameState.

import type { WikiStatus } from "../../balanceManager/wiki/status.js";

export type JsonValue = string | number | boolean | null;

/** A flat snapshot of facts the engine reads. Phase 2 builds this from GameState. */
export type FactSnapshot = Record<string, JsonValue | undefined>;

export type Op = "eq" | "ne" | "gte" | "lte" | "gt" | "lt" | "truthy";

/** A leaf reads one fact and compares. `op` defaults to "truthy" (fact is set/non-false). */
export interface Leaf {
  fact: string;
  op?: Op;
  value?: JsonValue;
}

export type Cond =
  | Leaf
  | { all: Cond[] }
  | { any: Cond[] }
  | { not: Cond };

/** Category of an unlock, for the feed's grouped "➜ Unlocked" rows. */
export type ConsequenceKind =
  | "zone" | "tile" | "resource" | "building"
  | "tool" | "recipe" | "worker" | "effect" | "story" | "hazard" | "system";

/** What a trigger does when it fires. Phase 1 consumes these as DATA (no applier yet). */
export type Effect =
  | { kind: "setFlag"; flag: string | string[] }
  | { kind: "clearFlag"; flag: string | string[] }
  | { kind: "unlockZone"; zone: string }
  | { kind: "unlockBuilding"; building: string }
  | { kind: "discoverTile"; tile: string }
  | { kind: "unlockRecipe"; recipe: string }
  | { kind: "unlockTool"; tool: string }
  | { kind: "unlockWorker"; worker: string }
  | { kind: "grant"; resources?: Record<string, number>; coins?: number }
  | { kind: "advanceAct"; to: number }
  | { kind: "spawnNpc"; npc: string }
  | { kind: "spawnBoss"; boss: string }
  | { kind: "bondDelta"; npc: string; amount: number }
  | { kind: "showBeat"; beat: string }
  | { kind: "note"; consequence: ConsequenceKind; label: string };

export interface ProgTrigger {
  id: string;
  label: string;
  /** The configurable logical check. */
  when: Cond;
  effects: Effect[];
  /** Fires once when `when` first holds. Default true (informational in Phase 1). */
  once?: boolean;

  // ── classification the view reads ──
  /** Part of the ordered spine (a full "event" card). */
  milestone?: boolean;
  /** Prior trigger ids — encodes spine order as data. */
  requires?: string[];
  /** Non-linear parallel-track tag. */
  zone?: string;
  /** Reporter-flavour line / future story hook. */
  blurb?: string;
  /** Honest implementation status; PLANNED entries are exempt from ref-resolution. */
  status: WikiStatus;
}
