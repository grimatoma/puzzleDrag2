/**
 * NpcGifts.tsx — "Gift preferences" section for the Game Wiki.
 */

import React from "react";
import { COLORS } from "../../shared.jsx";
import { ConceptRefList } from "../refs.js";
import { NPC_DATA } from "../../../features/npcs/data.js";

function giftList(npcId: string, field: "loves" | "likes"): string[] {
  const data = (NPC_DATA as Record<string, unknown>)[npcId];
  if (data == null || typeof data !== "object") return [];
  const raw = (data as Record<string, unknown>)[field];
  return Array.isArray(raw) ? raw.map((k) => String(k)) : [];
}

export function hasNpcGifts(npcId: string): boolean {
  return giftList(npcId, "loves").length > 0 || giftList(npcId, "likes").length > 0;
}

function GiftRow({ heading, items }: { heading: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <div
        className="text-[9px] font-bold uppercase tracking-wide mb-2"
        style={{ color: COLORS.inkSubtle }}
      >
        {heading}
      </div>
      <ConceptRefList entityKeys={items} conceptId="resources" variant="card" />
    </div>
  );
}

export interface NpcGiftsProps {
  npcId: string;
  npc?: Record<string, unknown> | null;
}

export function NpcGifts({ npcId }: NpcGiftsProps) {
  const loves = giftList(npcId, "loves");
  const likes = giftList(npcId, "likes");
  if (loves.length === 0 && likes.length === 0) return null;

  return (
    <section id="npc-gifts">
      <h2 className="wiki-section-heading mb-2">Gift preferences</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <GiftRow heading="Loves" items={loves} />
        <GiftRow heading="Likes" items={likes} />
      </div>
    </section>
  );
}

export default NpcGifts;
