// ─── Story state slice ────────────────────────────────────────────────────────
// Pure helpers: no Phaser, no DOM, fully testable in Vitest.

export const INITIAL_STORY_STATE = {
  act: 1,
  beat: "act1_arrival",
  flags: {},
  // Phase 1 — persisted record of every choice the player has made, in
  // order. Each entry: { beatId, choiceId, ts }. Read by the finale.
  choiceLog: [],
};

// ─── Cutscene scenes ─────────────────────────────────────────────────────────
// A beat may carry `scene: "<key>"`; the dialogue modal renders the matching
// theme's gradient behind the panel so different beats feel like different
// places/times without needing camera work or new texture art (§2.42).
export const SCENE_THEMES = Object.freeze({
  ruin:   { label: "A cold ruin",   bg: "radial-gradient(120% 100% at 50% 0%, #2c3640 0%, #161b21 60%, #0c0f12 100%)" },
  hearth: { label: "By the hearth", bg: "radial-gradient(120% 100% at 50% 100%, #5a2f12 0%, #2a1a0e 55%, #120c07 100%)" },
  night:  { label: "Deep night",    bg: "linear-gradient(180deg, #0c1530 0%, #0a0f22 60%, #06070f 100%)" },
  dawn:   { label: "First light",   bg: "linear-gradient(180deg, #b9663a 0%, #6a3a1f 45%, #281710 100%)" },
});

/** Returns the scene theme object for a beat, or null. */
export function beatScene(beat) {
  const key = beat?.scene;
  return (typeof key === "string" && SCENE_THEMES[key]) || null;
}

export const STORY_BEATS = [
  // ── Act 1 ──────────────────────────────────────────────────────────────────
  {
    id: "act1_arrival",
    act: 1,
    title: "A Cold Hearth",
    scene: "ruin",
    // Phase 1 — multi-line dialogue form (the doc's Wren opening). Each line
    // is { speaker, text }; speaker is an NPC id (or null for narration).
    lines: [
      { speaker: null, text: "You step through a doorway that has not been a doorway in years. A figure waits by a cold stone hollow." },
      { speaker: "wren", text: "Took you long enough." },
      { speaker: "wren", text: "This was the Hearth — or it will be again, if you've still got the hands for it." },
      { speaker: null, text: "She presses a pair of iron tongs into your palm." },
      { speaker: "wren", text: "Bring me 20 hay — we light it tonight. But first this place needs a name. Yours, now." },
    ],
    // A `prompt` replaces the Continue/choice buttons with an input. The
    // submit dispatches SET_SETTLEMENT_NAME then STORY/PICK_CHOICE.
    prompt: { kind: "name_settlement", zoneId: "home", placeholder: "Name your settlement…", buttonLabel: "Found it" },
    trigger: { type: "session_start" },
    onComplete: { setFlag: "intro_seen" },
  },
  {
    id: "act1_light_hearth",
    act: 1,
    title: "First Light",
    scene: "hearth",
    body: "Wren: 'The Hearth is alive again. Mira will be here soon.'",
    trigger: { type: "resource_total", key: "grass_hay", amount: 20 },
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
    body: "Bram: 'The cold is a creature. Gather 30 logs or we burn the rafters.'",
    // Phase 7 — was `season_entered: winter`. The calendar was removed in #289;
    // this beat now fires when the player has hauled enough firewood total.
    trigger: { type: "resource_total", key: "wood_log", amount: 30 },
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
    trigger: { type: "resource_total_multi", req: { mine_stone: 20, mine_coal: 10 } },
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
    title: "The Settlement Lives",
    scene: "dawn",
    // {settlement} is replaced at render time with the player-chosen name.
    // (The recurring-festival / Old-Capital-finale rework is a later phase;
    // for now this stays the act-3 milestone, just no longer "the vale".)
    body: "The festival larder is full. {settlement} lives again — and there is more of the old kingdom still to find. (Sandbox mode continues.)",
    trigger: {
      type: "resource_total_multi",
      req: { grass_hay: 50, grain_wheat: 50, grain: 50, berry: 50, wood_log: 50 },
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
  const m = String(body ?? "").match(/^([A-Z][a-zA-Z ]+?):/);
  return m ? (SPEAKER_MAP[m[1]] ?? null) : null;
}

/**
 * Strips a recognised "Speaker: " prefix and surrounding single quotes from a
 * legacy `body` string so the dialogue UI can render clean text alongside the
 * parsed speaker. Lines authored directly in `lines[]` form are already clean,
 * so this is a no-op on them.
 *   "Wren: 'bring me hay'" → "bring me hay"
 *   "The larder is full."  → "The larder is full."
 */
export function stripSpeakerPrefix(text) {
  let t = String(text ?? "");
  const m = t.match(/^([A-Z][a-zA-Z ]+?):\s*(.*)$/s);
  if (m && SPEAKER_MAP[m[1]]) t = m[2];
  // Trim a single matched pair of wrapping single quotes (the legacy style).
  const q = t.match(/^'(.*)'$/s);
  if (q) t = q[1];
  return t.trim();
}

// ─── Dialogue + choice schema (Phase 1) ──────────────────────────────────────

/**
 * Normalised line list for a beat. New beats author `lines: [{speaker, text}]`
 * directly; legacy beats carry a single `body: "Speaker: '...'"` string which
 * we project into one clean line.
 * @returns {Array<{ speaker: string|null, text: string }>}
 */
export function beatLines(beat) {
  if (beat && Array.isArray(beat.lines) && beat.lines.length > 0) {
    return beat.lines.map((l) => ({
      speaker: l?.speaker ?? null,
      text: String(l?.text ?? ""),
    }));
  }
  if (beat && typeof beat.body === "string") {
    return [{ speaker: parseSpeaker(beat.body), text: stripSpeakerPrefix(beat.body) }];
  }
  return [];
}

/**
 * Normalised choice list for a beat. A beat with no authored `choices` gets a
 * single "continue" choice (the legacy "Continue" button). Each choice:
 *   { id, label, outcome? }
 * where `outcome` (optional) is consumed by `applyChoiceOutcome`.
 * @returns {Array<{ id: string, label: string, outcome?: object }>}
 */
export function beatChoices(beat) {
  if (beat && Array.isArray(beat.choices) && beat.choices.length > 0) {
    return beat.choices.map((c, i) => ({
      id: c?.id ?? `choice_${i}`,
      label: String(c?.label ?? "Continue"),
      outcome: c?.outcome ?? null,
    }));
  }
  return [{ id: "continue", label: String(beat?.continueLabel ?? "Continue"), outcome: null }];
}

/**
 * True when the beat presents exactly the single implicit "Continue" choice
 * (i.e. it can be dismissed without a decision — ESC / backdrop ok).
 */
export function beatIsContinueOnly(beat) {
  const cs = beatChoices(beat);
  return cs.length === 1 && cs[0].id === "continue";
}

/**
 * Replaces `{token}` placeholders in dialogue text. Unknown tokens are left
 * verbatim. Currently the modal supplies `{ settlement }` (the player's home
 * settlement name); more vars can be added without touching this function.
 */
export function interpolateBeatText(text, vars = {}) {
  return String(text ?? "").replace(/\{(\w+)\}/g, (m, k) =>
    Object.prototype.hasOwnProperty.call(vars, k) ? String(vars[k]) : m
  );
}

/**
 * Pure. Applies a choice's `outcome` to the full game state. Does not mutate.
 * Supported outcome keys (all optional, all composable):
 *   setFlag:    string | string[]            — set story flag(s) true
 *   clearFlag:  string | string[]            — set story flag(s) false
 *   bondDelta:  { npc: string, amount: n }   — add to that NPC's bond (clamped 0..10)
 *   resources:  { [key]: n }                 — add to inventory (clamped ≥ 0)
 *   coins:      n                            — add to coins (clamped ≥ 0)
 *   queueBeat:  string                       — append a beat id to the modal queue
 * A falsy `outcome` is a no-op.
 */
export function applyChoiceOutcome(gameState, outcome) {
  if (!outcome || typeof outcome !== "object") return gameState;
  let next = { ...gameState };

  const setFlags = (val, on) => {
    const keys = Array.isArray(val) ? val : [val];
    const flags = { ...(next.story?.flags ?? {}) };
    for (const k of keys) if (typeof k === "string" && k) flags[k] = on;
    next = { ...next, story: { ...next.story, flags } };
  };
  if (outcome.setFlag) setFlags(outcome.setFlag, true);
  if (outcome.clearFlag) setFlags(outcome.clearFlag, false);

  if (outcome.bondDelta && typeof outcome.bondDelta === "object") {
    const { npc, amount } = outcome.bondDelta;
    if (typeof npc === "string" && Number.isFinite(amount)) {
      const bonds = { ...(next.npcs?.bonds ?? {}) };
      const cur = Number.isFinite(bonds[npc]) ? bonds[npc] : 5;
      bonds[npc] = Math.max(0, Math.min(10, cur + amount));
      next = { ...next, npcs: { ...next.npcs, bonds } };
    }
  }

  if (outcome.resources && typeof outcome.resources === "object") {
    const inventory = { ...(next.inventory ?? {}) };
    for (const [k, v] of Object.entries(outcome.resources)) {
      if (!Number.isFinite(v)) continue;
      inventory[k] = Math.max(0, (inventory[k] ?? 0) + v);
    }
    next = { ...next, inventory };
  }

  if (Number.isFinite(outcome.coins)) {
    next = { ...next, coins: Math.max(0, (next.coins ?? 0) + outcome.coins) };
  }

  if (typeof outcome.queueBeat === "string") {
    const beat = STORY_BEATS.find((b) => b.id === outcome.queueBeat);
    if (beat) {
      const queue = next.story?.beatQueue ?? [];
      const open = !!next.story?.queuedBeat;
      next = {
        ...next,
        story: {
          ...next.story,
          queuedBeat: open ? next.story.queuedBeat : beat,
          beatQueue: open ? [...queue, beat] : queue,
        },
      };
    }
  }

  return next;
}
