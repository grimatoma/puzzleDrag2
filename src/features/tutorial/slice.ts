import { STORAGE_KEYS } from "../../constants.js";
import type { Action, GameState } from "../../types/state.js";
import { STEPS, TOTAL_STEPS, modalForStep } from "./steps.js";

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

function endTutorial(state: GameState): GameState {
  persistSeen();
  const tutorial = (state.tutorial ?? {}) as TutorialSubstate;
  return {
    ...state,
    tutorial: { ...tutorial, active: false, seen: true },
    // Only clear the modal if the wizard owned it — never stomp a real modal.
    modal: state.modal === 'tutorial' ? null : state.modal,
  };
}

function gotoStep(state: GameState, step: number): GameState {
  const tutorial = (state.tutorial ?? {}) as TutorialSubstate;
  return {
    ...state,
    tutorial: { ...tutorial, step },
    modal: modalForStep(step),
  };
}

function advanceStep(state: GameState): GameState {
  const tutorial = (state.tutorial ?? {}) as TutorialSubstate;
  const next = tutorial.step + 1;
  if (next >= TOTAL_STEPS) return endTutorial(state);
  return gotoStep(state, next);
}

export function reduce(state: GameState, action: Action): GameState {
  const tutorial = state.tutorial as TutorialSubstate | undefined;
  if (!tutorial) return state;

  // Auto-start on the player's very first meaningful action. Exclude meta/biome
  // actions that may fire before the player has a chance to see the board —
  // prevents spurious auto-start in tests and during biome-switch no-ops.
  const TUTORIAL_SKIP_ACTIONS = new Set(['@@INIT', 'SESSION_START', 'TUTORIAL/START', 'SET_BIOME', 'ADVANCE_SEASON']);
  if (
    !tutorial.seen &&
    !tutorial.active &&
    // Feature flag (lives in settings, survives a game reset): when the player
    // has disabled the tutorial it must never auto-start.
    !state.settings?.tutorialDisabled &&
    !TUTORIAL_SKIP_ACTIONS.has(action.type) &&
    state.modal === null
  ) {
    return {
      ...state,
      tutorial: { ...tutorial, active: true, step: 0 },
      modal: modalForStep(0),
    };
  }

  switch (action.type) {
    case 'TUTORIAL/START':
      return {
        ...state,
        tutorial: { ...tutorial, active: true, step: 0 },
        modal: modalForStep(0),
      };

    case 'TUTORIAL/NEXT':
      if (!tutorial.active) return state;
      return advanceStep(state);

    case 'TUTORIAL/PREV': {
      if (!tutorial.active) return state;
      const prev = Math.max(0, tutorial.step - 1);
      if (prev === tutorial.step) return state;
      return gotoStep(state, prev);
    }

    case 'TUTORIAL/SKIP':
      return endTutorial(state);

    default:
      break;
  }

  // Action-gated steps auto-advance when the player performs the real action
  // (collect a chain, build a building, craft a recipe, deliver an order).
  if (tutorial.active) {
    const current = STEPS[tutorial.step];
    if (current?.advanceOn && current.advanceOn === action.type) {
      return advanceStep(state);
    }
  }

  return state;
}
