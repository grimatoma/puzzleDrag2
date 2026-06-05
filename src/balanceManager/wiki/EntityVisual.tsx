/**
 * EntityVisual.tsx — Foundation module for the Game Wiki's per-entity visuals.
 *
 * Replaces the old "embed the full playable game iframe" approach with the
 * entity's *actual* procedural / SVG asset:
 *   - tiles / resources / tools / bosses / npcs / hazards → baked <Icon>
 *   - buildings → the inline-SVG <BuildingIllustration>
 *   - zones → the top-down town-map SVG (<TownGround>)
 *   - recipes → the output item's <Icon>
 * Anything without an asset renders NOTHING (returns null) — never an iframe.
 *
 * This module owns the shared helpers; later tasks wire it into Infobox /
 * WikiArticle and retire their local copies.
 *
 * React Compiler is on — no manual useMemo/useCallback/useState memoization.
 */

import React from "react";
import Icon from "../../ui/Icon.jsx";
import { iconColor, iconLabel } from "../../textures/iconRegistry.js";
import BuildingIllustration, { BUILDING_KEYS } from "../../ui/buildings/index.jsx";
import { COLORS, Pill } from "../shared.jsx";
import { CostChip } from "../../ui/primitives/Chip.jsx";
import { buildTownPlan, STAGE_W, STAGE_H } from "../../townLayout.js";
import TownGround from "../../ui/TownGround.jsx";
import { MAP_NODES } from "../../features/cartography/data.js";
import { ZONES, zoneHasBoard } from "../../features/zones/data.js";
import { keeperIconKey, dailyRewardIconKey } from "./concepts.js";

// ─── entityIconKey ─────────────────────────────────────────────────────────────

/**
 * Resolve the procedural icon key for an entity, or null when the concept has
 * no per-entity icon.
 *
 * Generalizes the local `iconKeyForLink` helper in WikiArticle.tsx to cover
 * every concept whose entities map 1-to-1 to a baked icon.
 */
export function entityIconKey(
  conceptId: string,
  entityKey: string,
  entity: Record<string, unknown> | null,
): string | null {
  switch (conceptId) {
    case "tiles":
    case "resources":
    case "tools":
      // The item id IS the icon key.
      return entityKey;
    case "bosses":
      return `boss_${entityKey}`;
    case "npcs":
      return `char_${entityKey}`;
    case "hazards":
      return `hazard_${entityKey}`;
    case "boardKinds":
      return `biome_${entityKey}`;
    case "categories": {
      const categoryIcon = `cat_${entityKey}`;
      return iconColor(categoryIcon) != null ? categoryIcon : null;
    }
    case "workers":
    case "abilities":
    case "seasons": {
      // These store their own iconKey string under `look`.
      const look = entity?.look as { iconKey?: unknown } | undefined;
      const k = look?.iconKey;
      return typeof k === "string" && k.length > 0 ? k : null;
    }
    case "recipes": {
      // A recipe's icon is its OUTPUT item's icon.
      const item = entity?.item;
      return typeof item === "string" && item.length > 0 ? item : null;
    }
    case "achievements": {
      // Achievements store a baked icon-registry key (e.g. `ach_first_steps`)
      // under look.
      const look = entity?.look as { icon?: unknown } | undefined;
      const icon = look?.icon;
      return typeof icon === "string" && icon.length > 0 ? icon : null;
    }
    case "dailyRewards": {
      // Delegate to the canonical helper in concepts.ts (single source of truth).
      return dailyRewardIconKey(entity as Parameters<typeof dailyRewardIconKey>[0] ?? {});
    }

    case "boons": {
      // Boons affect coin or bond gains — use the matching canvas icon.
      // boon_coin_mult and boon_bond_mult are in fixed-icons.js.
      const effectType = (entity?.effect as { type?: string } | undefined)?.type;
      return effectType === "bond_gain_mult" ? "boon_bond_mult" : "boon_coin_mult";
    }

    case "keepers": {
      // Delegate to the canonical helper in concepts.ts (single source of truth).
      return keeperIconKey(entityKey) ?? null;
    }

    case "zones":
      return zoneMapIconKey(entityKey);

    default:
      // buildings, views, modals, toolPowers,
      // settlementBiomes, tileDiscoveryMethods, … have no per-entity procedural icon.
      return null;
  }
}


const MAP_NODE_BY_ID = Object.fromEntries(MAP_NODES.map((n) => [n.id, n]));
const ZONES_WITH_MAP_ICON = new Set([
  "home", "meadow", "orchard", "crossroads", "quarry", "caves", "fairground", "forge", "pit",
]);

/** Baked cartography icon key when this zone has a mapNodes texture; null otherwise. */
export function zoneMapIconKey(zoneId: string): string | null {
  return ZONES_WITH_MAP_ICON.has(zoneId) ? `map_${zoneId}` : null;
}

/** Map-node emoji from cartography data (harbor, oldcapital, …). */
export function zoneMapEmoji(zoneId: string): string | null {
  return MAP_NODE_BY_ID[zoneId]?.icon ?? null;
}

// ─── Zone town map ─────────────────────────────────────────────────────────────

/**
 * Render the zone's top-down town map as a static, fully-built SVG, mirroring
 * the wiring in Town.tsx (buildTownPlan → TownGround). Returns null for unknown
 * zones.
 */
function ZoneTownMap({ zoneId, size }: { zoneId: string; size: number }) {
  const zone = ZONES[zoneId];
  if (!zone) return null;

  const boardKinds = [
    zoneHasBoard(zone, "farm") && "farm",
    zoneHasBoard(zone, "mine") && "mine",
    zoneHasBoard(zone, "fish") && "fish",
  ].filter(Boolean) as string[];

  const plan = buildTownPlan({
    zoneId,
    plotCount: Math.max(1, zone.plotCount ?? 12),
    boardKinds,
  });

  const biomeVariant = zoneHasBoard(zone, "mine") && !zoneHasBoard(zone, "farm") ? "mine" : "farm";
  // Render every lot as built so the wiki town reads as a populated settlement.
  const builtLots = new Set<number>(plan.lots.map((l) => l.index));

  return (
    <svg
      viewBox={`0 0 ${STAGE_W} ${STAGE_H}`}
      preserveAspectRatio="xMidYMid meet"
      width={size}
      height={size}
      style={{ display: "block", borderRadius: 8, background: COLORS.parchmentDeep }}
      role="img"
      aria-label={`${zoneId} town map`}
    >
      <TownGround plan={plan} biomeVariant={biomeVariant} builtLots={builtLots} />
    </svg>
  );
}

// ─── EntityVisual ──────────────────────────────────────────────────────────────

export interface EntityVisualProps {
  conceptId: string;
  entityKey: string;
  entity?: Record<string, unknown> | null;
  size?: number;
}

/**
 * Render the best available visual for an entity, or null when there is no
 * asset. NEVER renders a game iframe.
 */
export function EntityVisual({ conceptId, entityKey, entity = null, size = 96 }: EntityVisualProps) {
  // Buildings: render the inline-SVG illustration for any building that has one
  // (BUILDING_KEYS includes the housing2/housing3 aliases, so every building
  // entry — not just the canonical iso set — gets its art).
  if (conceptId === "buildings" && BUILDING_KEYS.includes(entityKey)) {
    return (
      <div
        style={{
          width: size,
          height: size,
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        <BuildingIllustration id={entityKey} isBuilt />
      </div>
    );
  }

  // Zones: baked map icon when available, otherwise the node's map emoji.
  if (conceptId === "zones") {
    const mapKey = zoneMapIconKey(entityKey);
    if (mapKey != null) return <Icon iconKey={mapKey} size={size} />;
    const emoji = zoneMapEmoji(entityKey);
    if (emoji) {
      return (
        <span
          aria-hidden="true"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: size,
            height: size,
            fontSize: size * 0.55,
            lineHeight: 1,
          }}
        >
          {emoji}
        </span>
      );
    }
    return <ZoneTownMap zoneId={entityKey} size={size} />;
  }

  // Baked icon resolved by the canonical helper (single source of truth for all
  // concept→key mappings, including keeperIconKey / dailyRewardIconKey).
  const k = entityIconKey(conceptId, entityKey, entity);
  if (k != null) return <Icon iconKey={k} size={size} />;

  // Emoji fallback — used by unknown keepers (look.icon) and any other entity
  // that carries a look.icon but has no canvas key registered yet.
  const lookEmoji = (entity?.look as { icon?: string } | undefined)?.icon;
  if (lookEmoji) {
    return (
      <span
        aria-hidden="true"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: size,
          height: size,
          fontSize: size * 0.55,
          lineHeight: 1,
        }}
      >
        {lookEmoji}
      </span>
    );
  }

  // Graceful fallback: muted initial circle — consistent with EntryGrid's fallback.
  const initial = entityKey.trim().charAt(0).toUpperCase();
  return (
    <span
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "50%",
        background: "rgba(178, 139, 98, 0.25)",
        color: "rgba(122, 90, 56, 0.6)",
        fontSize: size * 0.4,
        fontWeight: 700,
        lineHeight: 1,
        flexShrink: 0,
      }}
    >
      {initial}
    </span>
  );
}

// ─── AmountChips ───────────────────────────────────────────────────────────────

export interface AmountChipsProps {
  amounts?: Record<string, number> | null;
  variant?: "row" | "chip";
}

/**
 * Render each key→count entry as an icon + count + label chip. Entries with a
 * falsy count are skipped. Icon-less currencies still show their count + label
 * (Icon no-ops/renders a fallback for unknown keys, and the label is always
 * present so the chip stays meaningful).
 */
export function AmountChips({ amounts, variant = "chip" }: AmountChipsProps) {
  const entries = Object.entries(amounts ?? {}).filter(([, count]) => Boolean(count));
  if (entries.length === 0) return null;

  return (
    <span
      style={{
        display: variant === "row" ? "flex" : "inline-flex",
        flexDirection: variant === "row" ? "column" : "row",
        flexWrap: variant === "row" ? "nowrap" : "wrap",
        gap: 6,
        alignItems: variant === "row" ? "stretch" : "center",
      }}
    >
      {entries.map(([key, count]) => (
        <CostChip key={key} title={iconLabel(key) ?? key}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <Icon iconKey={key} size={20} />
            <span style={{ fontWeight: 700 }}>{count}</span>
            <span style={{ color: COLORS.inkSubtle }}>{iconLabel(key) ?? key}</span>
          </span>
        </CostChip>
      ))}
    </span>
  );
}

// ─── RecipeIO ──────────────────────────────────────────────────────────────────

export interface RecipeIOProps {
  recipe: { item: string; station?: string; inputs?: Record<string, number> | null } | null | undefined;
}

/**
 * Render a recipe's inputs → output flow: input chips, an arrow glyph, and the
 * output item's icon + label, with the crafting station shown as a small Pill.
 */
export function RecipeIO({ recipe }: RecipeIOProps) {
  if (!recipe) return null;
  const outLabel = iconLabel(recipe.item) ?? recipe.item;

  return (
    <span style={{ display: "inline-flex", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
      <AmountChips amounts={recipe.inputs} />
      <span aria-hidden="true" style={{ fontWeight: 700, color: COLORS.inkSubtle, fontSize: 18 }}>
        →
      </span>
      <CostChip title={outLabel}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          <Icon iconKey={recipe.item} size={28} />
          <span style={{ fontWeight: 700 }}>{outLabel}</span>
        </span>
      </CostChip>
      {recipe.station ? <Pill>{recipe.station}</Pill> : null}
    </span>
  );
}

export default EntityVisual;
