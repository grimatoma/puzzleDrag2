import { describe, it, expect } from "vitest";
import { createInitialState, rootReducer } from "../state.js";
import { STEPS } from "../features/tutorial/steps.js";
import { ACTION_TYPES } from "../types/actions.js";
import type { Action, GameState } from "../types/state.js";

// ── The tutorial-advance routing footgun ────────────────────────────────────
//
// Action-gated tutorial steps auto-advance when their `advanceOn` action fires
// (slice.ts). But the tutorial slice only runs if state.ts routes the action to
// the slices — and the router SKIPS slices when the core reducer returns the
// same state reference AND the action is neither slice-primary nor always-run
// (the "#1 footgun" in CLAUDE.md). The existing coverage calls the tutorial
// slice directly, so it can't catch a routing regression. These tests dispatch
// through the REAL rootReducer to prove each advanceOn action genuinely reaches
// the slice.

const stepIndex = (id: string): number => {
  const i = STEPS.findIndex((s) => s.id === id);
  if (i < 0) throw new Error(`no tutorial step "${id}"`);
  return i;
};

/** A fresh game with the wizard parked, active, on a given step. */
function atStep(step: number, extra: Partial<GameState> = {}): GameState {
  const base = createInitialState();
  return {
    ...base,
    // active:true bypasses the auto-start branch so we test ADVANCE, not start.
    tutorial: { active: true, step, seen: true },
    ...extra,
  } as GameState;
}

describe("tutorial advance survives the full-reducer routing", () => {
  it("CHAIN_COLLECTED (core-mutating path) reaches the slice and advances the puzzle step", () => {
    const puzzle = stepIndex("puzzle"); // advanceOn: CHAIN_COLLECTED
    const s0 = atStep(puzzle);
    const s1 = rootReducer(s0, {
      type: "CHAIN_COLLECTED",
      payload: { key: "tile_grass_grass", gained: 3, chainLength: 3, value: 1 },
    } as Action);
    expect((s1.tutorial as { step: number }).step).toBe(puzzle + 1);
  });

  it("CRAFTING/CRAFT_RECIPE (always-run path) reaches the slice on a payable craft", () => {
    const base = createInitialState();
    const craft = stepIndex("craft"); // advanceOn: CRAFTING/CRAFT_RECIPE
    // rec_rake needs a Workshop + 1 plank. With those present the craft is
    // payable, so shouldAlwaysRunSlices() lets the wizard advance even though the
    // core CRAFTING handler may return the same reference (no story beat fires).
    const builtHome = { ...((base.built?.home as Record<string, unknown>) ?? {}), workshop: true };
    const invHome = { ...((base.inventory as Record<string, Record<string, number>>).home ?? {}), plank: 1 };
    const s0 = {
      ...base,
      tutorial: { active: true, step: craft, seen: true },
      built: { ...base.built, home: builtHome },
      inventory: { ...base.inventory, home: invHome },
    } as GameState;
    const s1 = rootReducer(s0, {
      type: "CRAFTING/CRAFT_RECIPE",
      recipeKey: "rec_rake",
    } as Action);
    expect((s1.tutorial as { step: number }).step).toBe(craft + 1);
    expect((s1.tools as Record<string, number>).rake).toBe(1); // the craft really happened
  });

  it("a non-payable CRAFTING does not advance the wizard (always-run is gated on payability)", () => {
    const craft = stepIndex("craft");
    const s0 = atStep(craft); // no workshop, no plank → unpayable
    const s1 = rootReducer(s0, {
      type: "CRAFTING/CRAFT_RECIPE",
      recipeKey: "rec_rake",
    } as Action);
    expect((s1.tutorial as { step: number }).step).toBe(craft);
  });

  it("a non-advancing action does not move the wizard", () => {
    const puzzle = stepIndex("puzzle");
    const s0 = atStep(puzzle);
    const s1 = rootReducer(s0, { type: "SET_VIEW", view: "town" } as Action);
    expect((s1.tutorial as { step: number }).step).toBe(puzzle);
  });
});

describe("tutorial step data integrity", () => {
  it("every action-gated step's advanceOn is a registered ActionType", () => {
    const known = new Set<string>(ACTION_TYPES as readonly string[]);
    for (const step of STEPS) {
      if (!step.advanceOn) continue;
      expect(known.has(step.advanceOn), `unknown advanceOn "${step.advanceOn}" on step "${step.id}"`).toBe(true);
    }
  });
});
