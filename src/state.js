import { BIOMES, BUILDINGS, NPCS, MAX_TURNS, RECIPES, STORAGE_KEYS, SEASON_EFFECTS, DAILY_REWARDS, MINE_ENTRY_TIERS, CAPPED_RESOURCES } from "./constants.js";
import { driftPrices, applyTrade } from "./market.js";
import { currentCap } from "./utils.js";
import { WORKER_MAP } from "./features/apprentices/data.js";
import { computeWorkerEffects } from "./features/apprentices/effects.js";
import { SPECIES, CATEGORIES, SPECIES_MAP } from "./features/species/data.js";
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

const slices = [crafting, quests, achievements, tutorial, settings, boss, cartography, apprentices, mood, storySlice];

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
const CRAFTED_MINE_POOL = ["hinge", "cobblepath", "lantern", "goldring", "gemcrown", "ironframe", "stonework"];

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

export function initialState() {
  const biomeKey = "farm";
  const level = 1;
  const o1 = makeOrder(biomeKey, level);
  const o2 = makeOrder(biomeKey, level, [o1.npc], [o1.key]);
  const o3 = makeOrder(biomeKey, level, [o1.npc, o2.npc], [o1.key, o2.key]);
  const marketSeed = Math.floor(Math.random() * 1e9);
  const fresh = {
    biomeKey,
    view: "town",
    coins: 150,
    level,
    xp: 0,
    turnsUsed: 0,
    seasonsCycled: 0,
    inventory: { supplies: 0 },
    orders: [o1, o2, o3],
    tools: { clear: 2, basic: 1, rare: 1, shuffle: 0, bomb: 0 },
    built: { hearth: true },
    bubble: null,
    modal: null,
    pendingView: null,
    seasonStats: { harvests: 0, upgrades: 0, ordersFilled: 0, coins: 0 },
    _hintsShown: {},
    story: { ...INITIAL_STORY_STATE, flags: {}, queuedBeat: null, beatQueue: [], sandbox: false },
    npcs: { roster: ["wren"], bonds: { wren: 5 } },
    market: { seed: marketSeed, season: 0, prices: driftPrices(marketSeed, 0), prevPrices: null },
    runes: 0,
    runeStash: 0,
    shovel: 0,
    sessionMaxTurns: MAX_TURNS,
    dailyStreak: { lastClaimedDate: null, currentDay: 0 },
    workers: { hired: { hilda: 0, pip: 0, wila: 0, tuck: 0, osric: 0, dren: 0 }, debt: 0, pool: 1 },
    species: defaultSpeciesSlice(),
    ...crafting.initial,
    ...quests.initial,
    ...achievements.initial,
    ...tutorial.initial,
    ...settings.initial,
    ...boss.initial,
    ...cartography.initial,
    ...apprentices.initial,
    ...mood.initial,
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

      const afterChain = {
        ...state,
        inventory,
        coins: state.coins + coinsGain,
        xp: xpResult.xp,
        level: xpResult.level,
        turnsUsed,
        seasonStats: { ...seasonStats, capFloaters: chainCf },
        floaters: chainFloaters,
        bubble,
        _hintsShown: newHintsShown,
        lastChainLength: effectiveChain,
        modal: seasonEnded ? "season" : state.modal,
      };
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
      // Summer: orders pay multiplied reward
      const summerMult = ((state.seasonsCycled || 0) % 4 === 1) ? SEASON_EFFECTS.Summer.orderMult : 1;
      const actualReward = o.reward * summerMult;
      // Auto-repay debt before crediting coins
      const { coinsCredit, newDebt } = applyDebtRepayment(state, actualReward);
      let bubble = { id: Date.now(), npc: o.npc, text: summerMult > 1 ? `+${actualReward}◉ (☀️ 2×) — thank you!` : `+${actualReward}◉ — thank you!`, ms: 1600 };
      if (xpResult.leveledUp) {
        bubble = { id: Date.now(), npc: "wren", text: `Level ${xpResult.level}! New things await.`, ms: 2400 };
      }
      return {
        ...state,
        inventory,
        coins: state.coins + coinsCredit,
        xp: xpResult.xp,
        level: xpResult.level,
        orders: state.orders.map((x) => (x.id === o.id ? replacement : x)),
        seasonStats: { ...state.seasonStats, ordersFilled: state.seasonStats.ordersFilled + 1, coins: state.seasonStats.coins + actualReward },
        workers: state.workers ? { ...state.workers, debt: newDebt } : state.workers,
        bubble,
      };
    }
    case "USE_TOOL": {
      // Support both action.key (legacy) and action.payload.key (Phase 1+)
      const key = action.payload?.key ?? action.key;
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
      // Unknown tool key — decrement only
      return { ...state, tools };
    }
    case "SWITCH_BIOME": {
      const { key } = action;
      if (key === state.biomeKey) return state;
      if (key === "mine" && state.level < 2) {
        return { ...state, bubble: { id: Date.now(), npc: "wren", text: "Mine unlocks at Level 2.", ms: 1800 } };
      }
      const excludeNpcs = [];
      const excludeKeys = [];
      const replacements = state.orders.map(() => {
        const o = makeOrder(key, state.level, excludeNpcs, excludeKeys);
        excludeNpcs.push(o.npc);
        excludeKeys.push(o.key);
        return o;
      });
      return { ...state, biomeKey: key, orders: replacements };
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
      const afterBuild = {
        ...state,
        coins: state.coins - (b.cost.coins || 0),
        runes: (state.runes ?? 0) - runesNeeded,
        inventory,
        built: { ...state.built, [b.id]: true },
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
        bubble: { id: Date.now(), npc: "tomas", text: "Bonus: +1 Reshuffle Horn · +25◉", ms: 2000 },
        market: {
          ...(state.market ?? {}),
          season: newSeasonNum,
          prevPrices: state.market?.prices ?? null,
          prices: newPrices,
        },
      };
      // Story: fire season_entered trigger
      const newSeasonIndex = (afterSeason.seasonsCycled % 4);
      const seasonNames = ["spring", "summer", "autumn", "winter"];
      return evaluateAndApplyStoryBeat(afterSeason, { type: "season_entered", season: seasonNames[newSeasonIndex] });
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
      if (!state.story?.flags?.act3_mine_opened) return state;
      const tier = MINE_ENTRY_TIERS.find((t) => t.id === action.payload?.tier);
      if (!tier) return state;
      if (tier.id === "free") {
        if ((state.inventory.supplies ?? 0) < 3) return state;
        return {
          ...state,
          biomeKey: "mine",
          inventory: { ...state.inventory, supplies: state.inventory.supplies - 3 },
          sessionMaxTurns: MAX_TURNS,
        };
      }
      if (tier.id === "better") {
        if ((state.coins ?? 0) < 100 || (state.shovel ?? 0) < 10) return state;
        return {
          ...state,
          biomeKey: "mine",
          coins: state.coins - 100,
          shovel: state.shovel - 10,
          sessionMaxTurns: MAX_TURNS + 2,
        };
      }
      if (tier.id === "premium") {
        if ((state.runes ?? 0) < 2) return state;
        return { ...state, biomeKey: "mine", runes: state.runes - 2, sessionMaxTurns: MAX_TURNS };
      }
      return state;
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
      return { ...state, inventory: newInv };
    }

    case "GRANT_RUNES": {
      const amt = Math.max(0, action.payload?.amount | 0);
      return { ...state, runes: (state.runes ?? 0) + amt };
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
            npcs: { roster: ["wren"], bonds: { wren: 5 } },
            workers: { hired: { hilda: 0, pip: 0, wila: 0, tuck: 0, osric: 0, dren: 0 }, debt: 0, pool: 1 },
            species: defaultSpeciesSlice() };
        }
      }
      return state;
    }
  }
}

function rawReducer(state, action) {
  // 1. Core reducer mutates the canonical game state for known actions.
  // 2. Then every feature slice sees the action against the post-core state,
  //    so cross-cutting effects (quests, achievements, etc.) fire.
  const afterCore = coreReducer(state, action);
  return slices.reduce((s, slice) => slice.reduce(s, action), afterCore);
}

export function gameReducer(state, action) {
  const next = rawReducer(state, action);
  if (next !== state) persistState(next);
  return next;
}

// Alias exports for test compatibility (spec uses rootReducer / createInitialState)
export const rootReducer = rawReducer;
export const createInitialState = initialState;
