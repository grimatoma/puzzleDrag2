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
  ruin:   { label: "A cold ruin",     bg: "radial-gradient(120% 100% at 50% 0%, #2c3640 0%, #161b21 60%, #0c0f12 100%)" },
  hearth: { label: "By the hearth",   bg: "radial-gradient(120% 100% at 50% 100%, #5a2f12 0%, #2a1a0e 55%, #120c07 100%)" },
  night:  { label: "Deep night",      bg: "linear-gradient(180deg, #0c1530 0%, #0a0f22 60%, #06070f 100%)" },
  dawn:   { label: "First light",     bg: "linear-gradient(180deg, #b9663a 0%, #6a3a1f 45%, #281710 100%)" },
  frost:  { label: "The frozen wood", bg: "radial-gradient(120% 100% at 50% 10%, #2a4a5a 0%, #142a36 55%, #07121a 100%)" },
});

export type SceneThemeKey = keyof typeof SCENE_THEMES;
export type SceneTheme = (typeof SCENE_THEMES)[SceneThemeKey];

export interface BeatLine {
  speaker: string | null;
  text: string;
}

export interface BeatChoice {
  id: string;
  label: string;
  outcome?: ChoiceOutcome | null;
}

export interface BeatTrigger {
  type: string;
  [k: string]: unknown;
}

export interface Beat {
  id: string;
  act?: number;
  title?: string;
  scene?: string;
  body?: string;
  lines?: BeatLine[];
  prompt?: { kind: string; zoneId?: string; placeholder?: string; buttonLabel?: string };
  trigger?: BeatTrigger;
  onComplete?: BeatSideEffects;
  choices?: BeatChoice[];
  continueLabel?: string;
  repeat?: boolean;
  repeatCooldown?: number;
  [k: string]: unknown;
}

export interface BeatSideEffects {
  setFlag?: string | string[];
  spawnNPC?: string;
  unlockBiome?: string;
  advanceAct?: number;
  spawnBoss?: string;
  [k: string]: unknown;
}

export interface ChoiceOutcome {
  setFlag?: string | string[];
  clearFlag?: string | string[];
  bondDelta?: { npc: string; amount: number };
  resources?: Record<string, number>;
  coins?: number;
  embers?: number;
  coreIngots?: number;
  gems?: number;
  heirlooms?: Record<string, number>;
  queueBeat?: string;
  [k: string]: unknown;
}

/** Returns the scene theme object for a beat, or null. */
export function beatScene(beat: Beat | null | undefined): SceneTheme | null {
  const key = beat?.scene;
  if (typeof key !== "string") return null;
  return (SCENE_THEMES as Record<string, SceneTheme | undefined>)[key] ?? null;
}

export const STORY_BEATS = [
  // ── Act 1 ──────────────────────────────────────────────────────────────────
  {
    id: "act1_arrival",
    act: 1,
    title: "A Cold Hearth",
    scene: "ruin",
    lines: [
      { speaker: null, text: "You step through a doorway that has not been a doorway in years. A figure waits by a cold stone hollow." },
      { speaker: "wren", text: "Took you long enough." },
      { speaker: "wren", text: "This was the Hearth — or it will be again, if you've still got the hands for it." },
      { speaker: null, text: "She presses a pair of iron tongs into your palm." },
      { speaker: "wren", text: "Bring me 20 hay — we light it tonight. But first this place needs a name. Yours, now." },
    ],
    prompt: { kind: "name_settlement", zoneId: "home", placeholder: "Name your settlement…", buttonLabel: "Found it" },
    trigger: { type: "session_start" },
    onComplete: { setFlag: "intro_seen" },
  },
  {
    id: "act1_first_harvest",
    act: 1,
    title: "The First Harvest",
    scene: "ruin",
    lines: [
      { speaker: "wren", text: "There. The first of many. This land was dead, but it still remembers how to grow." },
      { speaker: "wren", text: "Mira will be here soon. She'll need that hay for the workers' fires." },
    ],
    trigger: { type: "resource_total", key: "tile_grass_hay", amount: 1 },
    onComplete: { setFlag: "first_harvest" },
  },
  {
    id: "act1_light_hearth",
    act: 1,
    title: "First Light",
    scene: "hearth",
    body: "Wren: 'The Hearth is alive again. Mira will be here soon.'",
    trigger: { type: "resource_total", key: "tile_grass_hay", amount: 20 },
    onComplete: { setFlag: "hearth_lit", spawnNPC: "mira" },
  },
  {
    id: "act1_first_order",
    act: 1,
    title: "The First Delivery",
    body: "Mira: 'There. Someone asked, you answered, and the Vale knows it can ask again.'",
    trigger: { type: "order_fulfilled", count: 1 },
    onComplete: { setFlag: "first_order", spawnNPC: "tomas" },
  },
  {
    id: "act1_build_granary",
    act: 1,
    title: "Room For Tomorrow",
    body: "Tomas: 'A granary means you are not just surviving the field. You are planning the next one.'",
    trigger: { type: "building_built", id: "granary" },
    onComplete: { setFlag: "granary_built" },
  },
  {
    id: "act1_keeper_trial",
    act: 1,
    title: "The Keeper At The Fence",
    body: "Wren: 'The old keeper has noticed us. Settle this, and the road beyond the Vale can open.'",
    trigger: { type: "keeper_confronted", zoneId: "home" },
    onComplete: { setFlag: "home_keeper_resolved", advanceAct: 2 },
  },
  // ── Act 2 ──────────────────────────────────────────────────────────────────
  {
    id: "act2_bram_arrives",
    act: 2,
    title: "The Smith",
    body: "Bram: 'I need a forge. The vale needs iron.'",
    trigger: { type: "act_entered", act: 2 },
    onComplete: { spawnNPC: "bram", setFlag: "bram_arrived" },
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
    title: "Quarry Foothold",
    body: "Bram: 'That stone is not just stone. It is road, wall, kiln, and promise.'",
    // Save-compat id: this was the Frostmaw audit-boss beat. Keeper Trials now
    // own boss progression, so Act 2 uses the quarry as the next-zone tutorial.
    trigger: { type: "resource_total", key: "tile_mine_stone", amount: 20 },
    onComplete: { setFlag: "quarry_foothold" },
  },
  {
    id: "act2_liss_arrives",
    act: 2,
    title: "The Healer",
    body: "Sister Liss: 'A child has fever. I need berries.'",
    trigger: { type: "resource_total_multi", req: { tile_mine_stone: 20, tile_fruit_blackberry: 10 } },
    onComplete: { spawnNPC: "liss", setFlag: "liss_arrived", advanceAct: 3 },
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
    trigger: { type: "resource_total_multi", req: { tile_mine_stone: 20, tile_mine_coal: 10 } },
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
      req: { tile_grass_hay: 50, tile_grain_wheat: 50, flour: 50, tile_fruit_blackberry: 50, tile_tree_oak: 50 },
    },
    onComplete: { setFlag: "isWon" },
  },
];

// ─── Side beats ──────────────────────────────────────────────────────────────
// Opportunistic beats — Bond-8 personal arcs (Phase 2) and, later, random side
// events (§4.15). Unlike STORY_BEATS, they are NOT act-ordered: each fires the
// next "settle moment" (session start/end) once its trigger condition is met,
// without blocking the main story. Resolution beats (queued via a choice's
// `queueBeat` outcome) carry no `trigger`. `onComplete.setFlag` marks the
// triggering beat as fired so it never re-queues.
export const SIDE_BEATS: Beat[] = [
  // ── Onboarding (Beat 4) ───────────────────────────────────────────────────
  {
    id: "tutorial_beat_4",
    title: "The Rhythm of the Vale",
    scene: "ruin",
    lines: [
      { speaker: "wren", text: "Every move you make on that board spends time. See the counter? When it hits zero, the season turns." },
      { speaker: "wren", text: "Harvest what you can, but remember: we're not just collecting hay. We're building a home. Every scrap counts toward the next construction." },
    ],
    trigger: { type: "resource_total", key: "tile_grass_hay", amount: 5 },
    onComplete: { setFlag: "tutorial_beat_4" },
  },

  // ── Mira's Letter (Bond-8) ────────────────────────────────────────────────
  {
    id: "mira_letter_1",
    title: "Mira's Letter",
    scene: "hearth",
    lines: [
      { speaker: "mira", text: "Can I show you something? I've been... not sending it." },
      { speaker: null, text: "She unfolds a sheet of paper, soft and re-creased a hundred times over." },
      { speaker: "mira", text: "It's for my brother. Edrin. He went south before the kingdom emptied — said he'd be back by harvest. That was a long string of harvests ago." },
      { speaker: "mira", text: "If I send it and there's no answer... that's a worse kind of quiet than not knowing. I keep telling myself I'll decide tomorrow." },
    ],
    trigger: { type: "bond_at_least", npc: "mira", amount: 8 },
    choices: [
      { id: "send", label: "Send it. He'd want to hear from you.",
        outcome: { setFlag: ["mira_letter_resolved", "mira_letter_sent"], bondDelta: { npc: "mira", amount: 1 }, queueBeat: "mira_letter_sent" } },
      { id: "keep", label: "Keep it. There's no hurry.",
        outcome: { setFlag: ["mira_letter_resolved", "mira_letter_kept"], queueBeat: "mira_letter_kept" } },
      { id: "read", label: "Read it to me first?",
        outcome: { setFlag: ["mira_letter_resolved", "mira_letter_read"], bondDelta: { npc: "mira", amount: 0.5 }, queueBeat: "mira_letter_read" } },
    ],
    onComplete: { setFlag: "mira_letter_seen" },
  },
  {
    id: "mira_letter_sent",
    title: "Mira's Letter",
    scene: "hearth",
    lines: [
      { speaker: null, text: "Mira folds the letter into the next caravan satchel before she can talk herself out of it." },
      { speaker: "mira", text: "There. Gone. If anything ever comes back addressed to {settlement}, you'll be the first to hear it. I mean that." },
      { speaker: null, text: "She slides a fresh loaf across the counter on her way out, the way she does when words run short." },
    ],
  },
  {
    id: "mira_letter_kept",
    title: "Mira's Letter",
    scene: "hearth",
    lines: [
      { speaker: null, text: "Mira tucks the letter back inside her apron, just over the flour-dust." },
      { speaker: "mira", text: "Some doors you want to know are still there before you knock. ...Thank you. For not pushing." },
    ],
  },
  {
    id: "mira_letter_read",
    title: "Mira's Letter",
    scene: "hearth",
    lines: [
      { speaker: null, text: "She reads it aloud, low and even — the bakery, the new name over the door, the smell of the place." },
      { speaker: "mira", text: "\"...and there's a settlement again, Edrin. They call it {settlement}. There's room.\"" },
      { speaker: "mira", text: "I still don't know how to end it. But it helped, hearing it out loud. I'll decide when I'm ready." },
    ],
  },

  // ── Legacy Frostmaw side fork ──────────────────────────────────────────────
  // Kept for save/editor compatibility. Live keeper choices now resolve through
  // settlement Keeper Trials/Pacts rather than a post-boss modal.
  {
    id: "frostmaw_keeper",
    title: "The Hearth-Keeper",
    scene: "frost",
    lines: [
      { speaker: null, text: "The Frostmaw does not fall so much as settle — frost crackling down to a low blue glow that does not melt." },
      { speaker: "wren", text: "It's not a beast. Not really. It kept this hearth cold so nothing else could take it. ...Now it's waiting on you." },
      { speaker: null, text: "The cold leans toward {settlement} like it's listening." },
      { speaker: "wren", text: "We can let it stay — bind it to the hearth, the way it's always been. Or we break its hold for good and take what's left of its core. Your call." },
    ],
    choices: [
      { id: "coexist", label: "Let it stay. The hearth can share its warmth.",
        outcome: { setFlag: ["keeper_choice_made", "keeper_path_coexist"], embers: 5, queueBeat: "frostmaw_keeper_coexist" } },
      { id: "drive_out", label: "Break its hold. The hearth is ours alone.",
        outcome: { setFlag: ["keeper_choice_made", "keeper_path_driveout"], coreIngots: 5, queueBeat: "frostmaw_keeper_driveout" } },
    ],
  },
  {
    id: "frostmaw_keeper_coexist",
    title: "The Hearth-Keeper",
    scene: "frost",
    lines: [
      { speaker: null, text: "The blue glow folds itself into the hearthstone and goes quiet. The wood at the settlement's edge stays rimed and still — guarded." },
      { speaker: "wren", text: "It'll tend the cold edges. That's worth something — Embers, the old word for it. We can draw on them, in time." },
    ],
  },
  {
    id: "frostmaw_keeper_driveout",
    title: "The Hearth-Keeper",
    scene: "frost",
    lines: [
      { speaker: null, text: "Wren works the frost-core loose with the iron tongs. It comes away as dense grey ingots — Core Ingots — colder than they have any right to be." },
      { speaker: "wren", text: "The hearth's ours, clean. No guardian on the edges now, mind. We can make something of the core — in time." },
    ],
  },
];

// ─── Pure helpers ────────────────────────────────────────────────────────────

/** Find a beat by id across both the main and side beat lists. */
export function findBeat(id: string): Beat | null {
  return (STORY_BEATS as readonly Beat[]).find((b) => b.id === id)
    || (SIDE_BEATS as readonly Beat[]).find((b) => b.id === id)
    || null;
}

/**
 * Returns the auto-generated fired-flag key for a beat.
 * e.g. "act2_bram_arrives" → "_fired_act2_bram_arrives"
 */
export function firedFlagKey(beatId: string): string {
  return `_fired_${beatId}`;
}

function flagList(value: string | string[] | null | undefined): string[] {
  return Array.isArray(value) ? value.filter(Boolean) : (value ? [value] : []);
}

export interface StoryState {
  act: number;
  beat?: string | null;
  flags: Record<string, boolean>;
  choiceLog?: Array<{ beatId: string; choiceId: string; ts: number }>;
  queuedBeat?: Beat | null;
  beatQueue?: Beat[];
  sandbox?: boolean;
  repeatCooldowns?: Record<string, number>;
  [k: string]: unknown;
}

/**
 * Returns true if the given beat has been completed.
 * Beats with an explicit onComplete.setFlag use that flag.
 * Beats without one use an auto-generated "_fired_<id>" flag set when the beat fires.
 */
export function isBeatComplete(state: StoryState, beatId: string): boolean {
  const beat = (STORY_BEATS as readonly Beat[]).find((b) => b.id === beatId);
  if (!beat) return false;
  // Check explicit flag first; fall back to auto-generated fired marker.
  const explicitKey = beat.onComplete?.setFlag;
  const explicitFlags = flagList(explicitKey);
  if (explicitFlags.length > 0) return explicitFlags.some((flag) => !!state.flags[flag]);
  return !!state.flags[firedFlagKey(beatId)];
}

/**
 * Returns the first beat whose act ≤ state.act and that has not yet been completed.
 */
export function nextPendingBeat(state: StoryState): Beat | undefined {
  return (STORY_BEATS as readonly Beat[]).find(
    (b) => (b.act ?? 0) <= state.act && !isBeatComplete(state, b.id)
  );
}

// ─── Trigger evaluator ────────────────────────────────────────────────────────

/**
 * Returns true if a trigger *condition* matches a game event (+ current state).
 * Shared by the story-beat evaluator, the side-beat evaluator, and the
 * flag-trigger evaluator (src/flags.js) so they all speak one vocabulary.
 *
 * Two flavours of condition:
 *  - **event conditions** (`craft_made`, `building_built`, `order_fulfilled`, `keeper_confronted`, `boss_defeated`,
 *    `act_entered`, `session_start/ended`, `all_buildings_built`): must match
 *    `event.type` exactly — they fire when that event happens.
 *  - **state conditions** (`resource_total`, `resource_total_multi`,
 *    `flag_set`, `flag_cleared`): a predicate on current state; matches on
 *    *any* event once the predicate holds (so a beat with such a trigger fires
 *    the next time anything happens after the condition becomes true). NB:
 *    `bond_at_least` is also state-driven but its bonds snapshot lives with the
 *    callers, so they handle it themselves.
 *
 * @param {object} t      — trigger condition `{ type, ...fields }`
 * @param {object} event  — game event `{ type, ...fields }`
 * @param {object} totals — inventory snapshot (resource key → amount)
 * @param {object} flags  — `state.story.flags` (for flag_set / flag_cleared)
 */
export interface StoryEvent {
  type: string;
  [k: string]: unknown;
}

export function conditionMatches(
  t: BeatTrigger | null | undefined,
  event: StoryEvent | null | undefined,
  totals: Record<string, number> = {},
  flags: Record<string, boolean> = {},
): boolean {
  if (!t) return false;
  // state conditions — checked regardless of which event fired
  switch (t.type) {
    case "resource_total": {
      const key = t.key as string;
      const amount = t.amount as number;
      return (totals[key] ?? 0) >= amount;
    }
    case "resource_total_multi": {
      const req = (t.req ?? {}) as Record<string, number>;
      return Object.entries(req).every(([k, v]) => (totals[k] ?? 0) >= v);
    }
    case "flag_set":             return !!flags[t.flag as string];
    case "flag_cleared":         return !!t.flag && !flags[t.flag as string];
    default: break;
  }
  // event conditions — must match the event's type
  if (t.type !== event?.type) return false;
  switch (t.type) {
    case "session_start":
    case "session_ended":      return true;
    case "act_entered":        return event.act === t.act;
    case "craft_made":         return event.item === t.item && ((event.count as number | undefined) ?? 1) >= ((t.count as number | undefined) ?? 1);
    case "building_built":     return event.id === t.id;
    case "order_fulfilled":    return ((event.count as number | undefined) ?? 1) >= ((t.count as number | undefined) ?? 1);
    case "keeper_confronted":  return (!t.zoneId || event.zoneId === t.zoneId) && (!t.path || event.path === t.path);
    case "boss_defeated":      return event.id === t.id;
    case "all_buildings_built":return event.allBuilt === true;
    default:                   return false;
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
export function evaluateStoryTriggers(
  state: StoryState,
  event: StoryEvent,
  totals: Record<string, number> = {},
  opts: { onlyFlagConditions?: boolean } = {},
): { firedBeat: Beat; newFlags: Record<string, boolean>; sideEffects: BeatSideEffects } | null {
  const next = nextPendingBeat(state);
  if (!next) return null;
  if (opts.onlyFlagConditions && next.trigger?.type !== "flag_set" && next.trigger?.type !== "flag_cleared") return null;

  // Extra guard for the win beat: festival must be announced first
  if (next.id === "act3_win" && !state.flags.festival_announced) return null;

  if (!next.trigger || !conditionMatches(next.trigger, event, totals, state.flags ?? {})) return null;

  const newFlags = { ...state.flags };
  const setFlags = flagList(next.onComplete?.setFlag);
  if (setFlags.length > 0) {
    for (const flag of setFlags) newFlags[flag] = true;
  } else {
    // Beats without an explicit flag get an auto-generated fired marker
    // so they are never re-triggered.
    newFlags[firedFlagKey(next.id)] = true;
  }

  return { firedBeat: next, newFlags, sideEffects: next.onComplete ?? {} };
}

// ─── Side-beat trigger evaluation ────────────────────────────────────────────

const SIDE_SETTLE_EVENTS = new Set(["session_start", "session_ended"]);
// Predicate-style conditions (true as long as some state holds), as opposed to
// the discrete event conditions (`craft_made`, `building_built`, …).
const STATE_CONDITION_TYPES = new Set(["resource_total", "resource_total_multi", "bond_at_least", "flag_set", "flag_cleared"]);

interface SideBeatGameState {
  story?: StoryState | { flags?: Record<string, boolean>; repeatCooldowns?: Record<string, number> };
  inventory?: Record<string, number>;
  npcs?: { bonds?: Record<string, number> };
}

/** True if a side beat has already fired (by its onComplete.setFlag or fired marker). */
function sideBeatFired(flags: Record<string, boolean> | undefined, beat: Beat): boolean {
  const explicitFlags = flagList(beat.onComplete?.setFlag);
  if (explicitFlags.length > 0) return explicitFlags.some((flag) => !!flags?.[flag]);
  return !!flags?.[firedFlagKey(beat.id)];
}

function sideTriggerMatches(beat: Beat, event: StoryEvent, gameState: SideBeatGameState | undefined): boolean {
  const t = beat.trigger;
  if (!t) return false; // resolution beats (queued via choices) have no trigger
  const cooldowns = (gameState?.story as { repeatCooldowns?: Record<string, number> } | undefined)?.repeatCooldowns ?? {};
  if (beat.repeat && (cooldowns[beat.id] ?? 0) > 0) return false;
  if (t.type === "bond_at_least") {
    // State-driven via the bonds snapshot (not in `conditionMatches`) — fires
    // the next settle moment once the bond threshold holds.
    if (!SIDE_SETTLE_EVENTS.has(event.type)) return false;
    const npc = t.npc as string;
    const amount = t.amount as number;
    return (gameState?.npcs?.bonds?.[npc] ?? 0) >= amount;
  }
  // A `repeat` beat on a perpetual predicate would re-fire on every event, so
  // pin those re-fires to settle moments. One-shot beats (and beats on discrete
  // event conditions) can match on any event — the fired-marker stops repeats.
  if (beat.repeat && STATE_CONDITION_TYPES.has(t.type) && !SIDE_SETTLE_EVENTS.has(event.type)) return false;
  const flags = (gameState?.story as { flags?: Record<string, boolean> } | undefined)?.flags ?? {};
  return conditionMatches(t, event, gameState?.inventory ?? {}, flags);
}

function fireSideBeat(beat: Beat, flags: Record<string, boolean>): { firedBeat: Beat; newFlags: Record<string, boolean>; sideEffects: BeatSideEffects; repeatCooldown?: number } {
  const newFlags = { ...flags };
  const setFlags = flagList(beat.onComplete?.setFlag);
  if (setFlags.length > 0) {
    for (const flag of setFlags) newFlags[flag] = true;
  } else if (!beat.repeat) {
    newFlags[firedFlagKey(beat.id)] = true; // repeat beats keep no permanent marker
  }
  const cd = beat.repeatCooldown;
  const repeatCooldown = beat.repeat && Number.isFinite(cd) && (cd as number) > 0 ? Math.trunc(cd as number) : undefined;
  return { firedBeat: beat, newFlags, sideEffects: beat.onComplete ?? {}, repeatCooldown };
}

/**
 * Evaluates the SIDE_BEATS list against a game event. Fires at most one side
 * beat per call: the first un-fired one-shot beat whose trigger matches, else
 * the first matching `repeat` beat. Returns the same
 * `{ firedBeat, newFlags, sideEffects }` shape as evaluateStoryTriggers so
 * callers can reuse the STORY/BEAT_FIRED machinery, or null.
 *
 * @param {object} gameState — full game state (needs `.story.flags`, `.inventory`, `.npcs`)
 * @param {object} event     — game event { type, ... }
 * @param {object} opts      — optional `{ onlyFlagConditions: true }`
 */
export function evaluateSideBeats(
  gameState: SideBeatGameState,
  event: StoryEvent,
  opts: { onlyFlagConditions?: boolean } = {},
): { firedBeat: Beat; newFlags: Record<string, boolean>; sideEffects: BeatSideEffects; repeatCooldown?: number } | null {
  const flags = ((gameState?.story as { flags?: Record<string, boolean> } | undefined)?.flags) ?? {};
  let repeatCandidate: Beat | null = null;
  for (const beat of SIDE_BEATS) {
    if (opts.onlyFlagConditions && beat.trigger?.type !== "flag_set" && beat.trigger?.type !== "flag_cleared") continue;
    if (!sideTriggerMatches(beat, event, gameState)) continue;
    if (beat.repeat === true) { if (!repeatCandidate) repeatCandidate = beat; continue; }
    if (sideBeatFired(flags, beat)) continue;
    return fireSideBeat(beat, flags);
  }
  if (repeatCandidate) return fireSideBeat(repeatCandidate, flags);
  return null;
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
/**
 * Loose state shape accepted by `applyBeatResult` and `applyChoiceOutcome`.
 * Lists every field the implementations read or write so callers can pass
 * either a full `GameState` or the small partial stubs used by tests.
 */
interface AnyMap {
  story?: unknown;
  npcs?: unknown;
  inventory?: unknown;
  coins?: unknown;
  embers?: unknown;
  coreIngots?: unknown;
  gems?: unknown;
  heirlooms?: unknown;
  unlockedBiomes?: unknown;
  pendingBossKey?: unknown;
}

export function applyBeatResult<S extends AnyMap>(gameState: S, sideEffects: BeatSideEffects): S {
  let next: AnyMap = { ...gameState };

  // --- setFlag ---
  const setFlags = flagList(sideEffects.setFlag);
  if (setFlags.length > 0) {
    const story = (next.story as Record<string, unknown> | undefined) ?? {};
    const flags = (story.flags as Record<string, boolean> | undefined) ?? {};
    next = {
      ...next,
      story: {
        ...story,
        flags: {
          ...flags,
          ...Object.fromEntries(setFlags.map((flag) => [flag, true])),
        },
      },
    };
  }

  // --- spawnNPC ---
  if (sideEffects.spawnNPC) {
    const npc = sideEffects.spawnNPC;
    const npcs = (next.npcs as Record<string, unknown> | undefined) ?? {};
    const roster = (npcs.roster as string[] | undefined) ?? [];
    if (!roster.includes(npc)) {
      const bonds = (npcs.bonds as Record<string, number> | undefined) ?? {};
      next = {
        ...next,
        npcs: {
          ...npcs,
          roster: [...roster, npc],
          bonds: { ...bonds, [npc]: bonds[npc] ?? 5 },
        },
      };
    }
  }

  // --- unlockBiome ---
  if (sideEffects.unlockBiome) {
    const unlocked = (next.unlockedBiomes as Record<string, boolean> | undefined) ?? {};
    next = {
      ...next,
      unlockedBiomes: {
        ...unlocked,
        [sideEffects.unlockBiome]: true,
      },
    };
  }

  // --- advanceAct ---
  if (sideEffects.advanceAct) {
    const story = (next.story as Record<string, unknown> | undefined) ?? {};
    next = {
      ...next,
      story: { ...story, act: sideEffects.advanceAct },
    };
  }

  // --- spawnBoss ---
  if (sideEffects.spawnBoss) {
    next = {
      ...next,
      pendingBossKey: sideEffects.spawnBoss,
    };
  }

  return next as S;
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
export function parseSpeaker(body: string | null | undefined): string | null {
  const m = String(body ?? "").match(/^([A-Z][a-zA-Z ]+?):/);
  if (!m) return null;
  const map = SPEAKER_MAP as Record<string, string | undefined>;
  return map[m[1]] ?? null;
}

/**
 * Strips a recognised "Speaker: " prefix and surrounding single quotes from a
 * legacy `body` string so the dialogue UI can render clean text alongside the
 * parsed speaker. Lines authored directly in `lines[]` form are already clean,
 * so this is a no-op on them.
 *   "Wren: 'bring me hay'" → "bring me hay"
 *   "The larder is full."  → "The larder is full."
 */
export function stripSpeakerPrefix(text: string | null | undefined): string {
  let t = String(text ?? "");
  const m = t.match(/^([A-Z][a-zA-Z ]+?):\s*(.*)$/s);
  const map = SPEAKER_MAP as Record<string, string | undefined>;
  if (m && map[m[1]]) t = m[2];
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
export function beatLines(beat: Beat | null | undefined): BeatLine[] {
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
export function beatChoices(beat: Beat | null | undefined): BeatChoice[] {
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
export function beatIsContinueOnly(beat: Beat | null | undefined): boolean {
  const cs = beatChoices(beat);
  return cs.length === 1 && cs[0].id === "continue";
}

/**
 * Replaces `{token}` placeholders in dialogue text. Unknown tokens are left
 * verbatim. Currently the modal supplies `{ settlement }` (the player's home
 * settlement name); more vars can be added without touching this function.
 */
export function interpolateBeatText(text: string | null | undefined, vars: Record<string, unknown> = {}): string {
  return String(text ?? "").replace(/\{(\w+)\}/g, (m, k) =>
    Object.prototype.hasOwnProperty.call(vars, k) ? String((vars as Record<string, unknown>)[k]) : m
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
 *   embers / coreIngots / gems: n            — add to that meta-currency (clamped ≥ 0)
 *   heirlooms:  { [key]: n }                 — add to the heirlooms map (clamped ≥ 0)
 *   queueBeat:  string                       — append a beat id to the modal queue
 * A falsy `outcome` is a no-op.
 */
export function applyChoiceOutcome<S extends AnyMap>(gameState: S, outcome: ChoiceOutcome | null | undefined): S {
  if (!outcome || typeof outcome !== "object") return gameState;
  let next: AnyMap = { ...gameState };

  const setFlagsFn = (val: string | string[], on: boolean) => {
    const keys = Array.isArray(val) ? val : [val];
    const story = (next.story as Record<string, unknown> | undefined) ?? {};
    const flags: Record<string, boolean> = { ...((story.flags as Record<string, boolean> | undefined) ?? {}) };
    for (const k of keys) if (typeof k === "string" && k) flags[k] = on;
    next = { ...next, story: { ...story, flags } };
  };
  if (outcome.setFlag) setFlagsFn(outcome.setFlag, true);
  if (outcome.clearFlag) setFlagsFn(outcome.clearFlag, false);

  if (outcome.bondDelta && typeof outcome.bondDelta === "object") {
    const { npc, amount } = outcome.bondDelta;
    if (typeof npc === "string" && Number.isFinite(amount)) {
      const npcs = (next.npcs as Record<string, unknown> | undefined) ?? {};
      const bonds: Record<string, number> = { ...((npcs.bonds as Record<string, number> | undefined) ?? {}) };
      const cur = Number.isFinite(bonds[npc]) ? bonds[npc] : 5;
      bonds[npc] = Math.max(0, Math.min(10, cur + amount));
      next = { ...next, npcs: { ...npcs, bonds } };
    }
  }

  if (outcome.resources && typeof outcome.resources === "object") {
    const inventory: Record<string, number> = { ...((next.inventory as Record<string, number> | undefined) ?? {}) };
    for (const [k, v] of Object.entries(outcome.resources)) {
      if (!Number.isFinite(v)) continue;
      inventory[k] = Math.max(0, (inventory[k] ?? 0) + (v as number));
    }
    next = { ...next, inventory };
  }

  if (Number.isFinite(outcome.coins)) {
    next = { ...next, coins: Math.max(0, ((next.coins as number | undefined) ?? 0) + (outcome.coins as number)) };
  }
  for (const key of ["embers", "coreIngots", "gems"] as const) {
    const val = outcome[key];
    if (Number.isFinite(val)) {
      next = { ...next, [key]: Math.max(0, ((next[key] as number | undefined) ?? 0) + (val as number)) };
    }
  }
  if (outcome.heirlooms && typeof outcome.heirlooms === "object") {
    const heirlooms: Record<string, number> = { ...((next.heirlooms as Record<string, number> | undefined) ?? {}) };
    for (const [k, v] of Object.entries(outcome.heirlooms)) {
      if (!Number.isFinite(v)) continue;
      heirlooms[k] = Math.max(0, (heirlooms[k] ?? 0) + (v as number));
    }
    next = { ...next, heirlooms };
  }

  if (typeof outcome.queueBeat === "string") {
    const beat = findBeat(outcome.queueBeat);
    if (beat) {
      const story = (next.story as Record<string, unknown> | undefined) ?? {};
      const queue = (story.beatQueue as Beat[] | undefined) ?? [];
      const open = !!story.queuedBeat;
      next = {
        ...next,
        story: {
          ...story,
          queuedBeat: open ? story.queuedBeat : beat,
          beatQueue: open ? [...queue, beat] : queue,
        },
      };
    }
  }

  return next as S;
}
