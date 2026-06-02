import { describe, it, expect } from "vitest";
import { CONCEPTS } from "./concepts.js";
import { getEntity } from "./conceptEntities.js";
import { statusForEntity } from "./status.js";

const hazardEntries = () =>
  CONCEPTS.find((c) => c.id === "hazards")!.getEntries() as Array<{ key: string }>;

describe("farm hazards as wiki entities", () => {
  it("hazardEntries includes fire, wolf, rats alongside mine hazards", () => {
    const keys = hazardEntries().map((e) => e.key);
    expect(keys).toEqual(expect.arrayContaining(["cave_in", "gas_vent", "lava", "mole", "fire", "wolf", "rats"]));
  });
  it("getEntity resolves a farm hazard with its meta fields", () => {
    const fire = getEntity("hazards", "fire");
    expect(fire).not.toBeNull();
    expect(fire!.name).toBe("Fire");
    expect(typeof fire!.clearInstruction).toBe("string");
  });
  it("fire is flag-gated PARTIAL; wolves/rats are WIRED", () => {
    expect(statusForEntity("hazards", "fire")).toBe("PARTIAL");
    expect(statusForEntity("hazards", "wolf")).toBe("WIRED");
    expect(statusForEntity("hazards", "rats")).toBe("WIRED");
    expect(statusForEntity("hazards", "cave_in")).toBe("WIRED");
  });
});
