import { describe, it, expect } from "vitest";
import { ACTION_TYPES } from "../types/actions.js";
import type { ChainCollectedAction, ToolFiredAction } from "../types/actionPayloads.js";
// Import the REAL slice-routing sets straight from state.ts rather than a
// hand-copied list. The old copy had silently drifted (it omitted
// SETTINGS/SET_TILE_ART_MODE, CIVIC/CLAIM, CIVIC/OPEN_CARE_PACKAGE and
// TOASTS/DISMISS) and only did a subset check, so the drift produced no
// failure. Importing the source makes drift impossible by construction; the
// remaining assertions verify the source itself stays coherent with the
// ACTION_TYPES catalog. See reference/docs/projects/24-test-suite-and-infra-review.html §1.
import { SLICE_PRIMARY_ACTIONS, ALWAYS_RUN_SLICES } from "../state.js";

const KNOWN = new Set<string>(ACTION_TYPES);

describe("ACTION_TYPES catalog", () => {
  it("includes every slice-primary and always-run action", () => {
    const missing = [...SLICE_PRIMARY_ACTIONS, ...ALWAYS_RUN_SLICES].filter((t) => !KNOWN.has(t));
    expect(missing, `slice-routed actions absent from ACTION_TYPES: ${missing.join(", ")}`).toEqual([]);
  });

  it("keeps the slice-primary and always-run sets disjoint", () => {
    const overlap = [...SLICE_PRIMARY_ACTIONS].filter((t) => ALWAYS_RUN_SLICES.has(t));
    expect(overlap, `actions in BOTH slice-routing sets: ${overlap.join(", ")}`).toEqual([]);
  });

  it("has no duplicates", () => {
    expect(new Set(ACTION_TYPES).size).toBe(ACTION_TYPES.length);
  });
});

describe("typed action payloads", () => {
  it("accepts bridge-shaped CHAIN_COLLECTED and TOOL_FIRED", () => {
    const chain: ChainCollectedAction = {
      type: "CHAIN_COLLECTED",
      payload: { key: "tile_grass_grass", gained: 3, chainLength: 3, value: 1 },
    };
    const tool: ToolFiredAction = { type: "TOOL_FIRED", key: "rake", row: 0, col: 1 };
    expect(chain.payload.resourceKey).toBeUndefined();
    expect(tool.row).toBe(0);
  });
});
