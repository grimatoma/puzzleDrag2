/**
 * Runtime predicates and assertions for entries from the items maps.
 *
 * Predicates (`isTile`, `isResource`, `isTool`) are pure boolean checks safe
 * to call anywhere.
 *
 * Assertions (`assertTile`, `assertResource`, `assertTool`) throw in dev mode
 * (`import.meta.env.DEV`) and warn-once in production, so callers can rely on
 * the type being correct after the assert without paying a throw cost in prod.
 *
 * @see ./items.ts for the corresponding type declarations.
 */

import { getItem } from "../constants.js";
import type { TileKey, ResourceKey, ToolKey } from "./items.js";

// Module-scoped set used to suppress duplicate prod warnings.
// Key format: `${key}:${expectedKind}`
const _warnedPairs = new Set<string>();

// ── Predicates ────────────────────────────────────────────────────────────

/**
 * Returns true when `key` refers to a tile entry.
 */
export function isTile(key: string): key is TileKey {
  return getItem(key)?.kind === "tile";
}

/**
 * Returns true when `key` refers to a resource entry.
 */
export function isResource(key: string): key is ResourceKey {
  return getItem(key)?.kind === "resource";
}

/**
 * Returns true when `key` refers to a tool entry.
 */
export function isTool(key: string): key is ToolKey {
  return getItem(key)?.kind === "tool";
}

// ── Internal helper ───────────────────────────────────────────────────────

function _assertKind(key: string, expected: "tile" | "resource" | "tool"): void {
  const entry = getItem(key);
  const actual = entry?.kind ?? "(missing)";
  if (actual === expected) return;

  const msg = `Expected ITEMS["${key}"] to have kind="${expected}" but got "${actual}".`;

  if (import.meta.env.DEV) {
    throw new Error(msg);
  }

  const pair = `${key}:${expected}`;
  if (!_warnedPairs.has(pair)) {
    _warnedPairs.add(pair);
    console.warn(`[guards] ${msg}`);
  }
}

// ── Assertions ────────────────────────────────────────────────────────────

/**
 * Asserts that `key` refers to a tile entry.
 * - Dev: throws `Error` if the assertion fails.
 * - Prod: logs `console.warn` at most once per offending key.
 */
export function assertTile(key: string): asserts key is TileKey {
  _assertKind(key, "tile");
}

/**
 * Asserts that `key` refers to a resource entry.
 * - Dev: throws `Error` if the assertion fails.
 * - Prod: logs `console.warn` at most once per offending key.
 */
export function assertResource(key: string): asserts key is ResourceKey {
  _assertKind(key, "resource");
}

/**
 * Asserts that `key` refers to a tool entry.
 * - Dev: throws `Error` if the assertion fails.
 * - Prod: logs `console.warn` at most once per offending key.
 */
export function assertTool(key: string): asserts key is ToolKey {
  _assertKind(key, "tool");
}
