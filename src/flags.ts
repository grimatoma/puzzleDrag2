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
// `evaluateFlagTriggers` runs *after* the first story-beat evaluator pass on
// every game event (see src/state.js → evaluateAndApplyStoryBeat). Flag flips
// cascade within that dispatch, then flag-conditioned beats get one narrowly
// filtered follow-up pass. ⚠ Do NOT put a trigger on a flag that a beat uses as its
// `onComplete.setFlag` — those flags double as "beat completed" markers and the
// strict beat ordering would fight an out-of-order flag flip. The flags below
// that are set by a beat/choice keep `triggers: []`; the mechanism is here for
// new, standalone flags.
//
// Supported trigger conditions (see `conditionMatches` in src/story.js — the
// same vocabulary beat triggers use):
//   session_start | session_ended | all_buildings_built
//   act_entered          { act }
//   resource_total       { key, amount }
//   resource_total_multi { req: { key: amount, … } }
//   craft_made           { item, count? }
//   building_built       { id }
//   boss_defeated        { id }
//   bond_at_least        { npc, amount }            (settle moments only)
//   flag_set / flag_cleared { flag }                (a flag flipped by a flag)

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
  { id: "first_order",       label: "First order",         category: "story", default: false, source: "beat:act1_first_order",
    description: "The player has fulfilled their first town order.", triggers: [] },
  { id: "granary_built",     label: "Granary built",       category: "story", default: false, source: "beat:act1_build_granary",
    description: "The granary stands, teaching the first turn-budget building bonus.", triggers: [] },
  { id: "home_keeper_resolved", label: "Home keeper resolved", category: "story", default: false, source: "beat:act1_keeper_trial",
    description: "The home Keeper Trial or pact has been resolved.", triggers: [] },
  { id: "first_iron",        label: "First iron",          category: "story", default: false, source: "beat:act2_first_hinge",
    description: "Bram has forged the vale's first hinge.", triggers: [] },
  { id: "quarry_foothold",   label: "Quarry foothold",     category: "story", default: false, source: "beat:act2_frostmaw",
    description: "The player has collected enough quarry stone to stabilize the next-zone loop.", triggers: [] },
  { id: "frostmaw_active",   label: "Frostmaw active",     category: "frostmaw", default: false, source: "legacy:manual_boss",
    description: "Legacy manual boss-gallery state; no longer drives automatic story/audit cadence.", triggers: [] },
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

  // ── Legacy Frostmaw side fork (kept for save/editor compatibility) ──
  { id: "keeper_choice_made",   label: "Keeper choice made",        category: "frostmaw", default: false, source: "choice:frostmaw_keeper",
    description: "Legacy Frostmaw side-fork choice. New keeper paths live on settlements and Keeper Trials.", triggers: [] },
  { id: "keeper_path_coexist",  label: "Keeper path — coexist",     category: "frostmaw", default: false, source: "choice:frostmaw_keeper#coexist",
    description: "Let the Frostmaw stay — bound to the hearth; grants Embers.", triggers: [] },
  { id: "keeper_path_driveout", label: "Keeper path — drive out",   category: "frostmaw", default: false, source: "choice:frostmaw_keeper#drive_out",
    description: "Break the Frostmaw's hold — the hearth is ours; grants Core Ingots.", triggers: [] },
];

// Self-apply Dev Panel / `/story/`-editor overrides (label / description /
// category / default / triggers patches, plus author-created flags). Mutates
// STORY_FLAGS in place — same pattern as applyStoryOverrides in src/story.js.
applyFlagOverrides(STORY_FLAGS, BALANCE_OVERRIDES.flags);

// ─── lookups ─────────────────────────────────────────────────────────────────

export interface FlagTrigger {
  type: string;
  [k: string]: unknown;
}

export interface FlagDef {
  id: string;
  label: string;
  description?: string;
  category?: string;
  default?: boolean;
  source?: string;
  triggers?: FlagTrigger[];
}

export function flagDef(id: string): FlagDef | null {
  return (STORY_FLAGS as readonly FlagDef[]).find((f) => f && f.id === id) || null;
}
export function isRegisteredFlag(id: string): boolean {
  return (STORY_FLAGS as readonly FlagDef[]).some((f) => f && f.id === id);
}
/** Resolved category descriptor for a flag id, falling back to "misc". */
export function flagCategory(id: string): { id: string; label: string; color: string } {
  const def = flagDef(id);
  const cats = FLAG_CATEGORIES as Record<string, { label: string; color: string }>;
  const key = (def && def.category && cats[def.category]) ? def.category : "misc";
  return { id: key, ...cats[key] };
}
/** `{ [id]: true }` for every registered flag whose default is true (seeds new runs). */
export function initialFlagState(): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const f of STORY_FLAGS as readonly FlagDef[]) if (f && f.default === true) out[f.id] = true;
  return out;
}

// ─── trigger evaluator ───────────────────────────────────────────────────────

interface FlagEvent {
  type: string;
  [k: string]: unknown;
}

interface FlagGameState {
  npcs?: { bonds?: Record<string, number> };
  inventory?: Record<string, number>;
  story?: { flags?: Record<string, boolean> };
}

function flagTriggerMatches(trigger: FlagTrigger | null | undefined, event: FlagEvent, gameState: FlagGameState | undefined): boolean {
  if (!trigger || typeof trigger !== "object") return false;
  if (trigger.type === "bond_at_least") {
    if (event.type !== "session_start" && event.type !== "session_ended") return false;
    const npc = trigger.npc as string;
    const amount = trigger.amount as number;
    return (gameState?.npcs?.bonds?.[npc] ?? 0) >= amount;
  }
  return conditionMatches(trigger, event, gameState?.inventory ?? {}, gameState?.story?.flags ?? {});
}

/**
 * Pure. Evaluates registered flag triggers against a game event.
 */
export function evaluateFlagTriggers(
  gameState: FlagGameState | undefined,
  event: FlagEvent,
): { changed: Record<string, true> } | null {
  const flags = gameState?.story?.flags ?? {};
  const changed: Record<string, true> = {};
  for (const def of STORY_FLAGS as readonly FlagDef[]) {
    if (!def || !Array.isArray(def.triggers) || def.triggers.length === 0) continue;
    if (flags[def.id]) continue;            // already set — leave it
    if (def.triggers.some((t) => flagTriggerMatches(t, event, gameState))) changed[def.id] = true;
  }
  return Object.keys(changed).length > 0 ? { changed } : null;
}

/**
 * Convenience: returns `gameState` with any flag triggers fired by `event`
 * applied to `story.flags`. Flag triggers can depend on other flags, so this
 * settles to a fixed point within the same dispatch. Does not mutate.
 */
export function applyFlagTriggersWithResult<S extends FlagGameState>(
  gameState: S,
  event: FlagEvent,
): { state: S; changed: Record<string, true> | null } {
  let next: S = gameState;
  const changed: Record<string, true> = {};
  for (let i = 0; i < STORY_FLAGS.length; i += 1) {
    const result = evaluateFlagTriggers(next, event);
    if (!result) break;
    Object.assign(changed, result.changed);
    next = {
      ...next,
      story: { ...(next.story ?? {}), flags: { ...(next.story?.flags ?? {}), ...result.changed } },
    };
  }
  return Object.keys(changed).length > 0 ? { state: next, changed } : { state: gameState, changed: null };
}

export function applyFlagTriggers<S extends FlagGameState>(gameState: S, event: FlagEvent): S {
  return applyFlagTriggersWithResult(gameState, event).state;
}
