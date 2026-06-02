/**
 * NpcGifts.tsx — "Gift preferences" section for the Game Wiki.
 *
 * For an NPC article, renders the NPC's `loves` (big bond gain) and `likes`
 * (medium) gift lists as rows of navigable item chips — icon + label, each
 * linking to that item's wiki article.
 *
 * The gift data lives in NPC_DATA (features/npcs/data.ts), NOT in NPCS
 * (constants.ts — what getEntity returns for the `npcs` concept). NPCS carries
 * only name/role/color/lines; NPC_DATA carries loves/likes/favoriteGift. We
 * therefore read NPC_DATA directly, keyed by `npcId`.
 *
 * Returns null when the NPC has neither loves nor likes.
 *
 * React Compiler is on — no manual useMemo/useCallback.
 */

import React from "react";
import Icon from "../../../ui/Icon.jsx";
import { iconLabel } from "../../../textures/iconRegistry.js";
import { COLORS } from "../../shared.jsx";
import { useBalanceNav } from "../../balanceNav.jsx";
import { wikiNavTarget } from "../WikiLinkButton.jsx";
import { conceptForKey } from "../conceptEntities.js";
import { NPC_DATA } from "../../../features/npcs/data.js";

/** Read a string-array field off the NPC_DATA record, or [] when absent. */
function giftList(npcId: string, field: "loves" | "likes"): string[] {
  const data = (NPC_DATA as Record<string, unknown>)[npcId];
  if (data == null || typeof data !== "object") return [];
  const raw = (data as Record<string, unknown>)[field];
  return Array.isArray(raw) ? raw.map((k) => String(k)) : [];
}

/** Cheap precheck for TOC gating — true when the NPC has any gift preferences. */
export function hasNpcGifts(npcId: string): boolean {
  return giftList(npcId, "loves").length > 0 || giftList(npcId, "likes").length > 0;
}

/** A single gift rendered as a navigable item chip. */
function GiftChip({ itemKey }: { itemKey: string }) {
  const { navigate } = useBalanceNav();
  const label = iconLabel(itemKey) ?? itemKey;
  const conceptId = conceptForKey(itemKey);

  const inner = (
    <>
      <Icon iconKey={itemKey} size={18} style={{ marginRight: 4, verticalAlign: "middle" }} />
      <span style={{ fontWeight: 600 }}>{label}</span>
    </>
  );

  const baseStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    padding: "3px 8px",
    borderRadius: 8,
    fontSize: 11,
    background: COLORS.parchmentDeep,
    border: `1px solid ${COLORS.border}`,
    color: COLORS.ink,
  };

  if (conceptId == null) {
    return <span style={baseStyle}>{inner}</span>;
  }

  return (
    <button
      type="button"
      title={`${conceptId}:${itemKey}`}
      onClick={() => navigate(wikiNavTarget(conceptId, itemKey))}
      style={{ ...baseStyle, cursor: "pointer", transition: "opacity 120ms ease" }}
      className="hover:opacity-80"
    >
      {inner}
    </button>
  );
}

function GiftRow({ heading, items }: { heading: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <div
        className="text-[9px] font-bold uppercase tracking-wide mb-1"
        style={{ color: COLORS.inkSubtle }}
      >
        {heading}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {items.map((key, i) => (
          <GiftChip key={`${key}:${i}`} itemKey={key} />
        ))}
      </div>
    </div>
  );
}

export interface NpcGiftsProps {
  npcId: string;
  /** The live NPCS entity (unused for gift data — kept for API symmetry). */
  npc?: Record<string, unknown> | null;
}

/**
 * Render the NPC's gift preferences, or null when the NPC has no loves/likes.
 */
export function NpcGifts({ npcId }: NpcGiftsProps) {
  const loves = giftList(npcId, "loves");
  const likes = giftList(npcId, "likes");
  if (loves.length === 0 && likes.length === 0) return null;

  return (
    <section id="npc-gifts">
      <div className="wiki-section-heading mb-2">Gift preferences</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <GiftRow heading="Loves" items={loves} />
        <GiftRow heading="Likes" items={likes} />
      </div>
    </section>
  );
}

export default NpcGifts;
