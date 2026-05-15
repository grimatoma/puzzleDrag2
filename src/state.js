import { BIOMES, BUILDINGS, NPCS, RECIPES, DAILY_REWARDS, MIN_EXPEDITION_TURNS, CAPPED_RESOURCES, UPGRADE_THRESHOLDS, SAVE_SCHEMA_VERSION, ITEMS, CRAFT_GEM_SKIP_COST } from "./constants.js";
import { locBuilt as _locBuilt } from "./locBuilt.js";
import { sellPriceFor as _sellPriceFor } from "./features/market/pricing.js";
import { tryClearRatChain } from "./features/farm/rats.js";
import { tryExtinguishFire, rollFarmHazard, tickFire, tickWolves } from "./features/farm/hazards.js";
import { tryDeadlyPestsKill } from "./features/farm/deadlyPests.js";
import { rollHazard, tickHazards } from "./features/mine/hazards.js";
import { isMysteriousChainValid, spawnMysteriousOre, tickMysteriousOre } from "./features/mine/mysterious_ore.js";
import { isPearlChainValid, spawnPearl, tickPearl, PEARL_KEY } from "./features/fish/pearl.js";
import { driftPrices, applyTrade, pickMarketEvent } from "./market.js";
import { currentCap } from "./utils.js";
import { computeWorkerEffects } from "./features/workers/aggregate.js";
import { TILE_TYPES, CATEGORIES, TILE_TYPES_MAP, CATEGORY_OF } from "./features/tileCollection/data.js";
import { discoverTileTypesFromChain } from "./features/tileCollection/effects.js";
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
import * as storySlice from "./features/story/slice.js";
import * as fish from "./features/fish/slice.js";
import { INITIAL_STORY_STATE, evaluateStoryTriggers, evaluateSideBeats } from "./story.js";
import { initialFlagState, applyFlagTriggersWithResult } from "./flags.js";
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
import * as boons from "./features/boons/slice.js";
import * as runSummary from "./features/runSummary/slice.js";
import { boonEffectMult } from "./features/boons/data.js";
import { ZONES, settlementFoundingCost, isSettlementFounded, displayZoneName, grantEarnedHearthTokens, isOldCapitalUnlocked, isExpeditionFood, expeditionTurnsFromSupply, settlementTypeForZone, resolveBiomeChoice, keeperReadyFor, completedSettlementCount, DEFAULT_ZONE, turnBudgetForZone, settlementHazards } from "./features/zones/data.js";
import { keeperForType, keeperPathInfo } from "./keepers.js";
import { FIRE_HAZARD_ENABLED } from "./featureFlags.js";
import { addCappedResourceMut, hasAllInventory, deductInventory, defaultTileCollectionSlice, mergeLoadedState, resourceByKey, pickNpcKey, makeOrder, seedOrderIdSeq, SEASON_END_BONUS_COINS, xpForLevel } from "./state/helpers.js";
export { addCappedResourceMut, hasAllInventory, deductInventory, defaultTileCollectionSlice, mergeLoadedState, resourceByKey, pickNpcKey, makeOrder, seedOrderIdSeq, SEASON_END_BONUS_COINS, xpForLevel };
import { loadSavedState, persistStateNow, persistState, flushPersistState, clearSave } from "./state/persistence.js";
export { loadSavedState, persistStateNow, persistState, flushPersistState, clearSave };
import { keeperTrialDefinition, bossMirrorForTrial, finalizeKeeperPath, startKeeperTrial, resolveKeeperTrial, applyKeeperTrialChainProgress } from "./state/keeperTrials.js";
export { keeperTrialDefinition, bossMirrorForTrial, finalizeKeeperPath, startKeeperTrial, resolveKeeperTrial, applyKeeperTrialChainProgress };
import { evaluateAndApplyStoryBeat, maybeFireResourceBeats } from "./state/storyEffects.js";
export { evaluateAndApplyStoryBeat, maybeFireResourceBeats };
import { createFreshState, generateSaveSeed, initialState } from "./state/init.js";
export { createFreshState, generateSaveSeed, initialState };

const slices = [crafting, quests, achievements, tutorial, settings, boss, cartography, storySlice, decorations, portal, market, castle, fish, zones, workers, boons, runSummary];

// Phase 7 — SEASON_NAMES used to be the calendar-season index → name lookup.
// All readers were removed when the calendar was deleted, so the table is
// gone too.

// Canonical almanac XP function (§17 linear, 150 XP/level).
// Wraps features/almanac/data.js awardXp() so all reducers route through it.
function applyAlmanacXp(state, amount) {
  const { newState, leveledTo } = awardXp(state, amount);
  return { newState, leveledTo };
}



const locBuilt = _locBuilt;

function boardTurnPatch(state, count = 1) {
  const freeMoves = state.tileCollection?.freeMoves ?? 0;
  if (freeMoves > 0) {
    return {
      turnsUsed: state.turnsUsed ?? 0,
      farmRun: state.farmRun ?? null,
      tileCollection: {
        ...state.tileCollection,
        freeMoves: freeMoves - 1,
      },
      ended: false,
      consumedFreeMove: true,
    };
  }
  const turnsUsed = (state.turnsUsed ?? 0) + count;
  if (!state.farmRun) return { turnsUsed, farmRun: null, ended: false };
  const turnsRemaining = Math.max(0, (state.farmRun.turnsRemaining ?? 0) - count);
  const farmRun = { ...state.farmRun, turnsRemaining };
  return { turnsUsed, farmRun, ended: turnsRemaining <= 0 };
}

function applyTileCollectionChainEffects(state, key, length) {
  if (!key || !length) return state;
  let tcSlice = state.tileCollection ?? defaultTileCollectionSlice();
  let progress = tcSlice.researchProgress ?? {};
  let discovered = tcSlice.discovered ?? {};
  let activeByCategory = tcSlice.activeByCategory ?? {};
  let bubble = state.bubble;

  const chainDiscovery = discoverTileTypesFromChain(
    { ...state, tileCollection: tcSlice },
    { resourceKey: key, chainLength: length },
  );
  if (chainDiscovery.discoveredIds.length > 0) {
    discovered = chainDiscovery.newDiscoveredMap;
    activeByCategory = { ...activeByCategory };
    for (const id of chainDiscovery.discoveredIds) {
      const t = TILE_TYPES_MAP[id];
      if (t && activeByCategory[t.category] == null) activeByCategory[t.category] = id;
    }
    const first = TILE_TYPES_MAP[chainDiscovery.discoveredIds[0]];
    if (first) bubble = { id: Date.now() + first.id.length, npc: "wren", text: `New tile type: ${first.displayName}`, ms: 2200 };
  }

  for (const t of TILE_TYPES) {
    if (t.discovery?.method !== "research") continue;
    if (t.discovery.researchOf !== key) continue;
    if (discovered[t.id]) continue;
    const cur = progress[t.id] ?? 0;
    const next = cur + length;
    const capped = Math.min(next, t.discovery.researchAmount);
    progress = { ...progress, [t.id]: capped };
    if (next >= t.discovery.researchAmount) {
      discovered = { ...discovered, [t.id]: true };
      if (activeByCategory[t.category] == null) {
        activeByCategory = { ...activeByCategory, [t.category]: t.id };
      }
      bubble = { id: Date.now() + t.id.length, npc: "wren", text: `New tile type: ${t.displayName}`, ms: 2200 };
    }
  }

  const chainedTile = TILE_TYPES_MAP[key];
  let freeMoves = tcSlice.freeMoves ?? 0;
  const grant = chainedTile?.effects?.freeMoves ?? 0;
  if (grant > 0) freeMoves += grant;
  const condHook = chainedTile?.effects?.freeMovesIfChain;
  if (condHook && length >= (condHook.minChain ?? 999)) {
    freeMoves += condHook.count ?? 1;
  }

  return {
    ...state,
    tileCollection: { ...tcSlice, researchProgress: progress, discovered, activeByCategory, freeMoves },
    bubble,
  };
}

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
              bubble: { id: Date.now(), npc: "wren", text: "[icon:fish_pearl] Pearl captured! +1 Rune.", ms: 2200, priority: 2 },
            };
          }
        }
      }

      // Boss board modifier: active boss may require longer chains
      const bossMinChain = state.boss?.minChain || 0;
      if (bossMinChain > 0 && effectiveChain < bossMinChain) {
        const turn = boardTurnPatch(state);
        const next = {
          ...state,
          turnsUsed: turn.turnsUsed,
          farmRun: turn.farmRun,
          lastBoardActionConsumedFreeMove: !!turn.consumedFreeMove,
          ...(turn.tileCollection ? { tileCollection: turn.tileCollection } : {}),
          bubble: { id: Date.now(), npc: "mira", text: `${state.boss.emoji} Challenge: chains need ${bossMinChain}+ tiles!`, ms: 2200, priority: 2 },
          modal: turn.ended ? "season" : state.modal,
        };
        return applyKeeperTrialChainProgress(next, null, 0, turn);
      }

      const res = resourceByKey(key);
      const inventory = { ...state.inventory };
      const chainCap = currentCap(state);
      const chainCf = { ...(state.seasonStats?.capFloaters ?? {}) };
      const chainFloaters = [...(state.floaters ?? [])];

      // Phase 6b — chain_yield_mult boons scale the resource amount the chain
      // adds to inventory. Floored to keep counts integer, never below `gained`.
      const yieldMultBoon = boonEffectMult(state, "chain_yield_mult");
      const effectiveGained = yieldMultBoon > 1
        ? Math.max(gained, Math.floor(gained * yieldMultBoon))
        : gained;
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

      const baseCoinsGain = Math.max(1, Math.floor((effectiveGained * value) / 2)) + coinHookBonus;
      // Phase 6b — coin_gain_mult boons scale chain coin reward.
      const coinMultBoon = boonEffectMult(state, "coin_gain_mult");
      const coinsGain = coinMultBoon > 1
        ? Math.floor(baseCoinsGain * coinMultBoon)
        : baseCoinsGain;
      // §17 locked: 1 XP per chain (regardless of length/value) into almanac
      const { newState: afterAlmanacXp } = applyAlmanacXp(state, 1);
      const turn = boardTurnPatch(state);
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
          bubble = { id: Date.now(), npc: "wren", text: "Level 2! [icon:ui_build]️ Mine biome unlocked — switch with the button below.", ms: 2800, priority: 2 };
        } else {
          bubble = { id: Date.now(), npc: "wren", text: `Level ${afterAlmanacXp.almanac.level}! New things await.`, ms: 2400, priority: 2 };
        }
      } else if (effectiveUpgrades > 0 && !hintsShown.upgradeHint) {
        bubble = { id: Date.now(), npc: "mira", text: "[icon:ui_star] Upgrade! Chain 6+ tiles to snowball rare resources.", ms: 2800, priority: 2 };
        newHintsShown = { ...hintsShown, upgradeHint: true };
      }

      // Capture snapshot for hourglass rewind (before chain is applied)
      const lastChainSnapshot = {
        inventory: state.inventory,
        grid: state.grid ?? null,
        turnsUsed: state.turnsUsed,
        farmRun: state.farmRun ?? null,
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
        turnsUsed: turn.turnsUsed,
        farmRun: turn.farmRun,
        lastBoardActionConsumedFreeMove: !!turn.consumedFreeMove,
        ...(turn.tileCollection ? { tileCollection: turn.tileCollection } : {}),
        seasonStats: { ...seasonStats, capFloaters: chainCf },
        floaters: chainFloaters,
        bubble,
        _hintsShown: newHintsShown,
        lastChainLength: effectiveChain,
        lastChainSnapshot,
        modal: turn.ended ? "season" : state.modal,
      };
      afterChain = applyTileCollectionChainEffects(afterChain, key, effectiveChain);
      afterChain = applyKeeperTrialChainProgress(afterChain, key, effectiveGained, turn);
      if (state.activeTrial && !afterChain.activeTrial) {
        return maybeFireResourceBeats(afterChain, state);
      }
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
        const zoneId = afterChain.activeZone ?? afterChain.mapCurrent ?? "home";
        const allowed = settlementHazards(afterChain, zoneId);
        const hazardSpawn = rollFarmHazard(afterChain, Math.random, allowed);
        if (hazardSpawn) {
          const hazards = { ...afterChain.hazards };
          if (hazardSpawn.kind === "fire") hazards.fire = { cells: hazardSpawn.cells };
          else if (hazardSpawn.kind === "wolf") hazards.wolves = { list: [{ row: hazardSpawn.row, col: hazardSpawn.col, scared: false }], scaredTurnsRemaining: 0 };
          afterChain = { ...afterChain, hazards };
        }
      } else if (chainBiome === "mine") {
        afterChain = tickHazards(afterChain);
        // Roll for a new mine hazard
        const zoneId = afterChain.activeZone ?? afterChain.mapCurrent ?? "home";
        const allowed = settlementHazards(afterChain, zoneId);
        const mineSpawn = rollHazard(afterChain, Math.random, allowed);
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
      const replacement = makeOrder(state.biomeKey, state.level, usedNpcs, usedKeys, state.npcs?.roster);
      // §17 locked: 5 XP per order into almanac
      const { newState: afterOrderAlmanac } = applyAlmanacXp(state, 5);
      // Bond multiplier (Phase 6.1): base reward × bond modifier
      const npcBond = state.npcs?.bonds?.[o.npc] ?? 5;
      // Use order.baseReward if present, else fall back to order.reward as the base
      const orderBase = o.baseReward ?? o.reward;
      const bondPaid = payOrder({ baseReward: orderBase }, npcBond);
      const actualReward = bondPaid;
      // Bump bond +0.3 on delivery (Phase 6.1) — scaled by any owned bond_gain_mult boons.
      const newBond = gainBond(npcBond, 0.3 * boonEffectMult(state, "bond_gain_mult"));
      const updatedNpcs = state.npcs
        ? { ...state.npcs, bonds: { ...state.npcs.bonds, [o.npc]: newBond } }
        : state.npcs;
      // Dialog line from pool (Phase 6.3) — calendar season removed; pass null
      // and let pickDialog fall back to a season-agnostic line.
      const dialogLine = pickDialog(o.npc, null, newBond, Math.random, state);
      const orderLeveledUp = afterOrderAlmanac.almanac.level > state.almanac.level;
      let bubble = { id: Date.now(), npc: o.npc,
        text: `+${actualReward}[icon:berry] — ${dialogLine}`,
        ms: 2000 };
      if (orderLeveledUp) {
        bubble = { id: Date.now(), npc: "wren", text: `Level ${afterOrderAlmanac.almanac.level}! New things await.`, ms: 2400 };
      }
      const afterOrder = {
        ...state,
        inventory,
        coins: state.coins + actualReward,
        xp: afterOrderAlmanac.almanac.xp,
        level: afterOrderAlmanac.almanac.level,
        almanac: afterOrderAlmanac.almanac,
        orders: state.orders.map((x) => (x.id === o.id ? replacement : x)),
        seasonStats: { ...state.seasonStats, ordersFilled: state.seasonStats.ordersFilled + 1, coins: state.seasonStats.coins + actualReward },
        npcs: updatedNpcs,
        bubble,
      };
      return evaluateAndApplyStoryBeat(afterOrder, { type: "order_fulfilled", id: o.id, key: o.key, npc: o.npc, count: 1 });
    }
    case "CRAFT_TOOL": {
      // Phase 10.1 — craft a Workshop tool (rake / axe / fertilizer / cat / etc.)
      const toolId = action.id ?? action.payload?.id;
      if (!toolId) return state;
      const toolRecipe = Object.values(RECIPES).find((r) => r.item === toolId && r.station === "workshop");
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
      // Fertilizer disarm: when already armed, refund 1 and clear the flag,
      // even if the player has spent their last fertilizer arming it.
      if (key === "fertilizer" && state.fertilizerActive) {
        return {
          ...state,
          tools: { ...state.tools, fertilizer: (state.tools.fertilizer ?? 0) + 1 },
          fertilizerActive: false,
        };
      }
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
      // Phase 10.1 — Fertilizer: arm the flag for next fillBoard (no turn
      // cost). The matching disarm branch lives above the count check so the
      // player can cancel even after spending their last fertilizer.
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
      const activeZone = state.activeZone ?? state.mapCurrent ?? DEFAULT_ZONE;
      if (key === "mine" && !ZONES[activeZone]?.hasMine) {
        return { ...state, bubble: { id: Date.now(), npc: "wren", text: "Travel to a mining settlement before opening the mine board.", ms: 2200 } };
      }
      if (key === "fish" && !ZONES[activeZone]?.hasWater) {
        return { ...state, bubble: { id: Date.now(), npc: "wren", text: "Travel to a harbor before opening the fishing board.", ms: 2200 } };
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
        const o = makeOrder(key, state.level, excludeNpcs, excludeKeys, state.npcs?.roster);
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
    case "SET_SETTLEMENT_NAME": {
      // The only thing a player names is a settlement (a zone). Empty/blank
      // clears back to "unnamed" (UI then shows the static MAP_NODES name).
      const zoneId = action.payload?.zoneId ?? action.zoneId ?? state.mapCurrent ?? "home";
      const name = String(action.payload?.name ?? action.name ?? "").trim().slice(0, 24);
      return { ...state, zoneNames: { ...(state.zoneNames ?? {}), [zoneId]: name } };
    }
    case "FOUND_SETTLEMENT": {
      const zoneId = action.payload?.zoneId ?? action.zoneId;
      if (!zoneId || !ZONES[zoneId]) return state;            // unknown zone
      if (isSettlementFounded(state, zoneId)) return state;   // already founded
      // Progression gate (Phase 6a): the player must have completed at least one
      // prior settlement before founding the next. `home` is auto-founded so the
      // first time a player faces this gate is when founding settlement #2 —
      // they need home (or some other founded zone) finished first. Skipped
      // entirely for `home`, which is always founded.
      if (zoneId !== DEFAULT_ZONE && completedSettlementCount(state) < 1) {
        return {
          ...state,
          bubble: { id: Date.now(), npc: "wren", text: "Complete your first settlement before founding the next.", ms: 2400 },
        };
      }
      const cost = settlementFoundingCost(state);
      if ((state.coins ?? 0) < (cost.coins ?? 0)) return state; // can't afford
      // Phase 5e — pick the biome at founding (the picker passes payload.biome;
      // a missing/unknown choice falls back to the first option for the type).
      const biome = resolveBiomeChoice(settlementTypeForZone(zoneId), action.payload?.biome);
      if (!biome) return state;
      return {
        ...state,
        coins: state.coins - (cost.coins ?? 0),
        settlements: { ...(state.settlements ?? {}), [zoneId]: { founded: true, biome: biome.id } },
        bubble: { id: Date.now(), npc: "wren", text: `${displayZoneName(state, zoneId)} is a ${biome.name} settlement now. People will come.`, ms: 2400 },
      };
    }
    case "KEEPER/CONFRONT": {
      const zoneId = action.payload?.zoneId ?? action.zoneId;
      const path = action.payload?.path ?? action.path;
      return startKeeperTrial(state, zoneId, path);
    }
    case "KEEPER/START_TRIAL": {
      const zoneId = action.payload?.zoneId ?? action.zoneId;
      return startKeeperTrial(state, zoneId, action.payload?.path ?? action.path ?? "driveout");
    }
    case "KEEPER/APPEASE": {
      const zoneId = action.payload?.zoneId ?? action.zoneId;
      return finalizeKeeperPath(state, zoneId, "coexist");
    }
    case "KEEPER/TRIAL_RESOLVE": {
      return resolveKeeperTrial(state, action.payload?.won ?? action.won);
    }
    case "OPEN_MODAL":
      return { ...state, modal: action.modal, settingsTab: action.settingsTab ?? 'main' };
    case "CLOSE_MODAL":
      return { ...state, modal: null, settingsTab: 'main' };
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
      }
      return next;
    }
    case "BUILD": {
      // Support both legacy action.building (full object) and action.payload.id (lookup by id)
      const b = action.building ?? BUILDINGS.find((x) => x.id === action.payload?.id);
      if (!b) return state;
      // Founding gate (Phase 6a): can't build at a zone that hasn't been founded.
      // `home` is auto-founded so this only catches the player at meadow/quarry/etc.
      if (!isSettlementFounded(state, state.mapCurrent)) {
        return {
          ...state,
          bubble: { id: Date.now(), npc: "wren", text: `Found ${displayZoneName(state, state.mapCurrent)} before you build here.`, ms: 2400 },
        };
      }
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
        bubble = { id: Date.now(), npc: "mira", text: `${b.name} built! [icon:ui_build] Tap it in Town to open crafting recipes.`, ms: 2800 };
        newHintsShown = { ...hintsShown, craftHint: true };
      } else if (b.id === "inn" && !hintsShown.innHint) {
        bubble = { id: Date.now(), npc: "wren", text: "Inn built! 🧑‍[icon:grass_hay] You can now hire Helpers from the nav below.", ms: 2800 };
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
      // Phase 5b — a completed settlement earns its type's Hearth-Token; the
      // third one opens the Old Capital on the map. (The Old Capital's *finale*
      // is TBD per the master doc, so the unlock just surfaces a stub node + a
      // bubble — no dialogue beat yet.)
      const earnedHeirlooms = grantEarnedHearthTokens(afterBuildStory);
      if (earnedHeirlooms !== afterBuildStory.heirlooms) {
        const justUnlockedCapital = !isOldCapitalUnlocked(afterBuildStory) &&
          isOldCapitalUnlocked({ ...afterBuildStory, heirlooms: earnedHeirlooms });
        afterBuildStory = {
          ...afterBuildStory,
          heirlooms: earnedHeirlooms,
          bubble: justUnlockedCapital
            ? { id: Date.now(), npc: "tomas", text: "Three Hearth-Tokens. The old road to the Capital opens.", ms: 2800 }
            : { id: Date.now(), npc: "wren", text: "A Hearth-Token — the kingdom remembers this place.", ms: 2400 },
        };
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
      const newEvent = pickMarketEvent(mSeed, newSeasonNum);
      const newPrices = driftPrices(mSeed, newSeasonNum, newEvent);
      // Spec §11: shuffles are earned via almanac/quests — not free per season.
      // TODO: if players run out of shuffles entirely, add a season-1 bootstrap grant here.
      let tools = { ...state.tools };
      // Unified aggregator: workers + built buildings + active tiles.
      // Building grant_tool / season_bonus / preserve_board contributions land
      // on the same channels as worker contributions.
      const seasonAgg = computeWorkerEffects(state);
      for (const [tool, count] of Object.entries(seasonAgg.seasonEndTools ?? {})) {
        if (count > 0) tools[tool] = (tools[tool] ?? 0) + count;
      }

      // ── season_bonus — worker + building season_bonus abilities (which both
      // contribute to the same `seasonBonus.coins` channel) ────────────────
      const bonusCoins = Math.round(seasonAgg.seasonBonus.coins ?? 0);

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
        coins: state.coins + bonusCoins + SEASON_END_BONUS_COINS,
        turnsUsed: 0,
        farmRun: null,
        activeTrial: null,
        boss: state.boss?.isKeeperTrial ? null : state.boss,
        modal: null,
        view: "town",
        viewParams: {},
        pendingView: null,
        seasonStats: { harvests: 0, upgrades: 0, ordersFilled: 0, coins: 0, capFloaters: {} },
        // Clear fertilizer flag at season end — it was consumed this season
        fertilizerActive: false,
        // 5.7: reset per-season free moves on season close
        tileCollection: state.tileCollection ? { ...state.tileCollection, freeMoves: 0 } : state.tileCollection,
        npcs: decayedNpcs,
        bubble: newEvent
          ? { id: Date.now(), npc: "tomas", text: `Market News: ${newEvent.label}! ${newEvent.desc}`, ms: 4000 }
          : { id: Date.now(), npc: "tomas", text: "Season ended! +25[icon:berry] season bonus.", ms: 2000 },
        market: {
          ...(state.market ?? {}),
          season: newSeasonNum,
          prevPrices: state.market?.prices ?? null,
          prices: newPrices,
          event: newEvent,
        },
      };
      // Phase 12.5 — snapshot board into saved-field slot for any biome whose
      // built buildings contribute a `preserve_board` ability (Silo on farm,
      // Barn on mine — driven by the unified abilities aggregator).
      let afterSeasonFarm = afterSeason.farm ?? { savedField: null };
      let afterSeasonMine = afterSeason.mine ?? { savedField: null };
      const preservedBiomes = seasonAgg.boardPreserveBiomes ?? new Set();
      if (state.biomeKey === "farm" && preservedBiomes.has("farm") && state.grid) {
        afterSeasonFarm = { ...afterSeasonFarm, savedField: {
          tiles: state.grid,
          hazards: state.hazards ?? null,
          turnsUsed: 0,
        } };
      }
      if (state.biomeKey === "mine" && preservedBiomes.has("mine") && state.grid) {
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
      const craftKey = action.recipeKey ?? action.payload?.key;
      if (!craftKey) return state;
      if (!crafting.canPayForRecipe(state, craftKey)) return state;
      return evaluateAndApplyStoryBeat(state, { type: "craft_made", item: craftKey, count: 1 });
    }
    case "CRAFTING/CLAIM_CRAFT": {
      // Mirror CRAFT_RECIPE for queued completions: claiming a ready queue
      // entry should fire `craft_made` so story beats, boss progress
      // (ember_drake counts mine_ingot crafts) and achievements
      // (totalCrafted, distinct_crafts) all advance. The slice still owns the
      // actual inventory mutation + queue removal; we only emit the event when
      // the action would succeed.
      const idx = action.payload?.idx ?? action.idx;
      const queue = state.craftQueue ?? [];
      const entry = queue[idx];
      if (!entry || (entry.readyAt ?? Infinity) > Date.now()) return state;
      return evaluateAndApplyStoryBeat(state, { type: "craft_made", item: entry.key, count: 1 });
    }
    case "CRAFTING/SKIP_CRAFT": {
      // Same idea as CLAIM_CRAFT but for gem-skip completions. Validate gem
      // cost so we don't fire the event on a rejected skip.
      const idx = action.payload?.idx ?? action.idx;
      const queue = state.craftQueue ?? [];
      const entry = queue[idx];
      if (!entry) return state;
      if ((state.gems ?? 0) < CRAFT_GEM_SKIP_COST) return state;
      return evaluateAndApplyStoryBeat(state, { type: "craft_made", item: entry.key, count: 1 });
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
      return applyTrade(state, action);
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

    case "FARM/ENTER": {
      // Phase 2 — pay-to-start farming session.
      // Payload: { selectedTiles: string[], useFertilizer: boolean }
      // - selectedTiles: zone categories the player chose (1 per type, max 8).
      //   Filtered by GameScene to bias spawn rotation. Empty array is allowed
      //   and behaves as "no filter" (legacy entry path).
      // - useFertilizer: when true, consume one workshop-crafted fertilizer
      //   (state.tools.fertilizer) and double the session's turn budget.
      const payload = action.payload ?? {};
      const selectedTiles = Array.isArray(payload.selectedTiles)
        ? payload.selectedTiles.slice(0, 8)
        : [];
      const useFertilizer = !!payload.useFertilizer;

      const zoneId = state.activeZone ?? state.mapCurrent ?? "home";
      const zone = ZONES[zoneId];
      if (!zone) return state;
      if (!zone.hasFarm) {
        return {
          ...state,
          bubble: { id: Date.now(), npc: "wren", text: `${displayZoneName(state, zoneId)} does not have farm fields.`, ms: 2200 },
        };
      }
      // Founding gate (Phase 6a): can't start a farming session at an unfounded zone.
      if (!isSettlementFounded(state, zoneId)) {
        return {
          ...state,
          bubble: { id: Date.now(), npc: "wren", text: `Found ${displayZoneName(state, zoneId)} before you farm here.`, ms: 2400 },
        };
      }

      const entryCoins = zone.entryCost?.coins ?? 50;
      if ((state.coins ?? 0) < entryCoins) return state;
      const fertilizerStock = state.tools?.fertilizer ?? 0;
      if (useFertilizer && fertilizerStock < 1) return state;

      const turnBudget = turnBudgetForZone(state, zoneId, { useFertilizer });

      return {
        ...state,
        biomeKey: "farm",
        biome: "farm",
        view: "board",
        viewParams: {},
        coins: state.coins - entryCoins,
        tools: useFertilizer
          ? { ...state.tools, fertilizer: fertilizerStock - 1 }
          : state.tools,
        turnsUsed: 0,
        farmRun: {
          zoneId,
          turnBudget,
          turnsRemaining: turnBudget,
          startedAt: Date.now(),
          mode: "normal",
        },
        activeTrial: null,
        boss: state.boss?.isKeeperTrial ? null : state.boss,
        session: {
          selectedTiles,
          fertilizerUsed: useFertilizer,
        },
      };
    }

    case "EXPEDITION/DEPART": {
      // Phase 5d — supply-structured expedition into a mine/harbor zone (master
      // doc §VI). Payload: { biomeKey: "mine"|"fish", supply: { foodKey: count } }.
      // Pack food before the round; each ration is worth a number of turns
      // (expeditionTurnsForFood, building-boosted); play until they run out.
      const biomeKey = action.payload?.biomeKey;
      if (biomeKey !== "mine" && biomeKey !== "fish") return state;
      const needLevel = biomeKey === "mine" ? 2 : 3;
      if ((state.level ?? 1) < needLevel) return state;
      const zoneId = state.activeZone ?? state.mapCurrent ?? "home";
      // Founding gate (Phase 6a): can't depart on an expedition from an unfounded zone.
      if (!isSettlementFounded(state, zoneId)) {
        return {
          ...state,
          bubble: { id: Date.now(), npc: "wren", text: `Found ${displayZoneName(state, zoneId)} before you depart from here.`, ms: 2400 },
        };
      }
      const supply = action.payload?.supply ?? {};
      // Validate: every entry is a real ration the player has enough of.
      const inv = { ...(state.inventory ?? {}) };
      for (const [foodKey, rawCount] of Object.entries(supply)) {
        const n = Math.floor(rawCount);
        if (n <= 0) continue;
        if (!isExpeditionFood(foodKey)) return state;
        if ((inv[foodKey] ?? 0) < n) return state;
      }
      const turns = expeditionTurnsFromSupply(state, supply, zoneId);
      if (turns < MIN_EXPEDITION_TURNS) return state;
      // Pay the supply, set the turn budget, then run the regular biome switch.
      for (const [foodKey, rawCount] of Object.entries(supply)) {
        const n = Math.floor(rawCount);
        if (n > 0) inv[foodKey] = (inv[foodKey] ?? 0) - n;
      }
      const staged = {
        ...state,
        inventory: inv,
        turnsUsed: 0,
        farmRun: {
          zoneId,
          turnBudget: turns,
          turnsRemaining: turns,
          startedAt: Date.now(),
          mode: "expedition",
        },
        activeTrial: null,
        boss: state.boss?.isKeeperTrial ? null : state.boss,
      };
      const switched = coreReducer(staged, { type: "SWITCH_BIOME", key: biomeKey });
      return {
        ...switched,
        view: "board",
        viewParams: {},
        craftingTab: null,
        session: { expedition: { zoneId, supply, turns } },
      };
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
      return {
        ...state,
        inventory: { ...state.inventory, [itemId]: owned - sellQty },
        coins: (state.coins ?? 0) + proceeds,
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
      let next = {
        ...state,
        dailyStreak: { lastClaimedDate: today, currentDay: nextDay },
        coins: (state.coins ?? 0) + rewardCoins,
        runes: (state.runes ?? 0) + (reward.runes ?? 0),
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
      const turn = boardTurnPatch(state);
      return {
        ...state,
        turnsUsed: turn.turnsUsed,
        farmRun: turn.farmRun,
        ...(turn.tileCollection ? { tileCollection: turn.tileCollection } : {}),
        modal: turn.ended ? "season" : state.modal,
        lastBoardActionConsumedFreeMove: !!turn.consumedFreeMove,
      };
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
      const giftDialog = pickDialog(npcId, null, giftResult.newState.npcs.bonds[npcId], Math.random, state);
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
          story: { ...INITIAL_STORY_STATE, flags: { ...initialFlagState() }, queuedBeat: null, beatQueue: [], sandbox: false },
          npcs: {
            roster: ["wren"],
            bonds: { wren: 5, mira: 5, tomas: 5, bram: 5, liss: 5 },
            giftCooldown: { wren: 0, mira: 0, tomas: 0, bram: 0, liss: 0 },
          },
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
  // Type-tier workers slice
  "WORKERS/HIRE",
  "WORKERS/FIRE",
  "BUILD_DECORATION",
  "SUMMON_MAGIC_TOOL",
  "MARKET/SELL",
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
  // Story modal dismiss / choice picks are owned by story/slice
  "STORY/DISMISS_MODAL",
  "STORY/PICK_CHOICE",
  // Phase 5 — real-time crafting queue (crafting/slice). Instant CRAFT_RECIPE
  // stays in ALWAYS_RUN_SLICES (coreReducer fires its `craft_made` story beat).
  // CLAIM_CRAFT / SKIP_CRAFT also fire `craft_made` from coreReducer, but the
  // slice still owns the inventory mutation + queue removal, so they remain
  // slice-primary — coreReducer may or may not change state (depends on
  // whether a beat is queued for this item), but the slice must always run.
  "CRAFTING/QUEUE_RECIPE",
  "CRAFTING/CLAIM_CRAFT",
  "CRAFTING/SKIP_CRAFT",
  // Settings actions are owned by settings/slice
  "SETTINGS/SET_TAB",
  "SETTINGS/OPEN_DEBUG",
  "SETTINGS/LEAVE_BOARD",
  "SETTINGS/TOGGLE",
  "SETTINGS/RESET_SAVE",
  "SETTINGS/SHOW_TUTORIAL",
  // Tutorial actions are owned by tutorial/slice
  "TUTORIAL/START",
  "TUTORIAL/NEXT",
  "TUTORIAL/PREV",
  "TUTORIAL/SKIP",
  // Castle Needs contribution is owned by castle/slice
  "CASTLE/CONTRIBUTE",
  // Fish biome tide cycle
  "FISH/FORCE_TIDE_FLIP",
  // Boon trees — purchase a per-path zone boon (deducts Embers / Core Ingots)
  "BOON/PURCHASE",
  // Run summary modal open/close — owned by runSummary/slice
  "RUN_SUMMARY/OPEN",
  "RUN_SUMMARY/CLOSE",
]);

// Actions where coreReducer intentionally defers to slices (e.g. CRAFTING/CRAFT_RECIPE
// fires a story beat in core but the actual craft logic lives in crafting/slice.js).
// When no story beat fires, core returns the same state — but slices still need to run.
const ALWAYS_RUN_SLICES = new Set([
  "CRAFTING/CRAFT_RECIPE",
  "USE_TOOL",  // magic tool variants (hourglass, magic_seed, magic_fertilizer) handled in portal/slice
]);

function shouldAlwaysRunSlices(state, action) {
  if (action.type === "CRAFTING/CRAFT_RECIPE") {
    const craftKey = action.recipeKey ?? action.payload?.key;
    return !!crafting.canPayForRecipe(state, craftKey);
  }
  return ALWAYS_RUN_SLICES.has(action.type);
}

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
    || shouldAlwaysRunSlices(state, action);
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
