// Per-NPC bond timeline — walks every beat in the draft and collects the
// choices whose outcome includes a `bondDelta` for that NPC, in roughly
// story order. For each NPC the helper emits a list of stops:
//
//   { npc, total, max, min, stops: [{ beatId, beatTitle, choiceId, choiceLabel, amount, running }] }
//
// Useful when balancing the narrative economy:
//   "Wren ends Act II at +18 bond if you pick every kindness — is that
//    too generous?" "Bram never goes negative, even on the cruel path —
//    intentional?"
//
// Pure module; no React.

import { effectiveBeat, allBeatIds, npcByKey } from "./shared.jsx";
import type { BondTimelineRow, StoryBeat, StoryDraft } from "./types.js";

type ActOrder = [number, string];

const STORY_ACT_ORDER = (beatId: string, beat: StoryBeat | null): ActOrder => {
  if (!beat) return [99, beatId];
  if (Number.isFinite(beat.act)) return [beat.act as number, beatId];
  if (beat.side) return [4, beatId];
  return [3, beatId];
};

export function computeBondTimeline(draft: StoryDraft | null | undefined): BondTimelineRow[] {
  const ids = allBeatIds(draft);
  const beats = ids
    .map((id) => ({ id, beat: effectiveBeat(id, draft) }))
    .filter((entry): entry is { id: string; beat: StoryBeat } => Boolean(entry.beat));
  beats.sort((a, b) => {
    const [aAct, aId] = STORY_ACT_ORDER(a.id, a.beat);
    const [bAct, bId] = STORY_ACT_ORDER(b.id, b.beat);
    if (aAct !== bAct) return aAct - bAct;
    return aId.localeCompare(bId);
  });

  const byNpc = new Map<string, BondTimelineRow>();
  const ensure = (npc: string): BondTimelineRow => {
    if (!byNpc.has(npc)) byNpc.set(npc, { npc, total: 0, max: 0, min: 0, stops: [] });
    return byNpc.get(npc)!;
  };

  for (const { id, beat } of beats) {
    const choices = Array.isArray(beat.choices) ? beat.choices : [];
    for (const c of choices) {
      const bd = c?.outcome?.bondDelta;
      if (!bd || !bd.npc || !Number.isFinite(bd.amount) || bd.amount === 0) continue;
      const row = ensure(bd.npc);
      row.total += bd.amount;
      if (row.total > row.max) row.max = row.total;
      if (row.total < row.min) row.min = row.total;
      row.stops.push({
        beatId: id,
        beatTitle: beat.title || id,
        choiceId: c.id,
        choiceLabel: c.label || c.id,
        amount: bd.amount,
        running: row.total,
        act: Number.isFinite(beat.act) ? (beat.act as number) : null,
      });
    }
  }

  const npcs = [...byNpc.values()];
  npcs.sort((a, b) => {
    const an = npcByKey(a.npc)?.name || a.npc;
    const bn = npcByKey(b.npc)?.name || b.npc;
    return an.localeCompare(bn);
  });
  return npcs;
}

/** A single number summarising the net bond change across every choice. */
export function totalAbsoluteBondDelta(timeline: BondTimelineRow[]): number {
  return timeline.reduce((s, row) => s + row.stops.reduce((ss, stop) => ss + Math.abs(stop.amount), 0), 0);
}
