// Tile sources flow into the global aggregator (via computeWorkerEffects)
// so passive tile abilities — pool_weight, threshold_reduce — surface as
// channel contributions just like worker and building abilities do.

import { describe, it, expect } from "vitest";
import { createInitialState } from "../state.js";
import {
  computeWorkerEffects,
  discoveredTileSources,
  builtBuildingSources,
} from "../features/workers/aggregate.js";

function withTile(state, tileId, category) {
  const tc = state.tileCollection ?? { discovered: {}, activeByCategory: {} };
  return {
    ...state,
    tileCollection: {
      ...tc,
      discovered: { ...(tc.discovered ?? {}), [tileId]: true },
      activeByCategory: { ...(tc.activeByCategory ?? {}), [category]: tileId },
    },
  };
}

describe("discoveredTileSources", () => {
  it("returns no sources for a fresh state", () => {
    const sources = discoveredTileSources(createInitialState());
    // The fresh state may activate default tiles, but only those with abilities
    // should appear. None of the default-tier tiles carry abilities today.
    for (const s of sources) {
      expect(s.kind).toBe("tile");
      expect(s.weight).toBe(1);
    }
  });

  it("includes a tile when it is BOTH discovered AND active in its category", () => {
    let s = createInitialState();
    s = withTile(s, "grass_meadow", "grass"); // grass_meadow has pool_weight grass_hay +1
    const sources = discoveredTileSources(s);
    const meadow = sources.find((src) => src.sourceId === "grass_meadow");
    expect(meadow).toBeTruthy();
    expect(meadow.weight).toBe(1);
    expect(meadow.abilities).toEqual([
      { id: "pool_weight", params: { target: "grass_hay", amount: 1 } },
    ]);
  });

  it("excludes a tile that is discovered but not active", () => {
    let s = createInitialState();
    const tc = s.tileCollection ?? { discovered: {}, activeByCategory: {} };
    s = {
      ...s,
      tileCollection: {
        ...tc,
        discovered: { ...(tc.discovered ?? {}), grass_meadow: true },
        // activeByCategory.grass intentionally NOT pointing at grass_meadow
        activeByCategory: { ...(tc.activeByCategory ?? {}), grass: "grass_hay" },
      },
    };
    const sources = discoveredTileSources(s);
    expect(sources.find((src) => src.sourceId === "grass_meadow")).toBeUndefined();
  });
});

describe("computeWorkerEffects — tile contributions land on global channels", () => {
  it("active grass_meadow contributes +1 to effectivePoolWeights.grass_hay", () => {
    let s = createInitialState();
    s = withTile(s, "grass_meadow", "grass");
    const eff = computeWorkerEffects(s);
    expect(eff.effectivePoolWeights.grass_hay).toBe(1);
  });

  it("active grass_spiky contributes +2 (replaces grass_meadow when activated)", () => {
    let s = createInitialState();
    s = withTile(s, "grass_spiky", "grass");
    const eff = computeWorkerEffects(s);
    expect(eff.effectivePoolWeights.grass_hay).toBe(2);
  });

  it("tile pool_weight surfaces in effectivePoolWeights for the active key", () => {
    let s = createInitialState();
    s = withTile(s, "grass_meadow", "grass"); // grass_meadow has pool_weight grass_hay +1
    // Stacking with worker/building sources on a shared key is exercised in
    // abilities-combo.test.js; here we pin the tile-only contribution.
    const eff = computeWorkerEffects(s);
    expect(eff.effectivePoolWeights.grass_hay).toBe(1);
  });
});

describe("builtBuildingSources export", () => {
  it("returns no sources for a state with no buildings built", () => {
    const sources = builtBuildingSources(createInitialState());
    // Hearth is built by default but has no abilities, so it is omitted.
    expect(sources.find((s) => s.sourceId === "powder_store")).toBeUndefined();
  });

  it("returns powder_store when it is built", () => {
    let s = createInitialState();
    const map = s.mapCurrent ?? "home";
    const builtForMap = { ...(s.built?.[map] ?? {}), powder_store: true };
    s = { ...s, built: { ...s.built, [map]: builtForMap } };
    const sources = builtBuildingSources(s);
    const ps = sources.find((src) => src.sourceId === "powder_store");
    expect(ps).toBeTruthy();
    expect(ps.kind).toBe("building");
    expect(ps.weight).toBe(1);
    expect(ps.abilities[0].id).toBe("grant_tool");
  });
});
