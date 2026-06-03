import { describe, it, expect } from "vitest";
import { CONCEPTS } from "./concepts.js";
import { getEntity } from "./conceptEntities.js";
import { WIKI_SECTIONS } from "./wikiNav.js";
import { schemaForConcept, schemaForBoardKind } from "./conceptSchemas.js";
import { ledeFor } from "./lede.js";
import { infoboxFacts } from "./infoboxFacts.js";
import { relationsFor } from "./relations.js";
import { backlinksFor, __resetBacklinkIndex } from "./backlinks.js";

const concept = () => CONCEPTS.find((c) => c.id === "boardKinds");

describe("boardKinds concept registration", () => {
  it("is a registered concept", () => {
    expect(concept()).toBeDefined();
  });
  it("has exactly three entries: farm, mine, fish", () => {
    const keys = concept()!.getEntries().map((e) => (e as { key: string }).key).sort();
    expect(keys).toEqual(["farm", "fish", "mine"]);
  });
  it("entry display names match BIOMES (Harbor for fish)", () => {
    const byKey = Object.fromEntries(
      concept()!.getEntries().map((e) => [(e as { key: string }).key, (e as { name: string }).name]),
    );
    expect(byKey.farm).toBe("Farm");
    expect(byKey.mine).toBe("Mine");
    expect(byKey.fish).toBe("Harbor");
  });
  it("entries expose the biome icon keys used by the wiki grid", () => {
    const iconsByKey = Object.fromEntries(
      concept()!
        .getEntries()
        .map((e) => [(e as { key: string }).key, (e as { iconKey: string }).iconKey]),
    );
    expect(iconsByKey).toEqual({
      farm: "biome_farm",
      fish: "biome_fish",
      mine: "biome_mine",
    });
  });
  it("getEntity resolves a board kind from BIOMES", () => {
    const mine = getEntity("boardKinds", "mine");
    expect(mine).not.toBeNull();
    expect(mine!.name).toBe("Mine");
    expect(Array.isArray(mine!.tiles)).toBe(true);
  });
  it("appears in exactly one nav section (board)", () => {
    const sections = WIKI_SECTIONS.filter((s) =>
      s.nodes.some(
        (n) => n.conceptId === "boardKinds" || (n.children ?? []).includes("boardKinds"),
      ),
    );
    expect(sections.map((s) => s.id)).toEqual(["board"]);
  });
  it("has no concept-level Zod schema (instance schema is per board kind)", () => {
    expect(schemaForConcept("boardKinds")).toBeNull();
    expect(schemaForBoardKind("farm")).not.toBeNull();
    expect(schemaForBoardKind("mine")).not.toBeNull();
  });
});

describe("boardKinds lede + facts", () => {
  it("lede names the board kind and mentions tiles", () => {
    const mine = getEntity("boardKinds", "mine");
    const s = ledeFor("boardKinds", "mine", mine);
    expect(s).toMatch(/Mine/);
    expect(s).toMatch(/board kind/i);
    expect(s.endsWith(".")).toBe(true);
  });
  it("facts include a tile-species count", () => {
    const mine = getEntity("boardKinds", "mine");
    const facts = infoboxFacts("boardKinds", "mine", mine);
    const labels = facts.map((f) => f.label);
    expect(labels).toContain("Tile species");
  });
});

describe("boardKinds relations", () => {
  it("links to its tiles and its dangers", () => {
    const mine = getEntity("boardKinds", "mine");
    const groups = relationsFor("boardKinds", "mine", mine);
    const titles = groups.map((g) => g.title);
    expect(titles).toContain("Tiles");
    expect(titles).toContain("Dangers");
    const dangers = groups.find((g) => g.title === "Dangers")!.links.map((l) => l.key);
    expect(dangers).toContain("cave_in");
  });
  it("links to the zones that use it", () => {
    const mine = getEntity("boardKinds", "mine");
    const groups = relationsFor("boardKinds", "mine", mine);
    expect(groups.map((g) => g.title)).toContain("Zones");
  });
  it("a board-kind tile back-links to its board kind", () => {
    __resetBacklinkIndex();
    const mine = getEntity("boardKinds", "mine");
    const firstTileKey = (mine!.tiles as Array<{ key: string }>)[0].key;
    const back = backlinksFor("tiles", firstTileKey);
    const hasBoardKind = back.some((g) => g.links.some((l) => l.conceptId === "boardKinds" && l.key === "mine"));
    expect(hasBoardKind).toBe(true);
  });
});
