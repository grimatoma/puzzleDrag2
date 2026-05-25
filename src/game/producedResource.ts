/**
 * The pure-function half of the chain HUD pipeline: given a tile, return the
 * resource key the chain produces (per-tile override > family default > null).
 * Lives here (not in GameScene.js) so unit tests can import it without booting
 * Phaser, which requires `window`.
 */

import { tileFamilyResource, TILES_WITH_CUSTOM_OUTPUT, ITEMS, UPGRADE_THRESHOLDS } from "../constants.js";
import { TILE_TYPES_MAP } from "../features/tileCollection/data.js";
import { upgradeCountForChain } from "../utils.js";

/**
 * Returns the resource KEY (string) that chaining `tile` contributes progress
 * toward. Per-tile override > family default. Returns null for tiles in
 * TILES_WITH_CUSTOM_OUTPUT (their custom path handles output).
 *
 * @param {{ key?: string } | null | undefined} tile
 * @returns {string | null}
 */
export function producedResource(tile) {
  if (!tile?.key) return null;
  if (TILES_WITH_CUSTOM_OUTPUT.has(tile.key)) return null;
  const override = TILE_TYPES_MAP[tile.key]?.effects?.producesResource;
  if (override) return override;
  return tileFamilyResource(tile.key) ?? null;
}

/**
 * Pure builder for the SCENE_EVENTS.CHAIN_UPDATE payload. Pulled out of
 * GameScene._emitChainUpdate so it can be unit-tested without booting Phaser
 * (which requires `window`).
 *
 * @param {{
 *   path: Array<{ res: { key: string, label?: string } }>,
 *   nextUpgradeTile: (res: { key: string }) => ({ key?: string, label?: string } | null),
 *   effectiveThresholds?: Record<string, number>,
 *   effectiveMinChain: number,
 * }} args
 * @returns {{
 *   count: number,
 *   upgrades: number,
 *   valid: boolean,
 *   nextTileProgress: { current: number, threshold: number, targetLabel: string, targetKey: string } | null,
 *   resourceKey: string | null,
 *   resourceLabel: string | null,
 *   tileKey: string | null,
 *   tileLabel: string | null,
 * }}
 */
export function buildChainUpdatePayload(args) {
  const { path, nextUpgradeTile, effectiveThresholds, effectiveMinChain } = args;
  const n = path.length;
  const res = n ? path[0].res : null;
  const next = res ? nextUpgradeTile(res) : null;
  const effThresh = effectiveThresholds ?? UPGRADE_THRESHOLDS;
  const k = next && res ? upgradeCountForChain(n, res.key, effThresh) : 0;
  const valid = n === 0 || n >= effectiveMinChain;
  let nextTileProgress = null;
  if (next && res) {
    const threshold = effThresh[res.key] ?? UPGRADE_THRESHOLDS[res.key] ?? 0;
    if (threshold > 0) {
      nextTileProgress = {
        current: n,
        threshold,
        targetLabel: next.label ?? next.key ?? "",
        targetKey: next.key ?? "",
      };
    }
  }
  const producedKey = res ? producedResource(res) : null;
  const producedDef = producedKey ? ITEMS[producedKey] : null;
  return {
    count: n,
    upgrades: k,
    valid,
    nextTileProgress,
    resourceKey:   producedKey ?? res?.key ?? null,
    resourceLabel: producedDef?.label ?? res?.label ?? null,
    tileKey:       res?.key   ?? null,
    tileLabel:     res?.label ?? null,
  };
}
