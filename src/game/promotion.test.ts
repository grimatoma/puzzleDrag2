import { describe, it, expect } from "vitest";
import { PROMOTION_CHAINS, computePromotion } from "./promotion.js";

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
