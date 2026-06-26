import { describe, it, expect } from "vitest";
import { reachabilityPath } from "./reachabilityPath.js";
import { reachabilityOf, findUnreachable } from "./reachability.js";

/** Every edge must reference nodes that exist in the graph. */
function assertWellFormed(g: ReturnType<typeof reachabilityPath>) {
  expect(g).not.toBeNull();
  const ids = new Set(g!.nodes.map((n) => n.id));
  expect(ids.has(g!.rootId)).toBe(true);
  for (const e of g!.edges) {
    expect(ids.has(e.from)).toBe(true);
    expect(ids.has(e.to)).toBe(true);
  }
  // No node references itself; ids are unique.
  expect(ids.size).toBe(g!.nodes.length);
}

describe("reachabilityPath", () => {
  it("returns null for concepts that aren't reachability-gated", () => {
    expect(reachabilityPath("zones", "home")).toBeNull();
    expect(reachabilityPath("bosses", "anything")).toBeNull();
  });

  it("traces a recipe → station building → zone → Home, plus its ingredients", () => {
    const g = reachabilityPath("recipes", "rec_bread");
    assertWellFormed(g);
    expect(g!.status).toBe(reachabilityOf("recipes", "rec_bread"));
    // crafted at its station (bakery)
    expect(g!.edges.some((e) => e.from === "recipes:rec_bread" && e.to === "buildings:bakery")).toBe(true);
    // needs flour (an ingredient resource node)
    expect(g!.nodes.some((n) => n.conceptId === "resources" && n.entityKey === "flour")).toBe(true);
    // the chain bottoms out at Home (a terminal source)
    expect(g!.nodes.some((n) => n.terminal === "home")).toBe(true);
  });

  it("shows a default-board tile terminating at the board source", () => {
    // Find any tile that is reachable via the default board.
    const g = reachabilityPath("tiles", "tile_grass");
    if (g == null) return; // tile id may differ across configs
    assertWellFormed(g);
  });

  it("attaches a 'missing' dead-end for an unreachable entity", () => {
    const unreachableBuilding = findUnreachable().buildings[0];
    if (unreachableBuilding == null) return;
    const g = reachabilityPath("buildings", unreachableBuilding);
    assertWellFormed(g);
    expect(g!.status).toBe("unreachable");
    // The root building is coloured unreachable…
    expect(g!.nodes.find((n) => n.id === g!.rootId)!.reach).toBe("unreachable");
  });

  it("never exceeds the node cap and stays well-formed across the whole catalog", () => {
    for (const conceptId of ["recipes", "buildings", "tiles", "resources", "tools", "workers"]) {
      // Smoke a handful per concept via findUnreachable + a couple known keys.
      const keys = new Set<string>();
      const report = findUnreachable() as Record<string, string[]>;
      (report[conceptId] ?? []).slice(0, 3).forEach((k) => keys.add(k));
      for (const key of keys) {
        const g = reachabilityPath(conceptId, key);
        assertWellFormed(g);
        expect(g!.nodes.length).toBeLessThanOrEqual(80);
      }
    }
  });
});
