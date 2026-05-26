import { describe, it, expect } from "vitest";
import { normalizeHazardId } from "../config/hazardIds.js";
import { rootReducer, createInitialState } from "../state.js";

describe("normalizeHazardId", () => {
  it("maps snake_case Dev Panel ids to runtime keys", () => {
    expect(normalizeHazardId("cave_in")).toBe("caveIn");
    expect(normalizeHazardId("gas_vent")).toBe("gasVent");
    expect(normalizeHazardId("rats")).toBe("rats");
  });
});

describe("clear_hazard via tool power", () => {
  it("clears caveIn when param uses cave_in", () => {
    const s0 = {
      ...createInitialState(),
      biome: "mine",
      hazards: { ...(createInitialState().hazards ?? {}), caveIn: { cells: [{ row: 0, col: 0 }] } },
      tools: { explosives: 1 },
    };
    const s1 = rootReducer(s0, {
      type: "USE_TOOL",
      payload: { id: "explosives" },
    });
    expect(s1.hazards?.caveIn).toBeFalsy();
  });
});
