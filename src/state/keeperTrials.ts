import {
  settlementTypeForZone,
  keeperReadyFor,
  displayZoneName,
  grantEarnedHearthTokens,
  isOldCapitalUnlocked
} from "../features/zones/data.js";
import { keeperForType, keeperPathInfo } from "../keepers.js";
import { evaluateAndApplyStoryBeat } from "./storyEffects.js";
import type { GameState } from "../types/state.js";

/** Settlement type → biome key. */
function biomeForSettlementType(type: string | null | undefined): string {
  if (type === "mine") return "mine";
  if (type === "harbor") return "fish";
  return "farm";
}

/** A keeper trial definition. Embedded on `state.activeTrial` and per-zone in `state.keeperTrials`. */
export interface KeeperTrial {
  keeperKey: string;
  keeperType: string;
  keeperName: string;
  zoneId: string;
  path: string;
  status: string;
  pressure: number;
  entryCost: Record<string, number>;
  turnBudget: number;
  turnsRemaining: number;
  boardRules: { minChain: number; biomeKey: string };
  goal: { resource: string; amount: number };
  progress: number;
  pressureRules: { lossPressure: number };
  winReward: { embers?: number; coreIngots?: number };
  lossPenalty: { pressure: number };
  [extra: string]: unknown;
}

/** The boss-mirror payload synthesised from a keeper trial. */
export interface KeeperBossMirror {
  key: string;
  name: string;
  emoji: string;
  resource: string;
  targetCount: number;
  progress: number;
  turnsLeft: number;
  minChain: number;
  goal: string;
  flavor: string;
  description: string;
  modifierDescription: string | null;
  spawnBias: Record<string, number> | null;
  modifier: import("../features/bosses/modifiers.js").BossModifier;
  isKeeperTrial: true;
}

/** Shape of `keeperPathInfo` results — either coexist (embers) or driveout (coreIngots). */
interface PathInfoReward {
  embers?: number;
  coreIngots?: number;
  [extra: string]: unknown;
}

export function keeperTrialDefinition(state: GameState, zoneId: string | null | undefined, path: string = "driveout"): KeeperTrial | null {
  if (!zoneId) return null;
  const type = settlementTypeForZone(zoneId);
  const keeper = keeperForType(type);
  const info = keeperPathInfo(type, path) as PathInfoReward | null;
  if (!keeper || !info || !type) return null;
  const biomeKey = biomeForSettlementType(type);
  const goalByType: Record<string, { resource: string; amount: number }> = {
    farm: { resource: "tile_grass_grass", amount: 25 },
    mine: { resource: "tile_mine_stone", amount: 20 },
    harbor: { resource: "fish_fillet", amount: 20 },
  };
  const baseBudgetByType: Record<string, number> = { farm: 12, mine: 10, harbor: 10 };
  const goal = goalByType[type] ?? goalByType.farm;
  const trialsState = state.keeperTrials as Record<string, { pressure?: number } | undefined> | undefined;
  return {
    keeperKey: keeper.id,
    keeperType: type,
    keeperName: keeper.name,
    zoneId,
    path,
    status: "active",
    pressure: trialsState?.[zoneId]?.pressure ?? 0,
    entryCost: {},
    turnBudget: baseBudgetByType[type] ?? 10,
    turnsRemaining: baseBudgetByType[type] ?? 10,
    boardRules: { minChain: type === "farm" ? 4 : 3, biomeKey },
    goal,
    progress: 0,
    pressureRules: { lossPressure: 1 },
    winReward: path === "coexist"
      ? { embers: info.embers ?? 0 }
      : { coreIngots: info.coreIngots ?? 0 },
    lossPenalty: { pressure: 1 },
  };
}

export function bossMirrorForTrial(trial: KeeperTrial | null | undefined): KeeperBossMirror | null {
  if (!trial) return null;
  return {
    key: trial.keeperKey,
    name: trial.keeperName,
    emoji: "◆",
    resource: trial.goal.resource,
    targetCount: trial.goal.amount,
    progress: trial.progress ?? 0,
    turnsLeft: trial.turnsRemaining ?? trial.turnBudget,
    minChain: trial.boardRules?.minChain ?? 3,
    goal: `Collect ${trial.goal.amount} ${trial.goal.resource} before the trial ends.`,
    flavor: "Keeper Trial",
    description: "A special board with keeper rules.",
    modifierDescription: null,
    spawnBias: null,
    modifier: { type: "", params: {} },
    isKeeperTrial: true,
  };
}

export function finalizeKeeperPath(state: GameState, zoneId: string | null | undefined, path: string | null | undefined): GameState {
  if (path !== "coexist" && path !== "driveout") return state;
  if (!zoneId || !keeperReadyFor(state, zoneId)) return state;
  const type = settlementTypeForZone(zoneId);
  const keeper = keeperForType(type);
  const info = keeperPathInfo(type, path) as PathInfoReward | null;
  if (!keeper || !info) return state;
  const settlements: GameState["settlements"] = state.settlements ?? {};
  const prevEntry = settlements[zoneId] ?? { founded: true };
  const where = displayZoneName(state, zoneId);
  const boss = state.boss as { isKeeperTrial?: boolean } | null | undefined;
  const story = state.story as { flags?: Record<string, unknown>; [k: string]: unknown };
  const trialsState = (state.keeperTrials ?? {}) as Record<string, Record<string, unknown> | undefined>;
  let next: GameState = {
    ...state,
    activeTrial: null,
    boss: boss?.isKeeperTrial ? null : state.boss,
    bossMinimized: boss?.isKeeperTrial ? false : state.bossMinimized,
    settlements: { ...settlements, [zoneId]: { ...prevEntry, keeperPath: path } },
    keeperTrials: {
      ...trialsState,
      [zoneId]: { ...(trialsState[zoneId] ?? {}), status: "won", path, pressure: 0 },
    },
    story: { ...story, flags: { ...(story?.flags ?? {}), [`keeper_${zoneId}_${path}`]: true } },
    bubble: {
      id: Date.now(), npc: "wren", ms: 3000,
      text: path === "coexist"
        ? `${keeper.name} stays — its blessing rests on ${where}.`
        : `${keeper.name} withdraws. ${where} is yours alone now.`,
    },
  };
  if (path === "coexist") {
    next = { ...next, embers: (state.embers ?? 0) + (info.embers ?? 0) };
  } else {
    const achievementsRec = (state.achievements ?? {}) as GameState["achievements"];
    next = {
      ...next,
      bossesDefeated: state.bossesDefeated + 1,
      coreIngots: (state.coreIngots ?? 0) + (info.coreIngots ?? 0),
      achievements: {
        ...achievementsRec,
        counters: {
          ...(achievementsRec.counters ?? {}),
          bosses_defeated: (achievementsRec.counters?.bosses_defeated ?? 0) + 1,
        },
      },
    };
  }
  const earnedHeirlooms = grantEarnedHearthTokens(next);
  if (earnedHeirlooms !== next.heirlooms) {
    const justUnlockedCapital = !isOldCapitalUnlocked(next) &&
      isOldCapitalUnlocked({ ...next, heirlooms: earnedHeirlooms } as GameState);
    next = {
      ...next,
      heirlooms: earnedHeirlooms as GameState["heirlooms"],
      bubble: justUnlockedCapital
        ? { id: Date.now(), npc: "tomas", text: "Three Hearth-Tokens. The old road to the Capital opens.", ms: 2800 }
        : next.bubble,
    };
  }
  return evaluateAndApplyStoryBeat(next, { type: "keeper_confronted", zoneId, path, keeper: keeper.id });
}

export function startKeeperTrial(state: GameState, zoneId: string | null | undefined, path: string = "driveout"): GameState {
  if (path === "coexist") return finalizeKeeperPath(state, zoneId, path);
  if (!zoneId || !keeperReadyFor(state, zoneId)) return state;
  const trial = keeperTrialDefinition(state, zoneId, path);
  if (!trial) return state;
  const biomeKey = trial.boardRules?.biomeKey ?? "farm";
  const farmRun = {
    zoneId,
    turnBudget: trial.turnBudget,
    turnsRemaining: trial.turnBudget,
    startedAt: Date.now(),
    mode: "keeperTrial",
    trialKey: trial.keeperKey,
  };
  const trialsState = (state.keeperTrials ?? {}) as Record<string, unknown>;
  return {
    ...state,
    activeTrial: trial as unknown as GameState["activeTrial"],
    keeperTrials: { ...trialsState, [zoneId]: trial },
    boss: bossMirrorForTrial(trial),
    bossMinimized: true,
    modal: null,
    view: "board",
    viewParams: {},
    biomeKey,
    biome: biomeKey,
    turnsUsed: 0,
    farmRun,
    session: { selectedTiles: [], fertilizerUsed: false, trial: { zoneId, keeperKey: trial.keeperKey } },
    bubble: { id: Date.now(), npc: "wren", text: `${trial.keeperName} waits on a trial board. Meet its rules to drive it out.`, ms: 2600 },
  };
}

export function resolveKeeperTrial(state: GameState, won: boolean | null | undefined): GameState {
  const trial = state.activeTrial as KeeperTrial | null;
  if (!trial) return state;
  if (won) {
    return finalizeKeeperPath({
      ...state,
      farmRun: null,
      turnsUsed: 0,
      modal: null,
      view: "town",
      viewParams: {},
    }, trial.zoneId, trial.path);
  }
  const pressure = (trial.pressure ?? 0) + (trial.lossPenalty?.pressure ?? 1);
  const boss = state.boss as { isKeeperTrial?: boolean } | null | undefined;
  const trialsState = (state.keeperTrials ?? {}) as Record<string, unknown>;
  return {
    ...state,
    activeTrial: null,
    boss: boss?.isKeeperTrial ? null : state.boss,
    bossMinimized: boss?.isKeeperTrial ? false : state.bossMinimized,
    keeperTrials: {
      ...trialsState,
      [trial.zoneId]: { ...trial, status: "lost", pressure, turnsRemaining: 0 },
    },
    farmRun: null,
    turnsUsed: 0,
    modal: "season",
    view: "town",
    viewParams: {},
    bubble: { id: Date.now(), npc: "wren", text: `${trial.keeperName} holds for now. Regroup and try again.`, ms: 2600 },
  };
}

/** Per-turn patch supplied to {@link applyKeeperTrialChainProgress}. */
export interface KeeperTrialTurnPatch {
  /**
   * The next-turn farmRun snapshot (or null when not on a farm board).
   * Allows either `turnsRemaining?: number` (looser internal patches) or
   * `turnsRemaining: number` (the canonical FarmRun shape).
   */
  farmRun?: { turnsRemaining?: number; [k: string]: unknown } | null;
  ended?: boolean;
  [extra: string]: unknown;
}

export function applyKeeperTrialChainProgress(state: GameState, resourceKey: string | null | undefined, amount: number, turnPatch: KeeperTrialTurnPatch): GameState {
  const trial = state.activeTrial as KeeperTrial | null;
  if (!trial) return state;
  let nextTrial: KeeperTrial = {
    ...trial,
    turnsRemaining: turnPatch.farmRun?.turnsRemaining ?? trial.turnsRemaining,
  };
  if (resourceKey === trial.goal?.resource) {
    nextTrial = {
      ...nextTrial,
      progress: Math.min(trial.goal.amount, (trial.progress ?? 0) + amount),
    };
  }
  const trialsState = (state.keeperTrials ?? {}) as Record<string, unknown>;
  const boss = state.boss as { isKeeperTrial?: boolean } | null | undefined;
  let next: GameState = {
    ...state,
    activeTrial: nextTrial as unknown as GameState["activeTrial"],
    keeperTrials: { ...trialsState, [trial.zoneId]: nextTrial },
    boss: boss?.isKeeperTrial ? bossMirrorForTrial(nextTrial) : state.boss,
  };
  if ((nextTrial.progress ?? 0) >= (nextTrial.goal?.amount ?? Infinity)) {
    return resolveKeeperTrial(next, true);
  }
  if (turnPatch.ended) {
    return resolveKeeperTrial(next, false);
  }
  return next;
}
