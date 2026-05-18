import { 
  settlementTypeForZone, 
  keeperReadyFor, 
  displayZoneName, 
  grantEarnedHearthTokens, 
  isOldCapitalUnlocked 
} from "../features/zones/data.js";
import { keeperForType, keeperPathInfo } from "../keepers.js";
import { evaluateAndApplyStoryBeat } from "./storyEffects.js";

function biomeForSettlementType(type) {
  if (type === "mine") return "mine";
  if (type === "harbor") return "fish";
  return "farm";
}

export function keeperTrialDefinition(state, zoneId, path = "driveout") {
  const type = settlementTypeForZone(zoneId);
  const keeper = keeperForType(type);
  const info = keeperPathInfo(type, path);
  if (!keeper || !info) return null;
  const biomeKey = biomeForSettlementType(type);
  const goalByType = {
    farm: { resource: "grass_hay", amount: 25 },
    mine: { resource: "mine_stone", amount: 20 },
    harbor: { resource: "fish_raw", amount: 20 },
  };
  const baseBudgetByType = { farm: 12, mine: 10, harbor: 10 };
  const goal = goalByType[type] ?? goalByType.farm;
  return {
    keeperKey: keeper.id,
    keeperType: type,
    keeperName: keeper.name,
    zoneId,
    path,
    status: "active",
    pressure: state.keeperTrials?.[zoneId]?.pressure ?? 0,
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

export function bossMirrorForTrial(trial) {
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
    isKeeperTrial: true,
  };
}

export function finalizeKeeperPath(state, zoneId, path) {
  if (path !== "coexist" && path !== "driveout") return state;
  if (!zoneId || !keeperReadyFor(state, zoneId)) return state;
  const type = settlementTypeForZone(zoneId);
  const keeper = keeperForType(type);
  const info = keeperPathInfo(type, path);
  if (!keeper || !info) return state;
  const prevEntry = state.settlements?.[zoneId] ?? { founded: true };
  const where = displayZoneName(state, zoneId);
  let next = {
    ...state,
    activeTrial: null,
    boss: state.boss?.isKeeperTrial ? null : state.boss,
    bossMinimized: state.boss?.isKeeperTrial ? false : state.bossMinimized,
    settlements: { ...(state.settlements ?? {}), [zoneId]: { ...prevEntry, keeperPath: path } },
    keeperTrials: {
      ...(state.keeperTrials ?? {}),
      [zoneId]: { ...(state.keeperTrials?.[zoneId] ?? {}), status: "won", path, pressure: 0 },
    },
    story: { ...state.story, flags: { ...(state.story?.flags ?? {}), [`keeper_${zoneId}_${path}`]: true } },
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
    next = {
      ...next,
      bossesDefeated: (state.bossesDefeated || 0) + 1,
      coreIngots: (state.coreIngots ?? 0) + (info.coreIngots ?? 0),
      achievements: {
        ...(state.achievements ?? {}),
        counters: {
          ...(state.achievements?.counters ?? {}),
          bosses_defeated: (state.achievements?.counters?.bosses_defeated ?? 0) + 1,
        },
      },
    };
  }
  const earnedHeirlooms = grantEarnedHearthTokens(next);
  if (earnedHeirlooms !== next.heirlooms) {
    const justUnlockedCapital = !isOldCapitalUnlocked(next) &&
      isOldCapitalUnlocked({ ...next, heirlooms: earnedHeirlooms });
    next = {
      ...next,
      heirlooms: earnedHeirlooms,
      bubble: justUnlockedCapital
        ? { id: Date.now(), npc: "tomas", text: "Three Hearth-Tokens. The old road to the Capital opens.", ms: 2800 }
        : next.bubble,
    };
  }
  return evaluateAndApplyStoryBeat(next, { type: "keeper_confronted", zoneId, path, keeper: keeper.id });
}

export function startKeeperTrial(state, zoneId, path = "driveout") {
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
  return {
    ...state,
    activeTrial: trial,
    keeperTrials: { ...(state.keeperTrials ?? {}), [zoneId]: trial },
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

export function resolveKeeperTrial(state, won) {
  const trial = state.activeTrial;
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
  return {
    ...state,
    activeTrial: null,
    boss: state.boss?.isKeeperTrial ? null : state.boss,
    bossMinimized: state.boss?.isKeeperTrial ? false : state.bossMinimized,
    keeperTrials: {
      ...(state.keeperTrials ?? {}),
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

export function applyKeeperTrialChainProgress(state, resourceKey, amount, turnPatch) {
  const trial = state.activeTrial;
  if (!trial) return state;
  let nextTrial = {
    ...trial,
    turnsRemaining: turnPatch.farmRun?.turnsRemaining ?? trial.turnsRemaining,
  };
  if (resourceKey === trial.goal?.resource) {
    nextTrial = {
      ...nextTrial,
      progress: Math.min(trial.goal.amount, (trial.progress ?? 0) + amount),
    };
  }
  let next = {
    ...state,
    activeTrial: nextTrial,
    keeperTrials: { ...(state.keeperTrials ?? {}), [trial.zoneId]: nextTrial },
    boss: state.boss?.isKeeperTrial ? bossMirrorForTrial(nextTrial) : state.boss,
  };
  if ((nextTrial.progress ?? 0) >= (nextTrial.goal?.amount ?? Infinity)) {
    return resolveKeeperTrial(next, true);
  }
  if (turnPatch.ended) {
    return resolveKeeperTrial(next, false);
  }
  return next;
}
