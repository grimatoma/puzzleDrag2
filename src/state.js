import { BIOMES, BUILDINGS, NPCS, MAX_TURNS, RECIPES, WORKSHOP_RECIPES, STORAGE_KEYS, DAILY_REWARDS, MINE_ENTRY_TIERS, HARBOR_ENTRY_TIERS, CAPPED_RESOURCES, UPGRADE_THRESHOLDS, SAVE_SCHEMA_VERSION } from "./constants.js";
import { locBuilt as _locBuilt } from "./locBuilt.js";
import { sellPriceFor as _sellPriceFor } from "./features/market/pricing.js";
import { tryClearRatChain } from "./features/farm/rats.js";
import { tryExtinguishFire, rollFarmHazard, tickFire, tickWolves } from "./features/farm/hazards.js";
import { tryDeadlyPestsKill } from "./features/farm/deadlyPests.js";
import { rollHazard, tickHazards } from "./features/mine/hazards.js";
import { isMysteriousChainValid, spawnMysteriousOre, tickMysteriousOre } from "./features/mine/mysterious_ore.js";
import { isPearlChainValid, spawnPearl, tickPearl, PEARL_KEY } from "./features/fish/pearl.js";
import { driftPrices, applyTrade } from "./market.js";
import { currentCap } from "./utils.js";
import { WORKER_MAP } from "./features/apprentices/data.js";
import { computeWorkerEffects } from "./features/apprentices/aggregate.js";
import { TILE_TYPES, CATEGORIES, TILE_TYPES_MAP, CATEGORY_OF } from "./features/tileCollection/data.js";
import { yieldMultiplierFor } from "./features/tileCollection/yieldMultipliers.js";
import { longChainBonusFor } from "./features/tileCollection/longChainBonus.js";
import { rollQuests } from "./features/quests/data.js";
import { ACHIEVEMENTS as ACHIEVEMENT_LIST } from "./features/achievements/data.js";
import { awardXp } from "./features/almanac/data.js";
import * as crafting from "./features/crafting/slice.js";
import * as quests from "./features/quests/slice.js";
import * as achievements from "./features/achievements/slice.js";
import * as tutorial from "./features/tutorial/slice.js";
import * as settings from "./features/settings/slice.js";
import * as boss from "./features/boss/slice.js";
import * as cartography from "./features/cartography/slice.js";
import * as apprentices from "./features/apprentices/slice.js";
import * as mood from "./features/mood/slice.js";
import * as storySlice from "./features/story/slice.js";
import * as fish from "./features/fish/slice.js";
import { INITIAL_STORY_STATE, evaluateStoryTriggers } from "./story.js";
import { STORY_BUILDING_IDS } from "./features/story/data.js";
import { NPC_IDS } from "./features/npcs/data.js";
import { payOrder, gainBond, decayBond, applyGift } from "./features/npcs/bond.js";
import { pickDialog } from "./features/npcs/dialog.js";
import * as decorations from "./features/decorations/slice.js";
import * as portal from "./features/portal/slice.js";
import * as market from "./features/market/slice.js";
import * as castle from "./features/castle/slice.js";
import * as zones from "./features/zones/slice.js";
import * as workers from "./features/workers/slice.js";
import { ZONES } from "./features/zones/data.js";
import { FIRE_HAZARD_ENABLED } from "./featureFlags.js";

const slices = [crafting, quests, achievements, tutorial, settings, boss, cartography, apprentices, mood, storySlice, decorations, portal, market, castle, fish, zones, workers];

// Phase 7 — SEASON_NAMES used to be the calendar-season index → name lookup.
// All readers were removed when the calendar was deleted, so the table is
// gone too.

// ─── Inventory helpers ─────────────────────────────────────────────────────

/**
 * Mutates `inv` (and `capFloaters` / `floaters` when provided) to credit
 * `amount` of `key` to inventory, applying the resource cap when the key is
 * in CAPPED_RESOURCES. When the cap is freshly hit, sets capFloaters[key]
 * and appends a "stash full" floater if a floaters draft is supplied.
 *
 * Caller is responsible for cloning `inv`/`capFloaters`/`floaters` first
 * (they're treated as locally-owned drafts).
 */
function addCappedResourceMut(inv, capFloaters, floaters, key, amount, cap) {
  if (!CAPPED_RESOURCES.includes(key)) {
    inv[key] = (inv[key] ?? 0) + amount;
    return;
  }
  const cur = inv[key] ?? 0;
  const next = Math.min(cap, cur + amount);
  inv[key] = next;
  if (next === cap && cur + amount > cap && !capFloaters[key]) {
    capFloaters[key] = true;
    if (floaters) floaters.push({ text: `${key} stash full`, ms: 1200 });
  }
}

/** Returns true if state.inventory has at least `needs[k]` of every key. */
function hasAllInventory(state, needs) {
  const inv = state.inventory ?? {};
  for (const [k, n] of Object.entries(needs)) {
    if ((inv[k] ?? 0) < n) return false;
  }
  return true;
}

/** Returns a new inventory with each `needs[k]` deducted from `inv[k]`. */
function deductInventory(inv, needs) {
  const next = { ...inv };
  for (const [k, n] of Object.entries(needs)) {
    next[k] = (next[k] ?? 0) - n;
  }
  return next;
}

// ─── Wages / debt ──────────────────────────────────────────────────────────
const MAX_DEBT = 9999;

function applyDebtRepayment(state, incomingCoins) {
  const debt = state.townsfolk?.debt ?? 0;
  if (debt <= 0 || incomingCoins <= 0) return { coinsCredit: incomingCoins, newDebt: debt };
  if (incomingCoins >= debt)           return { coinsCredit: incomingCoins - debt, newDebt: 0 };
  return { coinsCredit: 0, newDebt: debt - incomingCoins };
}

// ─── Save/load ─────────────────────────────────────────────────────────────
// Persisted: everything except volatile UI fields (modal/bubble/view/pendingView).
const SAVE_KEY = STORAGE_KEYS.save;
const VOLATILE = new Set(["modal", "bubble", "view", "viewParams", "pendingView", "craftingTab"]);

export function loadSavedState() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch (e) { console.warn("[hearth] save data corrupt, starting fresh:", e); return null; }
}

// Synchronous write. Used internally by persistState's flush path and by the
// page-unload handler. Tests can call this directly to bypass debouncing.
export function persistStateNow(state) {
  try {
    const out = {};
    for (const k of Object.keys(state)) if (!VOLATILE.has(k)) out[k] = state[k];
    localStorage.setItem(SAVE_KEY, JSON.stringify(out));
  } catch { /* storage unavailable (private browsing / quota) */ }
}

// rAF-coalesced wrapper around persistStateNow. Multiple dispatches in the
// same animation frame collapse to a single localStorage write — important
// because a chain-collect or close-season fires several reducer transitions
// in rapid succession, and JSON.stringify over the entire game state on the
// hot path was a measurable cost. A pagehide handler flushes any pending
// state so a tab close right after a dispatch never loses progress.
let _pendingPersist = null;
let _persistScheduled = false;
let _unloadHooked = false;

function _flushPersist() {
  _persistScheduled = false;
  if (_pendingPersist === null) return;
  const s = _pendingPersist;
  _pendingPersist = null;
  persistStateNow(s);
}

export function persistState(state) {
  _pendingPersist = state;
  if (!_persistScheduled) {
    _persistScheduled = true;
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(_flushPersist);
    } else {
      // Tests / SSR have no rAF; queueMicrotask preserves the intent (flush
      // before the next macrotask) without making the call synchronous.
      queueMicrotask(_flushPersist);
    }
  }
  if (!_unloadHooked && typeof window !== "undefined") {
    _unloadHooked = true;
    const flushOnExit = () => {
      if (_pendingPersist) persistStateNow(_pendingPersist);
      _pendingPersist = null;
      _persistScheduled = false;
    };
    window.addEventListener("pagehide", flushOnExit);
    window.addEventListener("beforeunload", flushOnExit);
  }
}

// Public flush, useful for callers that need a hard sync (tests, debug tools).
export function flushPersistState() {
  if (_pendingPersist) persistStateNow(_pendingPersist);
  _pendingPersist = null;
  _persistScheduled = false;
}

export function clearSave() {
  try { localStorage.removeItem(SAVE_KEY); } catch { /* storage unavailable */ }
}

// ─── Tile Collection slice helpers ─────────────────────────────────────────

function defaultTileCollectionSlice() {
  const discovered = {};
  const researchProgress = {};
  const activeByCategory = {};
  for (const c of CATEGORIES) activeByCategory[c] = null;
  for (const t of TILE_TYPES) {
    if (t.discovery.method === "default") {
      discovered[t.id] = true;
      if (activeByCategory[t.category] === null) {
        activeByCategory[t.category] = t.id;
      }
    } else if (t.discovery.method === "research") {
      researchProgress[t.id] = 0;
    }
  }
  return { discovered, researchProgress, activeByCategory, freeMoves: 0 };
}

/**
 * Merges a loaded save state with current defaults, ensuring the tileCollection slice
 * is always well-formed. Idempotent: calling twice produces the same result.
 */
export function mergeLoadedState(saved) {
  const freshTileCollection = defaultTileCollectionSlice();
  if (!saved || typeof saved !== "object") return { tileCollection: freshTileCollection };
  let tileCollection = saved.tileCollection ?? saved.species; // backward compat: migrate old saves
  if (!tileCollection || typeof tileCollection !== "object") {
    tileCollection = freshTileCollection;
  } else {
    // Deep-merge each sub-key: fill in any missing ids from fresh defaults
    const discovered = { ...freshTileCollection.discovered, ...tileCollection.discovered };
    const researchProgress = { ...freshTileCollection.researchProgress, ...tileCollection.researchProgress };
    const activeByCategory = { ...freshTileCollection.activeByCategory, ...tileCollection.activeByCategory };
    const freeMoves = typeof tileCollection.freeMoves === "number" ? tileCollection.freeMoves : 0;
    tileCollection = { discovered, researchProgress, activeByCategory, freeMoves };
  }
  const out = { ...saved };
  delete out.species; // remove legacy key if present
  return { ...out, tileCollection };
}

// Legacy non-linear curve — kept for backward compat with any external callers.
// Internal state.js reducers now route through applyAlmanacXp (linear 150/level).
export const xpForLevel = (l) => 50 + l * 80;

const _resourceCache = new Map();
export function resourceByKey(key) {
  if (_resourceCache.has(key)) return _resourceCache.get(key);
  for (const b of Object.values(BIOMES)) {
    const r = b.resources.find((x) => x.key === key);
    if (r) { _resourceCache.set(key, r); return r; }
  }
  return null;
}

function pickNpcKey(excludeKeys = []) {
  const all = Object.keys(NPCS).filter((k) => !excludeKeys.includes(k));
  const pool = all.length ? all : Object.keys(NPCS);
  return pool[Math.floor(Math.random() * pool.length)];
}

const CRAFTED_ORDER_CHANCE = 0.30;
const SEASON_END_BONUS_COINS = 25;

// Crafted item pools for advanced orders (level 3+)
const CRAFTED_FARM_POOL = ["bread", "honeyroll", "harvestpie", "preserve", "tincture"];
const CRAFTED_MINE_POOL = ["iron_hinge", "cobblepath", "lantern", "goldring", "gemcrown", "ironframe", "stonework"];

let orderIdSeq = 1;
export function makeOrder(biomeKey, level, excludeNpcs = [], excludeOrderKeys = []) {
  const biome = BIOMES[biomeKey];

  // At level 3+, 30% chance for a crafted item order
  const useCrafted = level >= 3 && Math.random() < CRAFTED_ORDER_CHANCE;

  let key, need, reward, resourceLabel;
  if (useCrafted) {
    const craftedPool = biomeKey === "mine" ? CRAFTED_MINE_POOL : CRAFTED_FARM_POOL;
    const craftedCandidates = craftedPool.filter((k) => !excludeOrderKeys.includes(k));
    const craftedPickPool = craftedCandidates.length ? craftedCandidates : craftedPool;
    key = craftedPickPool[Math.floor(Math.random() * craftedPickPool.length)];
    const recipe = RECIPES[key];
    need = 1 + Math.floor(Math.random() * 3); // 1–3 crafted items
    reward = Math.round(need * (recipe?.coins || 100) * 1.5);
    resourceLabel = (recipe?.name || key).toLowerCase();
  } else {
    const candidates = biome.pool.filter((k, i, a) => a.indexOf(k) === i);
    const resourceCandidates = candidates.filter((k) => !excludeOrderKeys.includes(k));
    const resourcePickPool = resourceCandidates.length ? resourceCandidates : candidates;
    key = resourcePickPool[Math.floor(Math.random() * resourcePickPool.length)];
    const res = resourceByKey(key);
    const baseNeed = res.value < 3 ? 8 : 4;
    need = baseNeed + Math.floor(Math.random() * 4) + Math.floor(level / 3) * 2;
    reward = Math.max(20, need * res.value * 6);
    resourceLabel = res.label.toLowerCase();
  }

  const npc = pickNpcKey(excludeNpcs);
  const lines = NPCS[npc].lines;
  const line = lines[Math.floor(Math.random() * lines.length)]
    .replace("{n}", need)
    .replace("{r}", resourceLabel);
  return { id: `o${orderIdSeq++}`, npc, key, need, reward, line };
}

/**
 * Build a fresh state object with no I/O. This is the side-effect-free core
 * of `initialState`. Callers that want the hydrated-from-save behaviour
 * should use `initialState` instead.
 */
export function createFreshState(overrides) {
  const biomeKey = "farm";
  const level = 1;
  const o1 = makeOrder(biomeKey, level);
  const o2 = makeOrder(biomeKey, level, [o1.npc], [o1.key]);
  const o3 = makeOrder(biomeKey, level, [o1.npc, o2.npc], [o1.key, o2.key]);
  const marketSeed = Math.floor(Math.random() * 1e9);
  // saveSeed: stable per-save identifier for deterministic quest rolls.
  // If overrides supply one (e.g. from a loaded save), keep it; otherwise
  // generate from crypto.getRandomValues when available (better entropy than
  // Math.random's ~30 bits) and fall back to Math.random elsewhere.
  const saveSeed = overrides?.saveSeed ?? generateSaveSeed();
  // tools with structural flag support — startingExtraScythe grants +1 Scythe (clear) each session
  const extraScytheBonus = overrides?.tools?.startingExtraScythe ? 1 : 0;
  const fresh = {
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
    // Phase 7 — calendar season removed (state.seasonsCycled used to count
    // the global Spring/Summer/Autumn/Winter cycle). The in-session season
    // helper in features/zones/data.js is what drives the per-(zone, season)
    // spawn-rate sampler now.
    inventory: { supplies: 0 },
    orders: [o1, o2, o3],
    quests: rollQuests(saveSeed, 1, "spring"),
    tools: { clear: 2 + extraScytheBonus, basic: 1, rare: 1, shuffle: 0, bomb: 0,
             startingExtraScythe: !!overrides?.tools?.startingExtraScythe,
             magic_wand: 0, hourglass: 0, magic_seed: 0, magic_fertilizer: 0,
             water_pump: 0, explosives: 0,
             rake: 0, axe: 0, fertilizer: 0,
             cat: 0,
             bird_cage: 0, scythe_full: 0,
             rifle: 0, hound: 0 },
    toolPending: null,
    fertilizerActive: false,
    // Phase 9 — Mine biome state
    mysteriousOre: null,
    // Fish biome — Pearl rune-capture (mirror of mysterious ore).
    fishPearl: null,
    hazards: { caveIn: null, gasVent: null, lava: null, mole: null,
               // Phase 10.4 — Rat hazard
               rats: [],
               // Phase 10.7 — Fire hazard
               fire: null,
               // Phase 10.8 — Wolves hazard
               wolves: null },
    // Board grid (populated during play, not stored on init)
    grid: Array.from({ length: 6 }, () => Array.from({ length: 6 }, () => ({ key: "grass_hay" }))),
    _biomeRestored: false,
    lastChainSnapshot: null,
    magicFertilizerCharges: 0,
    built: { home: { hearth: true, decorations: {}, _plots: { 0: "hearth" } } },
    influence: 0,
    bubble: null,
    modal: null,
    pendingView: null,
    seasonStats: { harvests: 0, upgrades: 0, ordersFilled: 0, coins: 0 },
    _hintsShown: {},
    story: { ...INITIAL_STORY_STATE, flags: {}, queuedBeat: null, beatQueue: [], sandbox: false },
    npcs: {
      roster: ["wren"],
      bonds: { wren: 5, mira: 5, tomas: 5, bram: 5, liss: 5 },
      giftCooldown: { wren: 0, mira: 0, tomas: 0, bram: 0, liss: 0 },
    },
    market: { seed: marketSeed, season: 0, prices: driftPrices(marketSeed, 0), prevPrices: null },
    season: 0,
    runes: 0,
    runeStash: 0,
    shovel: 0,
    sessionMaxTurns: MAX_TURNS,
    // Phase 2 — Start Farming session config. `selectedTiles` is the up-to-8
    // categories the player chose to expose on the board this session;
    // `fertilizerUsed` records whether the session was started with the
    // turn-doubling fertilizer applied. Both reset on FARM/ENTER.
    session: { selectedTiles: [], fertilizerUsed: false },
    // Player-owned stock of farm fertilizer consumables. Distinct from the
    // workshop `tools.fertilizer` (spawn-injection passive) and from the
    // portal `tools.magic_fertilizer`. Spent inside FARM/ENTER when the
    // player toggles the fertilizer option in the Start Farming modal.
    farmFertilizer: 0,
    dailyStreak: { lastClaimedDate: null, currentDay: 0 },
    townsfolk: { hired: { hilda: 0, pip: 0, wila: 0, tuck: 0, osric: 0, dren: 0 }, debt: 0, pool: 1 },
    // Phase 5b — type-tier workers (anonymous, stackable). Distinct from
    // townsfolk (named individuals). Hired count is capped at each
    // worker's maxCount; per-hire effects accumulate via the apprentices
    // aggregator's TYPE_WORKERS pass.
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
    ...apprentices.initial,
    ...mood.initial,
    ...castle.initial,
    ...fish.initial,
    ...zones.initial,
    // Phase 12.5 — saved-field slots for Silo/Barn
    farm: { savedField: null },
    mine: { savedField: null },
  };
  return fresh;
}

/**
 * Stable per-save id seed used by deterministic systems (quest rolls).
 * Prefers crypto.getRandomValues for ~64 bits of entropy; falls back to
 * Math.random when crypto isn't available (older test envs).
 */
function generateSaveSeed() {
  try {
    const c = (typeof globalThis !== "undefined" && globalThis.crypto)
      || (typeof window !== "undefined" && window.crypto);
    if (c && typeof c.getRandomValues === "function") {
      const buf = new Uint32Array(2);
      c.getRandomValues(buf);
      return buf[0].toString(36).padStart(7, "0") + buf[1].toString(36).padStart(7, "0");
    }
  } catch { /* fall through */ }
  return Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10);
}

export function initialState(overrides) {
  const fresh = createFreshState(overrides);
  // Hydrate from save if present, but always force board view + clear modals on boot.
  // Saves whose schema version doesn't match the current version are discarded —
  // forward migrations are intentionally not maintained. Bump SAVE_SCHEMA_VERSION
  // whenever the persisted shape changes; existing players will start fresh.
  const raw = loadSavedState();
  if (raw && raw.version === SAVE_SCHEMA_VERSION) {
    const saved = raw;
    // Advance all ID sequences past persisted IDs so new items never collide.
    if (Array.isArray(saved.orders)) {
      for (const o of saved.orders) {
        const n = parseInt((o.id || '').slice(1), 10);
        if (!isNaN(n) && n >= orderIdSeq) orderIdSeq = n + 1;
      }
    }
    apprentices.seedHireSeq(saved.hiredApprentices);
    quests.seedQuestIdSeq(saved.dailies);
    // Merge saved story with INITIAL_STORY_STATE so older saves gain new beat fields.
    // Merge saved story: spread defaults first, then saved, then always clear volatile beat queue/modal on boot
    const mergedStory = saved.story
      ? { ...INITIAL_STORY_STATE, queuedBeat: null, beatQueue: [], sandbox: false, ...saved.story }
      : { ...INITIAL_STORY_STATE, flags: {}, queuedBeat: null, beatQueue: [], sandbox: false };
    // Always clear story modal queue on boot — never resume mid-modal
    mergedStory.queuedBeat = null;
    mergedStory.beatQueue = [];
    // Migrate: old saves without state.townsfolk get the fresh initial shape.
    const mergedWorkers = saved.townsfolk
      ? {
          hired: { hilda: 0, pip: 0, wila: 0, tuck: 0, osric: 0, dren: 0, ...(saved.townsfolk.hired ?? {}) },
          debt:  saved.townsfolk.debt  ?? 0,
          pool:  saved.townsfolk.pool  ?? 1,
        }
      : fresh.townsfolk;
    // Migrate: old saves without state.tileCollection get the default shape (also migrates legacy state.species)
    const mergedTileCollection = (() => {
      const freshTC = defaultTileCollectionSlice();
      const src = saved.tileCollection ?? saved.species; // backward compat
      if (!src || typeof src !== "object") return freshTC;
      return {
        discovered: { ...freshTC.discovered, ...src.discovered },
        researchProgress: { ...freshTC.researchProgress, ...src.researchProgress },
        activeByCategory: { ...freshTC.activeByCategory, ...src.activeByCategory },
        freeMoves: typeof src.freeMoves === "number" ? src.freeMoves : 0,
      };
    })();
    const savedWithoutLegacy = { ...saved };
    delete savedWithoutLegacy.species; // remove legacy key
    // Drop persisted fire if the feature flag is off — a previous session may
    // have spawned fire while it was enabled.
    if (!FIRE_HAZARD_ENABLED && savedWithoutLegacy.hazards?.fire) {
      savedWithoutLegacy.hazards = { ...savedWithoutLegacy.hazards, fire: null };
    }
    return { ...fresh, ...savedWithoutLegacy, townsfolk: mergedWorkers, story: mergedStory, tileCollection: mergedTileCollection, view: "town", viewParams: {}, turnsUsed: 0, modal: null, bubble: null, pendingView: null,
      seasonStats: { harvests: 0, upgrades: 0, ordersFilled: 0, coins: 0 } };
  }
  return fresh;
}

// Canonical almanac XP function (§17 linear, 150 XP/level).
// Wraps features/almanac/data.js awardXp() so all reducers route through it.
function applyAlmanacXp(state, amount) {
  const { newState, leveledTo } = awardXp(state, amount);
  return { newState, leveledTo };
}

// ─── Story trigger integration ────────────────────────────────────────────────
// evaluateAndApplyStoryBeat: given a game event, evaluate triggers against current story
// state and, if a beat fires, apply all side effects and queue the modal.
// Returns the updated state (no mutation).
function evaluateAndApplyStoryBeat(state, event) {
  const totals = state.inventory ?? {};
  const result = evaluateStoryTriggers(state.story ?? { ...INITIAL_STORY_STATE, flags: {} }, event, totals);
  if (!result) return state;
  // Delegate to the story slice reducer with a synthetic action
  return storySlice.reduce(state, { type: "STORY/BEAT_FIRED", payload: result });
}

// Emit resource_total events for changed inventory keys
function maybeFireResourceBeats(stateAfter, stateBefore) {
  const inv = stateAfter.inventory ?? {};
  const keys = Object.keys(inv);
  let next = stateAfter;
  // Check resource_total for each key that grew
  for (const key of keys) {
    const nowAmt = inv[key] || 0;
    const wasAmt = (stateBefore.inventory?.[key]) || 0;
    if (nowAmt > wasAmt) {
      next = evaluateAndApplyStoryBeat(next, { type: "resource_total", key, amount: nowAmt });
    }
  }
  // Also check resource_total_multi with full inventory snapshot
  next = evaluateAndApplyStoryBeat(next, { type: "resource_total_multi" });
  return next;
}

const locBuilt = _locBuilt;

function coreReducer(state, action) {
  switch (action.type) {
    case "GRID/SYNC": {
      const { grid } = action.payload;
      if (!grid) return state;
      return { ...state, grid };
    }
    case "CHAIN_COLLECTED": {
      // Phase 4.7: support { gains: {key: n, ...} } payload for cap-aware bulk collection
      if (action.payload?.gains) {
        const gainsMap = action.payload.gains;
        const cap = currentCap(state);
        const cf = { ...(state.seasonStats?.capFloaters ?? {}) };
        const inv = { ...state.inventory };
        const floaters = [...(state.floaters ?? [])];
        for (const [k, n] of Object.entries(gainsMap)) {
          addCappedResourceMut(inv, cf, floaters, k, n, cap);
        }
        return { ...state, inventory: inv, floaters,
          seasonStats: { ...state.seasonStats, capFloaters: cf } };
      }

      const { key, gained, upgrades, value, chainLength, noTurn } = action.payload;
      const hintsShown = state._hintsShown || {};
      const effectiveChain = chainLength || gained;

      // Tools (e.g. Scythe) emit chain-collected with noTurn:true — just add
      // resources without consuming a turn.
      if (noTurn) {
        const capNoTurn = currentCap(state);
        const inventory = { ...state.inventory };
        // No floater bookkeeping for tool-only gains (silent credit).
        addCappedResourceMut(inventory, {}, null, key, gained, capNoTurn);
        return { ...state, inventory };
      }

      // Mine/Farm hazard processing when full chain is provided in payload
      // (e.g. when GameScene dispatches CHAIN_COLLECTED with chain: [...]
      //  rather than a separate COMMIT_CHAIN)
      const chainTiles = action.payload.chain ?? null;
      const currentBiome = state.biome ?? state.biomeKey;
      let fireExtinguishPatch = null;
      let deadlyPatch = null;
      if (chainTiles && chainTiles.length > 0) {
        if (currentBiome === "farm") {
          // Rat clearing: chain of 3+ rat tiles
          const hasRat = chainTiles.some((t) => t.key === "rat");
          if (hasRat) {
            const patch = tryClearRatChain(state, chainTiles);
            if (patch) {
              return { ...state, hazards: patch.hazards, coins: patch.coins };
            }
            return state; // rejected
          }
          // Catalog §7 "deadly to pests" — Cypress / Beet / Phoenix in chain
          // exterminate orthogonally-adjacent rats. Captured here and applied
          // when building afterChain so the standard chain still resolves.
          deadlyPatch = tryDeadlyPestsKill(state, chainTiles);
          // Fire extinguishing — capture patch to apply when building afterChain
          fireExtinguishPatch = tryExtinguishFire(state, chainTiles);
        } else if (currentBiome === "mine") {
          // Mysterious ore capture
          const hasOre = chainTiles.some((t) => t.key === "mysterious_ore");
          if (hasOre && isMysteriousChainValid(chainTiles)) {
            return {
              ...state,
              runes: (state.runes ?? 0) + 1,
              mysteriousOre: null,
            };
          }
        } else if (currentBiome === "fish") {
          // Pearl capture — chain pearl + ≥2 other fish-category tiles → +1 rune
          const hasPearl = chainTiles.some((t) => t.key === PEARL_KEY);
          if (hasPearl && isPearlChainValid(chainTiles)) {
            return {
              ...state,
              runes: (state.runes ?? 0) + 1,
              fishPearl: null,
              bubble: { id: Date.now(), npc: "wren", text: "🟣 Pearl captured! +1 Rune.", ms: 2200, priority: 2 },
            };
          }
        }
      }

      // Boss board modifier: active boss may require longer chains
      const bossMinChain = state.boss?.minChain || 0;
      if (bossMinChain > 0 && effectiveChain < bossMinChain) {
        const turnsUsed = state.turnsUsed + 1;
        const seasonEnded = turnsUsed >= (state.sessionMaxTurns ?? MAX_TURNS);
        return {
          ...state,
          turnsUsed,
          bubble: { id: Date.now(), npc: "mira", text: `${state.boss.emoji} Challenge: chains need ${bossMinChain}+ tiles!`, ms: 2200, priority: 2 },
          modal: seasonEnded ? "season" : state.modal,
        };
      }

      const res = resourceByKey(key);
      const inventory = { ...state.inventory };
      const chainCap = currentCap(state);
      const chainCf = { ...(state.seasonStats?.capFloaters ?? {}) };
      const chainFloaters = [...(state.floaters ?? [])];

      const effectiveGained = gained;
      addCappedResourceMut(inventory, chainCf, chainFloaters, key, effectiveGained, chainCap);

      let effectiveUpgrades = upgrades;
      // Catalog §7 yield multiplier — Jackfruit → 2× pie, Triceratops → 2× milk.
      // Applies only when the chain key has an entry AND the upgrade target
      // (res.next) matches the entry's productKey (sanity-guard).
      const yieldMult = yieldMultiplierFor(key);
      if (yieldMult && res?.next === yieldMult.productKey && effectiveUpgrades > 0) {
        effectiveUpgrades = effectiveUpgrades * yieldMult.multiplier;
      }
      if (res?.next && effectiveUpgrades > 0) {
        addCappedResourceMut(inventory, chainCf, chainFloaters, res.next, effectiveUpgrades, chainCap);
      }

      // Power-hook coin bonuses (set via Balance Manager → Tile Powers).
      const chainTileEffects = TILE_TYPES_MAP[key]?.effects ?? {};
      const hookFlat = chainTileEffects.coinBonusFlat || 0;
      const hookPerTile = chainTileEffects.coinBonusPerTile || 0;
      const coinHookBonus = hookFlat + hookPerTile * effectiveChain;

      // Catalog §7 "long chain gives X" bonuses — Buckwheat → herd, Eggplant
      // → veg, Goose → veg, Willow → veg, Broccoli → flower, Warthog → mount.
      const longBonus = longChainBonusFor(key, effectiveChain);
      if (longBonus) {
        addCappedResourceMut(inventory, chainCf, chainFloaters, longBonus.bonusKey, longBonus.amount, chainCap);
      }

      const coinsGain = Math.max(1, Math.floor((effectiveGained * value) / 2)) + coinHookBonus;
      // §17 locked: 1 XP per chain (regardless of length/value) into almanac
      const { newState: afterAlmanacXp } = applyAlmanacXp(state, 1);
      const turnsUsed = state.turnsUsed + 1;
      const seasonEnded = turnsUsed >= MAX_TURNS;
      const seasonStats = {
        ...state.seasonStats,
        harvests: state.seasonStats.harvests + effectiveGained,
        upgrades: state.seasonStats.upgrades + effectiveUpgrades,
        coins: state.seasonStats.coins + coinsGain,
      };

      let bubble = state.bubble;
      let newHintsShown = hintsShown;

      const leveledUp = afterAlmanacXp.almanac.level > state.almanac.level;
      if (leveledUp) {
        if (afterAlmanacXp.almanac.level === 2) {
          bubble = { id: Date.now(), npc: "wren", text: "Level 2! ⛏️ Mine biome unlocked — switch with the button below.", ms: 2800, priority: 2 };
        } else {
          bubble = { id: Date.now(), npc: "wren", text: `Level ${afterAlmanacXp.almanac.level}! New things await.`, ms: 2400, priority: 2 };
        }
      } else if (effectiveUpgrades > 0 && !hintsShown.upgradeHint) {
        bubble = { id: Date.now(), npc: "mira", text: "★ Upgrade! Chain 6+ tiles to snowball rare resources.", ms: 2800, priority: 2 };
        newHintsShown = { ...hintsShown, upgradeHint: true };
      }

      // Capture snapshot for hourglass rewind (before chain is applied)
      const lastChainSnapshot = {
        inventory: state.inventory,
        grid: state.grid ?? null,
        turnsUsed: state.turnsUsed,
      };

      const fireCoinBonus = fireExtinguishPatch?.coinsBonus ?? 0;
      // deadlyPatch kills rats adjacent to chained "deadly_pests" tiles.
      // Patch is preferred over fireExtinguish for hazards; both also bump coins.
      const deadlyCoinBonus = deadlyPatch
        ? (deadlyPatch.coins ?? state.coins) - (state.coins ?? 0)
        : 0;
      // If both patches present, deadlyPatch's hazards (sans rats) takes
      // priority; fire patch updates the fire field within hazards.
      const mergedHazards = deadlyPatch
        ? (fireExtinguishPatch
            ? { ...fireExtinguishPatch.hazards, rats: deadlyPatch.hazards.rats }
            : deadlyPatch.hazards)
        : (fireExtinguishPatch ? fireExtinguishPatch.hazards : null);
      let afterChain = {
        ...state,
        ...(mergedHazards ? { hazards: mergedHazards } : {}),
        inventory,
        coins: state.coins + coinsGain + fireCoinBonus + deadlyCoinBonus,
        xp: afterAlmanacXp.almanac.xp,
        level: afterAlmanacXp.almanac.level,
        almanac: afterAlmanacXp.almanac,
        turnsUsed,
        seasonStats: { ...seasonStats, capFloaters: chainCf },
        floaters: chainFloaters,
        bubble,
        _hintsShown: newHintsShown,
        lastChainLength: effectiveChain,
        lastChainSnapshot,
        modal: seasonEnded ? "season" : state.modal,
      };
      // Mine: tick mysterious ore countdown on each chain
      if ((afterChain.biome ?? afterChain.biomeKey) === "mine" && afterChain.mysteriousOre) {
        afterChain = tickMysteriousOre(afterChain);
      }
      // Fish: tick pearl countdown on each chain
      if ((afterChain.biome ?? afterChain.biomeKey) === "fish" && afterChain.fishPearl) {
        afterChain = tickPearl(afterChain);
      }
      // Hazard tick + spawn (farm: fire/wolves, mine: gas_vent/lava/mole/cave_in)
      const chainBiome = afterChain.biome ?? afterChain.biomeKey;
      if (chainBiome === "farm") {
        afterChain = tickFire(afterChain);
        afterChain = tickWolves(afterChain);
        // Roll for a new hazard spawn only when none is currently active
        const hazardSpawn = rollFarmHazard(afterChain);
        if (hazardSpawn) {
          const hazards = { ...afterChain.hazards };
          if (hazardSpawn.kind === "fire") hazards.fire = { cells: hazardSpawn.cells };
          else if (hazardSpawn.kind === "wolf") hazards.wolves = { list: [{ row: hazardSpawn.row, col: hazardSpawn.col, scared: false }], scaredTurnsRemaining: 0 };
          afterChain = { ...afterChain, hazards };
        }
      } else if (chainBiome === "mine") {
        afterChain = tickHazards(afterChain);
        // Roll for a new mine hazard
        const mineSpawn = rollHazard(afterChain);
        if (mineSpawn) {
          afterChain = { ...afterChain, hazards: { ...(afterChain.hazards ?? {}), ...mineSpawn } };
        }
      }
      // Story: evaluate resource beats after inventory updated
      return maybeFireResourceBeats(afterChain, state);
    }
    case "TURN_IN_ORDER": {
      const o = state.orders.find((x) => x.id === action.id);
      if (!o) return state;
      if ((state.inventory[o.key] || 0) < o.need) {
        return { ...state, bubble: { id: Date.now(), npc: o.npc, text: "Need more!", ms: 1100 } };
      }
      const inventory = { ...state.inventory };
      inventory[o.key] -= o.need;
      const remainingOrders = state.orders.filter((x) => x.id !== o.id);
      const usedNpcs = remainingOrders.map((x) => x.npc);
      const usedKeys = remainingOrders.map((x) => x.key);
      const replacement = makeOrder(state.biomeKey, state.level, usedNpcs, usedKeys);
      // §17 locked: 5 XP per order into almanac
      const { newState: afterOrderAlmanac } = applyAlmanacXp(state, 5);
      // Bond multiplier (Phase 6.1): base reward × bond modifier
      const npcBond = state.npcs?.bonds?.[o.npc] ?? 5;
      // Use order.baseReward if present, else fall back to order.reward as the base
      const orderBase = o.baseReward ?? o.reward;
      const bondPaid = payOrder({ baseReward: orderBase }, npcBond);
      const actualReward = bondPaid;
      // Bump bond +0.3 on delivery (Phase 6.1)
      const newBond = gainBond(npcBond, 0.3);
      const updatedNpcs = state.npcs
        ? { ...state.npcs, bonds: { ...state.npcs.bonds, [o.npc]: newBond } }
        : state.npcs;
      // Auto-repay debt before crediting coins
      const { coinsCredit, newDebt } = applyDebtRepayment(state, actualReward);
      // Dialog line from pool (Phase 6.3) — calendar season removed; pass null
      // and let pickDialog fall back to a season-agnostic line.
      const dialogLine = pickDialog(o.npc, null, newBond, Math.random);
      const orderLeveledUp = afterOrderAlmanac.almanac.level > state.almanac.level;
      let bubble = { id: Date.now(), npc: o.npc,
        text: `+${actualReward}◉ — ${dialogLine}`,
        ms: 2000 };
      if (orderLeveledUp) {
        bubble = { id: Date.now(), npc: "wren", text: `Level ${afterOrderAlmanac.almanac.level}! New things await.`, ms: 2400 };
      }
      return {
        ...state,
        inventory,
        coins: state.coins + coinsCredit,
        xp: afterOrderAlmanac.almanac.xp,
        level: afterOrderAlmanac.almanac.level,
        almanac: afterOrderAlmanac.almanac,
        orders: state.orders.map((x) => (x.id === o.id ? replacement : x)),
        seasonStats: { ...state.seasonStats, ordersFilled: state.seasonStats.ordersFilled + 1, coins: state.seasonStats.coins + actualReward },
        townsfolk: state.townsfolk ? { ...state.townsfolk, debt: newDebt } : state.townsfolk,
        npcs: updatedNpcs,
        bubble,
      };
    }
    case "CRAFT_TOOL": {
      // Phase 10.1 — craft a Workshop tool (rake / axe / fertilizer / cat / etc.)
      const toolId = action.id ?? action.payload?.id;
      if (!toolId) return state;
      const toolRecipe = WORKSHOP_RECIPES[toolId];
      if (!toolRecipe) return state;
      // Workshop must be built
      if (!locBuilt(state).workshop) return state;
      if (!hasAllInventory(state, toolRecipe.inputs)) return state;
      return {
        ...state,
        inventory: deductInventory(state.inventory ?? {}, toolRecipe.inputs),
        tools: { ...state.tools, [toolId]: (state.tools[toolId] ?? 0) + 1 },
      };
    }

    case "CANCEL_TOOL": {
      // Refund and disarm an armed tap-target tool. Portal magic_wand also
      // routes through here so re-clicking it from the panel un-arms it.
      const pending = state.toolPending;
      if (!pending) return state;
      return {
        ...state,
        toolPending: null,
        tools: { ...state.tools, [pending]: (state.tools[pending] ?? 0) + 1 },
      };
    }
    case "USE_TOOL": {
      // Support action.payload.id (Phase 9), action.payload.key, or action.key (legacy)
      const rawKey = action.payload?.id ?? action.payload?.key ?? action.key;
      // Map dropped legacy aliases onto their canonical counterparts so older
      // call sites (and any quest/reward shapes still in flight) keep working.
      const ALIAS = { scythe: "clear", seedpack: "basic", lockbox: "rare", reshuffle: "shuffle" };
      const key = ALIAS[rawKey] ?? rawKey;
      // Magic tools (hourglass, magic_seed, magic_fertilizer) are handled exclusively
      // by the portal slice — skip them here to avoid double-consume.
      const MAGIC_TOOL_IDS = new Set(["hourglass", "magic_seed", "magic_fertilizer", "magic_wand"]);
      if (MAGIC_TOOL_IDS.has(key)) return state;
      if ((state.tools[key] || 0) <= 0) return state;
      const tools = { ...state.tools, [key]: state.tools[key] - 1 };
      if (key === "shuffle") {
        return {
          ...state,
          tools,
          toolPending: "shuffle",
          bubble: { id: Date.now(), npc: "bram", text: "Reshuffle Horn — board reshuffled!", ms: 1500 },
        };
      }
      if (key === "clear") {
        return {
          ...state,
          tools,
          toolPending: "clear",
          bubble: { id: Date.now(), npc: "bram", text: "Scythe — clearing tiles!", ms: 1500 },
        };
      }
      if (key === "basic") {
        return {
          ...state,
          tools,
          toolPending: "basic",
          bubble: { id: Date.now(), npc: "bram", text: "Seedpack — placing seeds!", ms: 1500 },
        };
      }
      if (key === "rare") {
        return {
          ...state,
          tools,
          toolPending: "rare",
          bubble: { id: Date.now(), npc: "bram", text: "Lockbox — placing rare tiles!", ms: 1500 },
        };
      }
      if (key === "bomb") {
        return {
          ...state,
          tools,
          toolPending: "bomb",
          bubble: { id: Date.now(), npc: "bram", text: "Bomb armed — tap a tile to detonate!", ms: 1500 },
        };
      }
      // Phase 9 — Water Pump: clear all lava cells (converts to rubble), no turn cost
      if (key === "water_pump") {
        const lavaCells = state.hazards?.lava?.cells ?? [];
        let grid = state.grid;
        if (lavaCells.length > 0 && grid) {
          const lavaSet = new Set(lavaCells.map((c) => `${c.row},${c.col}`));
          grid = grid.map((row, ri) =>
            row.map((t, ci) =>
              lavaSet.has(`${ri},${ci}`) ? { ...t, key: "mine_stone", rubble: true, lava: false } : t,
            ),
          );
        }
        return {
          ...state,
          tools,
          grid,
          hazards: { ...state.hazards, lava: null },
        };
      }
      // Phase 9 — Explosives: clear mole + cave-in rubble, no turn cost
      if (key === "explosives") {
        return {
          ...state,
          tools,
          hazards: { ...state.hazards, mole: null, caveIn: null },
        };
      }
      // Phase 10.1 — Rake / Axe: arm the board tool (no turn cost)
      if (key === "rake" || key === "axe") {
        return { ...state, tools, toolPending: key };
      }
      // Phase 10.1 — Fertilizer: set flag for next fillBoard (no turn cost)
      if (key === "fertilizer") {
        return { ...state, tools, fertilizerActive: true };
      }
      // Phase 10.5 — Cat: clear all rats from board (no turn cost)
      if (key === "cat") {
        const rats = state.hazards?.rats ?? [];
        if (rats.length === 0) {
          // Refund — no rats to chase
          return { ...state, tools: { ...state.tools }, // don't decrement
            bubble: { id: Date.now(), npc: "bram", text: "No rats to chase.", ms: 1200 } };
        }
        // Clear rat tiles from grid
        const ratSet = new Set(rats.map((r) => `${r.row},${r.col}`));
        let grid = state.grid;
        if (grid) {
          grid = grid.map((row, ri) =>
            row.map((t, ci) =>
              ratSet.has(`${ri},${ci}`) ? { ...t, key: null, _emptied: true } : t,
            ),
          );
        }
        return {
          ...state,
          tools,
          grid,
          hazards: { ...state.hazards, rats: [] },
        };
      }
      // Phase 10.6 — Bird Cage: collect all egg tiles (no turn cost)
      if (key === "bird_cage") {
        let grid = state.grid;
        let collected = 0;
        if (grid) {
          const eggCount = grid.flat().filter((t) => t.key === "bird_egg").length;
          if (eggCount === 0) {
            return { ...state, tools: { ...state.tools }, // refund
              bubble: { id: Date.now(), npc: "bram", text: "No eggs to cage.", ms: 1200 } };
          }
          grid = grid.map((row) =>
            row.map((t) => {
              if (t.key === "bird_egg") { collected += 1; return { ...t, key: null, _emptied: true }; }
              return t;
            }),
          );
        }
        return {
          ...state,
          tools,
          grid,
          inventory: { ...state.inventory, bird_egg: (state.inventory?.bird_egg ?? 0) + collected },
        };
      }
      // Phase 10.6 — Scythe (full): collect all grain tiles (no turn cost)
      if (key === "scythe_full") {
        let grid = state.grid;
        let collectedGrain = 0;
        if (grid) {
          const grainCount = grid.flat().filter((t) => t.key === "grain").length;
          if (grainCount === 0) {
            return { ...state, tools: { ...state.tools }, // refund
              bubble: { id: Date.now(), npc: "bram", text: "No grain to cut.", ms: 1200 } };
          }
          grid = grid.map((row) =>
            row.map((t) => {
              if (t.key === "grain") { collectedGrain += 1; return { ...t, key: null, _emptied: true }; }
              return t;
            }),
          );
        }
        return {
          ...state,
          tools,
          grid,
          inventory: { ...state.inventory, grain: (state.inventory?.grain ?? 0) + collectedGrain },
        };
      }
      // Phase 10.8 — Rifle: clear all wolves (no turn cost)
      if (key === "rifle") {
        return {
          ...state,
          tools,
          hazards: { ...state.hazards, wolves: null },
        };
      }
      // Phase 10.8 — Hound: scatter all wolves for 5 turns (no turn cost)
      if (key === "hound") {
        const wolvesState = state.hazards?.wolves;
        if (!wolvesState) return { ...state, tools };
        return {
          ...state,
          tools,
          hazards: {
            ...state.hazards,
            wolves: {
              ...wolvesState,
              list: (wolvesState.list ?? []).map((w) => ({ ...w, scared: true })),
              scaredTurnsRemaining: 5,
            },
          },
        };
      }
      // Unknown tool key — decrement only
      return { ...state, tools };
    }
    case "SWITCH_BIOME": {
      // Support both legacy action.key and Phase 12.5 action.payload.biome
      const key = action.key ?? action.payload?.biome;
      if (!key) return state;
      if (key === state.biomeKey) return state;
      if (key === "mine" && state.level < 2) {
        return { ...state, bubble: { id: Date.now(), npc: "wren", text: "Mine unlocks at Level 2.", ms: 1800 } };
      }
      // Phase 12.5 — restore saved board if Silo/Barn built and snapshot exists
      const savedField = state[key]?.savedField ?? null;
      let boardPatch = {};
      if (savedField && savedField.tiles) {
        boardPatch = { grid: savedField.tiles };
      }
      const excludeNpcs = [];
      const excludeKeys = [];
      const replacements = (state.orders ?? []).map(() => {
        const o = makeOrder(key, state.level, excludeNpcs, excludeKeys);
        excludeNpcs.push(o.npc);
        excludeKeys.push(o.key);
        return o;
      });
      return { ...state, biome: key, biomeKey: key, orders: replacements, turnsUsed: 0, _biomeRestored: !!(savedField && savedField.tiles), ...boardPatch };
    }
    case "SET_VIEW": {
      const next = action.view;
      // Reset viewParams when leaving a view so a fresh visit doesn't inherit
      // stale sub-tabs (e.g. tile-wiki sub-category from a previous trip).
      const sameView = next === state.view;
      const viewParams = action.viewParams ?? (sameView ? state.viewParams : {});
      return { ...state, view: next, viewParams, craftingTab: action.craftingTab ?? (next === "crafting" ? state.craftingTab : null) };
    }
    case "SET_VIEW_PARAMS":
      return { ...state, viewParams: { ...(state.viewParams ?? {}), ...(action.params ?? {}) } };
    case "OPEN_MODAL":
      return { ...state, modal: action.modal, settingsTab: action.settingsTab ?? 'main' };
    case "CLOSE_MODAL":
      return { ...state, modal: null, settingsTab: 'main', settingsDebugOpen: false };
    case "ROUTE/APPLY": {
      // Apply a router-derived navigation snapshot in one shot. Each branch
      // matches the equivalent SET_VIEW / OPEN_MODAL / SETTINGS/SET_TAB
      // semantics so popstate-driven changes look identical to user-driven
      // ones from the rest of the app's perspective.
      const r = action.route ?? {};
      const view = r.view ?? state.view ?? "town";
      const modal = r.modal ?? null;
      const incomingViewParams = r.viewParams ?? {};
      const next = { ...state, view, viewParams: incomingViewParams };
      if (view === "crafting") {
        next.craftingTab = incomingViewParams.tab ?? state.craftingTab ?? null;
      } else {
        next.craftingTab = null;
      }
      next.modal = modal;
      if (modal === "menu") {
        next.settingsTab = r.modalParams?.tab ?? 'main';
      } else {
        next.settingsTab = 'main';
        next.settingsDebugOpen = false;
      }
      return next;
    }
    case "BUILD": {
      // Support both legacy action.building (full object) and action.payload.id (lookup by id)
      const b = action.building ?? BUILDINGS.find((x) => x.id === action.payload?.id);
      if (!b) return state;
      const canCoin = state.coins >= (b.cost.coins || 0);
      const canRes = Object.entries(b.cost).every(
        ([k, v]) => k === "coins" || k === "runes" || (state.inventory[k] || 0) >= v,
      );
      // Special gate: portal requires runes (not inventory)
      const runesNeeded = b.cost.runes ?? 0;
      const canRunes = (state.runes ?? 0) >= runesNeeded;
      if (!canCoin || !canRes || !canRunes) return state;
      // Plot assignment: validate explicit plot index, otherwise auto-pick first free.
      const lbForPlot = locBuilt(state);
      const plots = { ...(lbForPlot._plots ?? {}) };
      const requestedPlot = action.plot ?? action.payload?.plot;
      const occupied = (idx) => Object.prototype.hasOwnProperty.call(plots, String(idx));
      let plotIdx;
      if (typeof requestedPlot === "number" && requestedPlot >= 0) {
        if (occupied(requestedPlot)) return state;
        plotIdx = requestedPlot;
      } else {
        // Auto-assign: scan ascending until a free index is found.
        plotIdx = 0;
        while (occupied(plotIdx)) plotIdx++;
      }
      plots[plotIdx] = b.id;
      const inventory = { ...state.inventory };
      Object.entries(b.cost).forEach(([k, v]) => {
        if (k !== "coins" && k !== "runes") inventory[k] = (inventory[k] || 0) - v;
      });
      const hintsShown = state._hintsShown || {};
      const CRAFTING_STATIONS = new Set(["bakery", "forge", "larder"]);
      const isCraftStation = CRAFTING_STATIONS.has(b.id);
      let bubble = { id: Date.now(), npc: "mira", text: `${b.name} built! The vale grows warmer.`, ms: 2200 };
      let newHintsShown = hintsShown;
      if (isCraftStation && !hintsShown.craftHint) {
        bubble = { id: Date.now(), npc: "mira", text: `${b.name} built! 🔨 Tap it in Town to open crafting recipes.`, ms: 2800 };
        newHintsShown = { ...hintsShown, craftHint: true };
      } else if (b.id === "inn" && !hintsShown.innHint) {
        bubble = { id: Date.now(), npc: "wren", text: "Inn built! 🧑‍🌾 You can now hire Helpers from the nav below.", ms: 2800 };
        newHintsShown = { ...hintsShown, innHint: true };
      }
      // §17 locked: 10 XP per building into almanac
      const { newState: afterBuildAlmanac } = applyAlmanacXp(state, 10);
      const afterBuild = {
        ...state,
        coins: state.coins - (b.cost.coins || 0),
        runes: (state.runes ?? 0) - runesNeeded,
        inventory,
        built: { ...state.built, [state.mapCurrent]: { ...locBuilt(state), [b.id]: true, _plots: plots } },
        almanac: afterBuildAlmanac.almanac,
        bubble,
        _hintsShown: newHintsShown,
      };
      // Story: fire building_built trigger
      let afterBuildStory = evaluateAndApplyStoryBeat(afterBuild, { type: "building_built", id: b.id });
      // Check if all 8 story-required buildings are now built
      const homeBuilt = afterBuildStory.built?.home ?? {};
      const allBuilt = STORY_BUILDING_IDS.every((id) => homeBuilt[id]);
      if (allBuilt) {
        afterBuildStory = evaluateAndApplyStoryBeat(afterBuildStory, { type: "all_buildings_built", allBuilt: true });
      }
      return afterBuildStory;
    }
    case "POP_NPC":
      return { ...state, bubble: { id: Date.now(), npc: action.npc, text: action.text, ms: action.ms ?? 1800 } };
    case "DISMISS_BUBBLE":
      return state.bubble && state.bubble.id === action.id ? { ...state, bubble: null } : state;
    case "CLOSE_SEASON": {
      const newSeasonNum = (state.market?.season ?? 0) + 1;
      const mSeed = state.market?.seed ?? 0;
      const newPrices = driftPrices(mSeed, newSeasonNum);
      // Spec §11: shuffles are earned via almanac/quests — not free per season.
      // TODO: if players run out of shuffles entirely, add a season-1 bootstrap grant here.
      let tools = { ...state.tools };
      // Powder Store: grant 2 bombs per season-end
      if (locBuilt(state).powder_store) {
        tools = { ...tools, bomb: (tools.bomb ?? 0) + 2 };
      }

      // ── Wages (FIRST economic event) ──────────────────────────────────────
      let wageCoins = state.coins;
      let wageDebt  = state.townsfolk?.debt ?? 0;
      let totalWages = 0;
      for (const [id, count] of Object.entries(state.townsfolk?.hired ?? {})) {
        const w = WORKER_MAP[id];
        if (!w || count <= 0) continue;
        totalWages += w.wage * count;
      }
      if (wageCoins >= totalWages) {
        wageCoins -= totalWages;
      } else {
        wageDebt += (totalWages - wageCoins);
        wageCoins = 0;
      }
      wageDebt = Math.min(wageDebt, MAX_DEBT);

      // ── season_bonus AFTER wages, AND only when not in debt ───────────────
      let bonusCoins = 0;
      if (wageDebt === 0) {
        const agg = computeWorkerEffects({ ...state, townsfolk: { ...state.townsfolk, debt: 0 } });
        bonusCoins = Math.round(agg.seasonBonus.coins ?? 0);
      }

      // ── Pool income from Housing buildings ────────────────────────────────
      const housingCount = ["housing", "housing2", "housing3"].filter(id => !!locBuilt(state)[id]).length;
      const newPool = (state.townsfolk?.pool ?? 0) + housingCount;

      // ── Phase 6.1: NPC bond decay (−0.1 above 5) + Phase 6.2: reset gift cooldowns ──
      const decayedNpcs = (() => {
        if (!state.npcs) return state.npcs;
        const bonds = { ...state.npcs.bonds };
        for (const id of NPC_IDS) bonds[id] = decayBond(bonds[id] ?? 5);
        const giftCooldown = Object.fromEntries(NPC_IDS.map((id) => [id, 0]));
        return { ...state.npcs, bonds, giftCooldown };
      })();

      const afterSeason = {
        ...state,
        tools,
        coins: wageCoins + bonusCoins + SEASON_END_BONUS_COINS,
        turnsUsed: 0,
        sessionMaxTurns: MAX_TURNS,
        modal: null,
        view: "town",
        viewParams: {},
        pendingView: null,
        seasonStats: { harvests: 0, upgrades: 0, ordersFilled: 0, coins: 0, capFloaters: {} },
        townsfolk: { ...state.townsfolk, debt: wageDebt, pool: newPool },
        // Clear fertilizer flag at season end — it was consumed this season
        fertilizerActive: false,
        // 5.7: reset per-season free moves on season close
        tileCollection: state.tileCollection ? { ...state.tileCollection, freeMoves: 0 } : state.tileCollection,
        npcs: decayedNpcs,
        bubble: { id: Date.now(), npc: "tomas", text: "Season ended! +25◉ season bonus.", ms: 2000 },
        market: {
          ...(state.market ?? {}),
          season: newSeasonNum,
          prevPrices: state.market?.prices ?? null,
          prices: newPrices,
        },
      };
      // Phase 12.5 — snapshot board into saved-field slot when Silo/Barn is built
      let afterSeasonFarm = afterSeason.farm ?? { savedField: null };
      let afterSeasonMine = afterSeason.mine ?? { savedField: null };
      if (state.biomeKey === "farm" && locBuilt(state).silo && state.grid) {
        afterSeasonFarm = { ...afterSeasonFarm, savedField: {
          tiles: state.grid,
          hazards: state.hazards ?? null,
          turnsUsed: 0,
        } };
      }
      if (state.biomeKey === "mine" && locBuilt(state).barn && state.grid) {
        afterSeasonMine = { ...afterSeasonMine, savedField: {
          tiles: state.grid,
          hazards: state.hazards ?? null,
          turnsUsed: 0,
        } };
      }
      // Phase 7 — calendar removed: deterministic quest rolling now uses a
      // monotonically-increasing session counter (state.market.season carries
      // it forward) so quest content still varies session-to-session.
      const sessionCounter = (state.market?.season ?? 0) + 1;
      const rerolledQuests = rollQuests(state.saveSeed ?? "default", sessionCounter, "Spring");
      const afterSeasonWithFields = {
        ...afterSeason,
        farm: afterSeasonFarm,
        mine: afterSeasonMine,
        quests: rerolledQuests,
      };
      // Story: fire session_ended trigger (was season_entered before the
      // calendar was deleted). Story content keyed on season names should be
      // re-keyed in a follow-up; for now we pass null so calendar-bound beats
      // simply don't fire.
      return evaluateAndApplyStoryBeat(afterSeasonWithFields, { type: "session_ended", season: null });
    }
    case "SESSION_START": {
      // Always evaluate story beats on session start — each beat checks its own first-time
      // flags via isBeatComplete() in nextPendingBeat(). The blanket intro_seen gate was
      // removed so later session_start beats (if added) also fire correctly.
      return evaluateAndApplyStoryBeat(state, { type: "session_start" });
    }
    case "CRAFTING/CRAFT_RECIPE": {
      // Story: crafted items can trigger story beats (forwarded to next action handlers below)
      const craftKey = action.payload?.key;
      if (!craftKey) return state;
      return evaluateAndApplyStoryBeat(state, { type: "craft_made", item: craftKey, count: 1 });
    }

    // ─── Phase 3 Economy ────────────────────────────────────────────────────────

    case "BUY_RESOURCE": {
      const { key: buyKey, qty: buyQty } = action.payload;
      if (CAPPED_RESOURCES.includes(buyKey)) {
        const buyingCap = currentCap(state);
        const currentAmt = state.inventory?.[buyKey] ?? 0;
        if (currentAmt + buyQty > buyingCap) return state; // cap reached — no debit
      }
      return applyTrade(state, action);
    }
    case "SELL_RESOURCE": {
      const afterTrade = applyTrade(state, action);
      if (afterTrade === state) return state; // trade rejected (not enough inventory)
      // Auto-repay debt from sale proceeds
      const saleProceeds = afterTrade.coins - state.coins;
      if (saleProceeds > 0 && (state.townsfolk?.debt ?? 0) > 0) {
        const { coinsCredit, newDebt } = applyDebtRepayment(state, saleProceeds);
        return { ...afterTrade,
          coins: state.coins + coinsCredit,
          townsfolk: afterTrade.townsfolk ? { ...afterTrade.townsfolk, debt: newDebt } : afterTrade.townsfolk,
        };
      }
      return afterTrade;
    }

    case "CONVERT_TO_SUPPLY": {
      const qty = Math.max(1, action.payload.qty | 0);
      const cost = qty * 3;
      if ((state.inventory.grain ?? 0) < cost) return state;
      return {
        ...state,
        inventory: {
          ...state.inventory,
          grain: state.inventory.grain - cost,
          supplies: (state.inventory.supplies ?? 0) + qty,
        },
      };
    }

    case "ENTER_MINE": {
      if (!state.story?.flags?.mine_unlocked) return state;
      const mode = action.payload?.mode ?? "standard";
      if (mode === "standard") {
        if ((state.inventory.supplies ?? 0) < 3) return state;
        return {
          ...state,
          biome: "mine",
          biomeKey: "mine",
          inventory: { ...state.inventory, supplies: state.inventory.supplies - 3 },
        };
      }
      if (mode === "premium") {
        if ((state.runes ?? 0) < 2) return state;
        return { ...state, biome: "mine", biomeKey: "mine", runes: state.runes - 2 };
      }
      return state;
    }

    case "FARM/ENTER": {
      // Phase 2 — pay-to-start farming session.
      // Payload: { selectedTiles: string[], useFertilizer: boolean }
      // - selectedTiles: zone categories the player chose (1 per type, max 8).
      //   Filtered by GameScene to bias spawn rotation. Empty array is allowed
      //   and behaves as "no filter" (legacy entry path).
      // - useFertilizer: when true, decrement farmFertilizer and double the
      //   session's turn budget.
      const payload = action.payload ?? {};
      const selectedTiles = Array.isArray(payload.selectedTiles)
        ? payload.selectedTiles.slice(0, 8)
        : [];
      const useFertilizer = !!payload.useFertilizer;

      const zoneId = state.activeZone ?? state.mapCurrent ?? "home";
      const zone = ZONES[zoneId];
      if (!zone) return state;

      const entryCoins = zone.entryCost?.coins ?? 50;
      if ((state.coins ?? 0) < entryCoins) return state;
      if (useFertilizer && (state.farmFertilizer ?? 0) < 1) return state;

      const startingTurns = zone.startingTurns ?? MAX_TURNS;
      const sessionMaxTurns = startingTurns * (useFertilizer ? 2 : 1);

      return {
        ...state,
        biomeKey: "farm",
        biome: "farm",
        view: "board",
        viewParams: {},
        coins: state.coins - entryCoins,
        farmFertilizer: useFertilizer
          ? (state.farmFertilizer ?? 0) - 1
          : (state.farmFertilizer ?? 0),
        turnsUsed: 0,
        sessionMaxTurns,
        session: {
          selectedTiles,
          fertilizerUsed: useFertilizer,
        },
      };
    }

    case "MINE/ENTER": {
      if (!state.story?.flags?.mine_unlocked) return state;
      const tier = MINE_ENTRY_TIERS.find((t) => t.id === action.payload?.tier);
      if (!tier) return state;
      let mineBase;
      if (tier.id === "free") {
        if ((state.inventory.supplies ?? 0) < 3) return state;
        mineBase = {
          ...state,
          biomeKey: "mine",
          biome: "mine",
          inventory: { ...state.inventory, supplies: state.inventory.supplies - 3 },
          sessionMaxTurns: MAX_TURNS,
        };
      } else if (tier.id === "better") {
        if ((state.coins ?? 0) < 100 || (state.shovel ?? 0) < 10) return state;
        mineBase = {
          ...state,
          biomeKey: "mine",
          biome: "mine",
          coins: state.coins - 100,
          shovel: state.shovel - 10,
          sessionMaxTurns: MAX_TURNS + 2,
        };
      } else if (tier.id === "premium") {
        if ((state.runes ?? 0) < 2) return state;
        mineBase = { ...state, biomeKey: "mine", biome: "mine", runes: state.runes - 2, sessionMaxTurns: MAX_TURNS };
      } else {
        return state;
      }
      // Spawn mysterious ore on mine entry if grid is available
      if (mineBase.grid && mineBase.grid.length > 0) {
        return spawnMysteriousOre(mineBase);
      }
      return mineBase;
    }

    case "HARBOR/ENTER": {
      // Mirror of MINE/ENTER. Pays a per-trip cost from the chosen tier;
      // each tier may extend turns and/or boost the trip in other ways.
      const tier = HARBOR_ENTRY_TIERS.find((t) => t.id === action.payload?.tier);
      if (!tier) return state;
      let harborBase;
      if (tier.id === "free") {
        if ((state.inventory?.wood_plank ?? 0) < (tier.wood_plank ?? 0)) return state;
        harborBase = {
          ...state,
          biomeKey: "fish",
          biome: "fish",
          inventory: { ...state.inventory, wood_plank: state.inventory.wood_plank - tier.wood_plank },
          sessionMaxTurns: MAX_TURNS,
        };
      } else if (tier.id === "better") {
        if ((state.coins ?? 0) < (tier.coins ?? 0)) return state;
        if ((state.inventory?.wood_plank ?? 0) < (tier.wood_plank ?? 0)) return state;
        harborBase = {
          ...state,
          biomeKey: "fish",
          biome: "fish",
          coins: state.coins - tier.coins,
          inventory: { ...state.inventory, wood_plank: state.inventory.wood_plank - tier.wood_plank },
          sessionMaxTurns: MAX_TURNS + 2,
        };
      } else if (tier.id === "premium") {
        if ((state.runes ?? 0) < (tier.runes ?? 0)) return state;
        harborBase = {
          ...state,
          biomeKey: "fish",
          biome: "fish",
          runes: state.runes - tier.runes,
          sessionMaxTurns: MAX_TURNS,
        };
      } else {
        return state;
      }
      return { ...harborBase, _needsRefill: true };
    }

    case "CRAFT": {
      const { id: craftId, qty: craftQty = 1 } = action.payload ?? {};
      const recipe = RECIPES[craftId];
      if (!recipe) return state;
      // Check station is built (for workshop, check state.built.workshop)
      if (recipe.station && !locBuilt(state)[recipe.station]) return state;
      // Scale recipe inputs by craftQty so the shared helpers can do the
      // check + deduct without a qty-aware codepath.
      const scaledInputs = craftQty === 1
        ? recipe.inputs
        : Object.fromEntries(Object.entries(recipe.inputs).map(([k, n]) => [k, n * craftQty]));
      if (!hasAllInventory(state, scaledInputs)) return state;
      const newInv = deductInventory(state.inventory ?? {}, scaledInputs);
      // shovel is tracked as state.shovel (not inventory)
      if (craftId === "shovel") {
        return { ...state, inventory: newInv, shovel: (state.shovel ?? 0) + craftQty };
      }
      // Credit crafted output to inventory
      newInv[craftId] = (newInv[craftId] ?? 0) + craftQty;
      return { ...state, inventory: newInv };
    }

    case "GRANT_RUNES": {
      const amt = Math.max(0, action.payload?.amount | 0);
      return { ...state, runes: (state.runes ?? 0) + amt };
    }

    // Phase 10.3 — Sell a crafted item for its §10 sell price
    case "SELL_ITEM": {
      const itemId = action.id ?? action.payload?.id;
      const sellQty = Math.max(1, (action.qty ?? action.payload?.qty ?? 1) | 0);
      if (!itemId) return state;
      const owned = state.inventory?.[itemId] ?? 0;
      if (owned < sellQty) return state;
      const price = _sellPriceFor(itemId);
      const proceeds = price * sellQty;
      const { coinsCredit, newDebt } = applyDebtRepayment(state, proceeds);
      return {
        ...state,
        inventory: { ...state.inventory, [itemId]: owned - sellQty },
        coins: (state.coins ?? 0) + coinsCredit,
        townsfolk: state.townsfolk ? { ...state.townsfolk, debt: newDebt } : state.townsfolk,
      };
    }

    // ── Phase 9 — Mine biome actions ───────────────────────────────────────────

    case "ADVANCE_SEASON": {
      // Used in tests to move to a session boundary so SET_BIOME is allowed.
      // Phase 7 — the calendar season was removed; this action just resets
      // turnsUsed so the next session starts cleanly.
      return { ...state, turnsUsed: 0 };
    }

    case "SET_BIOME": {
      // Reject mid-season switches; only allowed at a season boundary (turnsUsed === 0)
      if ((state.turnsUsed ?? 0) > 0) return state;
      const biomeId = action.id ?? action.payload?.id;
      if (!biomeId || !BIOMES[biomeId]) return state;
      if (biomeId === state.biome) return state;
      // Mysterious ore is a mine-only mechanic — clear it whenever leaving mine.
      // Pearl is a fish-only mechanic — clear it whenever leaving fish.
      const enteringMine = biomeId === "mine";
      const enteringFish = biomeId === "fish";
      const afterSetBiome = {
        ...state,
        biome: biomeId,
        biomeKey: biomeId,
        mysteriousOre: enteringMine ? state.mysteriousOre : null,
        fishPearl: enteringFish ? state.fishPearl : null,
        _needsRefill: true,
      };
      if (enteringMine && afterSetBiome.grid && afterSetBiome.grid.length > 0) {
        return spawnMysteriousOre(afterSetBiome);
      }
      if (enteringFish && afterSetBiome.grid && afterSetBiome.grid.length > 0) {
        return spawnPearl(afterSetBiome);
      }
      return afterSetBiome;
    }

    case "COMMIT_CHAIN": {
      // Mine-biome chain commit with upgrade logic.
      // Checks for mysterious ore special case; applies standard upgrade math.
      const chain = action.chain ?? [];
      if (chain.length === 0) return state;

      const chainKey = chain[0]?.key;
      if (!chainKey) return state;

      // Phase 10.4 — Rat chain: chain of 3+ rat tiles clears rats, +5◉ per rat.
      // Mixed chains (rat + other) and chains of < 3 rats are rejected.
      const hasRat = chain.some((t) => t.key === "rat");
      if (hasRat) {
        const patch = tryClearRatChain(state, chain);
        if (!patch) return state; // rejected — no-op
        return { ...state, hazards: patch.hazards, coins: patch.coins };
      }

      // Phase 10.7 — Fire extinguishing: fire tiles in chain are removed and
      // credit +2◉ each. Normal chain logic continues with non-fire tiles.
      const firePatch = tryExtinguishFire(state, chain);
      let stateAfterFire = state;
      let fireCoinBonus = 0;
      if (firePatch) {
        stateAfterFire = { ...state, hazards: firePatch.hazards };
        fireCoinBonus = firePatch.coinsBonus;
      }

      // Mysterious ore chain check
      const hasOre = chain.some((t) => t.key === "mysterious_ore");
      if (hasOre) {
        if (!isMysteriousChainValid(chain)) {
          // Rejected — no-op (countdown does NOT tick)
          return state;
        }
        // Valid mysterious capture: +1 rune, clear ore
        return {
          ...state,
          runes: (state.runes ?? 0) + 1,
          mysteriousOre: null,
        };
      }

      // Standard chain: all tiles must be the same key
      // (fire tiles filtered out — they are handled by tryExtinguishFire above)
      const nonFireChain = chain.filter((t) => t.key !== "fire");
      const chainToProcess = nonFireChain.length >= chain.length ? chain : nonFireChain;
      const effectiveKey = chainToProcess[0]?.key ?? chainKey;
      const length = chainToProcess.length;
      const workerEffects = computeWorkerEffects(state);
      const reduce = workerEffects.thresholdReduce?.[effectiveKey] ?? 0;

      // Cross-chain redirect (Grain Trader, Gardener, Orchardist, Farmer):
      // when a worker has redirected this category, the chain produces a tile
      // from the target category instead of the species' native `next`. The
      // redirect threshold supersedes the native threshold.
      const tileCat = CATEGORY_OF[effectiveKey] ?? null;
      const redirect = tileCat ? workerEffects.chainRedirect?.[tileCat] : null;
      let threshold;
      let upgradeKey;
      if (redirect) {
        threshold = Math.max(1, redirect.threshold);
        // Redirect target = active species in toCategory, fallback to first
        // default species in that category.
        const active = state.tileCollection?.activeByCategory?.[redirect.toCategory];
        upgradeKey = active ?? null;
      } else {
        threshold = Math.max(1, (UPGRADE_THRESHOLDS[effectiveKey] ?? Infinity) - reduce);
        const res = Object.values(BIOMES).flatMap((b) => b.resources ?? []).find((r) => r.key === effectiveKey);
        upgradeKey = res?.next ?? null;
      }

      const upgrades = isFinite(threshold) ? Math.floor(length / threshold) : 0;
      const gained = length - upgrades;
      const inv = { ...(stateAfterFire.inventory ?? state.inventory) };
      if (gained > 0) inv[effectiveKey] = (inv[effectiveKey] ?? 0) + gained;
      if (upgradeKey && upgrades > 0) {
        inv[upgradeKey] = (inv[upgradeKey] ?? 0) + upgrades;
      }
      return { ...stateAfterFire, inventory: inv,
               coins: (stateAfterFire.coins ?? 0) + fireCoinBonus };
    }

    case "ACTIVATE_RUNE_WILDCARD": {
      if ((state.runeStash ?? 0) < 1) return state;
      return { ...state, runeStash: state.runeStash - 1, toolPending: "rune_wildcard" };
    }

    case "FERTILIZER/CONSUMED": {
      if (!state.fertilizerActive) return state;
      return { ...state, fertilizerActive: false };
    }

    case "USE_TOOL_BOMB": {
      // Alias to USE_TOOL for bomb — handled in USE_TOOL branch too
      if ((state.tools.bomb ?? 0) <= 0) return state;
      return {
        ...state,
        tools: { ...state.tools, bomb: state.tools.bomb - 1 },
        toolPending: "bomb",
      };
    }

    case "LOGIN_TICK": {
      const today = action.payload.today;
      const last = state.dailyStreak?.lastClaimedDate ?? null;
      if (last === today) return state; // idempotent
      let nextDay;
      if (!last) {
        nextDay = 1;
      } else {
        const d1 = new Date(last + "T00:00:00");
        const d2 = new Date(today + "T00:00:00");
        const diff = Math.round((d2 - d1) / 86400000);
        nextDay = diff === 1 ? Math.min((state.dailyStreak?.currentDay ?? 0) + 1, 30) : 1;
      }
      const reward = DAILY_REWARDS[nextDay] ?? { coins: 25 };
      const rewardCoins = reward.coins ?? 0;
      const { coinsCredit: loginCoinsCredit, newDebt: loginNewDebt } = applyDebtRepayment(state, rewardCoins);
      let next = {
        ...state,
        dailyStreak: { lastClaimedDate: today, currentDay: nextDay },
        coins: (state.coins ?? 0) + loginCoinsCredit,
        runes: (state.runes ?? 0) + (reward.runes ?? 0),
        townsfolk: state.townsfolk ? { ...state.townsfolk, debt: loginNewDebt } : state.townsfolk,
      };
      if (reward.tool) {
        const cur = next.tools?.[reward.tool] ?? 0;
        next = { ...next, tools: { ...next.tools, [reward.tool]: cur + (reward.amount ?? 1) } };
      }
      if (reward.unlockTile && TILE_TYPES_MAP[reward.unlockTile]) {
        const tc = next.tileCollection ?? defaultTileCollectionSlice();
        if (!tc.discovered?.[reward.unlockTile]) {
          next = {
            ...next,
            tileCollection: {
              ...tc,
              discovered: { ...(tc.discovered ?? {}), [reward.unlockTile]: true },
            },
          };
        }
      }
      return { ...next, modal: { type: "daily_streak", day: nextDay, reward } };
    }

    case "MIGRATE/APPLY_CAPS": {
      // Clamp all capped resources to current cap; no floaters (silent migration)
      const migCap = currentCap(state);
      const migInv = { ...state.inventory };
      let changed = false;
      for (const k of CAPPED_RESOURCES) {
        if ((migInv[k] ?? 0) > migCap) {
          migInv[k] = migCap;
          changed = true;
        }
      }
      if (!changed) return state;
      return { ...state, inventory: migInv };
    }

    case "TOWNSFOLK/BUY_POOL": {
      // DEV-only IAP stub: credits +N worker pool units (default 5)
      const amount = Math.max(0, (action.payload?.amount | 0) || 5);
      return { ...state, townsfolk: { ...state.townsfolk, pool: (state.townsfolk?.pool ?? 0) + amount } };
    }

    // ─── Phase 5 Tile Collection ─────────────────────────────────────────────────

    case "SET_ACTIVE_TILE": {
      const { category, tileId } = action.payload ?? {};
      if (!CATEGORIES.includes(category)) return state;          // unknown category
      const current = state.tileCollection?.activeByCategory?.[category];
      if (current === tileId) return state;                      // already active → no-op

      if (tileId !== null) {
        const t = TILE_TYPES_MAP[tileId];
        if (!t) return state;                                    // unknown tile type
        if (t.category !== category) return state;               // cross-category
        if (!state.tileCollection?.discovered?.[tileId]) return state; // undiscovered
      }

      return {
        ...state,
        tileCollection: {
          ...state.tileCollection,
          activeByCategory: { ...state.tileCollection.activeByCategory, [category]: tileId },
        },
      };
    }

    case "TILE_DISCOVERED": {
      const ids = action.payload?.ids ?? [];
      const known = state.tileCollection?.discovered ?? {};
      let changed = false;
      const next = { ...known };
      for (const id of ids) {
        if (!TILE_TYPES_MAP[id]) continue;
        if (!next[id]) { next[id] = true; changed = true; }
      }
      if (!changed) return state;
      return { ...state, tileCollection: { ...state.tileCollection, discovered: next } };
    }

    case "CHAIN_COMMIT": {
      const { key, length } = action.payload ?? {};
      if (!key || !length) return state;

      let tcSlice = state.tileCollection ?? defaultTileCollectionSlice();
      let progress = tcSlice.researchProgress ?? {};
      let discovered = tcSlice.discovered ?? {};
      let bubble = state.bubble;

      // 5.5 — research progress
      for (const t of TILE_TYPES) {
        if (t.discovery?.method !== "research") continue;
        if (t.discovery.researchOf !== key) continue;
        if (discovered[t.id]) continue; // already discovered — no-op
        const cur = progress[t.id] ?? 0;
        const next = cur + length;
        const capped = Math.min(next, t.discovery.researchAmount);
        progress = { ...progress, [t.id]: capped };
        if (next >= t.discovery.researchAmount) {
          discovered = { ...discovered, [t.id]: true };
          bubble = { id: Date.now() + t.id.length, npc: "wren",
            text: `New tile type: ${t.displayName}`, ms: 2200 };
        }
      }

      // 5.7 — free moves from chaining a free-move tile type
      const chainedTile = TILE_TYPES_MAP[key];
      const grant = chainedTile?.effects?.freeMoves ?? 0;
      let freeMoves = tcSlice.freeMoves ?? 0;
      if (grant > 0) {
        freeMoves = freeMoves + grant;
      }
      // Conditional "free_turn_after_n" hook: grants extra free moves only
      // when the chain meets a configured length threshold.
      const condHook = chainedTile?.effects?.freeMovesIfChain;
      if (condHook && length >= (condHook.minChain ?? 999)) {
        freeMoves = freeMoves + (condHook.count ?? 1);
      }

      tcSlice = { ...tcSlice, researchProgress: progress, discovered, freeMoves };
      return { ...state, tileCollection: tcSlice, bubble };
    }

    case "END_TURN": {
      const fm = state.tileCollection?.freeMoves ?? 0;
      if (fm > 0) {
        return { ...state, tileCollection: { ...state.tileCollection, freeMoves: fm - 1 } };
        // turnsUsed NOT incremented — free move spent
      }
      return { ...state, turnsUsed: (state.turnsUsed ?? 0) + 1 };
    }

    case "BUY_TILE": {
      const { id: buyId } = action.payload ?? {};
      if (!buyId) return state;
      const t = TILE_TYPES_MAP[buyId];
      if (!t) return state;
      if (t.discovery.method !== "buy") return state;
      const cost = t.discovery.coinCost ?? 0;
      if ((state.coins ?? 0) < cost) return state;
      if (state.tileCollection?.discovered?.[buyId]) return state; // already discovered
      return {
        ...state,
        coins: state.coins - cost,
        tileCollection: {
          ...state.tileCollection,
          discovered: { ...state.tileCollection.discovered, [buyId]: true },
        },
      };
    }

    case "GIVE_GIFT": {
      // Phase 6.2: pure gift application via applyGift helper
      const { npcId, itemKey } = action.payload ?? {};
      if (!npcId || !itemKey) return state;
      const giftResult = applyGift(state, npcId, itemKey);
      if (!giftResult.ok) return state; // cooldown or empty inventory — silent no-op
      // Phase 7 — calendar season removed; pickDialog falls back to a
      // season-agnostic line when given null.
      const giftDialog = pickDialog(npcId, null, giftResult.newState.npcs.bonds[npcId], Math.random);
      const giftBubble = {
        id: Date.now(),
        npc: npcId,
        text: `${giftDialog} (+${giftResult.delta})`,
        ms: 2200,
      };
      return { ...giftResult.newState, bubble: giftBubble };
    }

    default: {
      if (action.type === "DEV/ADD_GOLD") {
        return { ...state, coins: state.coins + (action.amount ?? 1000) };
      }
      if (action.type === "DEV/FILL_STORAGE") {
        const inventory = { ...state.inventory };
        for (const biome of Object.values(BIOMES)) {
          for (const res of biome.resources) {
            inventory[res.key] = (inventory[res.key] || 0) + (action.amount ?? 100);
          }
        }
        return { ...state, inventory };
      }
      if (action.type === "DEV/ADD_ITEM") {
        const key = action.key;
        if (!key) return state;
        const inventory = { ...state.inventory };
        inventory[key] = (inventory[key] || 0) + (action.amount ?? 50);
        return { ...state, inventory };
      }
      if (action.type === "DEV/ADD_XP") {
        const { newState } = applyAlmanacXp(state, action.amount ?? 100);
        return { ...state, almanac: newState.almanac, xp: newState.almanac.xp, level: newState.almanac.level };
      }
      if (action.type === "DEV/ADD_LEVEL") {
        const next = (state.level ?? 1) + (action.amount ?? 1);
        return { ...state, level: next, xp: 0 };
      }
      if (action.type === "DEV/ADD_ALMANAC_XP") {
        const { newState } = applyAlmanacXp(state, action.amount ?? 50);
        return newState;
      }
      if (action.type === "DEV/ADD_RUNES") {
        return { ...state, runes: (state.runes ?? 0) + (action.amount ?? 10) };
      }
      if (action.type === "DEV/ADD_INFLUENCE") {
        return { ...state, influence: (state.influence ?? 0) + (action.amount ?? 10) };
      }
      if (action.type === "DEV/FILL_TOOLS") {
        const amt = action.amount ?? 5;
        const tools = { ...state.tools };
        for (const k of Object.keys(tools)) {
          if (typeof tools[k] === "number") tools[k] = tools[k] + amt;
        }
        return { ...state, tools };
      }
      if (action.type === "DEV/ADD_SUPPLIES") {
        const inventory = { ...state.inventory };
        inventory.supplies = (inventory.supplies || 0) + (action.amount ?? 10);
        return { ...state, inventory };
      }
      if (action.type === "DEV/BUILD_ALL") {
        const allIds = {};
        const plots = { ...(locBuilt(state)._plots ?? {}) };
        const occupied = (idx) => Object.prototype.hasOwnProperty.call(plots, String(idx));
        let nextIdx = 0;
        BUILDINGS.forEach((b) => {
          allIds[b.id] = true;
          if (!Object.values(plots).includes(b.id)) {
            while (occupied(nextIdx)) nextIdx++;
            plots[nextIdx] = b.id;
            nextIdx++;
          }
        });
        return { ...state, built: { ...state.built, [state.mapCurrent]: { ...locBuilt(state), ...allIds, _plots: plots } } };
      }
      if (action.type === "DEV/RESET_GAME") {
        // Wipe all persisted state and reset to initial state, preserving settings.
        clearSave();
        const fresh = initialState();
        return { ...fresh, settings: state.settings,
          story: { ...INITIAL_STORY_STATE, flags: {}, queuedBeat: null, beatQueue: [], sandbox: false },
          npcs: {
            roster: ["wren"],
            bonds: { wren: 5, mira: 5, tomas: 5, bram: 5, liss: 5 },
            giftCooldown: { wren: 0, mira: 0, tomas: 0, bram: 0, liss: 0 },
          },
          townsfolk: { hired: { hilda: 0, pip: 0, wila: 0, tuck: 0, osric: 0, dren: 0 }, debt: 0, pool: 1 },
          workers: { hired: { farmer: 0, lumberjack: 0, miner: 0, baker: 0 } },
          tileCollection: defaultTileCollectionSlice() };
      }
      return state;
    }
  }
}

// Actions that are owned exclusively by feature slices (not coreReducer).
// For these, slices must run even when coreReducer returns the same state reference
// (because coreReducer has no handler for them — it falls through to `default: return state`).
// Referential-equality no-op semantics are preserved: if every slice also returns the same
// state for a rejected action, the final result still === the original state.
const SLICE_PRIMARY_ACTIONS = new Set([
  "APP/HIRE",
  "APP/FIRE",
  // Phase 5b — type-tier workers slice
  "WORKERS/HIRE",
  "WORKERS/FIRE",
  "BUILD_DECORATION",
  "SUMMON_MAGIC_TOOL",
  "MARKET/SELL",
  // Mood (gift) is owned by mood/slice
  "MOOD/GIFT",
  // Quest claim and almanac actions are owned by quests/slice
  "QUESTS/CLAIM_QUEST",
  "QUESTS/CLAIM_ALMANAC",
  "QUESTS/ROLL_DAILIES",
  "QUESTS/PROGRESS_QUEST",
  // Boss actions are owned by boss/slice
  "BOSS/TRIGGER",
  "BOSS/RESOLVE",
  "BOSS/REJECT",
  "BOSS/MINIMIZE",
  "BOSS/EXPAND",
  "BOSS/CLOSE",
  // Cartography actions are owned by cartography/slice (also sets activeZone)
  "CARTO/TRAVEL",
  // Story modal dismiss is owned by story/slice
  "STORY/DISMISS_MODAL",
  // Settings actions are owned by settings/slice
  "SETTINGS/SET_TAB",
  "SETTINGS/OPEN_DEBUG",
  "SETTINGS/LEAVE_BOARD",
  "SETTINGS/TOGGLE",
  "SETTINGS/RESET_SAVE",
  "SETTINGS/EASTER_EGG",
  "SETTINGS/SHOW_TUTORIAL",
  "SET_PALETTE",
  "SET_REDUCED_MOTION",
  "SET_CURSOR",
  // Tutorial actions are owned by tutorial/slice
  "TUTORIAL/START",
  "TUTORIAL/NEXT",
  "TUTORIAL/PREV",
  "TUTORIAL/SKIP",
  // Castle Needs contribution is owned by castle/slice
  "CASTLE/CONTRIBUTE",
  // Fish biome tide cycle
  "FISH/FORCE_TIDE_FLIP",
]);

// Actions where coreReducer intentionally defers to slices (e.g. CRAFTING/CRAFT_RECIPE
// fires a story beat in core but the actual craft logic lives in crafting/slice.js).
// When no story beat fires, core returns the same state — but slices still need to run.
const ALWAYS_RUN_SLICES = new Set([
  "CRAFTING/CRAFT_RECIPE",
  "USE_TOOL",  // magic tool variants (hourglass, magic_seed, magic_fertilizer) handled in portal/slice
]);

function rawReducer(state, action) {
  // 1. Core reducer mutates the canonical game state for known actions.
  // 2. Then every feature slice sees the action against the post-core state,
  //    so cross-cutting effects (quests, achievements, etc.) fire.
  // 3. If the core reducer returned the same reference (action was rejected /
  //    was a no-op), skip all slice processing so side-effects don't fire on
  //    rejected actions (this also preserves referential equality for callers
  //    that test `next === state` to detect no-ops).
  // Exception: slice-primary actions and actions where core defers to slices
  //    must always run slices regardless.
  const afterCore = coreReducer(state, action);
  const needSlices = afterCore !== state
    || SLICE_PRIMARY_ACTIONS.has(action.type)
    || ALWAYS_RUN_SLICES.has(action.type);
  if (!needSlices) return state;
  const afterSlices = slices.reduce((s, slice) => slice.reduce(s, action), afterCore);
  // Preserve referential equality for true no-ops: if nothing changed, return original state.
  return afterSlices === state ? state : afterSlices;
}

// Side effects that fire after a successful state transition. These were
// previously inlined inside slice reducers (which violated reducer purity);
// pulling them out lets slices stay pure and lets test code call rawReducer
// without touching localStorage.
function runActionEffects(state, action) {
  switch (action.type) {
    case "SETTINGS/TOGGLE":
    case "SET_PALETTE":
    case "SET_REDUCED_MOTION":
      // Persist the settings sub-state to its own localStorage key so it
      // survives a SETTINGS/RESET_SAVE clearing of the main save slot.
      settings.persistSettings(state.settings);
      break;
    case "SETTINGS/RESET_SAVE":
      // Clears every hearth.* key. Runs after persistState above (which would
      // otherwise have just rewritten the main save), so the wipe is final.
      settings.clearAllHearthStorage();
      break;
    case "SETTINGS/SHOW_TUTORIAL":
      settings.clearTutorialSeen();
      break;
    default: break;
  }
}

export function gameReducer(state, action) {
  let next;
  try {
    next = rawReducer(state, action);
  } catch (e) {
    // Don't crash the React tree on a reducer bug. Log so the error boundary
    // and any external monitoring can catch it; return the previous state so
    // the next render is consistent with the last good state.
    console.error("[hearth] reducer threw on action", action?.type, e);
    return state;
  }
  if (next !== state) {
    persistState(next);
    runActionEffects(next, action);
  }
  return next;
}

// Alias exports for test compatibility (spec uses rootReducer / createInitialState)
export const rootReducer = rawReducer;
export const createInitialState = initialState;
// Phase 10.3 — re-export sellPriceFor for test imports from state.js
export { _sellPriceFor as sellPriceFor };
