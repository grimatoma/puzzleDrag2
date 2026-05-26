import { STORAGE_KEYS } from "../../constants.js";
import type { Action, GameState } from "../../types/state.js";

interface TutorialSubstate {
  active: boolean;
  step: number;
  seen: boolean;
}

function loadSeen(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEYS.tutorialSeen) === '1';
  } catch {
    return false;
  }
}

function persistSeen(): void {
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

function endTutorial(state: GameState): GameState {
  persistSeen();
  const tutorial = (state.tutorial ?? {}) as TutorialSubstate;
  return {
    ...state,
    tutorial: { ...tutorial, active: false, seen: true },
    modal: null,
  };
}

function advanceStep(state: GameState): GameState {
  const tutorial = (state.tutorial ?? {}) as TutorialSubstate;
  const next = tutorial.step + 1;
  if (next >= TOTAL_STEPS) {
    return endTutorial(state);
  }
  return {
    ...state,
    tutorial: { ...tutorial, step: next },
    modal: CORNER_STEPS.has(next) ? null : 'tutorial',
  };
}

export function reduce(state: GameState, action: Action): GameState {
  const tutorial = state.tutorial as TutorialSubstate | undefined;
  if (!tutorial) return state;

  // Auto-start on very first action (exclude meta/biome actions that may fire before
  // the player has a chance to see the board — prevents spurious auto-start in tests
  // and during biome-switch no-ops).
  const TUTORIAL_SKIP_ACTIONS = new Set(['@@INIT', 'SESSION_START', 'TUTORIAL/START', 'SET_BIOME', 'ADVANCE_SEASON']);
  if (
    !tutorial.seen &&
    !tutorial.active &&
    !TUTORIAL_SKIP_ACTIONS.has(action.type) &&
    state.modal === null
  ) {
    return {
      ...state,
      tutorial: { ...tutorial, active: true, step: 0 },
      modal: 'tutorial',
    };
  }

  switch (action.type) {
    case 'TUTORIAL/START':
      return {
        ...state,
        tutorial: { ...tutorial, active: true, step: 0 },
        modal: 'tutorial',
      };

    case 'TUTORIAL/NEXT':
      return advanceStep(state);

    case 'TUTORIAL/PREV': {
      if (!tutorial.active) return state;
      const prev = Math.max(0, tutorial.step - 1);
      if (prev === tutorial.step) return state;
      return {
        ...state,
        tutorial: { ...tutorial, step: prev },
        modal: CORNER_STEPS.has(prev) ? null : 'tutorial',
      };
    }

    case 'TUTORIAL/SKIP':
      return endTutorial(state);

    case 'CHAIN_COLLECTED':
      if (tutorial.active && tutorial.step === 1) {
        return advanceStep(state);
      }
      return state;

    case 'TURN_IN_ORDER':
      if (tutorial.active && tutorial.step === 3) {
        return advanceStep(state);
      }
      return state;

    case 'SET_VIEW':
      if (tutorial.active && tutorial.step === 4 && action.view === 'town') {
        return advanceStep(state);
      }
      return state;

    default:
      return state;
  }
}
