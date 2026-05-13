// src/smokeTests.js — Cross-phase smoke invariants for the in-game shim.
// These run at scene init via runSelfTests() as a lightweight (<50ms) console check.
// The comprehensive test suite lives in tests/phase-N-*.test.js (run via npm test).

import { createInitialState } from "./state.js";
import { INITIAL_STORY_STATE } from "./story.js";

export const SMOKE_INVARIANTS = [
  {
    name: "fresh state has no active farm run",
    check: () => createInitialState().farmRun === null,
  },
  {
    name: "fresh state has NPC roster with wren",
    check: () => {
      const s = createInitialState();
      return Array.isArray(s.npcs.roster) && s.npcs.roster.includes("wren");
    },
  },
  {
    name: "fresh state has bond 5 for Wren",
    check: () => createInitialState().npcs.bonds.wren === 5,
  },
  {
    name: "fresh state starts at story act 1, beat act1_arrival",
    check: () => {
      const s = createInitialState();
      return s.story.act === 1 && s.story.beat === "act1_arrival";
    },
  },
  {
    name: "INITIAL_STORY_STATE has no flags",
    check: () => Object.keys(INITIAL_STORY_STATE.flags).length === 0,
  },
  {
    name: "fresh state has hazards object with rats array",
    check: () => {
      const s = createInitialState();
      return s.hazards != null && Array.isArray(s.hazards.rats);
    },
  },
];
