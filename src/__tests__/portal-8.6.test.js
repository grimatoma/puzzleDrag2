import { describe, it, expect } from "vitest";
import { MAGIC_TOOLS } from "../features/portal/data.js";
import { createInitialState, rootReducer } from "../state.js";

describe("8.6 — Magic Portal summons", () => {
  it("all 4 magic tools registered", () => {
    const ids = MAGIC_TOOLS.map((t) => t.id);
    expect(ids.length).toBe(4);
    expect(ids.includes("magic_wand")).toBe(true);
    expect(ids.includes("hourglass")).toBe(true);
    expect(ids.includes("magic_seed")).toBe(true);
    expect(ids.includes("magic_fertilizer")).toBe(true);
  });

  it("magic_wand costs 80 influence", () => {
    expect(MAGIC_TOOLS.find((t) => t.id === "magic_wand").influenceCost).toBe(80);
  });

  it("hourglass costs 120 influence", () => {
    expect(MAGIC_TOOLS.find((t) => t.id === "hourglass").influenceCost).toBe(120);
  });

  it("magic_seed costs 100 influence", () => {
    expect(MAGIC_TOOLS.find((t) => t.id === "magic_seed").influenceCost).toBe(100);
  });

  it("magic_fertilizer costs 60 influence", () => {
    expect(MAGIC_TOOLS.find((t) => t.id === "magic_fertilizer").influenceCost).toBe(60);
  });

  it("SUMMON_MAGIC_TOOL: no-op when influence < cost", () => {
    const s0 = { ...createInitialState(), built: { portal: true }, influence: 50 };
    const r0 = rootReducer(s0, {
      type: "SUMMON_MAGIC_TOOL",
      payload: { id: "magic_wand" },
    });
    expect(r0.influence).toBe(50);
    expect(r0.tools?.magic_wand ?? 0).toBe(0);
  });

  it("SUMMON_MAGIC_TOOL: deducts influence and grants tool", () => {
    const s1 = { ...createInitialState(), built: { portal: true }, influence: 200 };
    const r1 = rootReducer(s1, {
      type: "SUMMON_MAGIC_TOOL",
      payload: { id: "magic_wand" },
    });
    expect(r1.influence).toBe(120);
    expect(r1.tools.magic_wand).toBe(1);
  });

  it("USE_TOOL hourglass with no snapshot does not consume the tool", () => {
    const s2 = {
      ...createInitialState(),
      built: { portal: true },
      influence: 200,
      lastChainSnapshot: null,
      tools: { ...createInitialState().tools, hourglass: 1 },
    };
    const r2 = rootReducer(s2, {
      type: "USE_TOOL",
      payload: { id: "hourglass" },
    });
    expect(r2.tools.hourglass ?? 0).toBe(s2.tools.hourglass);
  });

  it("USE_TOOL magic_seed: adds 5 turns to active farmRun, consumes tool", () => {
    const s3 = {
      ...createInitialState(),
      tools: { ...createInitialState().tools, magic_seed: 1 },
      farmRun: { zoneId: "home", turnBudget: 10, turnsRemaining: 4, startedAt: 1 },
    };
    const r3 = rootReducer(s3, {
      type: "USE_TOOL",
      payload: { id: "magic_seed" },
    });
    expect(r3.farmRun.turnBudget).toBe(15);
    expect(r3.farmRun.turnsRemaining).toBe(9);
    expect(r3.tools.magic_seed).toBe(0);
  });

  it("USE_TOOL magic_fertilizer: sets 3 charges, consumes tool", () => {
    const s4 = {
      ...createInitialState(),
      tools: { ...createInitialState().tools, magic_fertilizer: 1 },
    };
    const r4 = rootReducer(s4, {
      type: "USE_TOOL",
      payload: { id: "magic_fertilizer" },
    });
    expect(r4.magicFertilizerCharges).toBe(3);
    expect(r4.tools.magic_fertilizer).toBe(0);
  });

  it("USE_TOOL magic_wand: decrements tool count and sets toolPending", () => {
    const s5 = {
      ...createInitialState(),
      tools: { ...createInitialState().tools, magic_wand: 1 },
    };
    const r5 = rootReducer(s5, {
      type: "USE_TOOL",
      payload: { id: "magic_wand" },
    });
    expect(r5.tools.magic_wand).toBe(0);
    expect(r5.toolPending).toBe("magic_wand");
  });

  it("USE_TOOL magic_wand: no-op when count is 0", () => {
    const s6 = {
      ...createInitialState(),
      tools: { ...createInitialState().tools, magic_wand: 0 },
    };
    const r6 = rootReducer(s6, {
      type: "USE_TOOL",
      payload: { id: "magic_wand" },
    });
    expect(r6.tools.magic_wand).toBe(0);
    expect(r6.toolPending ?? null).toBeNull();
  });
});
