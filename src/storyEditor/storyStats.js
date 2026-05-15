// Pure analytics helpers for the story tree. Aggregates a draft into a flat
// stats blob: per-NPC line / word counts, fork density, choice outcome
// totals (bond / currency / flag usage), and a reachability summary. The
// numbers are useful when tuning narrative balance:
//
// - "Is Wren talking more than every other NPC combined?"
// - "How many beats have actual choices vs. straight-through dialogue?"
// - "Which side beats look likely to be unreachable?"
//
// Used by the Story Tree Editor / Balance Manager StoryTab.

import { effectiveBeat, allBeatIds, draftBeats, isDraftBeat } from "./shared.jsx";

const NARRATOR_KEY = "_narrator";

function wordCount(text) {
  if (typeof text !== "string") return 0;
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

const asArr = (v) => Array.isArray(v) ? v : (typeof v === "string" && v ? [v] : []);

function emptyNpcRow() {
  return { lines: 0, words: 0, beats: new Set(), bondDelta: 0 };
}

/**
 * Compute the stats blob for a draft. Pure: same draft → same numbers.
 */
export function computeStoryStats(draft) {
  const ids = allBeatIds(draft);
  const beatLookup = new Map();
  for (const id of ids) {
    const beat = effectiveBeat(id, draft);
    if (beat) beatLookup.set(id, beat);
  }

  let totalLines = 0;
  let totalWords = 0;
  let totalChoices = 0;
  let totalFlagSets = 0;
  let totalFlagClears = 0;
  let beatsWithDialogue = 0;
  let beatsWithChoices = 0;
  let beatsEmpty = 0;
  let totalCoins = 0;
  let totalEmbers = 0;
  let totalCoreIngots = 0;
  let totalGems = 0;
  const npcStats = new Map();
  const longestBeats = []; // sortable

  const ensureNpc = (key) => {
    const k = key || NARRATOR_KEY;
    if (!npcStats.has(k)) npcStats.set(k, emptyNpcRow());
    return npcStats.get(k);
  };

  // Track incoming-choice arrival for reachability bookkeeping.
  const reachable = new Set();
  for (const id of ids) {
    const beat = beatLookup.get(id);
    if (!beat) continue;
    // Beats with a real trigger or that sit on the main act spine reach
    // themselves; everything else needs to be queued by a choice.
    if (beat.trigger || isFinite(beat.act)) reachable.add(id);
  }
  for (const id of ids) {
    const beat = beatLookup.get(id);
    if (!beat) continue;
    for (const c of (Array.isArray(beat.choices) ? beat.choices : [])) {
      const target = c?.outcome?.queueBeat;
      if (target && beatLookup.has(target)) reachable.add(target);
    }
  }

  for (const id of ids) {
    const beat = beatLookup.get(id);
    if (!beat) continue;
    const lines = Array.isArray(beat.lines) ? beat.lines : [];
    let beatWords = 0;
    let beatLineCount = 0;
    for (const line of lines) {
      if (!line || typeof line.text !== "string" || line.text.trim() === "") continue;
      beatLineCount += 1;
      const w = wordCount(line.text);
      beatWords += w;
      const row = ensureNpc(line.speaker || null);
      row.lines += 1;
      row.words += w;
      row.beats.add(id);
    }
    if (beatLineCount === 0 && typeof beat.body === "string" && beat.body.trim()) {
      // Legacy `body` field counts as narrator content.
      const w = wordCount(beat.body);
      beatWords += w;
      beatLineCount += 1;
      const row = ensureNpc(null);
      row.lines += 1;
      row.words += w;
      row.beats.add(id);
    }
    totalLines += beatLineCount;
    totalWords += beatWords;
    if (beatLineCount > 0) beatsWithDialogue += 1;

    const choices = Array.isArray(beat.choices) ? beat.choices : [];
    if (choices.length > 0) {
      beatsWithChoices += 1;
      totalChoices += choices.length;
      for (const c of choices) {
        const o = c?.outcome || {};
        if (Number.isFinite(o.coins)) totalCoins += o.coins;
        if (Number.isFinite(o.embers)) totalEmbers += o.embers;
        if (Number.isFinite(o.coreIngots)) totalCoreIngots += o.coreIngots;
        if (Number.isFinite(o.gems)) totalGems += o.gems;
        for (const f of asArr(o.setFlag)) { totalFlagSets += 1; void f; }
        for (const f of asArr(o.clearFlag)) { totalFlagClears += 1; void f; }
        if (o.bondDelta?.npc && Number.isFinite(o.bondDelta.amount)) {
          ensureNpc(o.bondDelta.npc).bondDelta += o.bondDelta.amount;
        }
      }
    }
    if (beatLineCount === 0 && choices.length === 0 && !(beat.body && beat.body.trim())) {
      beatsEmpty += 1;
    }
    longestBeats.push({ id, title: beat.title || id, words: beatWords, lines: beatLineCount });
  }

  longestBeats.sort((a, b) => b.words - a.words);

  const npcs = [];
  for (const [key, row] of npcStats) {
    npcs.push({
      key,
      isNarrator: key === NARRATOR_KEY,
      lines: row.lines,
      words: row.words,
      beats: row.beats.size,
      bondDelta: row.bondDelta,
    });
  }
  npcs.sort((a, b) => (b.lines - a.lines) || a.key.localeCompare(b.key));

  const totalBeats = beatLookup.size;
  const reachableCount = reachable.size;
  return {
    totalBeats,
    draftBeats: draftBeats(draft).length,
    totalLines,
    totalWords,
    totalChoices,
    beatsWithDialogue,
    beatsWithChoices,
    beatsEmpty,
    forkDensity: totalBeats === 0 ? 0 : beatsWithChoices / totalBeats,
    avgChoicesPerFork: beatsWithChoices === 0 ? 0 : totalChoices / beatsWithChoices,
    reachableCount,
    unreachableCount: Math.max(0, totalBeats - reachableCount),
    npcs,
    longestBeats: longestBeats.slice(0, 8),
    flagOps: { sets: totalFlagSets, clears: totalFlagClears },
    currency: {
      coins: totalCoins,
      embers: totalEmbers,
      coreIngots: totalCoreIngots,
      gems: totalGems,
    },
  };
}

export const NARRATOR_SPEAKER = NARRATOR_KEY;

/** True when a beat is part of the author-created drafts lane. */
export function isAuthorBeat(draft, beatId) {
  return isDraftBeat(draft, beatId);
}

// Re-export so the panel doesn't have to dual-import from shared.jsx.
export { effectiveBeat, allBeatIds };
