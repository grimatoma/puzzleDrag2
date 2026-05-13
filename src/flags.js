// ─── Story-flag registry ─────────────────────────────────────────────────────
// A flag is a boolean on `state.story.flags` (default-false when absent). Before
// this module flags only "existed" implicitly — popped into being the moment a
// beat's `onComplete.setFlag` or a choice's `outcome.setFlag` fired. STORY_FLAGS
// makes the set of known flags explicit, with metadata (label / description /
// category / default / where it's set) and — optionally — declarative
// **triggers**: game events that flip the flag on, the same vocabulary the story
// beats use.
//
// ── Adding a trigger ──────────────────────────────────────────────────────────
//   { id: "saw_first_caravan", label: "Saw the first caravan", category: "story",
//     default: false, source: "trigger",
//     triggers: [{ type: "building_built", id: "caravan_post" }] }
//
// `evaluateFlagTriggers` runs *after* the story-beat evaluator on every game
// event (see src/state.js → evaluateAndApplyStoryBeat), so beats always get
// first crack. ⚠ Do NOT put a trigger on a flag that a beat uses as its
// `onComplete.setFlag` — those flags double as "beat completed" markers and the
// strict beat ordering would fight an out-of-order flag flip. The flags below
// that are set by a beat/choice keep `triggers: []`; the mechanism is here for
// new, standalone flags.
//
// Supported trigger conditions (mirrors the beat triggers in src/story.js):
//   session_start | session_ended
//   act_entered          { act }
//   resource_total       { key, amount }
//   resource_total_multi { req: { key: amount, … } }
//   craft_made           { item, count? }
//   building_built       { id }
//   boss_defeated        { id }
//   all_buildings_built
//   bond_at_least        { npc, amount }            (settle moments only)

import { conditionMatches } from "./story.js";
import { BALANCE_OVERRIDES } from "./constants.js";
import { applyFlagOverrides } from "./config/applyOverrides.js";

export const FLAG_CATEGORIES = Object.freeze({
  story:    { label: "Progression", color: "#a84010" },
  frostmaw: { label: "Frostmaw arc", color: "#7a8b5e" },
  mira:     { label: "Mira arc",     color: "#c9863a" },
  misc:     { label: "Misc",         color: "#7a5a38" },
});

/** @typedef {{ id:string, label:string, description?:string, category?:string,
 *   default?:boolean, source?:string, triggers?:Array<object> }} FlagDef */

/** @type {FlagDef[]} */
export const STORY_FLAGS = [
  // ── Act-progression milestones (set by a story beat's onComplete.setFlag) ──
  { id: "intro_seen",        label: "Intro seen",          category: "story", default: false, source: "beat:act1_arrival",
    description: "Set once the player has named their settlement at the cold hearth.", triggers: [] },
  { id: "hearth_lit",        label: "Hearth lit",          category: "story", default: false, source: "beat:act1_light_hearth",
    description: "The Hearth is alive again; Mira is on her way.", triggers: [] },
  { id: "first_craft",       label: "First craft",         category: "story", default: false, source: "beat:act1_first_bread",
    description: "The player has baked their first loaf of bread.", triggers: [] },
  { id: "mill_built",        label: "Mill built",          category: "story", default: false, source: "beat:act1_build_mill",
    description: "The mill stands — also advances the story to Act II.", triggers: [] },
  { id: "first_iron",        label: "First iron",          category: "story", default: false, source: "beat:act2_first_hinge",
    description: "Bram has forged the vale's first hinge.", triggers: [] },
  { id: "frostmaw_active",   label: "Frostmaw active",     category: "frostmaw", default: false, source: "beat:act2_frostmaw",
    description: "The Frostmaw boss has woken (gates the audit-boss cadence + boss gallery state).", triggers: [] },
  { id: "mine_revealed",     label: "Mine revealed",       category: "story", default: false, source: "beat:act3_mine_found",
    description: "Wren has found the sealed mine.", triggers: [] },
  { id: "mine_unlocked",     label: "Mine unlocked",       category: "story", default: false, source: "beat:act3_mine_opened",
    description: "The mine seal is broken — also unlocks the mine biome (read by mine-only actions).", triggers: [] },
  { id: "caravan_open",      label: "Caravan open",        category: "story", default: false, source: "beat:act3_caravan",
    description: "The caravan post is built; far traders are coming.", triggers: [] },
  { id: "festival_announced",label: "Festival announced",  category: "story", default: false, source: "beat:act3_festival",
    description: "The Harvest Festival is announced (guards the act3_win trigger; drives the larder-progress HUD).", triggers: [] },
  { id: "isWon",             label: "Game won",            category: "story", default: false, source: "beat:act3_win",
    description: "The festival larder is full — the settlement lives. Flips the win banner + sandbox affordances.", triggers: [] },

  // ── Mira's Letter (Bond-8 side arc — set by mira_letter_1 choices/onComplete) ──
  { id: "mira_letter_seen",     label: "Mira's letter — seen",      category: "mira", default: false, source: "beat:mira_letter_1",
    description: "Mira has shown the player the unsent letter to her brother Edrin.", triggers: [] },
  { id: "mira_letter_resolved", label: "Mira's letter — resolved",  category: "mira", default: false, source: "choice:mira_letter_1",
    description: "The player has made a call on the letter (sent / kept / read aloud).", triggers: [] },
  { id: "mira_letter_sent",     label: "Mira's letter — sent",      category: "mira", default: false, source: "choice:mira_letter_1#send",
    description: "The player told Mira to send the letter.", triggers: [] },
  { id: "mira_letter_kept",     label: "Mira's letter — kept",      category: "mira", default: false, source: "choice:mira_letter_1#keep",
    description: "The player told Mira to keep the letter for now.", triggers: [] },
  { id: "mira_letter_read",     label: "Mira's letter — read",      category: "mira", default: false, source: "choice:mira_letter_1#read",
    description: "The player asked Mira to read the letter aloud first.", triggers: [] },

  // ── The Hearth-Keeper (post-Frostmaw choice — set by frostmaw_keeper choices) ──
  { id: "keeper_choice_made",   label: "Keeper choice made",        category: "frostmaw", default: false, source: "choice:frostmaw_keeper",
    description: "The player has chosen the Frostmaw's fate (coexist / drive out). Read by the audit-boss flavour.", triggers: [] },
  { id: "keeper_path_coexist",  label: "Keeper path — coexist",     category: "frostmaw", default: false, source: "choice:frostmaw_keeper#coexist",
    description: "Let the Frostmaw stay — bound to the hearth; grants Embers.", triggers: [] },
  { id: "keeper_path_driveout", label: "Keeper path — drive out",   category: "frostmaw", default: false, source: "choice:frostmaw_keeper#drive_out",
    description: "Break the Frostmaw's hold — the hearth is ours; grants Core Ingots.", triggers: [] },
];

// Self-apply Balance-Manager / `/story/`-editor overrides (label / description /
// category / default / triggers patches, plus author-created flags). Mutates
// STORY_FLAGS in place — same pattern as applyStoryOverrides in src/story.js.
applyFlagOverrides(STORY_FLAGS, BALANCE_OVERRIDES.flags);

// ─── lookups ─────────────────────────────────────────────────────────────────

export function flagDef(id) {
  return STORY_FLAGS.find((f) => f && f.id === id) || null;
}
export function isRegisteredFlag(id) {
  return STORY_FLAGS.some((f) => f && f.id === id);
}
/** Resolved category descriptor for a flag id, falling back to "misc". */
export function flagCategory(id) {
  const def = flagDef(id);
  const key = (def && def.category && FLAG_CATEGORIES[def.category]) ? def.category : "misc";
  return { id: key, ...FLAG_CATEGORIES[key] };
}
/** `{ [id]: true }` for every registered flag whose default is true (seeds new runs). */
export function initialFlagState() {
  const out = {};
  for (const f of STORY_FLAGS) if (f && f.default === true) out[f.id] = true;
  return out;
}

// ─── trigger evaluator ───────────────────────────────────────────────────────

function flagTriggerMatches(trigger, event, gameState) {
  if (!trigger || typeof trigger !== "object") return false;
  if (trigger.type === "bond_at_least") {
    if (event.type !== "session_start" && event.type !== "session_ended") return false;
    return (gameState?.npcs?.bonds?.[trigger.npc] ?? 0) >= trigger.amount;
  }
  return conditionMatches(trigger, event, gameState?.inventory ?? {});
}

/**
 * Pure. Evaluates registered flag triggers against a game event.
 * @param {object} gameState — full game state (needs `.story.flags`, and
 *   `.inventory` / `.npcs.bonds` for the relevant trigger types)
 * @param {object} event     — game event `{ type, ...fields }`
 * @returns {{ changed: Record<string, true> } | null} the flags newly flipped
 *   to true, or null if none.
 */
export function evaluateFlagTriggers(gameState, event) {
  const flags = gameState?.story?.flags ?? {};
  const changed = {};
  for (const def of STORY_FLAGS) {
    if (!def || !Array.isArray(def.triggers) || def.triggers.length === 0) continue;
    if (flags[def.id]) continue;            // already set — leave it
    if (def.triggers.some((t) => flagTriggerMatches(t, event, gameState))) changed[def.id] = true;
  }
  return Object.keys(changed).length > 0 ? { changed } : null;
}

/**
 * Convenience: returns `gameState` with any flag triggers fired by `event`
 * applied to `story.flags`. Does not mutate. (Used by state.js.)
 */
export function applyFlagTriggers(gameState, event) {
  const result = evaluateFlagTriggers(gameState, event);
  if (!result) return gameState;
  return {
    ...gameState,
    story: { ...gameState.story, flags: { ...(gameState.story?.flags ?? {}), ...result.changed } },
  };
}
