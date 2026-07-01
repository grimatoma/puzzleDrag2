/**
 * Display coverage for the quest reward bundle: the pure flatten/order/pick
 * helpers that turn a reward object into the rows the card renders. These drive
 * both the headline chip and the expanded manifest, so a regression here silently
 * mis-renders every quest. The React surfaces (chip, manifest, claim burst) are
 * thin wrappers over these functions and are exercised by the visual goldens.
 */
import { describe, it, expect } from "vitest";
import { rewardRows, pickHeadline, manifestRows } from "./RewardBundle.js";

describe("rewardRows", () => {
  it("returns nothing for an empty or missing reward", () => {
    expect(rewardRows(null)).toEqual([]);
    expect(rewardRows(undefined)).toEqual([]);
    expect(rewardRows({})).toEqual([]);
  });

  it("emits coins and almanac XP as currency rows in taxonomy order", () => {
    const rows = rewardRows({ coins: 250, xp: 20 });
    expect(rows.map((r) => r.kind)).toEqual(["coin", "xp"]);
    expect(rows[0]).toMatchObject({ kind: "coin", value: 250, headline: false });
    expect(rows[1]).toMatchObject({ kind: "xp", value: 20, headline: false });
  });

  it("prefers almanacXp over xp for the XP row value", () => {
    const [row] = rewardRows({ almanacXp: 40, xp: 20 });
    expect(row).toMatchObject({ kind: "xp", value: 40 });
  });

  it("emits one row per tool and per item, carrying the count as qty", () => {
    const rows = rewardRows({ tools: { basic: 2, rare: 1 }, items: { plank: 5 } });
    const tools = rows.filter((r) => r.kind === "tool");
    const items = rows.filter((r) => r.kind === "item");
    expect(tools).toHaveLength(2);
    expect(tools.map((r) => r.qty)).toEqual([2, 1]);
    expect(items).toEqual([expect.objectContaining({ kind: "item", qty: 5 })]);
  });

  it("skips tools/items with a zero count", () => {
    const rows = rewardRows({ tools: { basic: 0 }, items: { plank: 0 } });
    expect(rows).toEqual([]);
  });

  it("marks runes, structural perks, and unlocks as headline rows with tags", () => {
    const rows = rewardRows({
      runes: 1,
      structural: "goldSeal",
      unlockTile: "tile_cattle_triceratops",
      unlockBuilding: "mill",
    });
    const byKind = Object.fromEntries(rows.map((r) => [r.kind, r]));
    expect(byKind.rune).toMatchObject({ kind: "rune", value: 1, headline: true });
    expect(byKind.structural).toMatchObject({ kind: "structural", headline: true, tag: "Perk" });
    expect(byKind.tile).toMatchObject({ kind: "tile", headline: true, tag: "Tile" });
    expect(byKind.building).toMatchObject({ kind: "building", headline: true, tag: "Building" });
    // Building/tile icon keys are derived for the registry lookup.
    expect(byKind.building.iconKey).toBe("bld_mill");
    expect(byKind.tile.iconKey).toBe("tile_cattle_triceratops");
  });

  it("uses the authored label for a known structural perk", () => {
    const [row] = rewardRows({ structural: "goldSeal" });
    expect(row.name).toBe("Golden Seal");
  });

  it("prettifies an unmapped structural key instead of leaking camelCase", () => {
    const [row] = rewardRows({ structural: "someShinyNewPerk" });
    expect(row.name).toBe("Some Shiny New Perk");
  });

  it("supports the legacy single-tool { tool, amt } shape", () => {
    const [row] = rewardRows({ tool: "basic", amt: 3 });
    expect(row).toMatchObject({ kind: "tool", qty: 3 });
  });
});

describe("pickHeadline", () => {
  it("returns null when there are no rows", () => {
    expect(pickHeadline([])).toBeNull();
  });

  it("ranks a building unlock above a tile, which ranks above coins", () => {
    const head = pickHeadline(rewardRows({ coins: 100, unlockTile: "tile_cattle_triceratops", unlockBuilding: "mill" }));
    expect(head?.kind).toBe("building");
    const head2 = pickHeadline(rewardRows({ coins: 100, unlockTile: "tile_cattle_triceratops" }));
    expect(head2?.kind).toBe("tile");
  });

  it("falls back to coins when no headline-class reward is present", () => {
    const head = pickHeadline(rewardRows({ coins: 100, xp: 20, tools: { basic: 1 } }));
    expect(head?.kind).toBe("coin");
  });
});

describe("manifestRows", () => {
  it("floats headline rewards to the top in prominence order, baseline below", () => {
    const rows = manifestRows({
      coins: 100,
      xp: 20,
      tools: { basic: 1 },
      runes: 1,
      unlockBuilding: "mill",
    });
    expect(rows.map((r) => r.kind)).toEqual(["building", "rune", "coin", "xp", "tool"]);
  });

  it("preserves the taxonomy order of baseline rows when there is no unlock", () => {
    const rows = manifestRows({ coins: 100, xp: 20, items: { plank: 2 } });
    expect(rows.map((r) => r.kind)).toEqual(["coin", "xp", "item"]);
  });

  it("keeps tile below building but above the baseline", () => {
    const rows = manifestRows({ coins: 100, unlockTile: "tile_cattle_triceratops", unlockBuilding: "mill" });
    expect(rows.map((r) => r.kind)).toEqual(["building", "tile", "coin"]);
  });
});
