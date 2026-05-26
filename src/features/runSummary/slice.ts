import type { Action, GameState } from "../../types/state.js";

export interface BiggestChainSnapshot {
  count: number;
  key: string | null;
  coinGain: number;
  upgrades: number;
  gained: number;
}

export interface BeatTriggered {
  id: string;
  title: string | null;
}

export interface RunSummary {
  open: boolean;
  biome: string | null;
  zoneId: string | null;
  mode: string | null;
  turnsAtStart: number;
  chainsPlayed: number;
  biggestChain: BiggestChainSnapshot | null;
  totalUpgrades: number;
  totalCoinGain: number;
  resourcesGained: Record<string, number>;
  bondsAtStart: Record<string, number> | null;
  bondDeltas: Record<string, number>;
  beatsTriggered: BeatTriggered[];
  suppliesConsumed: Record<string, number>;
  fertilizerUsed: boolean;
}

function emptyRun(): RunSummary {
  return {
    open: false,
    biome: null,
    zoneId: null,
    mode: null,
    turnsAtStart: 0,
    chainsPlayed: 0,
    biggestChain: null,
    totalUpgrades: 0,
    totalCoinGain: 0,
    resourcesGained: {},
    bondsAtStart: null,
    bondDeltas: {},
    beatsTriggered: [],
    suppliesConsumed: {},
    fertilizerUsed: false,
  };
}

export const initial = {
  runSummary: emptyRun(),
};

interface RunHostState {
  runSummary?: RunSummary;
  npcs?: { bonds?: Record<string, number> };
  biome?: string;
  biomeKey?: string;
  activeZone?: string;
  mapCurrent?: string;
  modal?: string | null;
  farmRun?: { turnBudget?: number; turnsRemaining?: number; zoneId?: string; mode?: string };
  session?: { fertilizerUsed?: boolean; expedition?: { supply?: Record<string, number> } };
}

function snapshotBonds(state: GameState): Record<string, number> {
  const s = state as unknown as RunHostState;
  const bonds = s.npcs?.bonds;
  if (!bonds || typeof bonds !== "object") return {};
  return { ...bonds };
}

function diffBonds(start: Record<string, number> | null | undefined, end: Record<string, number> | null | undefined): Record<string, number> {
  if (!start || !end) return {};
  const out: Record<string, number> = {};
  const keys = new Set<string>([...Object.keys(start), ...Object.keys(end)]);
  for (const k of keys) {
    const a = Number(start[k] ?? 0);
    const b = Number(end[k] ?? 0);
    const d = b - a;
    if (Math.abs(d) >= 0.05) out[k] = Math.round(d * 10) / 10;
  }
  return out;
}

function maybeAutoOpen(state: GameState): GameState {
  const s = state as unknown as RunHostState;
  const run = s.runSummary;
  if (!run || run.open) return state;
  if (s.modal !== "season") return state;
  const bondDeltas = diffBonds(run.bondsAtStart, snapshotBonds(state));
  return {
    ...state,
    runSummary: { ...run, open: true, bondDeltas },
  } as GameState;
}

interface StartArgs {
  biome?: string | null;
  zoneId?: string | null;
  mode?: string | null;
  supply?: Record<string, number> | null;
  fertilizerUsed?: boolean;
}

function startFreshRun(state: GameState, { biome, zoneId, mode, supply, fertilizerUsed }: StartArgs): GameState {
  const s = state as unknown as RunHostState;
  const fresh = emptyRun();
  fresh.biome = biome ?? s.biomeKey ?? s.biome ?? null;
  fresh.zoneId = zoneId ?? s.activeZone ?? s.mapCurrent ?? null;
  fresh.mode = mode ?? null;
  fresh.turnsAtStart = s.farmRun?.turnBudget ?? s.farmRun?.turnsRemaining ?? 0;
  fresh.bondsAtStart = snapshotBonds(state);
  fresh.suppliesConsumed = supply ? { ...supply } : {};
  fresh.fertilizerUsed = !!fertilizerUsed;
  return { ...state, runSummary: fresh } as GameState;
}

interface ChainPayload {
  noTurn?: boolean;
  gains?: Record<string, number>;
  chainLength?: number;
  gained?: number;
  key?: string;
  upgrades?: number;
  value?: number;
}

interface BeatPayload {
  firedBeat?: { id?: string; title?: string };
}

export function reduce(state: GameState, action: Action): GameState {
  const s = state as unknown as RunHostState;
  switch (action.type) {
    case "FARM/ENTER": {
      if (!s.farmRun) return state;
      return startFreshRun(state, {
        biome: s.biomeKey,
        zoneId: s.farmRun.zoneId,
        mode: s.farmRun.mode ?? "normal",
        fertilizerUsed: !!s.session?.fertilizerUsed,
      });
    }

    case "EXPEDITION/DEPART": {
      if (!s.farmRun) return state;
      return startFreshRun(state, {
        biome: s.biomeKey,
        zoneId: s.farmRun.zoneId,
        mode: s.farmRun.mode ?? "expedition",
        supply: s.session?.expedition?.supply,
      });
    }

    case "CHAIN_COLLECTED": {
      const run = s.runSummary;
      if (!run) return maybeAutoOpen(state);
      const payload = (action.payload as ChainPayload | undefined) ?? {};
      if (payload.noTurn) return maybeAutoOpen(state);
      if (payload.gains) {
        const gains: Record<string, number> = { ...(run.resourcesGained ?? {}) };
        for (const [k, n] of Object.entries(payload.gains)) {
          gains[k] = (gains[k] ?? 0) + (Number(n) || 0);
        }
        return maybeAutoOpen({ ...state, runSummary: { ...run, resourcesGained: gains } } as GameState);
      }
      const length = payload.chainLength || payload.gained || 0;
      if (length <= 0) return maybeAutoOpen(state);
      const key = payload.key;
      const gained = payload.gained || 0;
      const upgrades = payload.upgrades || 0;
      const value = payload.value || 0;
      const coinGain = Math.max(1, Math.floor((gained * value) / 2));

      const resourcesGained: Record<string, number> = { ...(run.resourcesGained ?? {}) };
      if (key && gained > 0) {
        resourcesGained[key] = (resourcesGained[key] ?? 0) + gained;
      }

      const biggest = run.biggestChain;
      const nextBiggest: BiggestChainSnapshot = !biggest || length > biggest.count
        ? { count: length, key: key ?? null, coinGain, upgrades, gained }
        : biggest;

      const updated = {
        ...state,
        runSummary: {
          ...run,
          chainsPlayed: (run.chainsPlayed ?? 0) + 1,
          totalUpgrades: (run.totalUpgrades ?? 0) + upgrades,
          totalCoinGain: (run.totalCoinGain ?? 0) + coinGain,
          resourcesGained,
          biggestChain: nextBiggest,
        },
      } as GameState;
      return maybeAutoOpen(updated);
    }

    case "END_TURN": {
      return maybeAutoOpen(state);
    }

    case "STORY/BEAT_FIRED": {
      const run = s.runSummary;
      if (!run) return state;
      const payload = action.payload as BeatPayload | undefined;
      const fired = payload?.firedBeat;
      if (!fired?.id) return state;
      const entry: BeatTriggered = { id: fired.id, title: fired.title ?? null };
      if (run.beatsTriggered.some((b: BeatTriggered) => b.id === entry.id)) return state;
      return {
        ...state,
        runSummary: { ...run, beatsTriggered: [...run.beatsTriggered, entry] },
      } as GameState;
    }

    case "RUN_SUMMARY/OPEN": {
      const run: RunSummary = s.runSummary ?? emptyRun();
      const bondDeltas = diffBonds(run.bondsAtStart, snapshotBonds(state));
      return {
        ...state,
        runSummary: {
          ...run,
          open: true,
          bondDeltas,
        },
      } as GameState;
    }

    case "RUN_SUMMARY/CLOSE": {
      return { ...state, runSummary: emptyRun() } as GameState;
    }

    case "DEV/RESET_GAME": {
      return { ...state, runSummary: emptyRun() } as GameState;
    }

    default:
      return state;
  }
}
