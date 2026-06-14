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

  it("TUTORIAL/PREV walks back to the previous step", () => {
    let state = initialState();
    state = { ...state, tutorial: { active: true, step: 2, seen: false }, modal: 'tutorial' };
    const next = gameReducer(state, { type: 'TUTORIAL/PREV' });
    expect(next.tutorial.step).toBe(1);
  });

  it("TUTORIAL/PREV is a no-op at step 0", () => {
    let state = initialState();
    state = { ...state, tutorial: { active: true, step: 0, seen: false }, modal: 'tutorial' };
    const next = gameReducer(state, { type: 'TUTORIAL/PREV' });
    expect(next.tutorial.step).toBe(0);
  });

  it("TUTORIAL/PREV onto a spotlight step clears the modal so the highlighted UI stays clickable", () => {
    let state = initialState();
    // Steps 1 and 2 are spotlight steps (no blocking modal). Stepping back from
    // 2 → 1 should leave the modal null so the spotlighted element is interactive.
    state = { ...state, tutorial: { active: true, step: 2, seen: false }, modal: 'tutorial' };
    const next = gameReducer(state, { type: 'TUTORIAL/PREV' });
    expect(next.tutorial.step).toBe(1);
    expect(next.modal).toBeNull();
  });
});
