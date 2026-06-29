/**
 * The pure-function half of the chain HUD pipeline: given a tile, return the
 * resource key the chain produces (per-tile override > family default > null).
 * Lives here (not in GameScene.js) so unit tests can import it without booting
 * Phaser, which requires `window`.
 */

import { tileFamilyResource, TILES_WITH_CUSTOM_OUTPUT, getItem, UPGRADE_THRESHOLDS } from "../constants.js";
import { TILE_TYPES, TILE_TYPES_MAP } from "../features/tileCollection/data.js";
import { upgradeCountForChain } from "../utils.js";

/**
 * Returns the resource KEY (string) that chaining `tile` contributes progress
 * toward. Per-tile override > family default. Returns null for tiles in
 * TILES_WITH_CUSTOM_OUTPUT (their custom path handles output).
 */
export function producedResource(tile: { key?: string } | null | undefined): string | null {
  if (!tile?.key) return null;
  if ((TILES_WITH_CUSTOM_OUTPUT as Set<string>).has(tile.key)) return null;
  const tileEntry = (TILE_TYPES_MAP as Record<string, { effects?: { producesResource?: string } } | undefined>)[tile.key];
  const override = tileEntry?.effects?.producesResource;
  if (override) return override;
  return tileFamilyResource(tile.key) ?? null;
}

/**
 * Reverse of {@link producedResource}: given a resource KEY, return the most
 * canonical board tile that produces it (lowest-tier producer, honouring
 * per-tile overrides), as `{ id, displayName }`, or null if no tile produces
 * it. Used by the board action-panel tooltips to show "what tile gets it".
 * The map is built lazily once and cached.
 */
let _resourceToTile: Record<string, { id: string; displayName: string; tier: number }> | null = null;
export function producingTileForResource(resourceKey: string): { id: string; displayName: string } | null {
  if (!_resourceToTile) {
    _resourceToTile = {};
    for (const t of TILE_TYPES as Array<{ id: string; displayName?: string; tier?: number }>) {
      const res = producedResource({ key: t.id });
      if (!res) continue;
      const tier = t.tier ?? 0;
      const existing = _resourceToTile[res];
      if (!existing || tier < existing.tier) {
        _resourceToTile[res] = { id: t.id, displayName: t.displayName ?? t.id, tier };
      }
    }
  }
  const hit = _resourceToTile[resourceKey];
  return hit ? { id: hit.id, displayName: hit.displayName } : null;
}

interface ChainPathTile {
  res: { key: string; label?: string };
}

interface NextUpgradeTile {
  key?: string;
  label?: string;
}

export interface ChainUpdateArgs {
  path: ChainPathTile[];
  nextUpgradeTile: (res: { key: string }) => NextUpgradeTile | null;
  effectiveThresholds?: Record<string, number>;
  effectiveMinChain: number;
}

export interface ChainUpdatePayload {
  count: number;
  upgrades: number;
  valid: boolean;
  minChain: number;
  nextTileProgress: { current: number; threshold: number; targetLabel: string; targetKey: string } | null;
  resourceKey: string | null;
  resourceLabel: string | null;
  tileKey: string | null;
  tileLabel: string | null;
}

/**
 * Pure builder for the SCENE_EVENTS.CHAIN_UPDATE payload. Pulled out of
 * GameScene._emitChainUpdate so it can be unit-tested without booting Phaser
 * (which requires `window`).
 */
export function buildChainUpdatePayload(args: ChainUpdateArgs): ChainUpdatePayload {
  const { path, nextUpgradeTile, effectiveThresholds, effectiveMinChain } = args;
  const n = path.length;
  const res = n ? path[0].res : null;
  const next = res ? nextUpgradeTile(res) : null;
  const effThresh: Record<string, number> = effectiveThresholds ?? (UPGRADE_THRESHOLDS as Record<string, number>);
  const k = next && res ? upgradeCountForChain(n, res.key, effThresh) : 0;
  const valid = n === 0 || n >= effectiveMinChain;
  let nextTileProgress: ChainUpdatePayload["nextTileProgress"] = null;
  if (next && res) {
    const threshold = effThresh[res.key] ?? (UPGRADE_THRESHOLDS as Record<string, number>)[res.key] ?? 0;
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
  const producedDef = producedKey ? getItem(producedKey) : null;
  return {
    count: n,
    upgrades: k,
    valid,
    minChain: effectiveMinChain,
    nextTileProgress,
    resourceKey:   producedKey ?? res?.key ?? null,
    resourceLabel: producedDef?.label ?? res?.label ?? null,
    tileKey:       res?.key   ?? null,
    tileLabel:     res?.label ?? null,
  };
}
