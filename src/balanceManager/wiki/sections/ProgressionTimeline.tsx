/**
 * ProgressionTimeline.tsx — "Progression & unlock map" overview for the Tiles
 * concept category page in the Game Wiki.
 *
 * Gives a player a scannable "how do tiles unlock?" read of the whole tile
 * catalog, organised by **tier** (0 = Starters → 3 = highest). Within each
 * tier, tiles render as compact navigable chips (icon + name) carrying a small
 * **discovery-method badge** (Default / Chain / Research / Buy / Daily /
 * Building). A legend explains the badge colours. Each chip navigates to the
 * tile's wiki article via wikiNavTarget("tiles", tile.id).
 *
 * COMPUTE is reused from the static catalogs — nothing is reimplemented here:
 *   - TILE_TYPES (features/tileCollection/data.js) — the tile defs.
 *   - TILE_DISCOVERY_METHOD_BY_ID (config/tileDiscoveryMethods.js) — friendly
 *     names + descriptions per discovery method.
 *
 * Returns null when TILE_TYPES is empty.
 *
 * React Compiler is on — no manual useMemo/useCallback. Tier grouping is a
 * plain pure module-scope helper.
 */

import React from "react";
import { COLORS } from "../../shared.jsx";
import { ConceptRefForKey } from "../refs.js";
import { TILE_TYPES } from "../../../features/tileCollection/data.js";
import { TILE_DISCOVERY_METHOD_BY_ID } from "../../../config/tileDiscoveryMethods.js";

// ─── Tile shape (the slice we read) ─────────────────────────────────────────

interface TileType {
  id: string;
  displayName?: string;
  tier?: number;
  discovery?: { method?: string };
}

// ─── Discovery-method palette ───────────────────────────────────────────────
// Each known method gets a distinct accent so the badges read at a glance.
// Falls back to a neutral slate for any unmapped/unknown method.

const METHOD_COLOR: Record<string, string> = {
  default: COLORS.green,
  chain: COLORS.ember,
  research: COLORS.violet,
  buy: COLORS.borderDeep,
  daily: COLORS.greenDeep,
  building: COLORS.inkLight,
};

function methodColor(method: string): string {
  return METHOD_COLOR[method] ?? COLORS.slate;
}

function methodName(method: string): string {
  return TILE_DISCOVERY_METHOD_BY_ID[method]?.name ?? method;
}

function methodDesc(method: string): string {
  return TILE_DISCOVERY_METHOD_BY_ID[method]?.desc ?? "";
}

// ─── Tier grouping (pure) ───────────────────────────────────────────────────

interface TierGroup {
  tier: number;
  /** Friendly label, e.g. "Tier 0 · Starters". */
  label: string;
  tiles: TileType[];
}

const TIER_NAMES: Record<number, string> = {
  0: "Starters",
  1: "Early",
  2: "Advanced",
  3: "Mastery",
};

/** The ordered set of discovery methods that actually appear in the catalog. */
function methodsPresent(tiles: ReadonlyArray<TileType>): string[] {
  // Preserve the catalog's declared order so the legend reads default → … .
  const order = Object.keys(METHOD_COLOR);
  const seen = new Set<string>();
  for (const t of tiles) seen.add(t.discovery?.method ?? "default");
  const known = order.filter((m) => seen.has(m));
  const extra = [...seen].filter((m) => !order.includes(m));
  return [...known, ...extra];
}

/**
 * Bucket every tile by its tier (0..3), preserving catalog order within each
 * tier. Empty tiers are skipped. Tiles with a missing/odd tier fall into a
 * trailing "Other" group so nothing silently disappears.
 */
function groupByTier(tiles: ReadonlyArray<TileType>): TierGroup[] {
  const byTier = new Map<number, TileType[]>();
  let hasOther = false;
  const OTHER = 99;

  for (const t of tiles) {
    const raw = typeof t.tier === "number" ? t.tier : OTHER;
    const tier = raw >= 0 && raw <= 3 ? raw : OTHER;
    if (tier === OTHER) hasOther = true;
    const bucket = byTier.get(tier);
    if (bucket) bucket.push(t);
    else byTier.set(tier, [t]);
  }

  const out: TierGroup[] = [];
  for (const tier of [0, 1, 2, 3]) {
    const bucket = byTier.get(tier);
    if (!bucket || bucket.length === 0) continue;
    const name = TIER_NAMES[tier];
    out.push({ tier, label: `Tier ${tier} · ${name}`, tiles: bucket });
  }
  if (hasOther) {
    const bucket = byTier.get(OTHER);
    if (bucket && bucket.length > 0) out.push({ tier: OTHER, label: "Other", tiles: bucket });
  }
  return out;
}

// ─── Small parts ────────────────────────────────────────────────────────────

/** Colored method dot + label, shared by the legend and the chip badge. */
function MethodBadge({ method }: { method: string }) {
  const color = methodColor(method);
  return (
    <span
      title={methodDesc(method)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "1px 6px",
        borderRadius: 999,
        fontSize: 9,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.03em",
        color: "#fff",
        background: color,
      }}
    >
      {methodName(method)}
    </span>
  );
}

/** A navigable tile chip: rich ref + discovery-method badge. */
function TileChip({ tile }: { tile: TileType }) {
  const method = tile.discovery?.method ?? "default";
  const display = tile.displayName ?? tile.id;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 8px",
        borderRadius: 10,
        background: COLORS.parchment,
        border: `1px solid ${COLORS.border}`,
        borderLeft: `3px solid ${methodColor(method)}`,
        color: COLORS.ink,
      }}
    >
      <ConceptRefForKey
        entityKey={tile.id}
        conceptId="tiles"
        label={display}
        variant="inline"
      />
      <MethodBadge method={method} />
    </span>
  );
}

// ─── Inner content (mounted only when the <details> is open) ────────────────

/**
 * The heavy tier-banded grid + legend. Exported separately so tests can render
 * it directly without driving the collapsed <details>.
 */
export function ProgressionTimelineContent() {
  const tiles = TILE_TYPES as unknown as TileType[];
  const groups = groupByTier(tiles);
  const legendMethods = methodsPresent(tiles);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Discovery-method legend */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 10,
          padding: "8px 12px",
          borderRadius: 10,
          background: COLORS.parchmentDeep,
          border: `1px solid ${COLORS.border}`,
        }}
      >
        <span
          className="text-[10px] font-bold uppercase tracking-wide"
          style={{ color: COLORS.inkSubtle }}
        >
          Unlock method
        </span>
        {legendMethods.map((method) => (
          <MethodBadge key={method} method={method} />
        ))}
      </div>

      {/* Tier bands — Tier 0 (Starters) → Tier 3 (Mastery). */}
      {groups.map((group) => (
        <section key={group.tier} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div
            className="flex items-center gap-2 pb-1"
            style={{ borderBottom: `2px solid ${COLORS.border}` }}
          >
            <span className="wiki-concept-title" style={{ fontSize: 16 }}>
              {group.label}
            </span>
            <span
              className="wiki-mono text-[11px]"
              style={{ color: COLORS.inkSubtle }}
            >
              {group.tiles.length}
            </span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {group.tiles.map((tile) => (
              <TileChip key={tile.id} tile={tile} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

// ─── Collapsible section wrapper ────────────────────────────────────────────

/**
 * The collapsed-by-default "Progression & unlock map" section for the Tiles
 * category page. Heavy content (~80 tile icons) is only mounted when the
 * <details> is open — matching the RecipeGraph collapse pattern in
 * CategoryPage.tsx so the page stays cheap to render by default.
 *
 * Returns null when the tile catalog is empty.
 */
export function ProgressionTimeline() {
  const [open, setOpen] = React.useState(false);

  const tiles = TILE_TYPES as unknown as TileType[];
  if (tiles.length === 0) return null;

  return (
    <section id="progression-timeline">
      <details
        open={open}
        onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}
        style={{ borderRadius: 8, overflow: "hidden" }}
      >
        <summary
          onClick={(e) => {
            // Mirror the native toggle into React state so the mount/unmount of
            // the heavy content is React-controlled and testable in jsdom.
            e.preventDefault();
            setOpen((prev) => !prev);
          }}
          style={{
            cursor: "pointer",
            listStyle: "none",
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 12px",
            background: COLORS.parchmentDeep,
            border: `1px solid ${COLORS.border}`,
            borderRadius: open ? "8px 8px 0 0" : 8,
            fontSize: 13,
            fontWeight: 600,
            color: COLORS.ink,
            userSelect: "none",
          }}
        >
          <span
            aria-hidden
            style={{
              display: "inline-block",
              width: 12,
              height: 12,
              fontSize: 10,
              lineHeight: "12px",
              textAlign: "center",
              transform: open ? "rotate(90deg)" : "rotate(0deg)",
              transition: "transform 150ms ease",
              color: COLORS.inkSubtle,
              flexShrink: 0,
            }}
          >
            ▶
          </span>
          Progression &amp; unlock map
        </summary>

        {open && (
          <div
            style={{
              padding: 12,
              background: COLORS.parchment,
              border: `1px solid ${COLORS.border}`,
              borderTop: "none",
              borderRadius: "0 0 8px 8px",
            }}
          >
            <ProgressionTimelineContent />
          </div>
        )}
      </details>
    </section>
  );
}

export default ProgressionTimeline;
