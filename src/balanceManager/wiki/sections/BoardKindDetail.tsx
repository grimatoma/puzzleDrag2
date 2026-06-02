/**
 * BoardKindDetail.tsx — "Tiles, dangers & seasons" section for board-kind articles.
 *
 * Four blocks rendered from live config (BIOMES + HAZARDS/FARM_HAZARD_META +
 * SEASONS + ZONES):
 *   1. Tile roster   — every board tile this biome spawns, navigable to its article.
 *   2. Dangers       — the board hazards that can appear (mine vs farm), or a
 *                      graceful note for boards with no hazards (the Harbor).
 *   3. Seasons & turns — the four-season cycle every run plays through.
 *   4. Zones using it — map zones whose has{Farm,Mine,Water} flag exposes this board.
 *
 * Read-only. React Compiler is on — no manual useMemo/useCallback.
 */
import React from "react";
import Icon from "../../../ui/Icon.jsx";
import { COLORS } from "../../shared.jsx";
import { SEASONS } from "../../../constants.js";
import { HAZARDS } from "../../../features/mine/hazards.js";
import { FARM_HAZARD_META } from "../../../features/farm/hazards.js";
import { ZONES } from "../../../features/zones/data.js";
import type { Zone } from "../../../features/zones/data.js";
import { useBalanceNav } from "../../balanceNav.jsx";
import { wikiNavTarget } from "../WikiLinkButton.jsx";

interface BoardKindLike {
  name?: string;
  tiles?: Array<{ key: string; label?: string; next?: string | null }>;
}

// Board hazards keyed by board kind. Harbor (fish) has no board hazards;
// its tides + pearls live in features/fish/slice.js, surfaced in the lede/body.
const DANGER_KEYS: Record<string, string[]> = {
  mine: ["cave_in", "gas_vent", "lava", "mole"],
  farm: ["fire", "wolf", "rats"],
  fish: [],
};

function hazardName(key: string): string {
  const mine = HAZARDS.find((h) => h.id === key);
  if (mine) return mine.name;
  return FARM_HAZARD_META[key]?.name ?? key;
}

/** Cheap precheck for TOC gating — true when the board kind has a tile roster. */
export function hasBoardKindDetail(entity: BoardKindLike | null | undefined): boolean {
  return !!entity && Array.isArray(entity.tiles) && entity.tiles.length > 0;
}

const heading = (text: string) => (
  <div className="wiki-section-heading mb-2" style={{ color: COLORS.ink }}>{text}</div>
);

export interface BoardKindDetailProps {
  boardKindKey: string;
  boardKind: BoardKindLike;
}

export function BoardKindDetail({ boardKindKey, boardKind }: BoardKindDetailProps) {
  const { navigate } = useBalanceNav();
  const tiles = Array.isArray(boardKind.tiles) ? boardKind.tiles : [];
  const dangers = DANGER_KEYS[boardKindKey] ?? [];
  const zoneFlag =
    boardKindKey === "farm" ? "hasFarm" : boardKindKey === "mine" ? "hasMine" : "hasWater";
  const zones = (Object.values(ZONES) as Zone[]).filter(
    (z) => (z as unknown as Record<string, unknown>)[zoneFlag] === true,
  );

  const chip = (onClick: () => void, iconKey: string | null, label: string, key: string) => (
    <button
      key={key}
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "3px 8px",
        background: COLORS.parchment,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 8,
        cursor: "pointer",
        fontSize: 12,
        color: COLORS.ink,
      }}
    >
      {iconKey != null && <Icon iconKey={iconKey} size={16} style={{ verticalAlign: "middle" }} />}
      <span>{label}</span>
    </button>
  );

  return (
    <section id="board-kind-detail" className="flex flex-col gap-4">
      <div>
        {heading("Tile roster")}
        <div className="flex flex-wrap gap-1.5">
          {tiles.map((t) =>
            chip(
              () => navigate(wikiNavTarget("tiles", t.key)),
              t.key,
              t.next ? `${t.label ?? t.key} → ${t.next}` : (t.label ?? t.key),
              t.key,
            ),
          )}
        </div>
      </div>

      <div>
        {heading("Dangers")}
        {dangers.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {dangers.map((h) =>
              chip(() => navigate(wikiNavTarget("hazards", h)), `hazard_${h}`, hazardName(h), h),
            )}
          </div>
        ) : (
          <p className="text-[12px]" style={{ color: COLORS.inkSubtle, margin: 0 }}>
            This board has no board hazards — see the notes below for its tides and pearls.
          </p>
        )}
      </div>

      <div>
        {heading("Seasons & turns")}
        <div className="flex flex-wrap gap-1.5 mb-2">
          {SEASONS.map((s) => (
            <span
              key={s.name}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                padding: "3px 8px",
                background: COLORS.parchment,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 8,
                fontSize: 12,
              }}
            >
              <Icon iconKey={s.look.iconKey} size={16} style={{ verticalAlign: "middle" }} />
              <span>{s.name}</span>
            </span>
          ))}
        </div>
        <p className="text-[12px]" style={{ color: COLORS.inkSubtle, margin: 0 }}>
          A run plays through all four seasons. Each session&apos;s turn budget (the zone&apos;s{" "}
          <code>baseTurns</code>) is split evenly across the seasons, so the active season advances
          as turns are spent.
        </p>
      </div>

      <div>
        {heading("Zones using this board")}
        {zones.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {zones.map((z) =>
              chip(
                () => navigate(wikiNavTarget("zones", z.id)),
                null,
                z.name ?? z.id,
                z.id,
              ),
            )}
          </div>
        ) : (
          <p className="text-[12px]" style={{ color: COLORS.inkSubtle, margin: 0 }}>
            No map zones currently enable this board.
          </p>
        )}
      </div>
    </section>
  );
}

export default BoardKindDetail;
