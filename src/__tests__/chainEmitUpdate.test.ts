import { describe, it, expect } from "vitest";
import { producedResource, buildChainUpdatePayload } from "../game/producedResource.js";
import { ITEMS } from "../constants.js";

describe("producedResource (chain HUD source)", () => {
  it("returns family default for a vegetable tile", () => {
    const carrot = { key: "tile_veg_carrot" };
    expect(producedResource(carrot)).toBe("soup");
  });

  it("returns family default for an oak tile", () => {
    const oak = { key: "tile_tree_oak" };
    expect(producedResource(oak)).toBe("plank");
  });

  it("returns null for tiles with custom output", () => {
    expect(producedResource({ key: "tile_special_dirt" })).toBeNull();
    expect(producedResource({ key: "tile_special_giant_pearl" })).toBeNull();
  });

  it("returns null for missing/invalid inputs", () => {
    expect(producedResource({ key: "tile_unknown_thing" })).toBeNull();
    expect(producedResource({})).toBeNull();
    expect(producedResource(null)).toBeNull();
    expect(producedResource(undefined)).toBeNull();
  });
});

describe("buildChainUpdatePayload", () => {
  function harness(headTileKey, headTileLabel) {
    return buildChainUpdatePayload({
      path: [{ res: { key: headTileKey, label: headTileLabel } }],
      nextUpgradeTile: () => null,
      effectiveThresholds: undefined,
      effectiveMinChain: 3,
    });
  }

  it("emits the produced RESOURCE key, not the tile key, for a vegetable chain", () => {
    const payload = harness("tile_veg_carrot", "Carrot");
    expect(payload.resourceKey).toBe("soup");
    expect(payload.tileKey).toBe("tile_veg_carrot");
  });

  it("emits the produced resource label, not the tile label", () => {
    const payload = harness("tile_veg_carrot", "Carrot");
    expect(payload.resourceLabel).toBe(ITEMS.soup.label);
    expect(payload.tileLabel).toBe("Carrot");
  });

  it("falls back to the tile key/label for tiles with custom output", () => {
    const payload = harness("tile_special_dirt", "Dirt");
    expect(payload.resourceKey).toBe("tile_special_dirt");
    expect(payload.resourceLabel).toBe("Dirt");
    expect(payload.tileKey).toBe("tile_special_dirt");
    expect(payload.tileLabel).toBe("Dirt");
  });

  it("emits a null head when the path is empty", () => {
    const payload = buildChainUpdatePayload({
      path: [],
      nextUpgradeTile: () => null,
      effectiveThresholds: undefined,
      effectiveMinChain: 3,
    });
    expect(payload.count).toBe(0);
    expect(payload.resourceKey).toBeNull();
    expect(payload.tileKey).toBeNull();
    expect(payload.valid).toBe(true);
  });

  describe("valid logic", () => {
    it("is valid when chain length is 0", () => {
      const payload = buildChainUpdatePayload({
        path: [],
        nextUpgradeTile: () => null,
        effectiveMinChain: 3,
      });
      expect(payload.valid).toBe(true);
    });

    it("is invalid when chain length is greater than 0 but less than effectiveMinChain", () => {
      const payload = buildChainUpdatePayload({
        path: [{ res: { key: "tile_veg_carrot" } }, { res: { key: "tile_veg_carrot" } }],
        nextUpgradeTile: () => null,
        effectiveMinChain: 3,
      });
      expect(payload.valid).toBe(false);
    });

    it("is valid when chain length is >= effectiveMinChain", () => {
      const payload = buildChainUpdatePayload({
        path: [{ res: { key: "tile_veg_carrot" } }, { res: { key: "tile_veg_carrot" } }, { res: { key: "tile_veg_carrot" } }],
        nextUpgradeTile: () => null,
        effectiveMinChain: 3,
      });
      expect(payload.valid).toBe(true);
    });
  });

  describe("nextTileProgress & upgrades logic", () => {
    it("populates nextTileProgress correctly when threshold > 0", () => {
      const payload = buildChainUpdatePayload({
        path: [{ res: { key: "test_res" } }, { res: { key: "test_res" } }, { res: { key: "test_res" } }],
        nextUpgradeTile: () => ({ key: "test_upgrade", label: "Test Upgrade" }),
        effectiveThresholds: { test_res: 5 },
        effectiveMinChain: 3,
      });

      expect(payload.upgrades).toBe(0);
      expect(payload.nextTileProgress).toEqual({
        current: 3,
        threshold: 5,
        targetKey: "test_upgrade",
        targetLabel: "Test Upgrade",
      });
    });

    it("calculates upgrades correctly when chain length exceeds threshold", () => {
      const payload = buildChainUpdatePayload({
        path: Array.from({ length: 11 }, () => ({ res: { key: "test_res" } })),
        nextUpgradeTile: () => ({ key: "test_upgrade", label: "Test Upgrade" }),
        effectiveThresholds: { test_res: 5 },
        effectiveMinChain: 3,
      });

      expect(payload.upgrades).toBe(2);
      expect(payload.nextTileProgress).toEqual({
        current: 11,
        threshold: 5,
        targetKey: "test_upgrade",
        targetLabel: "Test Upgrade",
      });
    });

    it("leaves nextTileProgress null when threshold <= 0", () => {
      const payload = buildChainUpdatePayload({
        path: [{ res: { key: "test_res" } }],
        nextUpgradeTile: () => ({ key: "test_upgrade", label: "Test Upgrade" }),
        effectiveThresholds: { test_res: 0 },
        effectiveMinChain: 3,
      });

      expect(payload.upgrades).toBe(0);
      expect(payload.nextTileProgress).toBeNull();
    });

    it("leaves nextTileProgress null when nextUpgradeTile returns null", () => {
      const payload = buildChainUpdatePayload({
        path: [{ res: { key: "test_res" } }],
        nextUpgradeTile: () => null,
        effectiveThresholds: { test_res: 5 },
        effectiveMinChain: 3,
      });

      expect(payload.nextTileProgress).toBeNull();
    });

    it("falls back to empty strings for missing next keys/labels", () => {
      const payload = buildChainUpdatePayload({
        path: [{ res: { key: "test_res" } }],
        nextUpgradeTile: () => ({}), // Missing key and label
        effectiveThresholds: { test_res: 5 },
        effectiveMinChain: 3,
      });

      expect(payload.nextTileProgress).toEqual({
        current: 1,
        threshold: 5,
        targetKey: "",
        targetLabel: "",
      });
    });
  });
});
