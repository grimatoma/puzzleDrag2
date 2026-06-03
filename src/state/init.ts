import { SAVE_SCHEMA_VERSION } from "../constants.js";
import { rollQuests } from "../features/quests/data.js";
import { INITIAL_STORY_STATE } from "../story.js";
import { initialFlagState } from "../flags.js";
import { FIRE_HAZARD_ENABLED } from "../featureFlags.js";
import { isTapTargetPower } from "../config/toolPowers.js";
import { getItem } from "../constants.js";
import { ACHIEVEMENTS as ACHIEVEMENT_LIST } from "../features/achievements/data.js";
import * as crafting from "../features/crafting/slice.js";
import * as quests from "../features/quests/slice.js";
import * as achievements from "../features/achievements/slice.js";
import * as tutorial from "../features/tutorial/slice.js";
import * as settings from "../features/settings/slice.js";
import * as boss from "../features/boss/slice.js";
import * as cartography from "../features/cartography/slice.js";
import * as fish from "../features/fish/slice.js";
import * as zones from "../features/zones/slice.js";
import * as castle from "../features/castle/slice.js";
import * as boons from "../features/boons/slice.js";
import * as runSummary from "../features/runSummary/slice.js";
import { driftPrices } from "../market.js";
import { loadSavedState } from "./persistence.js";
import {
  makeOrder,
  seedOrderIdSeq,
  defaultTileCollectionSlice,
  mergeLoadedState,
} from "./helpers.js";
import type { GameState } from "../types/state";

/**
 * Generates a stable save seed for deterministic RNG.
 * Prefers crypto.getRandomValues for better entropy.
 */
export function generateSaveSeed() {
  try {
    const c = (typeof window !== "undefined" && window.crypto) || (typeof self !== "undefined" && self.crypto);
    if (c && typeof c.getRandomValues === "function") {
      const buf = new Uint32Array(2);
      c.getRandomValues(buf);
      return buf[0].toString(36).padStart(7, "0") + buf[1].toString(36).padStart(7, "0");
    }
  } catch { /* fall through */ }
  return Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10);
}

/**
 * Build a fresh state object with no I/O. This is the side-effect-free core
 * of `initialState`. Callers that want the hydrated-from-save behaviour
 * should use `initialState` instead.
 */
export function createFreshState(overrides?: { saveSeed?: string; tools?: Record<string, boolean> }): GameState {
  const biomeKey = "farm";
  const level = 1;
  const initialRoster = ["wren"];
  const o1 = makeOrder(biomeKey, level, [], [], initialRoster);
  const o2 = makeOrder(biomeKey, level, [o1.npc], [o1.key], initialRoster);
  const o3 = makeOrder(biomeKey, level, [o1.npc, o2.npc], [o1.key, o2.key], initialRoster);
  const marketSeed = Math.floor(Math.random() * 1e9);
  
  const saveSeed = overrides?.saveSeed ?? generateSaveSeed();
  const extraScytheBonus = overrides?.tools?.startingExtraScythe ? 1 : 0;
  
  return {
    version: SAVE_SCHEMA_VERSION,
    biomeKey,
    biome: "farm",
    saveSeed,
    view: "town",
    viewParams: {},
    coins: 150,
    level,
    xp: 0,
    turnsUsed: 0,
    farmRun: null,
    inventory: { supplies: 0 },
    /** Per-resource fractional progress toward the next whole unit. Resets to 0 on rollover. */
    resourceProgress: {},
    orders: [o1, o2, o3],
    quests: rollQuests(saveSeed, 1, "spring"),
    tools: {
      clear: 2 + extraScytheBonus, basic: 1, rare: 1, shuffle: 0, bomb: 0,
      startingExtraScythe: !!overrides?.tools?.startingExtraScythe,
      extraBlueprintSlot: !!overrides?.tools?.extraBlueprintSlot,
      goldSeal: !!overrides?.tools?.goldSeal,
      extraTurn: !!overrides?.tools?.extraTurn,
      magic_wand: 0, hourglass: 0, magic_seed: 0, magic_fertilizer: 0,
      water_pump: 0, explosives: 0,
      rake: 0, axe: 0, fertilizer: 0,
      cat: 0,
      bird_cage: 0, scythe_full: 0,
      rifle: 0, hound: 0,
      // Phase 3 net-new tools (tool-powers overhaul). Workshop tier defaults
      // to 0; players craft them. Magic tools come via the portal so they
      // also start at 0.
      trimmer: 0, plough: 0, fruit_picker: 0, herders_crook: 0, milk_churn: 0,
      saddle: 0, bee: 0, terrier: 0,
      drill: 0, coal_hammer: 0, gold_pick: 0, magnet: 0, coal_transmuter: 0,
      golden_apple: 0, golden_carrot: 0, golden_idol: 0, golden_sheep: 0,
      philosophers_stone: 0, miners_hat: 0,
    },
    toolPending: null,
    toolPendingPower: null,
    fillBiasTarget: null,
    mysteriousOre: null,
    fishPearl: null,
    hazards: { 
      caveIn: null, gasVent: null, lava: null, mole: null,
      rats: [],
      fire: null,
      wolves: null 
    },
    grid: Array.from({ length: 6 }, () => Array.from({ length: 6 }, () => ({ key: "tile_grass_grass" }))),
    _biomeRestored: false,
    _boardNonce: 0,
    lastChainSnapshot: null,
    magicFertilizerCharges: 0,
    built: { home: { decorations: {}, _plots: {} } },
    zoneNames: { home: "" },
    settlements: { home: { founded: true } },
    influence: 0,
    bubble: null,
    modal: null,
    pendingView: null,
    seasonStats: { harvests: 0, upgrades: 0, ordersFilled: 0, coins: 0 },
    _hintsShown: {},
    story: { ...INITIAL_STORY_STATE, flags: { ...initialFlagState() }, queuedBeat: null, beatQueue: [], sandbox: false },
    npcs: {
      roster: ["wren"],
      bonds: { wren: 5, mira: 5, tomas: 5, bram: 5, liss: 5 },
      giftCooldown: { wren: 0, mira: 0, tomas: 0, bram: 0, liss: 0 },
    },
    market: { seed: marketSeed, season: 0, prices: driftPrices(marketSeed, 0), prevPrices: null },
    season: 0,
    runes: 0,
    runeStash: 0,
    embers: 0,
    coreIngots: 0,
    gems: 0,
    heirlooms: { heirloomSeed: 0, pactIron: 0, tidesingerPearl: 0 },
    session: { selectedTiles: [], fertilizerUsed: false },
    keeperTrials: {},
    activeTrial: null,
    dailyStreak: { lastClaimedDate: null, currentDay: 0 },
    workers: { hired: { farmer: 0, lumberjack: 0, miner: 0, baker: 0 } },
    tileCollection: defaultTileCollectionSlice(),
    almanac: {
      xp: 0,
      level: 1,
      claimed: { 1: false, 2: false, 3: false, 4: false, 5: false },
    },
    achievements: {
      counters: {
        chains_committed: 0, orders_fulfilled: 0, bosses_defeated: 0,
        festival_won: 0, distinct_resources_chained: 0,
        distinct_buildings_built: 0, supplies_converted: 0,
        fish_chained: 0, mine_chained: 0,
        veg_chained: 0, fruit_chained: 0, flower_chained: 0, herd_chained: 0,
        cattle_chained: 0, mount_chained: 0, tree_chained: 0, bird_chained: 0,
      },
      unlocked: Object.fromEntries(ACHIEVEMENT_LIST.map((a) => [a.id, false])),
      seenResources: {},
      seenBuildings: {},
    },
    ...crafting.initial,
    ...quests.initial,
    ...achievements.initial,
    ...tutorial.initial,
    ...settings.initial,
    ...boss.initial,
    ...cartography.initial,
    ...castle.initial,
    ...fish.initial,
    ...zones.initial,
    ...boons.initial,
    ...runSummary.initial,
    farm: { savedField: null },
    mine: { savedField: null },
  };
}

export function initialState(overrides?: { saveSeed?: string; tools?: Record<string, boolean> }): GameState {
  const fresh = createFreshState(overrides);
  const raw = loadSavedState();
  if (raw && raw.version === SAVE_SCHEMA_VERSION) {
    // Treat saved as the persisted (loose) shape of GameState. The save
    // boundary is intrinsically untyped (JSON.parse), but inside this block
    // we narrow individual reads via casts at each access point.
    const saved = mergeLoadedState(raw as Record<string, unknown>);
    seedOrderIdSeq(saved.orders);
    quests.seedQuestIdSeq(saved.dailies as Parameters<typeof quests.seedQuestIdSeq>[0]);

    const savedStory = saved.story as Record<string, unknown> | undefined;
    const mergedStory = savedStory
      ? { ...INITIAL_STORY_STATE, queuedBeat: null, beatQueue: [], sandbox: false, ...savedStory }
      : { ...INITIAL_STORY_STATE, flags: { ...initialFlagState() }, queuedBeat: null, beatQueue: [], sandbox: false };
    mergedStory.queuedBeat = null;
    mergedStory.beatQueue = [];

    const mergedTileCollection = (() => {
      const freshTC = defaultTileCollectionSlice();
      const srcRaw = saved.tileCollection ?? saved.species;
      if (!srcRaw || typeof srcRaw !== "object") return freshTC;
      const src = srcRaw as {
        discovered?: Record<string, boolean>;
        researchProgress?: Record<string, number>;
        activeByCategory?: Record<string, string | null>;
        freeMoves?: number;
      };
      return {
        discovered: { ...freshTC.discovered, ...src.discovered },
        researchProgress: { ...freshTC.researchProgress, ...src.researchProgress },
        activeByCategory: { ...freshTC.activeByCategory, ...src.activeByCategory },
        freeMoves: typeof src.freeMoves === "number" ? src.freeMoves : 0,
      };
    })();

    const savedWithoutLegacy: Record<string, unknown> = { ...saved };
    delete savedWithoutLegacy.species;
    const savedHazards = savedWithoutLegacy.hazards as { fire?: unknown; [k: string]: unknown } | undefined;
    if (!FIRE_HAZARD_ENABLED && savedHazards?.fire) {
      savedWithoutLegacy.hazards = { ...savedHazards, fire: null };
    }

    // Restore active run if it still has turns remaining so a reload mid-session
    // drops the player back onto their board instead of losing progress.
    const savedFarmRun = saved.farmRun as { turnsRemaining?: number; [k: string]: unknown } | null | undefined;
    const restoredFarmRun = (savedFarmRun?.turnsRemaining ?? 0) > 0 ? savedFarmRun : null;

    // Load drops the player on town view, so any tool armed at save time must
    // deselect — the player isn't on the board to "directly use" it. Refund
    // fertilizer (its charge was spent on arm) and any instant-tool pending
    // arms (same). Tap-target arms (bomb/rake/axe/magic_wand) spent no charge,
    // so just clearing toolPending is enough.
    const savedTools = (savedWithoutLegacy.tools as Record<string, number | boolean | undefined> | undefined) ?? {};
    let restoredTools: Record<string, number | boolean | undefined> = { ...savedTools };
    if (savedWithoutLegacy.fillBiasTarget) {
      restoredTools = { ...restoredTools, fertilizer: (Number(restoredTools.fertilizer) || 0) + 1 };
    }
    const savedPending = savedWithoutLegacy.toolPending as string | null | undefined;
    const savedPendingPower = savedWithoutLegacy.toolPendingPower as { id?: string; [k: string]: unknown } | null | undefined;
    const itemPower = savedPending ? (getItem(savedPending)?.power as { id?: string } | undefined) : undefined;
    const pendingPower = savedPendingPower ?? itemPower;
    const pendingIsTap = !!(pendingPower?.id && isTapTargetPower(pendingPower.id));
    if (savedPending && !pendingIsTap && savedPending !== "rune_wildcard") {
      restoredTools = { ...restoredTools, [savedPending]: (Number(restoredTools[savedPending]) || 0) + 1 };
    }
    const restoredRuneStash = savedPending === "rune_wildcard"
      ? ((savedWithoutLegacy.runeStash as number | undefined) ?? 0) + 1
      : (savedWithoutLegacy.runeStash as number | undefined);

    return {
      ...fresh,
      ...savedWithoutLegacy,
      story: mergedStory,
      tileCollection: mergedTileCollection,
      view: "town",   // router will restore "board" from the URL hash if appropriate
      viewParams: {},
      turnsUsed: restoredFarmRun ? ((saved.turnsUsed as number | undefined) ?? 0) : 0,
      farmRun: (restoredFarmRun ?? null) as GameState["farmRun"],
      activeTrial: null,
      modal: null,
      bubble: null,
      pendingView: null,
      toolPending: null,
      // Phase 2 (tool-powers overhaul) — any armed typed power from save time
      // must also clear on load. The save schema is forward-safe: old saves
      // simply lack this field, and the merge sets it to null either way.
      toolPendingPower: null,
      fillBiasTarget: null,
      tools: restoredTools as GameState["tools"],
      runeStash: restoredRuneStash ?? 0,
      seasonStats: { harvests: 0, upgrades: 0, ordersFilled: 0, coins: 0 }
    };
  }
  return fresh;
}
