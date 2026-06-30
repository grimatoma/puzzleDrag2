import type { Action, GameState } from "../../types/state.js";
import type { Toast } from "./data.js";

interface ToastsSubstate {
  toasts: Toast[];
}

export const initial: ToastsSubstate = {
  toasts: [],
};

export function reduce(state: GameState, action: Action): GameState {
  switch (action.type) {
    case "TOASTS/DISMISS": {
      const { id } = action;
      const toasts = state.toasts ?? [];
      if (!toasts.some((t) => t.id === id)) return state;
      return { ...state, toasts: toasts.filter((t) => t.id !== id) };
    }
    default:
      return state;
  }
}
