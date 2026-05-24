// @ts-check
/**
 * Runtime predicates and assertions for ITEMS entries.
 *
 * Predicates (`isTile`, `isResource`, `isTool`) are pure boolean checks safe
 * to call anywhere.
 *
 * Assertions (`assertTile`, `assertResource`) throw in dev mode
 * (`import.meta.env.DEV`) and warn-once in production, so callers can rely on
 * the type being correct after the assert without paying a throw cost in prod.
 *
 * @see src/types/items.js for the corresponding JSDoc typedefs.
 */

import { ITEMS } from "../constants.js";

// Module-scoped set used to suppress duplicate prod warnings.
// Key format: `${key}:${expectedKind}`
const _warnedPairs = new Set();

// ── Predicates ────────────────────────────────────────────────────────────

/**
 * Returns true when `key` refers to a tile entry in ITEMS.
 * @param {string} key
 * @returns {boolean}
 */
export function isTile(key) {
  return ITEMS[key]?.kind === "tile";
}

/**
 * Returns true when `key` refers to a resource entry in ITEMS.
 * @param {string} key
 * @returns {boolean}
 */
export function isResource(key) {
  return ITEMS[key]?.kind === "resource";
}

/**
 * Returns true when `key` refers to a tool entry in ITEMS.
 * @param {string} key
 * @returns {boolean}
 */
export function isTool(key) {
  return ITEMS[key]?.kind === "tool";
}

// ── Internal helper ───────────────────────────────────────────────────────

/**
 * @param {string} key
 * @param {"tile" | "resource" | "tool"} expected
 * @returns {void}
 */
function _assertKind(key, expected) {
  const entry = ITEMS[key];
  const actual = entry?.kind ?? "(missing)";
  if (actual === expected) return;

  const msg = `Expected ITEMS["${key}"] to have kind="${expected}" but got "${actual}".`;

  if (import.meta.env.DEV) {
    throw new Error(msg);
  }

  // Production: warn once per (key, expectedKind) pair.
  const pair = `${key}:${expected}`;
  if (!_warnedPairs.has(pair)) {
    _warnedPairs.add(pair);
    console.warn(`[guards] ${msg}`);
  }
}

// ── Assertions ────────────────────────────────────────────────────────────

/**
 * Asserts that `key` refers to a tile entry in ITEMS.
 * - Dev: throws `Error` if the assertion fails.
 * - Prod: logs `console.warn` at most once per offending key.
 * @param {string} key
 * @returns {void}
 */
export function assertTile(key) {
  _assertKind(key, "tile");
}

/**
 * Asserts that `key` refers to a resource entry in ITEMS.
 * - Dev: throws `Error` if the assertion fails.
 * - Prod: logs `console.warn` at most once per offending key.
 * @param {string} key
 * @returns {void}
 */
export function assertResource(key) {
  _assertKind(key, "resource");
}

/**
 * Asserts that `key` refers to a tool entry in ITEMS.
 * - Dev: throws `Error` if the assertion fails.
 * - Prod: logs `console.warn` at most once per offending key.
 * @param {string} key
 * @returns {void}
 */
export function assertTool(key) {
  _assertKind(key, "tool");
}
