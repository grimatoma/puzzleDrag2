/**
 * Typed contract for the main GameScene's Phaser registry — the React ↔ Phaser
 * state bridge for the puzzle board.
 *
 * The registry itself (`scene.registry`, a {@link Phaser.Data.DataManager}) is
 * an untyped string-keyed bag. This module pins down which keys are valid and
 * what value type each one carries, so a typo or shape mismatch on either side
 * of the bridge fails at compile time instead of silently going wrong on the
 * canvas.
 *
 * Two access patterns:
 *   - {@link getRegistry} / {@link setRegistry} — wrap `registry.get` /
 *     `registry.set` with key-driven value typing.
 *   - {@link onRegistryChange} — wrap `registry.events.on("changedata-…")`
 *     handlers with typed `value` / `previousValue` parameters.
 *
 * Note: this contract covers only the main GameScene registry keys. The
 * cartography MapScene and season-strip scene use disjoint namespaces
 * (`carto.*`, `hwv.*`) and are intentionally not included here.
 */

import type Phaser from "phaser";
import type { BossState, Grid } from "./state.js";
import type { Inventory } from "./inventory.js";
import type { ToolPower } from "../state/toolPowerRuntime.js";

/** Fire hazard payload as written by `state.ts` and consumed by `fillBoard`. */
export interface FireHazardPayload {
  cells: Array<{ row: number; col: number }>;
}

/** GameScene's view of a single registry-grid cell. Tile (state) is structurally compatible. */
export interface RegistryGridCell {
  key: string;
  /** Frozen / rubble are tagged from hazard ticks; readers treat them as flags. */
  frozen?: unknown;
  rubble?: unknown;
}

export type RegistryGrid = (RegistryGridCell | null)[][];

/**
 * Map from registry key → value type. Every key the main GameScene reads or
 * writes is listed here exactly once. Adding a new bridge field starts with a
 * new entry on this map.
 */
export interface GameRegistryContract {
  // Layout / device — set once at preBoot and on resize.
  dpr: number;
  renderResolution: number;
  bakeScale: number;

  // Game lifecycle — set by React, consumed by the scene.
  biomeKey: string;
  biomeRestored: boolean;
  turnsUsed: number;
  turnBudget: number | null;
  uiLocked: boolean;
  hapticsOn: boolean;
  activeZone: string;

  // Board state mirror — `grid` is the live snapshot; `boardRestoreGrid` is
  // the one-shot save-load handoff read once at `create()` time.
  grid: Grid | null;
  boardRestoreGrid: Grid | null;
  inventory: Inventory;
  inventoryCap: number;

  // Slice fragments the scene reads to compute aggregated effects.
  built: Record<string, Record<string, unknown>> | null;
  workers: { hired: Record<string, number>; [k: string]: unknown } | null;
  fillBiasTarget: { key?: string | null; [k: string]: unknown } | null;
  magicFertilizerCharges: number;

  // Tile collection (player's active tile choices per category).
  tileCollectionActive: Record<string, string | null> | null;
  tileCollectionDiscovered: Record<string, boolean> | null;
  sessionSelectedTiles: readonly string[];

  // Boss state (drives minimum-chain and spawn bias).
  boss: BossState | null;

  // Currently-armed tool (set by React when the player taps a tool slot).
  toolPending: string | null;
  toolPendingPower: ToolPower | null;

  // Hazards — pushed by the reducer, atmospherics computed in the scene.
  hazardFire: FireHazardPayload | null;
  hazardRats: unknown[] | null;

  // Scene → React outputs: computed by `_syncWorkerEffects` and read back by
  // the reducer + UI to derive thresholds and bonuses.
  effectiveThresholds: Record<string, number>;
  effectivePoolWeights: Record<string, number>;
  bonusYields: Record<string, number> | undefined;
  seasonBonus: Record<string, number> | undefined;
}

export type GameRegistryKey = keyof GameRegistryContract;

/**
 * Typed `registry.get`. Returns `undefined` when the key has never been set,
 * or when the registry itself is null/undefined (which happens in React
 * effects that run before Phaser has booted).
 */
export function getRegistry<K extends GameRegistryKey>(
  registry: Phaser.Data.DataManager | null | undefined,
  key: K,
): GameRegistryContract[K] | undefined {
  return registry?.get(key) as GameRegistryContract[K] | undefined;
}

/**
 * Typed `registry.set`. A null/undefined registry is a no-op, matching the
 * `?.` ergonomics of React effects firing before Phaser has booted.
 */
export function setRegistry<K extends GameRegistryKey>(
  registry: Phaser.Data.DataManager | null | undefined,
  key: K,
  value: GameRegistryContract[K],
): void {
  registry?.set(key, value);
}

/** Handler signature for `changedata-<key>` events from a typed registry key. */
export type RegistryChangeHandler<K extends GameRegistryKey> = (
  parent: Phaser.Data.DataManager,
  value: GameRegistryContract[K] | undefined,
  previousValue: GameRegistryContract[K] | undefined,
) => void;
