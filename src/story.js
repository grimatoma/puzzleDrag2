// ─── Story state slice ────────────────────────────────────────────────────────
// Pure helpers: no Phaser, no DOM, fully testable in Vitest.

export const INITIAL_STORY_STATE = {
  act: 1,
  beat: "act1_arrival",
  flags: {},
};

export const STORY_BEATS = [
  // ── Act 1 ──────────────────────────────────────────────────────────────────
  {
    id: "act1_arrival",
    act: 1,
    title: "A Cold Hearth",
    body: "Wren: 'The vale was abandoned years ago. Bring me 20 hay — we'll light the Hearth.'",
    trigger: { type: "session_start" },
    onComplete: { setFlag: "intro_seen" },
  },
  {
    id: "act1_light_hearth",
    act: 1,
    title: "First Light",
    body: "Wren: 'The Hearth is alive again. Mira will be here soon.'",
    trigger: { type: "resource_total", key: "hay", amount: 20 },
    onComplete: { setFlag: "hearth_lit", spawnNPC: "mira" },
  },
  {
    id: "act1_first_bread",
    act: 1,
    title: "Bread for the Vale",
    body: "Mira: 'Bake a loaf with me — I'll show you the oven.'",
    trigger: { type: "craft_made", item: "bread", count: 1 },
    onComplete: { setFlag: "first_craft", spawnNPC: "tomas" },
  },
  {
    id: "act1_build_mill",
    act: 1,
    title: "The Mill Stands",
    body: "Tomas: 'A mill! Now we won't starve come winter.'",
    trigger: { type: "building_built", id: "mill" },
    onComplete: { setFlag: "mill_built", advanceAct: 2 },
  },
  // ── Act 2 ──────────────────────────────────────────────────────────────────
  {
    id: "act2_bram_arrives",
    act: 2,
    title: "The Smith",
    body: "Bram: 'I need a forge. The vale needs iron.'",
    trigger: { type: "act_entered", act: 2 },
    onComplete: { spawnNPC: "bram" },
  },
  {
    id: "act2_first_hinge",
    act: 2,
    title: "Iron in the Vale",
    body: "Bram: 'A hinge! Small thing — but it begins.'",
    trigger: { type: "craft_made", item: "iron_hinge", count: 1 },
    onComplete: { setFlag: "first_iron" },
  },
  {
    id: "act2_frostmaw",
    act: 2,
    title: "Frostmaw Wakes",
    body: "Bram: 'The cold is a creature. Gather 30 logs this season or we burn the rafters.'",
    trigger: { type: "season_entered", season: "winter" },
    onComplete: { setFlag: "frostmaw_active", spawnBoss: "frostmaw" },
  },
  {
    id: "act2_liss_arrives",
    act: 2,
    title: "The Healer",
    body: "Sister Liss: 'A child has fever. I need berries.'",
    trigger: { type: "boss_defeated", id: "frostmaw" },
    onComplete: { spawnNPC: "liss", advanceAct: 3 },
  },
  // ── Act 3 ──────────────────────────────────────────────────────────────────
  {
    id: "act3_mine_found",
    act: 3,
    title: "The Mine",
    body: "Wren: 'I found a sealed mine. Stone and coal will open it.'",
    trigger: { type: "act_entered", act: 3 },
    onComplete: { setFlag: "mine_revealed" },
  },
  {
    id: "act3_mine_opened",
    act: 3,
    title: "Into the Dark",
    body: "Wren: 'The seal is broken. The mine is yours.'",
    trigger: { type: "resource_total_multi", req: { stone: 20, coal: 10 } },
    onComplete: { setFlag: "mine_unlocked", unlockBiome: "mine" },
  },
  {
    id: "act3_caravan",
    act: 3,
    title: "The Caravan Post",
    body: "Tomas: 'Far traders are coming. The vale is on the map again.'",
    trigger: { type: "building_built", id: "caravan_post" },
    onComplete: { setFlag: "caravan_open" },
  },
  {
    id: "act3_festival",
    act: 3,
    title: "The Harvest Festival",
    body: "Mira: 'Fill the larder — 50 each of hay, wheat, grain, berry, log. The vale will feast.'",
    trigger: { type: "all_buildings_built" },
    onComplete: { setFlag: "festival_announced" },
  },
  {
    id: "act3_win",
    act: 3,
    title: "The Vale Lives",
    body: "The festival larder is full. Hearthwood Vale lives again. (Sandbox mode continues.)",
    trigger: {
      type: "resource_total_multi",
      req: { hay: 50, wheat: 50, grain: 50, berry: 50, log: 50 },
    },
    onComplete: { setFlag: "isWon" },
  },
];

// ─── Pure helpers ────────────────────────────────────────────────────────────

/**
 * Returns the auto-generated fired-flag key for a beat.
 * e.g. "act2_bram_arrives" → "_fired_act2_bram_arrives"
 */
export function firedFlagKey(beatId) {
  return `_fired_${beatId}`;
}

/**
 * Returns true if the given beat has been completed.
 * Beats with an explicit onComplete.setFlag use that flag.
 * Beats without one use an auto-generated "_fired_<id>" flag set when the beat fires.
 * @param {object} state  — story state (act, beat, flags)
 * @param {string} beatId — beat id to test
 */
export function isBeatComplete(state, beatId) {
  const beat = STORY_BEATS.find((b) => b.id === beatId);
  if (!beat) return false;
  // Check explicit flag first; fall back to auto-generated fired marker.
  const explicitKey = beat.onComplete?.setFlag;
  if (explicitKey) return !!state.flags[explicitKey];
  return !!state.flags[firedFlagKey(beatId)];
}

/**
 * Returns the first beat whose act ≤ state.act and that has not yet been completed.
 * @param {object} state — story state
 */
export function nextPendingBeat(state) {
  return STORY_BEATS.find(
    (b) => b.act <= state.act && !isBeatComplete(state, b.id)
  );
}

// ─── Trigger evaluator ────────────────────────────────────────────────────────

/**
 * Returns true if the beat's trigger matches the given game event.
 */
function triggerMatches(beat, event, state, totals) {
  const t = beat.trigger;
  if (t.type !== event.type) return false;

  switch (t.type) {
    case "session_start":
      return true;
    case "act_entered":
      return event.act === t.act;
    case "season_entered":
      return event.season === t.season;
    case "resource_total":
      return (totals[t.key] ?? 0) >= t.amount;
    case "resource_total_multi":
      return Object.entries(t.req).every(([k, v]) => (totals[k] ?? 0) >= v);
    case "craft_made":
      return event.item === t.item && (event.count ?? 1) >= (t.count ?? 1);
    case "building_built":
      return event.id === t.id;
    case "boss_defeated":
      return event.id === t.id;
    case "all_buildings_built":
      return event.allBuilt === true;
    default:
      return false;
  }
}

/**
 * Pure function. Evaluates story triggers after a game event.
 *
 * Beats fire in strict order — never skips an earlier pending beat.
 * The act3_win beat additionally requires festival_announced flag.
 *
 * @param {object} state  — story state { act, beat, flags }
 * @param {object} event  — game event { type, ...fields }
 * @param {object} totals — inventory snapshot (resource key → amount)
 * @returns {{ firedBeat, newFlags, sideEffects } | null}
 */
export function evaluateStoryTriggers(state, event, totals = {}) {
  const next = nextPendingBeat(state);
  if (!next) return null;

  // Extra guard for the win beat: festival must be announced first
  if (next.id === "act3_win" && !state.flags.festival_announced) return null;

  if (!triggerMatches(next, event, state, totals)) return null;

  const newFlags = { ...state.flags };
  if (next.onComplete?.setFlag) {
    newFlags[next.onComplete.setFlag] = true;
  } else {
    // Beats without an explicit flag get an auto-generated fired marker
    // so they are never re-triggered.
    newFlags[firedFlagKey(next.id)] = true;
  }

  return { firedBeat: next, newFlags, sideEffects: next.onComplete ?? {} };
}

// ─── Beat result applicator ───────────────────────────────────────────────────

/**
 * Pure function. Applies the side effects of a fired beat to the full game state.
 * Does NOT mutate the input state.
 *
 * Handles: setFlag, spawnNPC, unlockBiome, advanceAct, spawnBoss
 *
 * @param {object} gameState   — full game state
 * @param {object} sideEffects — beat.onComplete (or a subset for testing)
 * @returns {object} new game state with side effects applied
 */
export function applyBeatResult(gameState, sideEffects) {
  let next = { ...gameState };

  // --- setFlag ---
  if (sideEffects.setFlag) {
    next = {
      ...next,
      story: {
        ...next.story,
        flags: { ...next.story.flags, [sideEffects.setFlag]: true },
      },
    };
  }

  // --- spawnNPC ---
  if (sideEffects.spawnNPC) {
    const npc = sideEffects.spawnNPC;
    const roster = next.npcs?.roster ?? [];
    if (!roster.includes(npc)) {
      const bonds = next.npcs?.bonds ?? {};
      next = {
        ...next,
        npcs: {
          ...next.npcs,
          roster: [...roster, npc],
          bonds: { ...bonds, [npc]: bonds[npc] ?? 5 },
        },
      };
    }
  }

  // --- unlockBiome ---
  if (sideEffects.unlockBiome) {
    next = {
      ...next,
      unlockedBiomes: {
        ...(next.unlockedBiomes ?? {}),
        [sideEffects.unlockBiome]: true,
      },
    };
  }

  // --- advanceAct ---
  if (sideEffects.advanceAct) {
    next = {
      ...next,
      story: { ...next.story, act: sideEffects.advanceAct },
    };
  }

  // --- spawnBoss ---
  if (sideEffects.spawnBoss) {
    next = {
      ...next,
      pendingBossKey: sideEffects.spawnBoss,
    };
  }

  return next;
}

// ─── Speaker parser ───────────────────────────────────────────────────────────

const SPEAKER_MAP = {
  Wren: "wren",
  Mira: "mira",
  "Old Tomas": "tomas",
  Tomas: "tomas",
  Bram: "bram",
  "Sister Liss": "liss",
  Liss: "liss",
};

/**
 * Parses the speaker key from the first line of a beat body.
 * e.g. "Wren: 'hello'" → "wren"
 * Returns null if no recognisable speaker prefix.
 */
export function parseSpeaker(body) {
  const m = body.match(/^([A-Z][a-zA-Z ]+?):/);
  return m ? (SPEAKER_MAP[m[1]] ?? null) : null;
}
