/**
 * ZoneDetail.tsx — "Drop rates & upgrades" section for the Game Wiki.
 *
 * For a zone article, surfaces the two data-rich config tables that the
 * Infobox town map can't show:
 *   - Season drop-rate heatmap: a row per season × a column per zone category,
 *     each cell tinted by a value→color ramp so high-drop categories read hot.
 *   - Upgrade-map flow: each `category → upgradedCategory` chain pair rendered
 *     as a navigable-ish icon+label → arrow → icon+label row.
 *
 * COMPUTE is reused from the static zone catalog:
 *   - ZONES (features/zones/data.js) — id → zone def (seasonDrops + upgradeMap)
 *   - ZONE_TO_TILE_CATEGORIES — zone-category → concrete tile category
 *   - TILE_TYPES — used to pick a representative tile icon per category
 *
 * Category keys (grass, birds, …) are NOT icon keys; we resolve a representative
 * tile per category and fall back to a humanized text label when no icon exists.
 *
 * Returns null when the zone has neither season drops nor an upgrade map.
 *
 * React Compiler is on — no manual useMemo/useCallback.
 */

import React from "react";
import Icon from "../../../ui/Icon.jsx";
import { COLORS } from "../../shared.jsx";
import { useBalanceNav } from "../../balanceNav.jsx";
import { wikiNavTarget } from "../WikiLinkButton.jsx";
import { getEntity } from "../conceptEntities.js";
import {
  ZONE_TO_TILE_CATEGORIES,
  ZONE_UPGRADE_TARGET_GOLD,
} from "../../../features/zones/data.js";
import { TILE_TYPES } from "../../../features/tileCollection/data.js";

// ─── Shapes ─────────────────────────────────────────────────────────────────

interface ZoneLike {
  seasonDrops?: Record<string, Record<string, number>> | null;
  upgradeMap?: Record<string, string> | null;
}

// Season column order — matches SESSION_SEASON_NAMES in features/zones/data.js
// and the SEASONS table in constants.js.
const SEASON_ORDER = ["Spring", "Summer", "Autumn", "Winter"] as const;

// ─── Category → icon / label resolution ───────────────────────────────────────

/**
 * First tile in TILE_TYPES whose `category` matches one of the concrete tile
 * categories a zone-category expands to. The tile id doubles as its icon key.
 */
function representativeTileForCategory(zoneCat: string): string | null {
  const tileCats: string[] = ZONE_TO_TILE_CATEGORIES[zoneCat] ?? [zoneCat];
  for (const tc of tileCats) {
    const t = (TILE_TYPES as Array<{ id?: string; category?: string }>).find(
      (x) => x.category === tc,
    );
    if (t?.id) return t.id;
  }
  return null;
}

/** Title-case a snake/lower category key for display (e.g. "herd_animals" → "Herd Animals"). */
function humanizeCategory(zoneCat: string): string {
  return zoneCat
    .split("_")
    .map((w) => (w.length > 0 ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

/**
 * Navigation target for a zone-category's wiki article. Zone categories are
 * first-class `categories` concept entities, so each tag links to its own
 * page. Returns null for keys with no wiki entity (e.g. the gold/coins
 * sentinel, which is a board-only coin tile, not a catalogued category).
 */
function wikiTargetForZoneCat(zoneCat: string): { tab: string; focus: string } | null {
  if (zoneCat === ZONE_UPGRADE_TARGET_GOLD) return null;
  if (getEntity("categories", zoneCat) == null) return null;
  return wikiNavTarget("categories", zoneCat);
}

/**
 * A category icon + label. Falls back to text when no tile icon resolves.
 * When the category has a wiki article (every zone category does), the tag is
 * a button that navigates there; otherwise it renders as inert text.
 */
function CategoryTag({ zoneCat, size = 18 }: { zoneCat: string; size?: number }) {
  const { navigate } = useBalanceNav();

  const isGold = zoneCat === ZONE_UPGRADE_TARGET_GOLD;
  const iconKey = isGold ? "coins" : representativeTileForCategory(zoneCat);
  const label = isGold ? "Coins" : humanizeCategory(zoneCat);

  const inner = (
    <>
      {iconKey != null && (
        <Icon iconKey={iconKey} size={size} style={{ verticalAlign: "middle" }} />
      )}
      <span style={{ fontWeight: 600 }}>{label}</span>
    </>
  );

  const target = wikiTargetForZoneCat(zoneCat);
  if (target == null) {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
        {inner}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => navigate(target)}
      title={`Open ${label} category`}
      className="inline-flex items-center hover:underline"
      style={{
        gap: 5,
        background: "none",
        border: "none",
        padding: 0,
        margin: 0,
        font: "inherit",
        color: "inherit",
        cursor: "pointer",
      }}
    >
      {inner}
    </button>
  );
}

// ─── Heatmap color ramp ───────────────────────────────────────────────────────

/**
 * Map a drop weight (0..1, occasionally a raw count) onto a parchment→ember
 * background so the busiest categories read hottest. `max` is the largest
 * weight in the table so the ramp is normalized per-zone.
 */
function heatStyle(value: number, max: number): React.CSSProperties {
  if (!(value > 0)) {
    return { background: COLORS.parchment, color: COLORS.inkSubtle };
  }
  const t = max > 0 ? Math.min(1, value / max) : 0;
  // Parchment-deep → ember, fading the alpha so low cells stay legible.
  const alpha = 0.12 + 0.62 * t;
  return {
    background: `rgba(214,97,42,${alpha.toFixed(3)})`,
    color: t > 0.55 ? "#fff" : COLORS.ink,
    fontWeight: t > 0.4 ? 700 : 600,
  };
}

/** Format a drop weight as a percent string. Weights are 0..1; raw ints pass through. */
function pctLabel(value: number): string {
  if (!(value > 0)) return "·";
  const pct = value <= 1 ? value * 100 : value;
  return `${Math.round(pct)}%`;
}

// ─── Gating ───────────────────────────────────────────────────────────────────

function dropCategories(zone: ZoneLike): string[] {
  const drops = zone.seasonDrops ?? {};
  const seen = new Set<string>();
  for (const season of SEASON_ORDER) {
    for (const cat of Object.keys(drops[season] ?? {})) seen.add(cat);
  }
  // Preserve the column order as first-seen across the season rows.
  return Array.from(seen);
}

function hasAnyDrops(zone: ZoneLike): boolean {
  return dropCategories(zone).length > 0;
}

function upgradePairs(zone: ZoneLike): Array<[string, string]> {
  return Object.entries(zone.upgradeMap ?? {});
}

/** Cheap precheck for TOC gating — true when the zone has drops or an upgrade map. */
export function hasZoneDetail(zone: ZoneLike | null | undefined): boolean {
  if (zone == null) return false;
  return hasAnyDrops(zone) || upgradePairs(zone).length > 0;
}

// ─── Component ──────────────────────────────────────────────────────────────

export interface ZoneDetailProps {
  zone: ZoneLike;
}

/**
 * Render the season drop-rate heatmap + upgrade-map flow for `zone`, or null
 * when the zone has neither.
 */
export function ZoneDetail({ zone }: ZoneDetailProps) {
  if (!hasZoneDetail(zone)) return null;

  const cats = dropCategories(zone);
  const drops = zone.seasonDrops ?? {};
  const seasons = SEASON_ORDER.filter((s) => drops[s] != null);
  const pairs = upgradePairs(zone);

  // Normalize the heatmap ramp against the busiest cell in the whole table.
  let max = 0;
  for (const s of seasons) {
    for (const c of cats) {
      const v = Number(drops[s]?.[c]) || 0;
      if (v > max) max = v;
    }
  }

  const cellBase: React.CSSProperties = {
    padding: "6px 8px",
    textAlign: "center",
    fontSize: 12,
    borderRadius: 6,
    minWidth: 44,
  };

  return (
    <section id="zone-detail">
      <div className="wiki-section-heading mb-2">Drop rates &amp; upgrades</div>

      {/* Season drop-rate heatmap */}
      {cats.length > 0 && seasons.length > 0 && (
        <div
          style={{
            padding: "12px 14px",
            borderRadius: 10,
            background: COLORS.parchmentDeep,
            border: `1px solid ${COLORS.border}`,
            overflowX: "auto",
            marginBottom: pairs.length > 0 ? 14 : 0,
          }}
        >
          <div
            className="text-[9px] font-bold uppercase tracking-wide mb-2"
            style={{ color: COLORS.inkSubtle }}
          >
            Season drop rates
          </div>
          <table style={{ borderCollapse: "separate", borderSpacing: 4, width: "100%" }}>
            <thead>
              <tr>
                <th style={{ ...cellBase, textAlign: "left", color: COLORS.inkSubtle, fontSize: 10 }} />
                {cats.map((cat) => (
                  <th key={cat} style={{ ...cellBase, color: COLORS.ink }}>
                    <CategoryTag zoneCat={cat} size={16} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {seasons.map((season) => (
                <tr key={season}>
                  <td
                    style={{
                      ...cellBase,
                      textAlign: "left",
                      fontWeight: 700,
                      color: COLORS.ink,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {season}
                  </td>
                  {cats.map((cat) => {
                    const v = Number(drops[season]?.[cat]) || 0;
                    return (
                      <td
                        key={cat}
                        className="wiki-mono"
                        title={`${season} · ${humanizeCategory(cat)}: ${pctLabel(v)}`}
                        style={{ ...cellBase, ...heatStyle(v, max) }}
                      >
                        {pctLabel(v)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Upgrade-map flow */}
      {pairs.length > 0 && (
        <div
          style={{
            padding: "12px 14px",
            borderRadius: 10,
            background: COLORS.parchmentDeep,
            border: `1px solid ${COLORS.border}`,
          }}
        >
          <div
            className="text-[9px] font-bold uppercase tracking-wide mb-2"
            style={{ color: COLORS.inkSubtle }}
          >
            Chain upgrades
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {pairs.map(([from, to]) => (
              <div
                key={from}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  fontSize: 13,
                  color: COLORS.ink,
                }}
              >
                <CategoryTag zoneCat={from} />
                <span
                  aria-hidden="true"
                  style={{ fontWeight: 700, color: COLORS.inkSubtle, fontSize: 16 }}
                >
                  →
                </span>
                <CategoryTag zoneCat={to} />
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

export default ZoneDetail;
