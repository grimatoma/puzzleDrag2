import { BIOMES, BUILDINGS, NPCS, MAX_TURNS, RECIPES, WORKSHOP_RECIPES, STORAGE_KEYS, SEASON_EFFECTS, DAILY_REWARDS, MINE_ENTRY_TIERS, CAPPED_RESOURCES, UPGRADE_THRESHOLDS, SAVE_SCHEMA_VERSION } from "./constants.js";
import { sellPriceFor as _sellPriceFor } from "./features/market/pricing.js";
import { tryClearRatChain } from "./features/farm/rats.js";
import { tryExtinguishFire } from "./features/farm/hazards.js";
import { isMysteriousChainValid, spawnMysteriousOre, tickMysteriousOre } from "./features/mine/mysterious_ore.js";
import { driftPrices, applyTrade } from "./market.js";
import { currentCap } from "./utils.js";
import { WORKER_MAP } from "./features/apprentices/data.js";
import { computeWorkerEffects } from "./features/apprentices/effects.js";
import { SPECIES, CATEGORIES, SPECIES_MAP } from "./features/species/data.js";
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
import { INITIAL_STORY_STATE, evaluateStoryTriggers } from "./story.js";
import { STORY_BUILDING_IDS } from "./features/story/data.js";
import { NPC_IDS } from "./features/npcs/data.js";
import { payOrder, gainBond, decayBond, applyGift } from "./features/npcs/bond.js";
import { pickDialog } from "./features/npcs/dialog.js";
import * as decorations from "./features/decorations/slice.js";
import * as portal from "./features/portal/slice.js";

const slices = [crafting, quests, achievements, tutorial, settings, boss, cartography, apprentices, mood, storySlice, decorations, portal];

// ─── Wages / debt ──────────────────────────────────────────────────────────
const MAX_DEBT = 9999;

function applyDebtRepayment(state, incomingCoins) {
  const debt = state.workers?.debt ?? 0;
  if (debt <= 0 || incomingCoins <= 0) return { coinsCredit: incomingCoins, newDebt: debt };
  if (incomingCoins >= debt)           return { coinsCredit: incomingCoins - debt, newDebt: 0 };
  return { coinsCredit: 0, newDebt: debt - incomingCoins };
}

// ─── Save/load ─────────────────────────────────────────────────────────────
// Persisted: everything except volatile UI fields (modal/bubble/view/pendingView).
const SAVE_KEY = STORAGE_KEYS.save;
const VOLATILE = new Set(["modal", "bubble", "view", "pendingView", "craftingTab"]);

export function loadSavedState() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch (e) { console.warn("[hearth] save data corrupt, starting fresh:", e); return null; }
}

export function persistState(state) {
  try {
    const out = {};
    for (const k of Object.keys(state)) if (!VOLATILE.has(k)) out[k] = state[k];
    localStorage.setItem(SAVE_KEY, JSON.stringify(out));
  } catch { /* storage unavailable (private browsing / quota) */ }
}

export function clearSave() {
  try { localStorage.removeItem(SAVE_KEY); } catch { /* storage unavailable */ }
}

// ─── Species slice helpers ─────────────────────────────────────────────────

function defaultSpeciesSlice() {
  const discovered = {};
  const researchProgress = {};
  const activeByCategory = {};
  for (const c of CATEGORIES) activeByCategory[c] = null;
  for (const s of SPECIES) {
    if (s.discovery.method === "default") {
      discovered[s.id] = true;
      if (activeByCategory[s.category] === null) {
        activeByCategory[s.category] = s.id;
      }
    } else if (s.discovery.method === "research") {
      researchProgress[s.id] = 0;
    }
  }
  return { discovered, researchProgress, activeByCategory, freeMoves: 0 };
}

/**
 * Merges a loaded save state with current defaults, ensuring the species slice
 * is always well-formed. Idempotent: calling twice produces the same result.
 */
export function mergeLoadedState(saved) {
  const freshSpecies = defaultSpeciesSlice();
  if (!saved || typeof saved !== "object") return { species: freshSpecies };
  let species = saved.species;
  if (!species || typeof species !== "object") {
    species = freshSpecies;
  } else {
    // Deep-merge each sub-key: fill in any missing ids from fresh defaults
    const discovered = { ...freshSpecies.discovered, ...species.discovered };
    const researchProgress = { ...freshSpecies.researchProgress, ...species.researchProgress };
    const activeByCategory = { ...freshSpecies.activeByCategory, ...species.activeByCategory };
    const freeMoves = typeof species.freeMoves === "number" ? species.freeMoves : 0;
    species = { discovered, researchProgress, activeByCategory, freeMoves };
  }
  return { ...saved, species };
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

export function initialState(overrides) {
  const biomeKey = "farm";
  const level = 1;
  const o1 = makeOrder(biomeKey, level);
  const o2 = makeOrder(biomeKey, level, [o1.npc], [o1.key]);
  const o3 = makeOrder(biomeKey, level, [o1.npc, o2.npc], [o1.key, o2.key]);
  const marketSeed = Math.floor(Math.random() * 1e9);
  // saveSeed: stable per-save identifier for deterministic quest rolls.
  // If overrides supply one (e.g. from a loaded save), keep it; otherwise generate.
  const saveSeed = overrides?.saveSeed ?? Math.random().toString(36).slice(2, 10);
  // tools with structural flag support — startingExtraScythe grants +1 scythe each session
  const extraScytheBonus = overrides?.tools?.startingExtraScythe ? 1 : 0;
  const fresh = {
    version: SAVE_SCHEMA_VERSION,
    biomeKey,
    biome: "farm",
    saveSeed,
    view: "town",
    coins: 150,
    level,
    xp: 0,
    turnsUsed: 0,
    seasonsCycled: 0,
    inventory: { supplies: 0 },
    orders: [o1, o2, o3],
    quests: rollQuests(saveSeed, 1, "spring"),
    tools: { clear: 2, basic: 1, rare: 1, shuffle: 0, bomb: 0,
             scythe: extraScytheBonus, seedpack: 0, lockbox: 0, reshuffle: 0,
             startingExtraScythe: !!overrides?.tools?.startingExtraScythe,
             magic_wand: 0, hourglass: 0, magic_seed: 0, magic_fertilizer: 0,
             water_pump: 0, explosives: 0,
             // Phase 10.1 — new Workshop farm tools
             rake: 0, axe: 0, fertilizer: 0,
             // Phase 10.5 — Cat (clears rats)
             cat: 0,
             // Phase 10.6 — Bird Cage + Scythe (full)
             bird_cage: 0, scythe_full: 0,
             // Phase 10.8 — Rifle + Hound (wolf counters)
             rifle: 0, hound: 0 },
    _toolPending: null,
    fertilizerActive: false,
    // Phase 9 — Mine biome state
    mysteriousOre: null,
    hazards: { caveIn: null, gasVent: null, lava: null, mole: null,
               // Phase 10.4 — Rat hazard
               rats: [],
               // Phase 10.7 — Fire hazard
               fire: null,
               // Phase 10.8 — Wolves hazard
               wolves: null },
    // Board grid (populated during play, not stored on init)
    grid: Array.from({ length: 6 }, () => Array.from({ length: 6 }, () => ({ key: "hay" }))),
    lastChainSnapshot: null,
    magicFertilizerCharges: 0,
    built: { hearth: true, decorations: {} },
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
    dailyStreak: { lastClaimedDate: null, currentDay: 0 },
    workers: { hired: { hilda: 0, pip: 0, wila: 0, tuck: 0, osric: 0, dren: 0 }, debt: 0, pool: 1 },
    species: defaultSpeciesSlice(),
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
    // Phase 12.5 — saved-field slots for Silo/Barn
    farm: { savedField: null },
    mine: { savedField: null },
  };
  // Hydrate from save if present, but always force board view + clear modals on boot
  const saved = loadSavedState();
  if (saved) {
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
    // Migrate: old saves without state.workers get the fresh initial shape.
    const mergedWorkers = saved.workers
      ? {
          hired: { hilda: 0, pip: 0, wila: 0, tuck: 0, osric: 0, dren: 0, ...(saved.workers.hired ?? {}) },
          debt:  saved.workers.debt  ?? 0,
          pool:  saved.workers.pool  ?? 1,
        }
      : fresh.workers;
    // Migrate: old saves without state.species get the default shape
    const mergedSpecies = (() => {
      const freshSpec = defaultSpeciesSlice();
      if (!saved.species || typeof saved.species !== "object") return freshSpec;
      return {
        discovered: { ...freshSpec.discovered, ...saved.species.discovered },
        researchProgress: { ...freshSpec.researchProgress, ...saved.species.researchProgress },
        activeByCategory: { ...freshSpec.activeByCategory, ...saved.species.activeByCategory },
        freeMoves: typeof saved.species.freeMoves === "number" ? saved.species.freeMoves : 0,
      };
    })();
    return { ...fresh, ...saved, workers: mergedWorkers, story: mergedStory, species: mergedSpecies, view: "town", turnsUsed: 0, modal: null, bubble: null, pendingView: null,
      seasonStats: { harvests: 0, upgrades: 0, ordersFilled: 0, coins: 0 } };
  }
  return fresh;
}

// Legacy XP function (non-linear): used for state.xp / state.level (game-play level).
function applyXp(state, xpDelta) {
  let xp = state.xp + xpDelta;
  let level = state.level;
  let leveledUp = false;
  while (xp >= xpForLevel(level)) {
    xp -= xpForLevel(level);
    level += 1;
    leveledUp = true;
  }
  return { xp, level, leveledUp };
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

function coreReducer(state, action) {
  switch (action.type) {
    case "CHAIN_COLLECTED": {
      // Phase 4.7: support { gains: {key: n, ...} } payload for cap-aware bulk collection
      if (action.payload?.gains) {
        const gainsMap = action.payload.gains;
        const cap = currentCap(state);
        const cf = { ...(state.seasonStats?.capFloaters ?? {}) };
        const inv = { ...state.inventory };
        const floaters = [...(state.floaters ?? [])];
        for (const [k, n] of Object.entries(gainsMap)) {
          if (!CAPPED_RESOURCES.includes(k)) { inv[k] = (inv[k] ?? 0) + n; continue; }
          const cur = inv[k] ?? 0;
          const next = Math.min(cap, cur + n);
          inv[k] = next;
          if (next === cap && cur + n > cap && !cf[k]) {
            cf[k] = true;
            floaters.push({ text: `${k} stash full`, ms: 1200 });
          }
        }
        return { ...state, inventory: inv, floaters,
          seasonStats: { ...state.seasonStats, capFloaters: cf } };
      }

      const { key, gained, upgrades, value, chainLength, noTurn } = action.payload;
      const currentSeason = (state.seasonsCycled || 0) % 4;
      const hintsShown = state._hintsShown || {};
      const effectiveChain = chainLength || gained;

      // Tools (e.g. Scythe) emit chain-collected with noTurn:true — just add
      // resources without consuming a turn or triggering seasonal effects.
      if (noTurn) {
        const capNoTurn = currentCap(state);
        const inventory = { ...state.inventory };
        if (CAPPED_RESOURCES.includes(key)) {
          inventory[key] = Math.min(capNoTurn, (inventory[key] || 0) + gained);
        } else {
          inventory[key] = (inventory[key] || 0) + gained;
        }
        return { ...state, inventory };
      }

      // Mine/Farm hazard processing when full chain is provided in payload
      // (e.g. when GameScene dispatches CHAIN_COLLECTED with chain: [...]
      //  rather than a separate COMMIT_CHAIN)
      const chainTiles = action.payload.chain ?? null;
      const currentBiome = state.biome ?? state.biomeKey;
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
          // Fire extinguishing
          const firePatch = tryExtinguishFire(state, chainTiles);
          if (firePatch) {
            // Continue with normal chain logic using the patched state
            // (fire coins bonus handled below in combined result)
          }
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
        }
      }

      // Boss board modifier: active boss may require longer chains
      const bossMinChain = state.boss?.minChain || 0;
      if (bossMinChain > 0 && effectiveChain < bossMinChain) {
        const turnsUsed = state.turnsUsed + 1;
        const seasonEnded = turnsUsed >= MAX_TURNS;
        return {
          ...state,
          turnsUsed,
          bubble: { id: Date.now(), npc: "mira", text: `${state.boss.emoji} Challenge: chains need ${bossMinChain}+ tiles!`, ms: 2200, priority: 2 },
          modal: seasonEnded ? "season" : state.modal,
        };
      }

      // Winter: chains shorter than minChain tiles yield nothing but still consume the turn
      if (currentSeason === 3 && effectiveChain < SEASON_EFFECTS.Winter.minChain) {
        const turnsUsed = state.turnsUsed + 1;
        const seasonEnded = turnsUsed >= MAX_TURNS;
        let bubble = state.bubble;
        if (!hintsShown.winterChain) {
          bubble = { id: Date.now(), npc: "wren", text: `❄️ Winter: chains need ${SEASON_EFFECTS.Winter.minChain}+ tiles to harvest!`, ms: 2400, priority: 2 };
        }
        return {
          ...state,
          turnsUsed,
          bubble,
          _hintsShown: { ...hintsShown, winterChain: true },
          modal: seasonEnded ? "season" : state.modal,
        };
      }

      const res = resourceByKey(key);
      const inventory = { ...state.inventory };
      const chainCap = currentCap(state);
      const chainCf = { ...(state.seasonStats?.capFloaters ?? {}) };
      const chainFloaters = [...(state.floaters ?? [])];

      // Spring: +harvestBonus% resource bonus (rounded up)
      const springBonus = currentSeason === 0 ? Math.ceil(gained * SEASON_EFFECTS.Spring.harvestBonus) : 0;
      const effectiveGained = gained + springBonus;
      if (CAPPED_RESOURCES.includes(key)) {
        const cur = inventory[key] ?? 0;
        const next = Math.min(chainCap, cur + effectiveGained);
        inventory[key] = next;
        if (next === chainCap && cur + effectiveGained > chainCap && !chainCf[key]) {
          chainCf[key] = true;
          chainFloaters.push({ text: `${key} stash full`, ms: 1200 });
        }
      } else {
        inventory[key] = (inventory[key] || 0) + effectiveGained;
      }

      // Autumn: multiply upgrades
      const effectiveUpgrades = currentSeason === 2 ? upgrades * SEASON_EFFECTS.Autumn.upgradeMult : upgrades;
      if (res?.next && effectiveUpgrades > 0) {
        const nextKey = res.next;
        if (CAPPED_RESOURCES.includes(nextKey)) {
          const cur2 = inventory[nextKey] ?? 0;
          const next2 = Math.min(chainCap, cur2 + effectiveUpgrades);
          inventory[nextKey] = next2;
          if (next2 === chainCap && cur2 + effectiveUpgrades > chainCap && !chainCf[nextKey]) {
            chainCf[nextKey] = true;
            chainFloaters.push({ text: `${nextKey} stash full`, ms: 1200 });
          }
        } else {
          inventory[nextKey] = (inventory[nextKey] || 0) + effectiveUpgrades;
        }
      }

      const coinsGain = Math.max(1, Math.floor((effectiveGained * value) / 2));
      const xpGain = effectiveGained * value * 3 + effectiveUpgrades * 12;
      const xpResult = applyXp(state, xpGain);
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

      if (xpResult.leveledUp) {
        if (xpResult.level === 2) {
          bubble = { id: Date.now(), npc: "wren", text: "Level 2! ⛏️ Mine biome unlocked — switch with the button below.", ms: 2800, priority: 2 };
        } else {
          bubble = { id: Date.now(), npc: "wren", text: `Level ${xpResult.level}! New things await.`, ms: 2400, priority: 2 };
        }
      } else if (effectiveUpgrades > 0 && !hintsShown.upgradeHint) {
        bubble = { id: Date.now(), npc: "mira", text: "★ Upgrade! Chain 6+ tiles to snowball rare resources.", ms: 2800, priority: 2 };
        newHintsShown = { ...hintsShown, upgradeHint: true };
      }

      let afterChain = {
        ...state,
        inventory,
        coins: state.coins + coinsGain,
        xp: xpResult.xp,
        level: xpResult.level,
        // almanac XP from awardXp (linear 150/level)
        almanac: afterAlmanacXp.almanac,
        turnsUsed,
        seasonStats: { ...seasonStats, capFloaters: chainCf },
        floaters: chainFloaters,
        bubble,
        _hintsShown: newHintsShown,
        lastChainLength: effectiveChain,
        modal: seasonEnded ? "season" : state.modal,
      };
      // Mine: tick mysterious ore countdown on each chain
      if ((afterChain.biome ?? afterChain.biomeKey) === "mine" && afterChain.mysteriousOre) {
        afterChain = tickMysteriousOre(afterChain);
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
      const xpResult = applyXp(state, 12);
      // §17 locked: 5 XP per order into almanac
      const { newState: afterOrderAlmanac } = applyAlmanacXp(state, 5);
      // Bond multiplier (Phase 6.1): base reward × bond modifier
      const npcBond = state.npcs?.bonds?.[o.npc] ?? 5;
      // Use order.baseReward if present, else fall back to order.reward as the base
      const orderBase = o.baseReward ?? o.reward;
      const bondPaid = payOrder({ baseReward: orderBase }, npcBond);
      // Summer: orders pay multiplied reward (on top of bond)
      const summerMult = ((state.seasonsCycled || 0) % 4 === 1) ? SEASON_EFFECTS.Summer.orderMult : 1;
      const actualReward = Math.round(bondPaid * summerMult);
      // Bump bond +0.3 on delivery (Phase 6.1)
      const newBond = gainBond(npcBond, 0.3);
      const updatedNpcs = state.npcs
        ? { ...state.npcs, bonds: { ...state.npcs.bonds, [o.npc]: newBond } }
        : state.npcs;
      // Auto-repay debt before crediting coins
      const { coinsCredit, newDebt } = applyDebtRepayment(state, actualReward);
      // Dialog line from pool (Phase 6.3)
      const seasonNames = ["spring", "summer", "autumn", "winter"];
      const currentSeason = seasonNames[(state.seasonsCycled || 0) % 4];
      const dialogLine = pickDialog(o.npc, currentSeason, newBond, Math.random);
      let bubble = { id: Date.now(), npc: o.npc,
        text: summerMult > 1 ? `+${actualReward}◉ (☀️ 2×) — ${dialogLine}` : `+${actualReward}◉ — ${dialogLine}`,
        ms: 2000 };
      if (xpResult.leveledUp) {
        bubble = { id: Date.now(), npc: "wren", text: `Level ${xpResult.level}! New things await.`, ms: 2400 };
      }
      return {
        ...state,
        inventory,
        coins: state.coins + coinsCredit,
        xp: xpResult.xp,
        level: xpResult.level,
        almanac: afterOrderAlmanac.almanac,
        orders: state.orders.map((x) => (x.id === o.id ? replacement : x)),
        seasonStats: { ...state.seasonStats, ordersFilled: state.seasonStats.ordersFilled + 1, coins: state.seasonStats.coins + actualReward },
        workers: state.workers ? { ...state.workers, debt: newDebt } : state.workers,
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
      if (!state.built?.workshop) return state;
      // Check inputs
      const craftInv = state.inventory ?? {};
      for (const [res, need] of Object.entries(toolRecipe.inputs)) {
        if ((craftInv[res] ?? 0) < need) return state;
      }
      const newCraftInv = { ...craftInv };
      for (const [res, need] of Object.entries(toolRecipe.inputs)) {
        newCraftInv[res] = (newCraftInv[res] ?? 0) - need;
      }
      return {
        ...state,
        inventory: newCraftInv,
        tools: { ...state.tools, [toolId]: (state.tools[toolId] ?? 0) + 1 },
      };
    }

    case "USE_TOOL": {
      // Support action.payload.id (Phase 9), action.payload.key, or action.key (legacy)
      const key = action.payload?.id ?? action.payload?.key ?? action.key;
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
              lavaSet.has(`${ri},${ci}`) ? { ...t, key: "stone", rubble: true, lava: false } : t,
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
        return { ...state, tools, _toolPending: key };
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
          const eggCount = grid.flat().filter((t) => t.key === "egg").length;
          if (eggCount === 0) {
            return { ...state, tools: { ...state.tools }, // refund
              bubble: { id: Date.now(), npc: "bram", text: "No eggs to cage.", ms: 1200 } };
          }
          grid = grid.map((row) =>
            row.map((t) => {
              if (t.key === "egg") { collected += 1; return { ...t, key: null, _emptied: true }; }
              return t;
            }),
          );
        }
        return {
          ...state,
          tools,
          grid,
          inventory: { ...state.inventory, egg: (state.inventory?.egg ?? 0) + collected },
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
        boardPatch = { board: { tiles: savedField.tiles, hazards: savedField.hazards ?? [] } };
      }
      const excludeNpcs = [];
      const excludeKeys = [];
      const replacements = (state.orders ?? []).map(() => {
        const o = makeOrder(key, state.level, excludeNpcs, excludeKeys);
        excludeNpcs.push(o.npc);
        excludeKeys.push(o.key);
        return o;
      });
      return { ...state, biomeKey: key, orders: replacements, turnsUsed: 0, ...boardPatch };
    }
    case "SET_VIEW": {
      const next = action.view;
      return { ...state, view: next, craftingTab: action.craftingTab ?? (next === "crafting" ? state.craftingTab : null) };
    }
    case "OPEN_MODAL":
      return { ...state, modal: action.modal };
    case "CLOSE_MODAL":
      return { ...state, modal: null };
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
        built: { ...state.built, [b.id]: true },
        almanac: afterBuildAlmanac.almanac,
        bubble,
        _hintsShown: newHintsShown,
      };
      // Story: fire building_built trigger
      let afterBuildStory = evaluateAndApplyStoryBeat(afterBuild, { type: "building_built", id: b.id });
      // Check if all 8 story-required buildings are now built
      const allBuilt = STORY_BUILDING_IDS.every((id) => afterBuildStory.built?.[id]);
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
      let tools = { ...state.tools, shuffle: (state.tools.shuffle || 0) + 1 };
      // Powder Store: grant 2 bombs per season-end
      if (state.built?.powder_store) {
        tools = { ...tools, bomb: (tools.bomb ?? 0) + 2 };
      }

      // ── Wages (FIRST economic event) ──────────────────────────────────────
      let wageCoins = state.coins;
      let wageDebt  = state.workers?.debt ?? 0;
      let totalWages = 0;
      for (const [id, count] of Object.entries(state.workers?.hired ?? {})) {
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
        const agg = computeWorkerEffects({ ...state, workers: { ...state.workers, debt: 0 } });
        bonusCoins = Math.round(agg.seasonBonus.coins ?? 0);
      }

      // ── Pool income from Housing buildings ────────────────────────────────
      const housingCount = state.built?.housing?.count ?? (state.built?.housing ? 1 : 0);
      const newPool = (state.workers?.pool ?? 0) + housingCount;

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
        seasonsCycled: (state.seasonsCycled || 0) + 1,
        sessionMaxTurns: MAX_TURNS,
        modal: null,
        view: "town",
        pendingView: null,
        seasonStats: { harvests: 0, upgrades: 0, ordersFilled: 0, coins: 0, capFloaters: {} },
        workers: { ...state.workers, debt: wageDebt, pool: newPool },
        // 5.7: reset per-season free moves on season close
        species: state.species ? { ...state.species, freeMoves: 0 } : state.species,
        npcs: decayedNpcs,
        bubble: { id: Date.now(), npc: "tomas", text: "Bonus: +1 Reshuffle Horn · +25◉", ms: 2000 },
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
      if (state.biomeKey === "farm" && state.built?.silo && state.board) {
        afterSeasonFarm = { ...afterSeasonFarm, savedField: {
          tiles: state.board.tiles,
          hazards: state.board.hazards ?? [],
          turnsUsed: 0,
        } };
      }
      if (state.biomeKey === "mine" && state.built?.barn && state.board) {
        afterSeasonMine = { ...afterSeasonMine, savedField: {
          tiles: state.board.tiles,
          hazards: state.board.hazards ?? [],
          turnsUsed: 0,
        } };
      }
      // Re-roll deterministic 6-slot quests for the new season
      const newYear = Math.max(1, Math.floor(((afterSeason.seasonsCycled || 0) - 1) / 4) + 1);
      const newSeasonIndex2 = (afterSeason.seasonsCycled || 0) % 4;
      const seasonNames2 = ["spring", "summer", "autumn", "winter"];
      const rerolledQuests = rollQuests(state.saveSeed ?? "default", newYear, seasonNames2[newSeasonIndex2]);
      const afterSeasonWithFields = {
        ...afterSeason,
        farm: afterSeasonFarm,
        mine: afterSeasonMine,
        quests: rerolledQuests,
      };
      // Story: fire season_entered trigger
      const newSeasonIndex = (afterSeasonWithFields.seasonsCycled % 4);
      const seasonNames = ["spring", "summer", "autumn", "winter"];
      return evaluateAndApplyStoryBeat(afterSeasonWithFields, { type: "season_entered", season: seasonNames[newSeasonIndex] });
    }
    case "SESSION_START": {
      // Fire story session_start trigger if intro hasn't been seen yet
      if (state.story?.flags?.intro_seen) return state;
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
      if (saleProceeds > 0 && (state.workers?.debt ?? 0) > 0) {
        const { coinsCredit, newDebt } = applyDebtRepayment(state, saleProceeds);
        return { ...afterTrade,
          coins: state.coins + coinsCredit,
          workers: afterTrade.workers ? { ...afterTrade.workers, debt: newDebt } : afterTrade.workers,
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
          biomeKey: "mine",
          inventory: { ...state.inventory, supplies: state.inventory.supplies - 3 },
        };
      }
      if (mode === "premium") {
        if ((state.runes ?? 0) < 2) return state;
        return { ...state, biomeKey: "mine", runes: state.runes - 2 };
      }
      return state;
    }

    case "MINE/ENTER": {
      if (!state.story?.flags?.mine_unlocked) return state;
      const tier = MINE_ENTRY_TIERS.find((t) => t.id === action.payload?.tier);
      if (!tier) return state;
      let afterMineEnter = state;
      if (tier.id === "free") {
        if ((state.inventory.supplies ?? 0) < 3) return state;
        afterMineEnter = {
          ...state,
          biomeKey: "mine",
          biome: "mine",
          inventory: { ...state.inventory, supplies: state.inventory.supplies - 3 },
          sessionMaxTurns: MAX_TURNS,
        };
      } else if (tier.id === "better") {
        if ((state.coins ?? 0) < 100 || (state.shovel ?? 0) < 10) return state;
        afterMineEnter = {
          ...state,
          biomeKey: "mine",
          biome: "mine",
          coins: state.coins - 100,
          shovel: state.shovel - 10,
          sessionMaxTurns: MAX_TURNS + 2,
        };
      } else if (tier.id === "premium") {
        if ((state.runes ?? 0) < 2) return state;
        afterMineEnter = { ...state, biomeKey: "mine", biome: "mine", runes: state.runes - 2, sessionMaxTurns: MAX_TURNS };
      } else {
        return state;
      }
      // Spawn mysterious ore on mine entry if grid is available
      if (afterMineEnter.grid && afterMineEnter.grid.length > 0) {
        afterMineEnter = spawnMysteriousOre(afterMineEnter);
      }
      return afterMineEnter;
    }

    case "CRAFT": {
      const { id: craftId, qty: craftQty = 1 } = action.payload ?? {};
      const recipe = RECIPES[craftId];
      if (!recipe) return state;
      // Check station is built (for workshop, check state.built.workshop)
      if (recipe.station && !state.built?.[recipe.station]) return state;
      // Check inputs
      const inv = state.inventory ?? {};
      for (const [res, need] of Object.entries(recipe.inputs)) {
        if ((inv[res] ?? 0) < need * craftQty) return state;
      }
      const newInv = { ...inv };
      for (const [res, need] of Object.entries(recipe.inputs)) {
        newInv[res] = (newInv[res] ?? 0) - need * craftQty;
      }
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
      return {
        ...state,
        inventory: { ...state.inventory, [itemId]: owned - sellQty },
        coins: (state.coins ?? 0) + price * sellQty,
      };
    }

    // ── Phase 9 — Mine biome actions ───────────────────────────────────────────

    case "ADVANCE_SEASON": {
      // Used in tests to move to a season boundary so SET_BIOME is allowed.
      return { ...state, turnsUsed: 0, seasonsCycled: (state.seasonsCycled || 0) + 1 };
    }

    case "SET_BIOME": {
      // Reject mid-season switches; only allowed at a season boundary (turnsUsed === 0)
      if ((state.turnsUsed ?? 0) > 0) return state;
      const biomeId = action.id ?? action.payload?.id;
      if (!biomeId || !BIOMES[biomeId]) return state;
      if (biomeId === state.biome) return state;
      // Switching to Farm clears mysteriousOre (mine-only mechanic)
      const clearMine = biomeId === "farm";
      const afterSetBiome = {
        ...state,
        biome: biomeId,
        biomeKey: biomeId,
        mysteriousOre: clearMine ? null : state.mysteriousOre,
        _needsRefill: true,
      };
      // Spawn mysterious ore when entering mine, if grid is available
      if (!clearMine && afterSetBiome.grid && afterSetBiome.grid.length > 0) {
        return spawnMysteriousOre(afterSetBiome);
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
      const threshold = UPGRADE_THRESHOLDS[effectiveKey];
      const upgrades = threshold ? Math.floor(length / threshold) : 0;
      const gained = length - upgrades;
      const inv = { ...(stateAfterFire.inventory ?? state.inventory) };
      if (gained > 0) inv[effectiveKey] = (inv[effectiveKey] ?? 0) + gained;
      // Upgraded resource
      const res = Object.values(BIOMES).flatMap((b) => b.resources ?? []).find((r) => r.key === effectiveKey);
      if (res?.next && upgrades > 0) {
        inv[res.next] = (inv[res.next] ?? 0) + upgrades;
      }
      return { ...stateAfterFire, inventory: inv,
               coins: (stateAfterFire.coins ?? 0) + fireCoinBonus };
    }

    case "ACTIVATE_RUNE_WILDCARD": {
      if ((state.runeStash ?? 0) < 1) return state;
      return { ...state, runeStash: state.runeStash - 1, toolPending: "rune_wildcard" };
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
        workers: state.workers ? { ...state.workers, debt: loginNewDebt } : state.workers,
      };
      if (reward.tool) {
        const cur = next.tools?.[reward.tool] ?? 0;
        next = { ...next, tools: { ...next.tools, [reward.tool]: cur + (reward.amount ?? 1) } };
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

    case "WORKERS/BUY_POOL": {
      // DEV-only IAP stub: credits +N worker pool units (default 5)
      const amount = Math.max(0, (action.payload?.amount | 0) || 5);
      return { ...state, workers: { ...state.workers, pool: (state.workers?.pool ?? 0) + amount } };
    }

    // ─── Phase 5 Species ────────────────────────────────────────────────────────

    case "SET_ACTIVE_SPECIES": {
      const { category, speciesId } = action.payload ?? {};
      if (!CATEGORIES.includes(category)) return state;          // unknown category
      const current = state.species?.activeByCategory?.[category];
      if (current === speciesId) return state;                   // already active → no-op

      if (speciesId !== null) {
        const sp = SPECIES_MAP[speciesId];
        if (!sp) return state;                                   // unknown species
        if (sp.category !== category) return state;              // cross-category
        if (!state.species?.discovered?.[speciesId]) return state; // undiscovered
      }

      return {
        ...state,
        species: {
          ...state.species,
          activeByCategory: { ...state.species.activeByCategory, [category]: speciesId },
        },
      };
    }

    case "SPECIES_DISCOVERED": {
      const ids = action.payload?.ids ?? [];
      const known = state.species?.discovered ?? {};
      let changed = false;
      const next = { ...known };
      for (const id of ids) {
        if (!SPECIES_MAP[id]) continue;
        if (!next[id]) { next[id] = true; changed = true; }
      }
      if (!changed) return state;
      return { ...state, species: { ...state.species, discovered: next } };
    }

    case "CHAIN_COMMIT": {
      const { key, length } = action.payload ?? {};
      if (!key || !length) return state;

      let speciesSlice = state.species ?? defaultSpeciesSlice();
      let progress = speciesSlice.researchProgress ?? {};
      let discovered = speciesSlice.discovered ?? {};
      let bubble = state.bubble;

      // 5.5 — research progress
      for (const s of SPECIES) {
        if (s.discovery?.method !== "research") continue;
        if (s.discovery.researchOf !== key) continue;
        if (discovered[s.id]) continue; // already discovered — no-op
        const cur = progress[s.id] ?? 0;
        const next = cur + length;
        const capped = Math.min(next, s.discovery.researchAmount);
        progress = { ...progress, [s.id]: capped };
        if (next >= s.discovery.researchAmount) {
          discovered = { ...discovered, [s.id]: true };
          bubble = { id: Date.now() + s.id.length, npc: "wren",
            text: `New species: ${s.displayName}`, ms: 2200 };
        }
      }

      // 5.7 — free moves from chaining a free-move species
      const chainedSpec = SPECIES_MAP[key];
      const grant = chainedSpec?.effects?.freeMoves ?? 0;
      let freeMoves = speciesSlice.freeMoves ?? 0;
      if (grant > 0) {
        freeMoves = freeMoves + grant;
      }

      speciesSlice = { ...speciesSlice, researchProgress: progress, discovered, freeMoves };
      return { ...state, species: speciesSlice, bubble };
    }

    case "END_TURN": {
      const fm = state.species?.freeMoves ?? 0;
      if (fm > 0) {
        return { ...state, species: { ...state.species, freeMoves: fm - 1 } };
        // turnsUsed NOT incremented — free move spent
      }
      return { ...state, turnsUsed: (state.turnsUsed ?? 0) + 1 };
    }

    case "BUY_SPECIES": {
      const { id: buyId } = action.payload ?? {};
      if (!buyId) return state;
      const sp = SPECIES_MAP[buyId];
      if (!sp) return state;
      if (sp.discovery.method !== "buy") return state;
      const cost = sp.discovery.coinCost ?? 0;
      if ((state.coins ?? 0) < cost) return state;
      if (state.species?.discovered?.[buyId]) return state; // already discovered
      return {
        ...state,
        coins: state.coins - cost,
        species: {
          ...state.species,
          discovered: { ...state.species.discovered, [buyId]: true },
        },
      };
    }

    case "GIVE_GIFT": {
      // Phase 6.2: pure gift application via applyGift helper
      const { npcId, itemKey } = action.payload ?? {};
      if (!npcId || !itemKey) return state;
      const giftResult = applyGift(state, npcId, itemKey);
      if (!giftResult.ok) return state; // cooldown or empty inventory — silent no-op
      const seasonNamesGift = ["spring", "summer", "autumn", "winter"];
      const giftSeason = seasonNamesGift[(state.seasonsCycled || 0) % 4];
      const giftDialog = pickDialog(npcId, giftSeason, giftResult.newState.npcs.bonds[npcId], Math.random);
      const giftBubble = {
        id: Date.now(),
        npc: npcId,
        text: `${giftDialog} (+${giftResult.delta})`,
        ms: 2200,
      };
      return { ...giftResult.newState, bubble: giftBubble };
    }

    default: {
      if (import.meta.env.DEV) {
        if (action.type === "DEV/ADD_GOLD") {
          return { ...state, coins: state.coins + (action.amount ?? 1000) };
        }
        if (action.type === "DEV/FILL_STORAGE") {
          const inventory = { ...state.inventory };
          for (const biome of Object.values(BIOMES)) {
            for (const res of biome.resources) {
              inventory[res.key] = (inventory[res.key] || 0) + 100;
            }
          }
          return { ...state, inventory };
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
            workers: { hired: { hilda: 0, pip: 0, wila: 0, tuck: 0, osric: 0, dren: 0 }, debt: 0, pool: 1 },
            species: defaultSpeciesSlice() };
        }
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
  "BUILD_DECORATION",
  "SUMMON_MAGIC_TOOL",
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

export function gameReducer(state, action) {
  const next = rawReducer(state, action);
  if (next !== state) persistState(next);
  return next;
}

// Alias exports for test compatibility (spec uses rootReducer / createInitialState)
export const rootReducer = rawReducer;
export const createInitialState = initialState;
// Phase 10.3 — re-export sellPriceFor for test imports from state.js
export { _sellPriceFor as sellPriceFor };
