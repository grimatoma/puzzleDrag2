import { describe, it, expect } from "vitest";
import { NPCS } from "../constants.js";

describe("npc.look", () => {
  it("every NPC carries color under look, never flat", () => {
    for (const [key, def] of Object.entries(NPCS)) {
      const row = def as Record<string, unknown>;
      const look = row.look as { color?: unknown } | undefined;

      expect(look, `${key} look present`).toBeTypeOf("object");
      expect(look?.color, `${key} look.color`).toBeTypeOf("string");
      expect(row.color, `${key} flat color should not survive`).toBeUndefined();
    }
  });
});
