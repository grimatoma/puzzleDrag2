import { describe, it, expect } from "vitest";
import {
  runCatalogAudit, groupFindings, totalFindings, AUDIT_CATEGORIES, AUDIT_LABEL,
} from "../balanceManager/catalogAudit.js";

describe("runCatalogAudit — finding categories", () => {
  it("missingDescription: items without desc/description", () => {
    const out = runCatalogAudit({
      items: { lonely: { label: "Lonely" } },
      buildings: [], recipes: {}, bosses: [], achievements: [], zones: {},
    });
    expect(out.some((f) => f.category === "missingDescription" && f.owner === "lonely")).toBe(true);
  });

  it("brokenRecipeOutput: recipe outputs an unknown item", () => {
    const out = runCatalogAudit({
      items: {},
      recipes: { rec_ghost: { item: "phantom", inputs: {} } },
      buildings: [], bosses: [], achievements: [], zones: {},
    });
    expect(out.some((f) => f.category === "brokenRecipeOutput" && f.detail === "phantom")).toBe(true);
  });

  it("brokenRecipeInput: recipe consumes an unknown item", () => {
    const out = runCatalogAudit({
      items: { flour: {} },
      recipes: { rec_x: { item: "flour", inputs: { unicorn_horn: 1 } } },
      buildings: [], bosses: [], achievements: [], zones: {},
    });
    expect(out.some((f) => f.category === "brokenRecipeInput" && f.detail === "unicorn_horn")).toBe(true);
  });

  it("brokenBuildingCost: a non-currency cost key isn't a known item", () => {
    const out = runCatalogAudit({
      items: {},
      buildings: [{ id: "mill", cost: { coins: 200, dragon_egg: 3 } }],
      recipes: {}, bosses: [], achievements: [], zones: {},
    });
    expect(out.some((f) => f.category === "brokenBuildingCost" && f.detail === "dragon_egg")).toBe(true);
  });

  it("brokenBuildingCost: ignores known currency keys", () => {
    const out = runCatalogAudit({
      items: {},
      buildings: [{ id: "mill", cost: { coins: 200, runes: 1, gems: 1 } }],
      recipes: {}, bosses: [], achievements: [], zones: {},
    });
    expect(out.filter((f) => f.category === "brokenBuildingCost")).toEqual([]);
  });

  it("bossTargetMissing: target.resource isn't in ITEMS", () => {
    const out = runCatalogAudit({
      items: {},
      bosses: [{ id: "ghost", name: "Ghost", target: { resource: "phantom", amount: 1 }, modifier: { type: "x" } }],
      buildings: [], recipes: {}, achievements: [], zones: {},
    });
    expect(out.some((f) => f.category === "bossTargetMissing" && f.detail === "phantom")).toBe(true);
  });

  it("achievementMissing: tool reward isn't in ITEMS", () => {
    const out = runCatalogAudit({
      items: {},
      achievements: [{ id: "x", name: "X", reward: { tools: { mystery_amulet: 1 } } }],
      buildings: [], recipes: {}, bosses: [], zones: {},
    });
    expect(out.some((f) => f.category === "achievementMissing" && f.detail === "mystery_amulet")).toBe(true);
  });

  it("zoneBuildingMissing: zone references a missing building", () => {
    const out = runCatalogAudit({
      items: {},
      buildings: [{ id: "mill", cost: {} }],
      zones: { z1: { id: "z1", buildings: ["mill", "phantom_keep"] } },
      recipes: {}, bosses: [], achievements: [],
    });
    expect(out.some((f) => f.category === "zoneBuildingMissing" && f.detail === "phantom_keep")).toBe(true);
  });

  it("returns no findings for a coherent catalog", () => {
    const out = runCatalogAudit({
      items: { stone: { desc: "Stone", color: 1 } },
      buildings: [{ id: "mill", desc: "Mill", cost: { coins: 100, stone: 5 } }],
      recipes: { rec_x: { item: "stone", inputs: { stone: 1 } } },
      bosses: [{ id: "rocky", name: "Rocky", description: "x", target: { resource: "stone", amount: 5 }, modifier: { type: "x" } }],
      achievements: [{ id: "a", name: "A", reward: { coins: 5 } }],
      zones: { z: { id: "z", buildings: ["mill"] } },
    });
    expect(out.filter((f) => f.category !== "missingDescription")).toEqual([]);
  });

  it("runs against the live catalogs without crashing", () => {
    const out = runCatalogAudit();
    expect(Array.isArray(out)).toBe(true);
  });
});

describe("groupFindings / totalFindings", () => {
  it("groups findings by category in stable AUDIT_CATEGORIES order", () => {
    const out = groupFindings([
      { category: "missingDescription", owner: "a", detail: "x", message: "" },
      { category: "brokenRecipeInput",  owner: "b", detail: "x", message: "" },
      { category: "missingDescription", owner: "z", detail: "x", message: "" },
    ]);
    expect(out.map((g) => g.category)).toEqual(AUDIT_CATEGORIES);
    const desc = out.find((g) => g.category === "missingDescription");
    expect(desc.items.map((i) => i.owner)).toEqual(["a", "z"]);   // sorted
  });

  it("AUDIT_LABEL has a label for every category", () => {
    for (const cat of AUDIT_CATEGORIES) {
      expect(typeof AUDIT_LABEL[cat]).toBe("string");
    }
  });

  it("totalFindings counts all findings flatly", () => {
    expect(totalFindings([{}, {}, {}])).toBe(3);
    expect(totalFindings([])).toBe(0);
    expect(totalFindings(null)).toBe(0);
  });
});
