import { BIOMES, BUILDINGS, RECIPES, DAILY_REWARDS, MIN_EXPEDITION_TURNS, CAPPED_INVENTORY_RESOURCES, UPGRADE_THRESHOLDS, CRAFT_GEM_SKIP_COST, ITEMS, tileFamilyResource } from "./constants.js";
import { locBuilt as _locBuilt } from "./locBuilt.js";
import { sellPriceFor as _sellPriceFor } from "./features/market/pricing.js";
import { isTapTargetPower } from "./config/toolPowers.js";
import { rollRatSpawn, tickRats } from "./features/farm/rats.js";
import { canEnterBiome } from "./state/biomeAccess.js";
import { resolveToolDispatchKey } from "./state/toolAliases.js";
import { disarmFillBias, isFillBiasArmed } from "./state/fillBias.js";
import { applyToolPower, applyTapTargetPower } from "./state/toolPowerRuntime.js";
import { tryClearRatChain } from "./features/farm/rats.js";
import { tryExtinguishFire, rollFarmHazard, tickFire, tickWolves } from "./features/farm/hazards.js";
import { tryDeadlyPestsKill } from "./features/farm/deadlyPests.js";
import { rollHazard, tickHazards } from "./features/mine/hazards.js";
import { isMysteriousChainValid, spawnMysteriousOre, tickMysteriousOre } from "./features/mine/mysterious_ore.js";
import { isPearlChainValid, spawnPearl, tickPearl, PEARL_KEY } from "./features/fish/pearl.js";
import { driftPrices, applyTrade, pickMarketEvent } from "./market.js";
import { currentCap } from "./utils.js";
import { computeWorkerEffects } from "./features/workers/aggregate.js";
import { TILE_TYPES, CATEGORIES, TILE_TYPES_MAP } from "./features/tileCollection/data.js";
import { discoverTileTypesFromChain } from "./features/tileCollection/effects.js";
import { rollQuests } from "./features/quests/data.js";
import { awardXp, XP_PER_LEVEL } from "./features/almanac/data.js";
import * as crafting from "./features/crafting/slice.js";
import * as quests from "./features/quests/slice.js";
import * as achievements from "./features/achievements/slice.js";
import * as tutorial from "./features/tutorial/slice.js";
import * as settings from "./features/settings/slice.js";
import * as boss from "./features/boss/slice.js";
import * as cartography from "./features/cartography/slice.js";
import * as storySlice from "./features/story/slice.js";
import * as fish from "./features/fish/slice.js";
import { INITIAL_STORY_STATE } from "./story.js";
import { initialFlagState } from "./flags.js";
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
import { ZONES, settlementFoundingCost, isSettlementFounded, displayZoneName, grantEarnedHearthTokens, isOldCapitalUnlocked, isExpeditionFood, expeditionTurnsFromSupply, settlementTypeForZone, resolveBiomeChoice, completedSettlementCount, DEFAULT_ZONE, turnBudgetForZone, settlementHazards } from "./features/zones/data.js";
import type { Action, GameState, Grid, Order, Tile } from "./types/state";
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

// Tools that arm-then-fire from a board tap. USE_TOOL only sets toolPending;
// the charge is spent in TOOL_FIRED once the tap actually resolves. Keep in
// sync with `armed: "tap"` entries in src/ui/toolRegistry.js.
// Disarm every armed tool in one shot, mirroring the existing CANCEL_TOOL +
// USE_TOOL(fertilizer self-disarm) sequences so the player is left whole:
// tap-target arms spent no charge to refund, instant arms get their charge
// back, rune wildcard returns to the rune stash, and fertilizer refunds its
// charge. Used whenever the player navigates away from the board (or loads
// a save) — anything other than directly using the tool deselects it.
export function disarmAllTools(state: GameState): GameState {
  let next = state;
  const pending = next.toolPending;
  const pendingPower = next.toolPendingPower;
  // Phase 2 typed-power arm: if a tap-target power is armed, the charge was
  // deferred to TOOL_FIRED (never spent), so just clear the arm — do NOT
  // refund. Refunding here would dupe the charge the next time the player
  // returns to the board. Legacy behavior (no toolPendingPower set) is
  // preserved exactly by the else-branch below.
  if (pendingPower && isTapTargetPower(pendingPower.id)) {
    next = { ...next, toolPending: null, toolPendingPower: null };
  } else if (pending) {
    const legacyPower = ITEMS[pending]?.power;
    if (legacyPower?.id && isTapTargetPower(legacyPower.id)) {
      next = { ...next, toolPending: null };
    } else if (pending === "rune_wildcard") {
      next = { ...next, toolPending: null, runeStash: (next.runeStash ?? 0) + 1 };
    } else {
      next = {
        ...next,
        toolPending: null,
        tools: { ...next.tools, [pending]: toolCount(next.tools, pending) + 1 },
      };
    }
  }
  if (isFillBiasArmed(next)) {
    next = disarmFillBias(next);
  }
  // Defensive: if a non-tap-target toolPendingPower is somehow still set
  // (e.g. a non-tap typed power left armed by a future bug), drop it. The
  // legacy refund branch above already handled toolPending; this just makes
  // sure the field doesn't carry across.
  if (next.toolPendingPower) {
    next = { ...next, toolPendingPower: null };
  }
  return next;
}

// Phase 7 — SEASON_NAMES used to be the calendar-season index → name lookup.
// All readers were removed when the calendar was deleted, so the table is
// gone too.

function visualTestingEnabled() {
  return !!(
    import.meta.env?.DEV
    || import.meta.env?.MODE === "test"
    || globalThis.__HEARTH_VISUAL_TESTING__
  );
}

// Canonical almanac XP function (§17 linear, 150 XP/level).
// Wraps features/almanac/data.js awardXp() so all reducers route through it.
function applyAlmanacXp(state: GameState, amount: number) {
  const { newState, leveledTo } = awardXp(state, amount);
  return { newState, leveledTo };
}



const locBuilt = _locBuilt;

/**
 * Read a tool count safely. The Tools index signature is
 * `number | boolean | undefined` (a few boolean upgrade flags live alongside
 * the per-tool counters); this helper coerces unknown keys to a numeric
 * count so reducer arithmetic stays type-safe.
 */
function toolCount(tools: GameState["tools"] | undefined, key: string): number {
  const raw = (tools as Record<string, number | boolean | undefined> | undefined)?.[key];
  return typeof raw === "number" ? raw : 0;
}

function boardTurnPatch(state: GameState, count = 1) {
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

function applyTileCollectionChainEffects(state: GameState, key: string, length: number) {
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
  const grant = (chainedTile?.effects as any)?.freeMoves ?? 0;
  if (grant > 0) freeMoves += grant;
  const condHook = (chainedTile?.effects as any)?.freeMovesIfChain;
  if (condHook && length >= (condHook.minChain ?? 999)) {
    freeMoves += condHook.count ?? 1;
  }

  return {
    ...state,
    tileCollection: { ...tcSlice, researchProgress: progress, discovered, activeByCategory, freeMoves },
    bubble,
  };
}

function coreReducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case "VISUAL/LOAD_STATE": {
      if (!visualTestingEnabled()) return state;
      const payload = action.payload as { state?: GameState } | undefined;
      const next = (payload?.state ?? (action as { state?: GameState }).state) as GameState | undefined;
      return next && typeof next === "object" ? next : state;
    }
    case "GRID/SYNC": {
      if (visualTestingEnabled() && state?._visualScenarioId) return state;
      const payload = action.payload as { grid?: Grid } | undefined;
      const { grid } = payload ?? {};
      if (!grid) return state;
      return { ...state, grid };
    }
    case "CHAIN_COLLECTED": {
      const payload = action.payload as {
        gains?: Record<string, number>;
        key: string;
        gained: number;
        upgrades?: number;
        value?: number;
        chainLength?: number;
        noTurn?: boolean;
        resourceKey?: string;
        chain?: Tile[];
      } | undefined;
      // Phase 4.7: support { gains: {key: n, ...} } payload for cap-aware bulk collection
      if (payload?.gains) {
        const gainsMap = payload.gains;
        const cap = currentCap(state);
        const cf: Record<string, unknown> = { ...((state.seasonStats?.capFloaters as Record<string, unknown> | undefined) ?? {}) };
        const inv = { ...state.inventory };
        const floaters = [...((state.floaters as unknown[] | undefined) ?? [])];
        for (const [k, n] of Object.entries(gainsMap)) {
          addCappedResourceMut(inv, cf, floaters, k, n, cap);
        }
        return { ...state, inventory: inv, floaters,
          seasonStats: { ...state.seasonStats, capFloaters: cf } };
      }

      const { key, gained, upgrades = 0, value, chainLength, noTurn, resourceKey } = payload ?? { key: "", gained: 0 };
      const hintsShown = state._hintsShown || {};
      const effectiveChain = chainLength || gained;

      // Tools (e.g. Scythe) emit chain-collected with noTurn:true — just add
      // resources without consuming a turn.
      if (noTurn) {
        const capNoTurn = currentCap(state);
        const inventory = { ...state.inventory };
        const creditKey = resourceKey ?? tileFamilyResource(key) ?? key;
        addCappedResourceMut(inventory, {}, null, creditKey, gained, capNoTurn);
        return { ...state, inventory };
      }

      // Mine/Farm hazard processing when full chain is provided in payload
      // (e.g. when GameScene dispatches CHAIN_COLLECTED with chain: [...]
      //  rather than a separate COMMIT_CHAIN)
      const chainTiles = (payload?.chain ?? null) as Tile[] | null;
      const currentBiome = state.biome ?? state.biomeKey;
      type FireExtinguishPatch = { hazards: Record<string, unknown>; coinsBonus: number };
      type DeadlyPatch = { hazards: { rats: unknown[]; [k: string]: unknown }; coins: number; _deadlyKills?: number; _deadlyFloater?: string };
      let fireExtinguishPatch: FireExtinguishPatch | null = null;
      let deadlyPatch: DeadlyPatch | null = null;
      if (chainTiles && chainTiles.length > 0) {
        if (currentBiome === "farm") {
          // Rat clearing: chain of 3+ rat tiles
          const hasRat = chainTiles.some((t: Tile) => t.key === "rat");
          if (hasRat) {
            const patch = tryClearRatChain(state, chainTiles as unknown as Parameters<typeof tryClearRatChain>[1]);
            if (patch) {
              return { ...state, hazards: patch.hazards, coins: patch.coins };
            }
            return state; // rejected
          }
          // Catalog §7 "deadly to pests" — Cypress / Beet / Phoenix in chain
          // exterminate orthogonally-adjacent rats. Captured here and applied
          // when building afterChain so the standard chain still resolves.
          deadlyPatch = tryDeadlyPestsKill(state, chainTiles as unknown as Parameters<typeof tryDeadlyPestsKill>[1]) as DeadlyPatch | null;
          // Fire extinguishing — capture patch to apply when building afterChain
          fireExtinguishPatch = tryExtinguishFire(state, chainTiles as unknown as Parameters<typeof tryExtinguishFire>[1]) as FireExtinguishPatch | null;
        } else if (currentBiome === "mine") {
          // Mysterious ore capture
          const hasOre = chainTiles.some((t: Tile) => t.key === "mysterious_ore");
          if (hasOre) {
            if (!isMysteriousChainValid(chainTiles)) return state;
            return {
              ...state,
              runes: (state.runes ?? 0) + 1,
              mysteriousOre: null,
            };
          }
        } else if (currentBiome === "fish") {
          // Pearl capture — chain pearl + ≥2 other fish-category tiles → +1 rune
          const hasPearl = chainTiles.some((t: Tile) => t.key === PEARL_KEY);
          if (hasPearl && isPearlChainValid(chainTiles)) {
            return {
              ...state,
              runes: (state.runes ?? 0) + 1,
              fishPearl: null,
              bubble: { id: Date.now(), npc: "wren", text: "[icon:tile_special_giant_pearl] Pearl captured! +1 Rune.", ms: 2200, priority: 2 },
            };
          }
        }
      }

      // Boss board modifier: active boss may require longer chains
      const bossSnapshot = state.boss as { minChain?: number; emoji?: string } | null | undefined;
      const bossMinChain = bossSnapshot?.minChain || 0;
      if (bossMinChain > 0 && effectiveChain < bossMinChain) {
        const turn = boardTurnPatch(state);
        const next = {
          ...state,
          turnsUsed: turn.turnsUsed,
          farmRun: turn.farmRun,
          lastBoardActionConsumedFreeMove: !!turn.consumedFreeMove,
          ...(turn.tileCollection ? { tileCollection: turn.tileCollection } : {}),
          bubble: { id: Date.now(), npc: "mira", text: `${bossSnapshot?.emoji ?? ""} Challenge: chains need ${bossMinChain}+ tiles!`, ms: 2200, priority: 2 },
          modal: turn.ended ? "season" : state.modal,
        };
        return applyKeeperTrialChainProgress(next, null, 0, turn);
      }

      const inventory = { ...state.inventory };
      const chainCap = currentCap(state);
      const chainCf = { ...(state.seasonStats?.capFloaters ?? {}) };
      const chainFloaters = [...(state.floaters ?? [])];

      // Fractional resource accumulation: chain length contributes to
      // state.resourceProgress[resourceKey], rolling into inventory once it
      // crosses UPGRADE_THRESHOLDS[key] (the chained tile's threshold).
      // Tile keys no longer enter state.inventory directly.
      const progress = { ...(state.resourceProgress ?? {}) };
      if (resourceKey) {
        const thresholds = UPGRADE_THRESHOLDS as Record<string, number>;
        const threshold = thresholds[key] ?? Infinity;
        const chainLenForProgress = chainLength ?? gained;
        const newProgress = (progress[resourceKey] ?? 0) + chainLenForProgress;
        const wholeUnits = threshold === Infinity ? 0 : Math.floor(newProgress / threshold);
        progress[resourceKey] = threshold === Infinity ? newProgress : newProgress % threshold;
        if (wholeUnits > 0) {
          addCappedResourceMut(inventory, chainCf, chainFloaters, resourceKey, wholeUnits, chainCap);
        }
      }

      // Power-hook coin bonuses (set via Dev Panel → Tile Powers).
      const chainTileEffects = (TILE_TYPES_MAP[key]?.effects ?? {}) as { coinBonusFlat?: number; coinBonusPerTile?: number };
      const hookFlat = chainTileEffects.coinBonusFlat || 0;
      const hookPerTile = chainTileEffects.coinBonusPerTile || 0;
      const coinHookBonus = hookFlat + hookPerTile * effectiveChain;

      const baseCoinsGain = Math.max(1, Math.floor((gained * (value ?? 1)) / 2)) + coinHookBonus;
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
        harvests: state.seasonStats.harvests + gained,
        upgrades: state.seasonStats.upgrades + upgrades,
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
      } else if (upgrades > 0 && !hintsShown.upgradeHint) {
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
      let afterChain: GameState = {
        ...state,
        ...(mergedHazards ? { hazards: mergedHazards } : {}),
        inventory,
        resourceProgress: progress,
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
      afterChain = applyKeeperTrialChainProgress(afterChain, key, gained, turn);
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
        const zoneId = (afterChain.activeZone as string | undefined) ?? (afterChain.mapCurrent as string | undefined) ?? "home";
        const allowed = settlementHazards(afterChain, zoneId);
        const hazardSpawn = rollFarmHazard(afterChain, Math.random, allowed) as { kind: string; cells?: unknown; row?: number; col?: number } | null;
        if (hazardSpawn) {
          const hazards: Record<string, unknown> = { ...afterChain.hazards };
          if (hazardSpawn.kind === "fire") hazards.fire = { cells: hazardSpawn.cells };
          else if (hazardSpawn.kind === "wolf") hazards.wolves = { list: [{ row: hazardSpawn.row, col: hazardSpawn.col, scared: false }], scaredTurnsRemaining: 0 };
          afterChain = { ...afterChain, hazards };
        }
        afterChain = tickRats(afterChain);
        const ratSpawn = rollRatSpawn(afterChain, Math.random);
        if (ratSpawn) {
          afterChain = {
            ...afterChain,
            hazards: { ...(afterChain.hazards ?? {}), rats: [...((afterChain.hazards?.rats as unknown[] | undefined) ?? []), ratSpawn] },
          };
        }
      } else if (chainBiome === "mine") {
        afterChain = tickHazards(afterChain);
        // Roll for a new mine hazard
        const zoneId = (afterChain.activeZone as string | undefined) ?? (afterChain.mapCurrent as string | undefined) ?? "home";
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
      const actionId = action.id as number | undefined;
      const o = state.orders.find((x) => x.id === actionId);
      if (!o) return state;
      const requiredQty = o.need ?? o.amount ?? 0;
      if ((state.inventory[o.key] || 0) < requiredQty) {
        return { ...state, bubble: { id: Date.now(), npc: o.npc, text: "Need more!", ms: 1100 } };
      }
      const inventory = { ...state.inventory };
      inventory[o.key] -= requiredQty;
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
      const goldMult = state.tools?.goldSeal ? 1.1 : 1;
      const actualReward = Math.floor(bondPaid * goldMult);
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
      const payload = action.payload as { id?: string } | undefined;
      const toolId = (action.id as string | undefined) ?? payload?.id;
      if (!toolId) return state;
      const toolRecipe = Object.values(RECIPES).find((r: { item: string; station: string }) => r.item === toolId && r.station === "workshop") as { inputs: Record<string, number> } | undefined;
      if (!toolRecipe) return state;
      // Workshop must be built
      if (!locBuilt(state).workshop) return state;
      if (!hasAllInventory(state, toolRecipe.inputs)) return state;
      return {
        ...state,
        inventory: deductInventory(state.inventory ?? {}, toolRecipe.inputs),
        tools: { ...state.tools, [toolId]: toolCount(state.tools, toolId) + 1 },
      };
    }

    case "CANCEL_TOOL": {
      // Disarm an armed tool. Tap-target tools (bomb / rake / axe / magic_wand)
      // never consumed a charge on arm, so there is nothing to refund. Tools
      // that briefly arm during their fire effect (clear / basic / rare /
      // shuffle) and the rune-wildcard arming flow did spend, so refund those.
      const pending = state.toolPending;
      if (!pending) return state;
      const itemEntry = ITEMS[pending] as { power?: { id?: string } } | undefined;
      const cancelPower = state.toolPendingPower ?? itemEntry?.power;
      if (cancelPower?.id && isTapTargetPower(cancelPower.id)) {
        return { ...state, toolPending: null, toolPendingPower: null };
      }
      if (pending === "rune_wildcard") {
        return { ...state, toolPending: null, runeStash: (state.runeStash ?? 0) + 1 };
      }
      return {
        ...state,
        toolPending: null,
        tools: { ...state.tools, [pending]: toolCount(state.tools, pending) + 1 },
      };
    }
    case "TOOL_FIRED": {
      // Dispatched by GameScene after a tool effect actually executes. For
      // tap-target tools the charge is spent here (USE_TOOL only armed). For
      // instant tools that briefly set toolPending so the scene could pick it
      // up, we just clear toolPending — the charge was already spent in
      // USE_TOOL. Either way, this is the canonical end-of-fire signal that
      // keeps React state and the Phaser registry in sync.
      const payload = action.payload as { key?: string; row?: number; col?: number } | undefined;
      const key = (action.key as string | undefined) ?? payload?.key ?? state.toolPending;
      if (!key) return state;
      // Phase 2 (tool-powers overhaul) — typed tap-target powers stash the
      // armed power config in state.toolPendingPower. If present, apply it
      // here at the tap site instead of the key-based legacy branches below.
      const armedPower = state.toolPendingPower;
      if (armedPower?.id && isTapTargetPower(armedPower.id)) {
        const row = (action.row as number | undefined) ?? payload?.row;
        const col = (action.col as number | undefined) ?? payload?.col;
        return applyTapTargetPower(state, key, armedPower, row, col);
      }
      return { ...state, toolPending: null, toolPendingPower: null };
    }
    case "USE_TOOL": {
      const payload = action.payload as { id?: string; key?: string; power?: { id?: string; [k: string]: unknown } } | undefined;
      const rawKey = payload?.id ?? payload?.key ?? (action.key as string | undefined);
      const key = resolveToolDispatchKey(rawKey);
      const explicitPower = payload?.power;
      if (explicitPower?.id) {
        return applyToolPower(state, key, explicitPower);
      }
      if (key === "fertilizer" && isFillBiasArmed(state)) {
        return disarmFillBias(state);
      }
      const item = ITEMS[key] as { power?: { id?: string; [k: string]: unknown } } | undefined;
      const itemPower = item?.power ?? null;
      if (itemPower?.id) {
        return applyToolPower(state, key, itemPower);
      }
      if (toolCount(state.tools, key) <= 0) return state;
      return { ...state, tools: { ...state.tools, [key]: toolCount(state.tools, key) - 1 } };
    }
    case "SWITCH_BIOME": {
      // Support both legacy action.key and Phase 12.5 action.payload.biome
      const payload = action.payload as { biome?: string } | undefined;
      const key = (action.key as string | undefined) ?? payload?.biome;
      if (!key) return state;
      if (key === state.biomeKey) return state;
      const access = canEnterBiome(state, key) as { ok: boolean; reason?: string };
      if (!access.ok) {
        return { ...state, bubble: { id: Date.now(), npc: "wren", text: access.reason ?? "", ms: 2200 } };
      }
      // Phase 12.5 — restore saved board if Silo/Barn built and snapshot exists
      const biomeSlot = (state as Record<string, unknown>)[key] as { savedField?: { tiles?: Grid } | null } | undefined;
      const savedField = biomeSlot?.savedField ?? null;
      let boardPatch: { grid?: Grid } = {};
      if (savedField && savedField.tiles) {
        boardPatch = { grid: savedField.tiles };
      }
      const excludeNpcs: string[] = [];
      const excludeKeys: string[] = [];
      const replacements = (state.orders ?? []).map(() => {
        const o = makeOrder(key, state.level, excludeNpcs, excludeKeys, state.npcs?.roster) as Order;
        excludeNpcs.push(o.npc);
        excludeKeys.push(o.key);
        return o;
      });
      return { ...state, biome: key, biomeKey: key, orders: replacements, turnsUsed: 0, _biomeRestored: !!(savedField && savedField.tiles), ...boardPatch };
    }
    case "SET_VIEW": {
      const next = action.view as string;
      // Reset viewParams when leaving a view so a fresh visit doesn't inherit
      // stale sub-tabs (e.g. tile-wiki sub-category from a previous trip).
      const sameView = next === state.view;
      const viewParams = (action.viewParams as Record<string, unknown> | undefined)
        ?? (sameView ? state.viewParams : {});
      // Leaving the board is an "action not directly using the tool", so any
      // armed tool deselects (with charge refunded). Tap-target arms had no
      // charge to refund; instant/rune/fertilizer arms get their charge back.
      const base = next === "board" ? state : disarmAllTools(state);
      return { ...base, view: next, viewParams, craftingTab: (action.craftingTab as string | null | undefined) ?? (next === "crafting" ? base.craftingTab : null) };
    }
    case "SET_VIEW_PARAMS":
      return { ...state, viewParams: { ...(state.viewParams ?? {}), ...((action.params as Record<string, unknown> | undefined) ?? {}) } };
    case "SET_SETTLEMENT_NAME": {
      // The only thing a player names is a settlement (a zone). Empty/blank
      // clears back to "unnamed" (UI then shows the static MAP_NODES name).
      const payload = action.payload as { zoneId?: string; name?: string } | undefined;
      const zoneId = payload?.zoneId ?? (action.zoneId as string | undefined) ?? (state.mapCurrent as string | undefined) ?? "home";
      const name = String(payload?.name ?? (action.name as string | undefined) ?? "").trim().slice(0, 24);
      return { ...state, zoneNames: { ...(state.zoneNames ?? {}), [zoneId]: name } };
    }
    case "FOUND_SETTLEMENT": {
      const payload = action.payload as { zoneId?: string; biome?: string } | undefined;
      const zoneId = payload?.zoneId ?? (action.zoneId as string | undefined);
      if (!zoneId || !(ZONES as Record<string, unknown>)[zoneId]) return state;            // unknown zone
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
      const cost = settlementFoundingCost(state) as { coins?: number };
      if ((state.coins ?? 0) < (cost.coins ?? 0)) return state; // can't afford
      // Phase 5e — pick the biome at founding (the picker passes payload.biome;
      // a missing/unknown choice falls back to the first option for the type).
      const biome = resolveBiomeChoice(settlementTypeForZone(zoneId), payload?.biome) as { id: string; name: string } | null;
      if (!biome) return state;
      return {
        ...state,
        coins: state.coins - (cost.coins ?? 0),
        settlements: { ...(state.settlements ?? {}), [zoneId]: { founded: true, biome: biome.id } },
        bubble: { id: Date.now(), npc: "wren", text: `${displayZoneName(state, zoneId)} is a ${biome.name} settlement now. People will come.`, ms: 2400 },
      };
    }
    case "KEEPER/CONFRONT": {
      const payload = action.payload as { zoneId?: string; path?: string } | undefined;
      const zoneId = payload?.zoneId ?? (action.zoneId as string | undefined);
      const path = payload?.path ?? (action.path as string | undefined);
      return startKeeperTrial(state, zoneId, path);
    }
    case "KEEPER/START_TRIAL": {
      const payload = action.payload as { zoneId?: string; path?: string } | undefined;
      const zoneId = payload?.zoneId ?? (action.zoneId as string | undefined);
      return startKeeperTrial(state, zoneId, payload?.path ?? (action.path as string | undefined) ?? "driveout");
    }
    case "KEEPER/APPEASE": {
      const payload = action.payload as { zoneId?: string } | undefined;
      const zoneId = payload?.zoneId ?? (action.zoneId as string | undefined);
      return finalizeKeeperPath(state, zoneId, "coexist");
    }
    case "KEEPER/TRIAL_RESOLVE": {
      const payload = action.payload as { won?: boolean } | undefined;
      return resolveKeeperTrial(state, payload?.won ?? (action.won as boolean | undefined));
    }
    case "OPEN_MODAL":
      return { ...state, modal: action.modal as string | null, settingsTab: (action.settingsTab as string | undefined) ?? 'main' };
    case "CLOSE_MODAL":
      return { ...state, modal: null, settingsTab: 'main' };
    case "ROUTE/APPLY": {
      // Apply a router-derived navigation snapshot in one shot. Each branch
      // matches the equivalent SET_VIEW / OPEN_MODAL / SETTINGS/SET_TAB
      // semantics so popstate-driven changes look identical to user-driven
      // ones from the rest of the app's perspective.
      const r = (action.route as { view?: string; modal?: string | null; viewParams?: Record<string, unknown>; modalParams?: { tab?: string } } | undefined) ?? {};
      const rawView = r.view ?? state.view ?? "town";
      // Safety: don't navigate to board via URL if there's no active run —
      // avoids a broken green-screen on reload after a session has ended.
      const runTurnsRemaining = state.farmRun?.turnsRemaining ?? 0;
      const view = rawView === "board" && !(runTurnsRemaining > 0) ? "town" : rawView;
      // Mirror SET_VIEW: hash-driven navigation away from the board deselects
      // any armed tool (with charge refunded). Keeps "leave the board"
      // behavior consistent whether the user taps the nav or hits back.
      const base = view === "board" ? state : disarmAllTools(state);
      const modal = r.modal ?? null;
      const incomingViewParams: Record<string, unknown> = r.viewParams ?? {};
      const next: GameState = { ...base, view, viewParams: incomingViewParams };
      if (view === "crafting") {
        next.craftingTab = (incomingViewParams.tab as string | undefined) ?? base.craftingTab ?? null;
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
      type BuildingShape = { id: string; name: string; cost: Record<string, number> };
      const payload = action.payload as { id?: string; plot?: number } | undefined;
      const buildings = BUILDINGS as unknown as readonly BuildingShape[];
      const b = (action.building as BuildingShape | undefined) ?? buildings.find((x) => x.id === payload?.id);
      if (!b) return state;
      const currentZone = (state.mapCurrent as string | undefined) ?? "home";
      // Founding gate (Phase 6a): can't build at a zone that hasn't been founded.
      // `home` is auto-founded so this only catches the player at meadow/quarry/etc.
      if (!isSettlementFounded(state, currentZone)) {
        return {
          ...state,
          bubble: { id: Date.now(), npc: "wren", text: `Found ${displayZoneName(state, currentZone)} before you build here.`, ms: 2400 },
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
      const lbForPlot = locBuilt(state) as Record<string, unknown>;
      const plots: Record<string, unknown> = { ...((lbForPlot._plots as Record<string, unknown> | undefined) ?? {}) };
      const requestedPlot = (action.plot as number | undefined) ?? payload?.plot;
      const occupied = (idx: number) => Object.prototype.hasOwnProperty.call(plots, String(idx));
      let plotIdx: number;
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
        if (k !== "coins" && k !== "runes") inventory[k] = (inventory[k] || 0) - (v as number);
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
        bubble = { id: Date.now(), npc: "wren", text: "Inn built! 🧑‍[icon:tile_grass_hay] You can now hire Helpers from the nav below.", ms: 2800 };
        newHintsShown = { ...hintsShown, innHint: true };
      }
      // §17 locked: 10 XP per building into almanac
      const { newState: afterBuildAlmanac } = applyAlmanacXp(state, 10);
      const afterBuild: GameState = {
        ...state,
        coins: state.coins - (b.cost.coins || 0),
        runes: (state.runes ?? 0) - runesNeeded,
        inventory,
        built: { ...state.built, [currentZone]: { ...locBuilt(state), [b.id]: true, _plots: plots } },
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
      return { ...state, bubble: { id: Date.now(), npc: action.npc as string, text: action.text as string, ms: (action.ms as number | undefined) ?? 1800 } };
    case "DISMISS_BUBBLE":
      return state.bubble && state.bubble.id === (action.id as number | undefined) ? { ...state, bubble: null } : state;
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
        if ((count as number) > 0) tools[tool] = toolCount(tools, tool) + (count as number);
      }

      // ── season_bonus — worker + building season_bonus abilities (which both
      // contribute to the same `seasonBonus.coins` channel) ────────────────
      const bonusCoins = Math.round((seasonAgg.seasonBonus as any).coins ?? 0);

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
        fillBiasTarget: null,
        magicFertilizerCharges: 0,
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
      // Mirror CRAFT_RECIPE for queued completions: claiming the ready head
      // entry of a station's queue should fire `craft_made` so story beats,
      // boss progress (ember_drake counts iron_bar crafts) and achievements
      // (totalCrafted, distinct_crafts) all advance. The slice owns the
      // actual inventory mutation + queue removal; we only emit the event
      // when the action would succeed.
      const station = action.payload?.station ?? action.station;
      if (!station) return state;
      const queue = (state.craftQueues ?? {})[station] ?? [];
      const entry = queue[0];
      if (!entry || (entry.readyAt ?? Infinity) > Date.now()) return state;
      return evaluateAndApplyStoryBeat(state, { type: "craft_made", item: entry.key, count: 1 });
    }
    case "CRAFTING/SKIP_CRAFT": {
      // Same idea as CLAIM_CRAFT but for gem-skip completions. Validate gem
      // cost so we don't fire the event on a rejected skip.
      const station = action.payload?.station ?? action.station;
      if (!station) return state;
      const queue = (state.craftQueues ?? {})[station] ?? [];
      const entry = queue[0];
      if (!entry) return state;
      if ((state.gems ?? 0) < CRAFT_GEM_SKIP_COST) return state;
      return evaluateAndApplyStoryBeat(state, { type: "craft_made", item: entry.key, count: 1 });
    }

    // ─── Phase 3 Economy ────────────────────────────────────────────────────────

    case "BUY_RESOURCE": {
      const { key: buyKey, qty: buyQty } = action.payload;
      // Transitional: market still trades tile keys until PR 3 moves tiles out
      // of inventory. Cap-check against both lists.
      if (CAPPED_INVENTORY_RESOURCES.includes(buyKey)) {
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
      if ((state.inventory.flour ?? 0) < cost) return state;
      return {
        ...state,
        inventory: {
          ...state.inventory,
          flour: state.inventory.flour - cost,
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
        const n = Math.floor(rawCount as number);
        if (n <= 0) continue;
        if (!isExpeditionFood(foodKey)) return state;
        if ((inv[foodKey] ?? 0) < n) return state;
      }
      const turns = expeditionTurnsFromSupply(state, supply, zoneId);
      if (turns < MIN_EXPEDITION_TURNS) return state;
      // Pay the supply, set the turn budget, then run the regular biome switch.
      for (const [foodKey, rawCount] of Object.entries(supply)) {
        const n = Math.floor(rawCount as number);
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
        : Object.fromEntries(Object.entries(recipe.inputs).map(([k, n]) => [k, (n as number) * craftQty]));
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

    case "ACTIVATE_RUNE_WILDCARD": {
      if ((state.runeStash ?? 0) < 1) return state;
      return {
        ...state,
        runeStash: state.runeStash - 1,
        toolPending: "rune_wildcard",
        toolPendingPower: {
          id: "tap_clear_type",
          params: {},
          tint: 0xffd248,
        },
      };
    }

    case "FERTILIZER/CONSUMED": {
      if (!isFillBiasArmed(state)) return state;
      return { ...state, fillBiasTarget: null, magicFertilizerCharges: 0 };
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
        const diff = Math.round((d2.getTime() - d1.getTime()) / 86400000);
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
      for (const k of CAPPED_INVENTORY_RESOURCES) {
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
          for (const res of [...biome.tiles, ...biome.resources]) {
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
        const bump = action.amount ?? 1;
        let s = state;
        for (let i = 0; i < bump; i++) {
          const { newState } = applyAlmanacXp(s, XP_PER_LEVEL);
          s = newState;
        }
        return { ...s, xp: s.almanac.xp, level: s.almanac.level };
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

function rawReducer(state: GameState, action: Action): GameState {
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

export function gameReducer(state: GameState, action: Action): GameState {
  let next: GameState;
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
