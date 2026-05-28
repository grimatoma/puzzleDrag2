import { describe, it, expect } from "vitest";
import { SEASONS } from "../constants.js";
import { ICON_REGISTRY } from "../textures/iconRegistry.js";
import { ACHIEVEMENTS } from "../features/achievements/data.js";

describe("season icons wired", () => {
  it("each season uses its season_<name> icon and the key is registered", () => {
    const expected = ["season_spring", "season_summer", "season_autumn", "season_winter"];
    SEASONS.forEach((s, i) => {
      expect(s.iconKey).toBe(expected[i]);
      expect(ICON_REGISTRY[expected[i]]).toBeDefined();
    });
  });
});

describe("achievement icons wired", () => {
  it("every achievement has icon === ach_<id> and the key is registered", () => {
    for (const a of ACHIEVEMENTS) {
      expect(a.icon, a.id).toBe(`ach_${a.id}`);
      expect(ICON_REGISTRY[`ach_${a.id}`], a.id).toBeDefined();
    }
  });
});

describe("quest icons registered", () => {
  it("quest_<category> + quest_book keys all exist", () => {
    for (const k of ["quest_collect","quest_craft","quest_order","quest_tool","quest_chain","quest_book"]) {
      expect(ICON_REGISTRY[k], k).toBeDefined();
    }
  });
});

import { boonIconFor } from "../features/boons/index.jsx";

describe("boon icons wired", () => {
  it("boonIconFor maps effect types to registered keys", () => {
    expect(boonIconFor("coin_gain_mult")).toBe("boon_coin_mult");
    expect(boonIconFor("bond_gain_mult")).toBe("boon_bond_mult");
    expect(boonIconFor("chain_gain_mult")).toBe("boon_chain_mult");
    for (const k of ["boon_coin_mult","boon_bond_mult","boon_chain_mult","boon_branch_coexist","boon_branch_drive_out"]) {
      expect(ICON_REGISTRY[k], k).toBeDefined();
    }
  });
});
