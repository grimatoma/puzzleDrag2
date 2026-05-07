import { describe, it, expect } from "vitest";
import { gameReducer, initialState } from "../state.js";

describe("tutorial skip", () => {
  it("TUTORIAL/SKIP deactivates the tutorial", () => {
    let state = initialState();
    state = { ...state, tutorial: { active: true, step: 0, seen: false }, modal: 'tutorial' };
    const next = gameReducer(state, { type: 'TUTORIAL/SKIP' });
    expect(next.tutorial.active).toBe(false);
    expect(next.tutorial.seen).toBe(true);
    expect(next.modal).toBeNull();
  });

  it("TUTORIAL/NEXT advances to the next step", () => {
    let state = initialState();
    state = { ...state, tutorial: { active: true, step: 0, seen: false }, modal: 'tutorial' };
    const next = gameReducer(state, { type: 'TUTORIAL/NEXT' });
    expect(next.tutorial.step).toBe(1);
  });
});
