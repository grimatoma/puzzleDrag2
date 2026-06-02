import { describe, it, expect } from "vitest";
import { SEASONS } from "../constants.js";
import { ICON_REGISTRY } from "../textures/iconRegistry.js";
import { ACHIEVEMENTS } from "../features/achievements/data.js";

describe("season icons wired", () => {
  it("each season uses its season_<name> icon and the key is registered", () => {
    const expected = ["season_spring", "season_summer", "season_autumn", "season_winter"];
    SEASONS.forEach((s, i) => {
      expect(s.look.iconKey).toBe(expected[i]);
      expect(ICON_REGISTRY[expected[i]]).toBeDefined();
    });
  });

  it("season appearance fields live under look, not top-level", () => {
    expect(typeof SEASONS[0].look.bg).toBe("number");
    expect((SEASONS[0] as unknown as { bg?: number }).bg).toBeUndefined();
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

describe("boon icons registered", () => {
  it("boon_* keys exist", () => {
    for (const k of ["boon_coin_mult","boon_bond_mult","boon_chain_mult","boon_branch_coexist","boon_branch_drive_out"]) {
      expect(ICON_REGISTRY[k], k).toBeDefined();
    }
  });
});

describe("currency icons registered", () => {
  it("cur_*/token_* keys exist", () => {
    for (const k of ["cur_embers","cur_core_ingot","cur_gems","cur_heirloom","token_hearth_forest","token_hearth_stone","token_hearth_tide"]) {
      expect(ICON_REGISTRY[k], k).toBeDefined();
    }
  });
});

describe("bond icons registered", () => {
  it("bond_rank_1..8 + bond_8_arc keys exist", () => {
    for (let i = 1; i <= 8; i++) expect(ICON_REGISTRY[`bond_rank_${i}`], `bond_rank_${i}`).toBeDefined();
    expect(ICON_REGISTRY["bond_8_arc"]).toBeDefined();
  });
});

describe("region icons registered", () => {
  it("region_* keys exist", () => {
    for (const k of ["region_forest","region_moor","region_mine","region_harbor","region_tundra"]) {
      expect(ICON_REGISTRY[k], k).toBeDefined();
    }
  });
});

describe("keeper icons registered", () => {
  it("keeper_* keys exist", () => {
    for (const k of ["keeper_deer_spirit","keeper_stone_knocker","keeper_tidesinger"]) {
      expect(ICON_REGISTRY[k], k).toBeDefined();
    }
  });
});

describe("misc panel icons registered", () => {
  it("craft_queue/craft_queue_skip/xp_levelup/dangers_header keys exist", () => {
    for (const k of ["craft_queue","craft_queue_skip","xp_levelup","dangers_header"]) {
      expect(ICON_REGISTRY[k], k).toBeDefined();
    }
  });
});

import { getUsedIconKeys } from "../balanceManager/iconUsage.js";

describe("wired icons now report as used", () => {
  it("seasons + achievements + a sample of each wired family are in the used set", () => {
    const used = getUsedIconKeys();
    const sample = [
      "season_spring", "season_winter",
      "ach_first_steps", "ach_ability_artisan",
      "quest_collect", "quest_book",
      "boon_coin_mult", "boon_branch_drive_out",
      "cur_embers", "token_hearth_forest",
      "bond_rank_1", "bond_rank_8", "bond_8_arc",
      "region_forest", "region_tundra",
      "keeper_deer_spirit", "keeper_tidesinger",
      "craft_queue", "craft_queue_skip", "xp_levelup", "dangers_header",
    ];
    for (const k of sample) expect(used.has(k), k).toBe(true);
  });
});
