import { describe, it, expect } from "vitest";
import { ITEMS } from "../constants.js";

describe("item.look", () => {
  it("tiles carry color/dark under look, never flat", () => {
    for (const [key, def] of Object.entries(ITEMS)) {
      if ((def as { kind?: string }).kind !== "tile") continue;
      expect((def as Record<string, unknown>).color, `${key} flat color`).toBeUndefined();
      expect((def as { look?: { color?: number } }).look?.color, `${key} look.color`).toBeTypeOf("number");
    }
  });
});
