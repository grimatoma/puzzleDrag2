import { describe, it, expect } from "vitest";
import { ITEMS } from "../constants.js";

const FLAT_APPEARANCE_FIELDS = ["color", "dark", "iconKey", "anim", "ms", "sway"] as const;

describe("item.look", () => {
  it("tiles carry color/dark under look, never flat", () => {
    for (const [key, def] of Object.entries(ITEMS)) {
      if ((def as { kind?: string }).kind !== "tile") continue;
      expect((def as Record<string, unknown>).color, `${key} flat color`).toBeUndefined();
      expect((def as { look?: { color?: number } }).look?.color, `${key} look.color`).toBeTypeOf("number");
    }
  });

  it("tiles and resources carry appearance under look, never flat", () => {
    for (const [key, def] of Object.entries(ITEMS)) {
      const kind = (def as { kind?: string }).kind;
      if (kind !== "tile" && kind !== "resource") continue;
      const row = def as Record<string, unknown>;
      const look = row.look as { color?: unknown; dark?: unknown } | undefined;

      expect(look, `${key} (${kind}) look present`).toBeTypeOf("object");
      expect(look?.color, `${key} (${kind}) look.color`).toBeTypeOf("number");
      expect(look?.dark, `${key} (${kind}) look.dark`).toBeTypeOf("number");

      for (const field of FLAT_APPEARANCE_FIELDS) {
        expect(row[field], `${key} (${kind}) flat ${field} should not survive`).toBeUndefined();
      }
    }
  });

  it("tools keep look optional, but never carry flat appearance fields", () => {
    for (const [key, def] of Object.entries(ITEMS)) {
      if ((def as { kind?: string }).kind !== "tool") continue;
      const row = def as Record<string, unknown>;
      const look = row.look as { color?: unknown; dark?: unknown } | undefined;

      if (look !== undefined) {
        expect(look, `${key} (tool) look is object`).toBeTypeOf("object");
        if (look.color !== undefined) {
          expect(look.color, `${key} (tool) look.color`).toBeTypeOf("number");
        }
        if (look.dark !== undefined) {
          expect(look.dark, `${key} (tool) look.dark`).toBeTypeOf("number");
        }
      }

      // power.* may legitimately contain anim/ms — do NOT assert against it.
      for (const field of ["color", "dark", "iconKey", "anim", "ms"] as const) {
        expect(row[field], `${key} (tool) flat ${field} should not survive`).toBeUndefined();
      }
    }
  });
});
