import { describe, it, expect } from "vitest";
import { producedResource } from "../game/producedResource.js";
import { getObtainableResources } from "../game/obtainable.js";
import { RECIPES } from "../constants.js";

// Health review #1. The blackberry tile used to declare `next: "jam"` while the
// runtime produced `pie` (the fruit-family resource), and nothing produced jam at
// all — so the craft_jam quest was uncompletable and every jam-consuming recipe
// had no real source. Fix: blackberry honestly declares pie, and a rec_jam larder
// recipe makes jam a genuine crafted good.
describe("blackberry / jam (#1)", () => {
  it("blackberry tile honestly produces pie (matches the fruit family)", () => {
    expect(producedResource({ key: "tile_fruit_blackberry" })).toBe("pie");
  });

  it("jam has a real recipe producer so it is craftable (craft_jam quest completable)", () => {
    const jamRecipes = (Object.values(RECIPES) as Array<{ item?: string }>).filter(
      (r) => r.item === "jam",
    );
    expect(jamRecipes.length).toBeGreaterThan(0);
  });

  it("jam is obtainable (reachable via crafting from board-produced pie)", () => {
    expect(getObtainableResources().has("jam")).toBe(true);
  });
});
