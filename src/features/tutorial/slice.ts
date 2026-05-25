import { STORAGE_KEYS } from "../../constants.js";

function loadSeen() {
  try {
    return localStorage.getItem(STORAGE_KEYS.tutorialSeen) === '1';
  } catch {
    return false;
  }
}

function persistSeen() {
  try {
    localStorage.setItem(STORAGE_KEYS.tutorialSeen, '1');
  } catch { /* storage unavailable */ }
}

export const initial = {
  tutorial: { active: false, step: 0, seen: loadSeen() },
};

const TOTAL_STEPS = 6;
// Steps that show a corner toast and require board interaction (no screen block)
const CORNER_STEPS = new Set([1, 3, 4]);

function endTutorial(state) {
  persistSeen();
  return {
    ...state,
    tutorial: { ...state.tutorial, active: false, seen: true },
    modal: null,
  };
}

function advanceStep(state) {
  const next = state.tutorial.step + 1;
  if (next >= TOTAL_STEPS) {
    return endTutorial(state);
  }
  return {
    ...state,
    tutorial: { ...state.tutorial, step: next },
    modal: CORNER_STEPS.has(next) ? null : 'tutorial',
  };
}

export function reduce(state, action) {
  if (!state.tutorial) return state;

  // Auto-start on very first action (exclude meta/biome actions that may fire before
  // the player has a chance to see the board — prevents spurious auto-start in tests
  // and during biome-switch no-ops).
  const TUTORIAL_SKIP_ACTIONS = new Set(['@@INIT', 'SESSION_START', 'TUTORIAL/START', 'SET_BIOME', 'ADVANCE_SEASON']);
  if (
    !state.tutorial.seen &&
    !state.tutorial.active &&
    !TUTORIAL_SKIP_ACTIONS.has(action.type) &&
    state.modal === null
  ) {
    return {
      ...state,
      tutorial: { ...state.tutorial, active: true, step: 0 },
      modal: 'tutorial',
    };
  }

  switch (action.type) {
    case 'TUTORIAL/START':
      return {
        ...state,
        tutorial: { ...state.tutorial, active: true, step: 0 },
        modal: 'tutorial',
      };

    case 'TUTORIAL/NEXT':
      return advanceStep(state);

    case 'TUTORIAL/PREV': {
      if (!state.tutorial.active) return state;
      const prev = Math.max(0, state.tutorial.step - 1);
      if (prev === state.tutorial.step) return state;
      return {
        ...state,
        tutorial: { ...state.tutorial, step: prev },
        modal: CORNER_STEPS.has(prev) ? null : 'tutorial',
      };
    }

    case 'TUTORIAL/SKIP':
      return endTutorial(state);

    case 'CHAIN_COLLECTED':
      if (state.tutorial.active && state.tutorial.step === 1) {
        return advanceStep(state);
      }
      return state;

    case 'TURN_IN_ORDER':
      if (state.tutorial.active && state.tutorial.step === 3) {
        return advanceStep(state);
      }
      return state;

    case 'SET_VIEW':
      if (state.tutorial.active && state.tutorial.step === 4 && action.view === 'town') {
        return advanceStep(state);
      }
      return state;

    default:
      return state;
  }
}
