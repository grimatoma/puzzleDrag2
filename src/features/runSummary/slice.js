function emptyRun() {
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

function snapshotBonds(state) {
  const bonds = state.npcs?.bonds;
  if (!bonds || typeof bonds !== "object") return {};
  return { ...bonds };
}

function diffBonds(start, end) {
  if (!start || !end) return {};
  const out = {};
  const keys = new Set([...Object.keys(start), ...Object.keys(end)]);
  for (const k of keys) {
    const a = Number(start[k] ?? 0);
    const b = Number(end[k] ?? 0);
    const d = b - a;
    if (Math.abs(d) >= 0.05) out[k] = Math.round(d * 10) / 10;
  }
  return out;
}

function maybeAutoOpen(state) {
  const run = state.runSummary;
  if (!run || run.open) return state;
  if (state.modal !== "season") return state;
  const bondDeltas = diffBonds(run.bondsAtStart, snapshotBonds(state));
  return {
    ...state,
    runSummary: { ...run, open: true, bondDeltas },
  };
}

function startFreshRun(state, { biome, zoneId, mode, supply, fertilizerUsed }) {
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

export function reduce(state, action) {
  switch (action.type) {
    case "FARM/ENTER": {
      if (!state.farmRun) return state;
      return startFreshRun(state, {
        biome: state.biomeKey,
        zoneId: state.farmRun.zoneId,
        mode: state.farmRun.mode ?? "normal",
        fertilizerUsed: !!state.session?.fertilizerUsed,
      });
    }

    case "EXPEDITION/DEPART": {
      if (!state.farmRun) return state;
      return startFreshRun(state, {
        biome: state.biomeKey,
        zoneId: state.farmRun.zoneId,
        mode: state.farmRun.mode ?? "expedition",
        supply: state.session?.expedition?.supply,
      });
    }

    case "CHAIN_COLLECTED": {
      const run = state.runSummary;
      if (!run) return maybeAutoOpen(state);
      const payload = action.payload ?? {};
      if (payload.noTurn) return maybeAutoOpen(state);
      if (payload.gains) {
        const gains = { ...(run.resourcesGained ?? {}) };
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
      const coinGain = Math.max(1, Math.floor((gained * value) / 2));

      const resourcesGained = { ...(run.resourcesGained ?? {}) };
      if (key && gained > 0) {
        resourcesGained[key] = (resourcesGained[key] ?? 0) + gained;
      }

      const biggest = run.biggestChain;
      const nextBiggest = !biggest || length > biggest.count
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
      };
      return maybeAutoOpen(updated);
    }

    case "END_TURN": {
      return maybeAutoOpen(state);
    }

    case "STORY/BEAT_FIRED": {
      const run = state.runSummary;
      if (!run) return state;
      const fired = action.payload?.firedBeat;
      if (!fired?.id) return state;
      const entry = { id: fired.id, title: fired.title ?? null };
      if (run.beatsTriggered.some((b) => b.id === entry.id)) return state;
      return {
        ...state,
        runSummary: { ...run, beatsTriggered: [...run.beatsTriggered, entry] },
      };
    }

    case "RUN_SUMMARY/OPEN": {
      const run = state.runSummary ?? emptyRun();
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
