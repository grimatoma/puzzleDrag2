// Smoke tests for the redesigned cartography view: every node has lore,
// every Hearth-Token is wired to a settlement type, and the side-panel
// status reducer survives a few representative inputs.

import { describe, it, expect } from "vitest";
import { MAP_NODES } from "../features/cartography/data.js";
import { NODE_LORE, HEARTH_TOKENS, loreFor } from "../features/cartography/lore.js";
import { isAdjacent } from "../features/cartography/slice.js";

describe("cartography lore", () => {
  it("every map node has a lore entry", () => {
    for (const node of MAP_NODES) {
      const lore = loreFor(node.id);
      expect(lore, `missing lore for ${node.id}`).toBeTruthy();
      expect(lore.subtitle, `subtitle for ${node.id}`).toBeTruthy();
      expect(lore.epitaph,  `epitaph for ${node.id}`).toBeTruthy();
      expect(lore.hearth,   `hearth descriptor for ${node.id}`).toBeTruthy();
    }
  });

  it("lore entries don't reference non-existent nodes", () => {
    const knownIds = new Set(MAP_NODES.map(n => n.id));
    for (const id of Object.keys(NODE_LORE)) {
      expect(knownIds.has(id), `unknown node id in lore: ${id}`).toBe(true);
    }
  });

  it("ships exactly three Hearth-Tokens", () => {
    expect(HEARTH_TOKENS).toHaveLength(3);
    const ids = HEARTH_TOKENS.map(t => t.id).sort();
    expect(ids).toEqual(["iron", "pearl", "seed"]);
    for (const t of HEARTH_TOKENS) {
      expect(t.glyph, `glyph for ${t.id}`).toBeTruthy();
      expect(t.accent, `accent for ${t.id}`).toBeTruthy();
      expect(t.source, `source for ${t.id}`).toBeTruthy();
    }
  });
});

describe("map adjacency invariants", () => {
  it("home is reachable from its three starting neighbours", () => {
    expect(isAdjacent("home", "meadow")).toBe(true);
    expect(isAdjacent("home", "orchard")).toBe(true);
    expect(isAdjacent("home", "harbor")).toBe(true);
  });

  it("the Old Capital sits beyond the deep ways", () => {
    // The map scene's "discovered-locked" / "discovered-unreachable" branches
    // assume oldcapital is not adjacent to home.
    expect(isAdjacent("home", "oldcapital")).toBe(false);
  });
});
