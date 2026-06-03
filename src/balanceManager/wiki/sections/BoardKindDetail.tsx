/**
 * BoardKindDetail.tsx — "Tiles, dangers & seasons" section for board-kind articles.
 */

import React from "react";
import { COLORS } from "../../shared.jsx";
import { SEASONS } from "../../../constants.js";
import { HAZARDS } from "../../../features/mine/hazards.js";
import { FARM_HAZARD_META } from "../../../features/farm/hazards.js";
import { ZONES } from "../../../features/zones/data.js";
import type { Zone } from "../../../features/zones/data.js";
import { iconLabel } from "../../../textures/iconRegistry.js";
import {
  ConceptRefList,
  RelationRefGrid,
  entityKeysToWikiLinks,
} from "../refs.js";

interface BoardKindLike {
  name?: string;
  tiles?: Array<{ key: string; label?: string; next?: string | null }>;
}

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
  const tiles = Array.isArray(boardKind.tiles) ? boardKind.tiles : [];
  const dangers = DANGER_KEYS[boardKindKey] ?? [];
  const zoneFlag =
    boardKindKey === "farm" ? "hasFarm" : boardKindKey === "mine" ? "hasMine" : "hasWater";
  const zones = (Object.values(ZONES) as Zone[]).filter(
    (z) => (z as unknown as Record<string, unknown>)[zoneFlag] === true,
  );

  const tileLinks = entityKeysToWikiLinks(
    tiles.map((t) => t.key),
    {
      conceptId: "tiles",
      labelFor: (key) => {
        const t = tiles.find((tile) => tile.key === key);
        return t?.label ?? iconLabel(key) ?? key;
      },
    },
  );

  const hazardLinks = entityKeysToWikiLinks(dangers, {
    conceptId: "hazards",
    labelFor: hazardName,
  });

  const zoneLinks = zones.map((z) => ({
    conceptId: "zones",
    key: z.id,
    label: z.name ?? z.id,
  }));

  return (
    <section id="board-kind-detail" className="flex flex-col gap-4">
      <div>
        {heading("Tile roster")}
        {tileLinks.length > 0 ? (
          <RelationRefGrid links={tileLinks} />
        ) : (
          <p className="text-[12px]" style={{ color: COLORS.inkSubtle, margin: 0 }}>No tiles listed.</p>
        )}
      </div>

      <div>
        {heading("Dangers")}
        {hazardLinks.length > 0 ? (
          <RelationRefGrid links={hazardLinks} />
        ) : (
          <p className="text-[12px]" style={{ color: COLORS.inkSubtle, margin: 0 }}>
            This board has no board hazards — see the notes below for its tides and pearls.
          </p>
        )}
      </div>

      <div>
        {heading("Seasons & turns")}
        <ConceptRefList
          entityKeys={SEASONS.map((s) => s.name)}
          conceptId="seasons"
          variant="inline"
        />
        <p className="text-[12px] mt-2" style={{ color: COLORS.inkSubtle, margin: 0 }}>
          A run plays through all four seasons. Each session&apos;s turn budget (the zone&apos;s{" "}
          <code>baseTurns</code>) is split evenly across the seasons, so the active season advances
          as turns are spent.
        </p>
      </div>

      <div>
        {heading("Zones using this board")}
        {zoneLinks.length > 0 ? (
          <RelationRefGrid links={zoneLinks} />
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
