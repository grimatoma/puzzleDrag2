import { describe, it, expect } from "vitest";
import { TYPE_WORKERS, TYPE_WORKER_MAP } from "./data.js";
import { PRODUCTION_LINES, lineStep } from "../../config/productionLines.js";

describe("worker roster", () => {
  it("has exactly one production-line worker per resource category", () => {
    for (const cat of Object.keys(PRODUCTION_LINES)) {
      const workers = TYPE_WORKERS.filter((w) =>
        w.abilities.some(
          (a) => a.id === "threshold_reduce_category" &&
            (a.params as { category?: string })?.category === cat,
        ),
      );
      expect(workers.length, cat).toBe(1);
    }
  });

  it("sets each worker's reduction amount to its step (scoped override or line default)", () => {
    // Zones-1&2 scope: Peasant's grass bulk-step (2) is overridden to 1 so each hire shaves
    // exactly one tile (cap math = chain − 3). Non-overridden lines use their line step.
    expect((TYPE_WORKER_MAP.peasant.abilities[0].params as { amount: number }).amount).toBe(1);
    expect((TYPE_WORKER_MAP.fisherman.abilities[0].params as { amount: number }).amount).toBe(lineStep("fish"));
  });

  it("keeps every worker id unique", () => {
    const ids = TYPE_WORKERS.map((w) => w.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
