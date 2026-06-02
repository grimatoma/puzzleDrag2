import { describe, it, expect } from "vitest";
import { HAZARDS } from "../features/mine/hazards.js";

describe("hazard look.icon", () => {
  it("every hazard has a non-empty look.icon string", () => {
    for (const h of HAZARDS) {
      expect(typeof h.look.icon, h.id).toBe("string");
      expect(h.look.icon.length, h.id).toBeGreaterThan(0);
    }
  });
});
