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

function snapshotBonds(state: GameState): Record<string, number> {
  const bonds = state.npcs.bonds;
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
  const run = state.runSummary;
  if (!run || run.open) return state;
  if (state.modal !== "season") return state;
  const bondDeltas = diffBonds(run.bondsAtStart, snapshotBonds(state));
  return {
    ...state,
    runSummary: { ...run, open: true, bondDeltas },
  };
}

interface StartArgs {
  biome?: string | null;
  zoneId?: string | null;
  mode?: string | null;
  supply?: Record<string, number> | null;
  fertilizerUsed?: boolean;
}

function startFreshRun(state: GameState, { biome, zoneId, mode, supply, fertilizerUsed }: StartArgs): GameState {
  const fresh = emptyRun();
  fresh.biome = biome ?? state.biomeKey ?? state.biome ?? null;
  fresh.zoneId = zoneId ?? state.activeZone ?? state.mapCurrent ?? null;
  fresh.mode = mode ?? null;
  fresh.turnsAtStart = state.farmRun?.turnBudget ?? state.farmRun?.turnsRemaining ?? 0;
  fresh.bondsAtStart = snapshotBonds(state);
  fresh.suppliesConsumed = supply ? { ...supply } : {};
  fresh.fertilizerUsed = !!fertilizerUsed;
  return { ...state, runSummary: fresh };
}

export function reduce(state: GameState, action: Action): GameState {
  switch (action.type) {
    case "FARM/ENTER": {
      if (!state.farmRun) return state;
      return startFreshRun(state, {
        biome: state.biomeKey,
        zoneId: state.farmRun.zoneId,
        mode: state.farmRun.mode ?? "normal",
        fertilizerUsed: !!state.session.fertilizerUsed,
      });
    }

    case "EXPEDITION/DEPART": {
      if (!state.farmRun) return state;
      return startFreshRun(state, {
        biome: state.biomeKey,
        zoneId: state.farmRun.zoneId,
        mode: state.farmRun.mode ?? "expedition",
        supply: state.session.expedition?.supply,
      });
    }

    case "CHAIN_COLLECTED": {
      const run = state.runSummary;
      if (!run) return maybeAutoOpen(state);
      const payload = action.payload;
      if (payload.noTurn) return maybeAutoOpen(state);
      if (payload.gains) {
        const gains: Record<string, number> = { ...(run.resourcesGained ?? {}) };
        for (const [k, n] of Object.entries(payload.gains)) {
          gains[k] = (gains[k] ?? 0) + (Number(n) || 0);
        }
        return maybeAutoOpen({ ...state, runSummary: { ...run, resourcesGained: gains } });
      }
      const length = payload.chainLength || payload.gained || 0;
      if (length <= 0) return maybeAutoOpen(state);
      const key = payload.key;
      const gained = payload.gained || 0;
      const upgrades = payload.upgrades || 0;
      const value = payload.value || 0;
      // Mirror the board's base chain payout (state.ts: floor(gained * value)).
      // The economy pass raised that ~2x (was /2); keep this in step so the run
      // summary doesn't under-report. The per-tile coin hook + boon multiplier
      // aren't in this payload, so this is the base figure, not the exact total.
      const coinGain = Math.max(1, Math.floor(gained * value));

      const resourcesGained: Record<string, number> = { ...(run.resourcesGained ?? {}) };
      if (key && gained > 0) {
        resourcesGained[key] = (resourcesGained[key] ?? 0) + gained;
      }

      const biggest = run.biggestChain;
      const nextBiggest: BiggestChainSnapshot = !biggest || length > biggest.count
        ? { count: length, key: key ?? null, coinGain, upgrades, gained }
        : biggest;

      const updated: GameState = {
        ...state,
        runSummary: {
          ...run,
          chainsPlayed: (run.chainsPlayed ?? 0) + 1,
          totalUpgrades: (run.totalUpgrades ?? 0) + upgrades,
          totalCoinGain: (run.totalCoinGain ?? 0) + coinGain,
          resourcesGained,
          biggestChain: nextBiggest,
        },
      };
      return maybeAutoOpen(updated);
    }

    case "END_TURN": {
      return maybeAutoOpen(state);
    }

    case "STORY/BEAT_FIRED": {
      const run = state.runSummary;
      if (!run) return state;
      const fired = action.payload.firedBeat as { id?: string; title?: string | null } | undefined;
      if (!fired?.id) return state;
      const entry: BeatTriggered = { id: fired.id, title: fired.title ?? null };
      if (run.beatsTriggered.some((b: BeatTriggered) => b.id === entry.id)) return state;
      return {
        ...state,
        runSummary: { ...run, beatsTriggered: [...run.beatsTriggered, entry] },
      };
    }

    case "RUN_SUMMARY/OPEN": {
      const run: RunSummary = state.runSummary ?? emptyRun();
      const bondDeltas = diffBonds(run.bondsAtStart, snapshotBonds(state));
      return {
        ...state,
        runSummary: {
          ...run,
          open: true,
          bondDeltas,
        },
      };
    }

    case "RUN_SUMMARY/CLOSE": {
      return { ...state, runSummary: emptyRun() };
    }

    case "DEV/RESET_GAME": {
      return { ...state, runSummary: emptyRun() };
    }

    default:
      return state;
  }
}
