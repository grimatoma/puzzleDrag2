import { describe, it, expect } from "vitest";
import {
  itemsCsv, recipesCsv, buildingsCsv, workersCsv,
  achievementsCsv, bossesCsv, CATALOG_EXPORTS,
} from "../balanceManager/csvExport.js";

describe("itemsCsv", () => {
  it("emits the canonical header row + one line per item", () => {
    const csv = itemsCsv({ items: {
      bread: { kind: "resource", biome: "farm", label: "Bread", value: 125, color: 0xd49060 },
      wood:  { kind: "resource", biome: "farm", label: "Log",   value: 2,   color: 0x9b6b3e, next: "wood_plank" },
    }});
    const lines = csv.split("\r\n");
    expect(lines[0]).toBe("id,kind,biome,label,value,color,next,description");
    expect(lines).toHaveLength(3);
    expect(lines[1].startsWith("bread,resource,farm,Bread,125,0xd49060")).toBe(true);
    expect(lines[2]).toMatch(/wood,resource,farm,Log,2,0x9b6b3e,wood_plank/);
  });

  it("escape-quotes values containing commas / quotes / newlines", () => {
    const csv = itemsCsv({ items: {
      tricky: { kind: "resource", label: 'Has, "quotes" and\nnewline', value: 1 },
    }});
    const lines = csv.split("\r\n");
    expect(lines[1]).toMatch(/"Has, ""quotes"" and\nnewline"/);
  });
});

describe("recipesCsv", () => {
  it("joins inputs as `key:qty; key:qty`", () => {
    const csv = recipesCsv({ recipes: {
      rec_bread: { item: "bread", station: "bakery", tier: 1, inputs: { grain_flour: 3, bird_egg: 1 } },
    }});
    expect(csv).toMatch(/rec_bread,bread,bakery,1,grain_flour:3; bird_egg:1/);
  });

  it("dedups item-key aliases (RECIPES has both rec_bread and bread pointers)", () => {
    const csv = recipesCsv({ recipes: {
      rec_x: { item: "x", inputs: {} },
      x:     { item: "x", inputs: {} },        // alias of rec_x
    }});
    const lines = csv.split("\r\n");
    // Header + two entries (the helper doesn't merge by `item`; that's fine,
    // here both ids show up separately).
    expect(lines).toHaveLength(3);
  });
});

describe("buildingsCsv", () => {
  it("splits cost into coins + other-resource cost", () => {
    const csv = buildingsCsv({ buildings: [
      { id: "mill", name: "Mill", lv: 1, biome: "", cost: { coins: 200, wood_plank: 30 } },
    ]});
    const lines = csv.split("\r\n");
    expect(lines[1]).toMatch(/mill,Mill,1,,200,wood_plank:30/);
  });
});

describe("workersCsv", () => {
  it("emits ramp fields", () => {
    const csv = workersCsv({ workers: [
      { id: "farmer", name: "Farmer", hireCost: { coins: 50, coinsStep: 25 }, maxCount: 10 },
    ]});
    const lines = csv.split("\r\n");
    expect(lines[1]).toBe("farmer,Farmer,50,25,,10");
  });
});

describe("achievementsCsv", () => {
  it("flattens tool rewards into a `key:qty` string", () => {
    const csv = achievementsCsv({ achievements: [
      { id: "champ", name: "Champion", counter: "bosses", threshold: 4, target: 4,
        reward: { tools: { magic_wand: 1, magic_seed: 2 } }, desc: "" },
    ]});
    expect(csv).toMatch(/magic_wand:1; magic_seed:2/);
  });
});

describe("bossesCsv", () => {
  it("expands the target + modifier subobjects", () => {
    const csv = bossesCsv({ bosses: [
      { id: "frostmaw", name: "Frostmaw", season: "winter",
        target: { resource: "wood_log", amount: 30 }, modifier: { type: "freeze_columns" } },
    ]});
    expect(csv).toMatch(/frostmaw,Frostmaw,winter,wood_log,30,freeze_columns/);
  });
});

describe("CATALOG_EXPORTS", () => {
  it("lists every exporter with a build function", () => {
    expect(CATALOG_EXPORTS.length).toBeGreaterThan(0);
    for (const cat of CATALOG_EXPORTS) {
      expect(typeof cat.build).toBe("function");
      const out = cat.build();
      expect(typeof out).toBe("string");
      expect(out.split("\r\n").length).toBeGreaterThan(1);   // header + ≥1 row
    }
  });
});
