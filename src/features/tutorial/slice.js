function loadSeen() {
  try {
    return localStorage.getItem('hearth.tutorial.seen') === '1';
  } catch (_) {
    return false;
  }
}

function persistSeen() {
  try {
    localStorage.setItem('hearth.tutorial.seen', '1');
  } catch (_) {}
}

export const initial = {
  tutorial: { active: false, step: 0, seen: loadSeen() },
};

const TOTAL_STEPS = 6;

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
  };
}

export function reduce(state, action) {
  if (!state.tutorial) return state;

  // Auto-start on very first action
  if (
    !state.tutorial.seen &&
    !state.tutorial.active &&
    action.type !== '@@INIT' &&
    action.type !== 'TUTORIAL/START' &&
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
