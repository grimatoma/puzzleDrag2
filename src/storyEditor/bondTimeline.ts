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

import { effectiveBeat, allBeatIds, NPCS } from "./shared.jsx";

const STORY_ACT_ORDER = (beatId, beat) => {
  if (!beat) return [99, beatId];
  if (Number.isFinite(beat.act)) return [beat.act, beatId];
  if (beat.side) return [4, beatId];
  return [3, beatId];
};

export function computeBondTimeline(draft) {
  const ids = allBeatIds(draft);
  const beats = ids.map((id) => ({ id, beat: effectiveBeat(id, draft) }))
    .filter(({ beat }) => beat);
  beats.sort((a, b) => {
    const [aAct, aId] = STORY_ACT_ORDER(a.id, a.beat);
    const [bAct, bId] = STORY_ACT_ORDER(b.id, b.beat);
    if (aAct !== bAct) return aAct - bAct;
    return aId.localeCompare(bId);
  });

  const byNpc = new Map();
  const ensure = (npc) => {
    if (!byNpc.has(npc)) byNpc.set(npc, { npc, total: 0, max: 0, min: 0, stops: [] });
    return byNpc.get(npc);
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
        act: Number.isFinite(beat.act) ? beat.act : null,
      });
    }
  }

  const npcs = [...byNpc.values()];
  npcs.sort((a, b) => {
    const an = NPCS[a.npc]?.name || a.npc;
    const bn = NPCS[b.npc]?.name || b.npc;
    return an.localeCompare(bn);
  });
  return npcs;
}

/** A single number summarising the net bond change across every choice. */
export function totalAbsoluteBondDelta(timeline) {
  return timeline.reduce((s, row) => s + row.stops.reduce((ss, stop) => ss + Math.abs(stop.amount), 0), 0);
}
