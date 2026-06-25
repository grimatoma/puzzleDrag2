import { describe, it, expect } from "vitest";
import { rollQuests } from "../features/quests/data.js";
import { QUEST_TEMPLATES } from "../features/quests/templates.js";
import { accessibleBoardKinds } from "../features/cartography/data.js";

// Template-id sets grouped by biome, derived from the live pool so the test
// keeps tracking new templates automatically.
const idsForBiome = (biome: string) =>
  new Set(QUEST_TEMPLATES.filter((t) => t.biome === biome).map((t) => t.id));
const FISH_IDS = idsForBiome("fish");
const MINE_IDS = idsForBiome("mine");

// A spread of (seed, season) inputs so we exercise many independent rolls.
const SEEDS = ["alpha", "bravo", "charlie", "delta", "echo", "foxtrot"];
const SEASONS = ["spring", "summer", "autumn", "winter", 1, 2, 3];
function everyRoll(accessible?: readonly string[]) {
  const all = [];
  for (const seed of SEEDS) {
    for (const season of SEASONS) {
      all.push(...rollQuests(seed, 1, season, accessible));
    }
  }
  return all;
}

describe("quest reachability filter", () => {
  it("the pool actually tags fish and mine templates", () => {
    expect(FISH_IDS.size).toBeGreaterThan(0);
    expect(MINE_IDS.size).toBeGreaterThan(0);
  });

  it("a farm-only player is never commissioned a fish or mine quest", () => {
    for (const q of everyRoll(["farm"])) {
      expect(FISH_IDS.has(q.template)).toBe(false);
      expect(MINE_IDS.has(q.template)).toBe(false);
    }
  });

  it("unlocking fish admits fish quests but still excludes mine", () => {
    const rolled = everyRoll(["farm", "fish"]);
    expect(rolled.some((q) => FISH_IDS.has(q.template))).toBe(true);
    for (const q of rolled) expect(MINE_IDS.has(q.template)).toBe(false);
  });

  it("still rolls a full board of 6 from the farm-only pool", () => {
    const q = rollQuests("alpha", 1, "spring", ["farm"]);
    expect(q).toHaveLength(6);
    expect(new Set(q.map((x) => x.template)).size).toBe(6);
  });

  it("omitting the biome list keeps the full pool (back-compat)", () => {
    // Without a filter, fish/mine templates remain eligible across many rolls.
    const rolled = everyRoll();
    const sawGated = rolled.some((q) => FISH_IDS.has(q.template) || MINE_IDS.has(q.template));
    expect(sawGated).toBe(true);
  });
});

describe("accessibleBoardKinds", () => {
  it("maps the home village to the farm board", () => {
    expect(accessibleBoardKinds(["home"])).toEqual(["farm"]);
  });

  it("maps visited fish/mine nodes to their board kinds", () => {
    expect(accessibleBoardKinds(["home", "harbor"]).sort()).toEqual(["farm", "fish"]);
    expect(accessibleBoardKinds(["home", "quarry"]).sort()).toEqual(["farm", "mine"]);
  });

  it("ignores non-playable nodes and unknown ids", () => {
    // 'pit' (boss) and 'oldcapital' (capital) carry no board; 'nope' is unknown.
    expect(accessibleBoardKinds(["home", "pit", "oldcapital", "nope"])).toEqual(["farm"]);
  });

  it("returns nothing for an empty visited list", () => {
    expect(accessibleBoardKinds([])).toEqual([]);
  });
});
