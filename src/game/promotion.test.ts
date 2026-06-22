import { describe, it, expect } from "vitest";
import { PROMOTION_CHAINS, computePromotion } from "./promotion.js";
import { TYPE_WORKERS } from "../features/workers/data.js";

describe("computePromotion", () => {
  it("yields nothing when no redirect worker is hired", () => {
    expect(computePromotion({ chainRedirect: {} }, "grain", 12)).toBeNull();
  });
  it("awards the next-tier resource once the chain reaches the threshold", () => {
    const agg = { chainRedirect: { grain: { toCategory: "vegetables", threshold: 8, redirectShare: 1 } } };
    const r = computePromotion(agg, "grain", 12);
    expect(r).not.toBeNull();
    expect(r!.toCategory).toBe("vegetables");
    expect(r!.units).toBeGreaterThanOrEqual(1);
  });
  it("awards nothing below the (reduced) threshold", () => {
    const agg = { chainRedirect: { grain: { toCategory: "vegetables", threshold: 8, redirectShare: 1 } } };
    expect(computePromotion(agg, "grain", 5)).toBeNull();
  });
  it("declares a promotion step for each configured line", () => {
    expect(PROMOTION_CHAINS.grain).toBe("vegetables");
    expect(PROMOTION_CHAINS.bird).toBe("herd_animals");
  });
});

describe("PROMOTION_WORKER_META consistency (via TYPE_WORKERS)", () => {
  // Filter TYPE_WORKERS to those that carry a chain_redirect_category ability
  const promotionWorkers = TYPE_WORKERS.filter((w) =>
    w.abilities.some((a) => a.id === "chain_redirect_category"),
  );

  it("has at least one promotion worker", () => {
    expect(promotionWorkers.length).toBeGreaterThan(0);
  });

  it("every promoter's fromCategory exists as a key in PROMOTION_CHAINS", () => {
    for (const w of promotionWorkers) {
      for (const ability of w.abilities) {
        if (ability.id !== "chain_redirect_category") continue;
        const { fromCategory } = ability.params as { fromCategory: string; toCategory: string };
        expect(
          Object.prototype.hasOwnProperty.call(PROMOTION_CHAINS, fromCategory),
          `worker "${w.id}" fromCategory "${fromCategory}" not in PROMOTION_CHAINS`,
        ).toBe(true);
      }
    }
  });

  it("every promoter's toCategory equals PROMOTION_CHAINS[fromCategory]", () => {
    for (const w of promotionWorkers) {
      for (const ability of w.abilities) {
        if (ability.id !== "chain_redirect_category") continue;
        const { fromCategory, toCategory } = ability.params as { fromCategory: string; toCategory: string };
        expect(
          toCategory,
          `worker "${w.id}" toCategory "${toCategory}" should be PROMOTION_CHAINS["${fromCategory}"]`,
        ).toBe(PROMOTION_CHAINS[fromCategory]);
      }
    }
  });
});
