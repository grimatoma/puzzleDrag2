import { LONGNIGHT_WAVES } from './data.js';

export const initial = {
  longnight: {
    active: false,
    wave: 0,
    timeLeft: 0,
    lost: false,
    won: false,
    completedYears: 0,
    pending: false,
    _winterEnds: 0,
    lostBuilding: null,
  },
};

function canPay(inventory, cost) {
  return Object.entries(cost).every(([k, v]) => (inventory[k] || 0) >= v);
}

function deductCost(inventory, cost) {
  const inv = { ...inventory };
  Object.entries(cost).forEach(([k, v]) => { inv[k] = (inv[k] || 0) - v; });
  return inv;
}

function pickLostBuilding(built) {
  const keys = Object.keys(built).filter(k => k !== 'hearth' && built[k]);
  if (!keys.length) return null;
  return keys[Math.floor(Math.random() * keys.length)];
}

export function reduce(state, action) {
  switch (action.type) {
    case 'LONGNIGHT/START': {
      const wave = LONGNIGHT_WAVES[0];
      return {
        ...state,
        modal: 'longnight',
        longnight: {
          ...state.longnight,
          active: true,
          wave: 1,
          timeLeft: wave.time,
          lost: false,
          won: false,
          lostBuilding: null,
          pending: false,
        },
      };
    }

    case 'LONGNIGHT/TICK': {
      const ln = state.longnight;
      if (!ln.active || ln.won || ln.lost) return state;
      const timeLeft = ln.timeLeft - 1;
      if (timeLeft <= 0) {
        // Timer expired — auto-fail
        return reduce({ ...state, longnight: { ...ln, timeLeft: 0 } }, { type: 'LONGNIGHT/FAIL' });
      }
      return { ...state, longnight: { ...ln, timeLeft } };
    }

    case 'LONGNIGHT/PAY': {
      const ln = state.longnight;
      if (!ln.active || ln.won || ln.lost) return state;
      const waveData = LONGNIGHT_WAVES[ln.wave - 1];
      if (!waveData) return state;
      if (!canPay(state.inventory, waveData.cost)) return state;

      const inventory = deductCost(state.inventory, waveData.cost);
      const isLast = ln.wave >= LONGNIGHT_WAVES.length;

      if (isLast) {
        return {
          ...state,
          inventory,
          longnight: {
            ...ln,
            active: false,
            won: true,
            completedYears: ln.completedYears + 1,
          },
          coins: (state.coins || 0) + 200,
        };
      }

      const nextWave = LONGNIGHT_WAVES[ln.wave];
      return {
        ...state,
        inventory,
        longnight: {
          ...ln,
          wave: ln.wave + 1,
          timeLeft: nextWave.time,
        },
      };
    }

    case 'LONGNIGHT/FAIL': {
      const ln = state.longnight;
      if (!ln.active || ln.won || ln.lost) return state;
      const lostKey = pickLostBuilding(state.built || {});
      const built = lostKey ? { ...state.built } : { ...state.built };
      if (lostKey) delete built[lostKey];
      const buildingName = lostKey
        ? lostKey.charAt(0).toUpperCase() + lostKey.slice(1)
        : null;
      return {
        ...state,
        built,
        longnight: { ...ln, active: false, lost: true, lostBuilding: buildingName },
        bubble: buildingName
          ? { id: Date.now(), npc: 'mira', text: `The dark took the ${buildingName}...`, ms: 3000 }
          : { id: Date.now(), npc: 'mira', text: 'The night was too long...', ms: 3000 },
      };
    }

    case 'LONGNIGHT/CLOSE': {
      return {
        ...state,
        modal: state.modal === 'longnight' ? null : state.modal,
        longnight: {
          ...state.longnight,
          active: false,
          wave: 0,
          timeLeft: 0,
          lost: false,
          won: false,
          lostBuilding: null,
        },
      };
    }

    case 'CLOSE_SEASON': {
      const winterEnds = (state.longnight._winterEnds || 0) + 1;
      const shouldTrigger = winterEnds % 4 === 0 && !state.longnight.active && !state.longnight.pending;
      return {
        ...state,
        longnight: {
          ...state.longnight,
          _winterEnds: winterEnds,
          pending: shouldTrigger ? true : state.longnight.pending,
        },
      };
    }

    default:
      return state;
  }
}
