/**
 * Phase 3 (tool-powers overhaul) — catalog backfill.
 *
 * This file pins the contract between the ITEMS `power` field and the runtime
 * dispatch path: every new tool exposes a typed `power: { id, params }` that
 * resolves end-to-end through `USE_TOOL { payload: { power } }` against the
 * Phase 2 runtime (applyToolPower / applyTapTargetPower in src/state.js).
 *
 * We exercise BOTH the catalog (ITEMS / WORKSHOP_RECIPES / MAGIC_TOOLS /
 * TOOL_CATALOG) and the runtime path that the catalog's `power` config drives.
 * The Phase 2 baseline tests in toolPowersRuntime.test.js cover the synthetic
 * `power` payload contract; this file adds the catalog-driven flow.
 */
import { describe, it, expect } from "vitest";
import { ITEMS, WORKSHOP_RECIPES, ROWS, COLS } from "../constants.js";
import { TOOL_POWERS } from "../config/toolPowers.js";
import { TOOL_BY_KEY } from "../ui/toolRegistry.js";
import { MAGIC_TOOLS } from "../features/portal/data.js";
import { rootReducer, createInitialState } from "../state.js";

// ─── helpers ──────────────────────────────────────────────────────────────

function blankGrid(fillKey = "tile_grass_hay") {
  const grid = [];
  for (let r = 0; r < ROWS; r++) {
    const row = [];
    for (let c = 0; c < COLS; c++) row.push({ key: fillKey });
    grid.push(row);
  }
  return grid;
}

function countKey(grid, key) {
  let n = 0;
  for (const row of grid) for (const cell of row) if (cell.key === key) n += 1;
  return n;
}

/** Dispatch USE_TOOL using the canonical Phase 3 contract: pass JUST the
 *  tool id so the reducer's auto-lookup (Phase 3 fix 1) finds ITEMS[id].power
 *  and routes through applyToolPower. This is what production call sites do
 *  (the UI dispatches `{ type: "USE_TOOL", payload: { id } }` and never
 *  attaches a power config). */
function useTool(state, toolKey) {
  const item = ITEMS[toolKey];
  if (!item || !item.power) throw new Error(`${toolKey} has no power field`);
  return rootReducer(state, {
    type: "USE_TOOL",
    payload: { id: toolKey },
  });
}

// ─── ITEMS catalog ─────────────────────────────────────────────────────────

describe("tool catalog contract", () => {
  it("every ITEMS tool power id resolves in TOOL_POWERS", () => {
    const catalogIds = new Set(TOOL_POWERS.map((p) => p.id));
    for (const [key, item] of Object.entries(ITEMS)) {
      if (item.kind !== "tool" || !item.power?.id) continue;
      expect(catalogIds.has(item.power.id), `${key}.power.id=${item.power.id}`).toBe(true);
    }
  });

  it("migrated tools no longer declare legacy effect/target fields", () => {
    for (const [key, item] of Object.entries(ITEMS)) {
      if (item.kind !== "tool") continue;
      expect(item.effect, `${key}.effect`).toBeUndefined();
      expect(item.target, `${key}.target`).toBeUndefined();
    }
  });
});

describe("Phase 3 catalog — new tools registered in ITEMS with typed powers", () => {
  const NEW_FARM_TOOLS = [
    "trimmer", "plough", "fruit_picker", "herders_crook",
    "milk_churn", "saddle", "bee", "terrier",
  ];
  const NEW_MINE_TOOLS = [
    "drill", "coal_hammer", "gold_pick", "magnet", "coal_transmuter",
  ];
  const NEW_MAGIC_TOOLS = [
    "golden_apple", "golden_carrot", "golden_idol", "golden_sheep",
    "philosophers_stone", "miners_hat",
  ];

  it("every new farm tool exists as kind:'tool' with a typed power", () => {
    for (const key of NEW_FARM_TOOLS) {
      const item = ITEMS[key];
      expect(item, key).toBeDefined();
      expect(item.kind, key).toBe("tool");
      expect(item.power?.id, key).toBeTruthy();
    }
  });

  it("every new mine tool exists as kind:'tool' with a typed power", () => {
    for (const key of NEW_MINE_TOOLS) {
      const item = ITEMS[key];
      expect(item, key).toBeDefined();
      expect(item.kind, key).toBe("tool");
      expect(item.power?.id, key).toBeTruthy();
    }
  });

  it("every new magic-tier tool exists as kind:'tool' with a typed power", () => {
    for (const key of NEW_MAGIC_TOOLS) {
      const item = ITEMS[key];
      expect(item, key).toBeDefined();
      expect(item.kind, key).toBe("tool");
      expect(item.power?.id, key).toBeTruthy();
    }
  });

  it("every migrated existing tool has a typed power declared on ITEMS", () => {
    // These tools shipped pre-overhaul with ad-hoc effect/target fields. PR3
    // adds the declarative `power` field so the Wiki and runtime can route
    // through the typed dispatch (legacy fields stay for back-compat).
    const MIGRATED = [
      "rake", "axe", "scythe_full", "hoe", "bird_cage", "stone_hammer", "iron_pick",
      "explosives", "magic_wand", "hourglass", "magic_seed",
    ];
    for (const key of MIGRATED) {
      const item = ITEMS[key];
      expect(item, key).toBeDefined();
      expect(item.power?.id, `${key}.power.id missing`).toBeTruthy();
    }
  });

  it("magic-tier tools resolve via MAGIC_TOOLS for the portal summon flow", () => {
    const portalIds = new Set(MAGIC_TOOLS.map((t) => t.id));
    for (const key of NEW_MAGIC_TOOLS) {
      expect(portalIds.has(key), `MAGIC_TOOLS missing ${key}`).toBe(true);
    }
  });

  it("workshop-tier net-new tools have a craft recipe", () => {
    for (const key of [...NEW_FARM_TOOLS, ...NEW_MINE_TOOLS]) {
      expect(WORKSHOP_RECIPES[key], `WORKSHOP_RECIPES.${key}`).toBeDefined();
      expect(WORKSHOP_RECIPES[key].station).toBe("workshop");
    }
  });

  it("every new tool appears in TOOL_CATALOG", () => {
    for (const key of [...NEW_FARM_TOOLS, ...NEW_MINE_TOOLS, ...NEW_MAGIC_TOOLS]) {
      expect(TOOL_BY_KEY[key], `TOOL_CATALOG missing ${key}`).toBeDefined();
    }
  });

  it("net-new tap-target tools get armed:'tap' in TOOL_CATALOG", () => {
    // Magnet + coal_transmuter use transform_adjacent (tap-target). Other
    // net-new tools are instant. Legacy migrated tools (explosives, magic_wand)
    // keep their pre-overhaul `armed` values because the legacy runtime
    // pathway still drives them — the declarative `power` field hasn't been
    // wired into their UI dispatcher yet.
    const NEW_TAP_TARGETS = ["magnet", "coal_transmuter"];
    for (const key of NEW_TAP_TARGETS) {
      expect(TOOL_BY_KEY[key]?.armed, `${key} armed`).toBe("tap");
    }
  });
});

// ─── Runtime — exercises ITEMS[key].power end-to-end ──────────────────────

describe("Phase 3 — clear_category tools collect family tiles", () => {
  it("trimmer transforms every tree tile into hay (transform_tiles / trees)", () => {
    const grid = blankGrid("tile_tree_oak");
    const s0 = { ...createInitialState(), grid, tools: { ...createInitialState().tools, trimmer: 1 } };
    const s1 = useTool(s0, "trimmer");
    expect(countKey(s1.grid, "tile_tree_oak")).toBe(0);
    expect(countKey(s1.grid, "tile_grass_hay")).toBe(ROWS * COLS);
    expect(s1.tools.trimmer).toBe(0);
  });

  it("fruit_picker sweeps every fruit tile (clear_category / fruits)", () => {
    const grid = blankGrid();
    grid[0][0].key = "tile_fruit_apple";
    grid[1][1].key = "tile_fruit_blackberry";
    grid[2][2].key = "tile_fruit_lemon";
    const s0 = { ...createInitialState(), grid, tools: { ...createInitialState().tools, fruit_picker: 1 } };
    const s1 = useTool(s0, "fruit_picker");
    expect(countKey(s1.grid, "tile_fruit_apple")).toBe(0);
    expect(countKey(s1.grid, "tile_fruit_blackberry")).toBe(0);
    expect(countKey(s1.grid, "tile_fruit_lemon")).toBe(0);
    expect(s1.tools.fruit_picker).toBe(0);
  });

  it("herders_crook sweeps every herd tile (clear_category / herd_animals)", () => {
    const grid = blankGrid();
    grid[0][0].key = "tile_herd_pig";
    grid[1][1].key = "tile_herd_sheep";
    grid[2][2].key = "tile_herd_goat";
    const s0 = { ...createInitialState(), grid, tools: { ...createInitialState().tools, herders_crook: 1 } };
    const s1 = useTool(s0, "herders_crook");
    expect(countKey(s1.grid, "tile_herd_pig")).toBe(0);
    expect(countKey(s1.grid, "tile_herd_sheep")).toBe(0);
    expect(countKey(s1.grid, "tile_herd_goat")).toBe(0);
  });

  it("milk_churn sweeps every cattle tile (clear_category / cattle)", () => {
    const grid = blankGrid();
    grid[0][0].key = "tile_cattle_cow";
    grid[1][1].key = "tile_cattle_longhorn";
    const s0 = { ...createInitialState(), grid, tools: { ...createInitialState().tools, milk_churn: 1 } };
    const s1 = useTool(s0, "milk_churn");
    expect(countKey(s1.grid, "tile_cattle_cow")).toBe(0);
    expect(countKey(s1.grid, "tile_cattle_longhorn")).toBe(0);
  });

  it("saddle sweeps every mount tile (clear_category / mounts)", () => {
    const grid = blankGrid();
    grid[0][0].key = "tile_mount_horse";
    grid[1][1].key = "tile_mount_donkey";
    grid[2][2].key = "tile_mount_mammoth";
    const s0 = { ...createInitialState(), grid, tools: { ...createInitialState().tools, saddle: 1 } };
    const s1 = useTool(s0, "saddle");
    expect(countKey(s1.grid, "tile_mount_horse")).toBe(0);
    expect(countKey(s1.grid, "tile_mount_donkey")).toBe(0);
    expect(countKey(s1.grid, "tile_mount_mammoth")).toBe(0);
  });

  it("coal_hammer sweeps every coal tile (clear_category / coal)", () => {
    const grid = blankGrid();
    grid[0][0].key = "tile_mine_coal";
    grid[1][1].key = "tile_mine_coal";
    const s0 = { ...createInitialState(), grid, tools: { ...createInitialState().tools, coal_hammer: 1 } };
    const s1 = useTool(s0, "coal_hammer");
    expect(countKey(s1.grid, "tile_mine_coal")).toBe(0);
  });

  it("gold_pick sweeps every gold tile (clear_category / gold)", () => {
    const grid = blankGrid();
    grid[0][0].key = "tile_mine_gold";
    grid[3][3].key = "tile_mine_gold";
    const s0 = { ...createInitialState(), grid, tools: { ...createInitialState().tools, gold_pick: 1 } };
    const s1 = useTool(s0, "gold_pick");
    expect(countKey(s1.grid, "tile_mine_gold")).toBe(0);
  });

  it("plough sweeps grass AND grain in one pass (clear_category / array)", () => {
    // plough's `target` is ["grass", "grain"]. Make sure both clear.
    const grid = blankGrid();
    grid[0][0].key = "tile_grass_hay";
    grid[0][1].key = "tile_grain_wheat";
    grid[1][0].key = "tile_grass_meadow";
    grid[1][1].key = "tile_grain_corn";
    grid[2][2].key = "tile_fruit_apple"; // unrelated — should survive
    const s0 = { ...createInitialState(), grid, tools: { ...createInitialState().tools, plough: 1 } };
    const s1 = useTool(s0, "plough");
    expect(countKey(s1.grid, "tile_grass_hay")).toBe(0);
    expect(countKey(s1.grid, "tile_grain_wheat")).toBe(0);
    expect(countKey(s1.grid, "tile_grass_meadow")).toBe(0);
    expect(countKey(s1.grid, "tile_grain_corn")).toBe(0);
    // Fruit untouched.
    expect(s1.grid[2][2].key).toBe("tile_fruit_apple");
  });

  it("terrier clears every rat hazard (clear_hazard / rats)", () => {
    // PR-fix 3: applyToolPower now handles clear_hazard. terrier dispatches
    // through the typed-power runtime and clears rats end-to-end (both the
    // hazards.rats[] list AND any rat tiles still on the board).
    const grid = blankGrid();
    grid[1][1].key = "rat";
    grid[3][4].key = "rat";
    const s0 = {
      ...createInitialState(),
      grid,
      tools: { ...createInitialState().tools, terrier: 1 },
      hazards: { ...createInitialState().hazards, rats: [{ row: 1, col: 1 }, { row: 3, col: 4 }] },
    };
    const s1 = useTool(s0, "terrier");
    expect(s1.tools.terrier).toBe(0); // charge consumed
    expect(s1.hazards.rats).toEqual([]); // hazard list cleared
    expect(s1.grid[1][1].key).toBe(null); // rat cell emptied
    expect(s1.grid[3][4].key).toBe(null);
  });

  it("terrier refunds when no rats are present (no charge spent)", () => {
    const grid = blankGrid();
    const s0 = {
      ...createInitialState(),
      grid,
      tools: { ...createInitialState().tools, terrier: 1 },
      hazards: { ...createInitialState().hazards, rats: [] },
    };
    const s1 = useTool(s0, "terrier");
    expect(s1.tools.terrier).toBe(1); // refunded
  });
});

describe("Phase 3 — transform_tiles tools mutate matching board tiles", () => {
  it("bee turns every flower tile into apple tiles (transform_tiles / flowers → tile_fruit_apple)", () => {
    const grid = blankGrid();
    grid[0][0].key = "tile_flower_pansy";
    grid[2][2].key = "tile_flower_water_lily";
    const s0 = { ...createInitialState(), grid, tools: { ...createInitialState().tools, bee: 1 } };
    const s1 = useTool(s0, "bee");
    expect(countKey(s1.grid, "tile_flower_pansy")).toBe(0);
    expect(countKey(s1.grid, "tile_flower_water_lily")).toBe(0);
    expect(countKey(s1.grid, "tile_fruit_apple")).toBe(2);
  });

  it("drill turns every special-dirt tile into stone (transform_tiles / dirt → tile_mine_stone)", () => {
    const grid = blankGrid();
    grid[0][0].key = "tile_special_dirt";
    grid[1][1].key = "tile_special_dirt";
    grid[2][2].key = "tile_special_dirt";
    const s0 = { ...createInitialState(), grid, tools: { ...createInitialState().tools, drill: 1 } };
    const s1 = useTool(s0, "drill");
    expect(countKey(s1.grid, "tile_special_dirt")).toBe(0);
    expect(countKey(s1.grid, "tile_mine_stone")).toBe(3);
  });

  it("golden_apple turns every tree tile into an apple tile", () => {
    const grid = blankGrid("tile_tree_oak");
    const s0 = { ...createInitialState(), grid, tools: { ...createInitialState().tools, golden_apple: 1 } };
    const s1 = useTool(s0, "golden_apple");
    expect(countKey(s1.grid, "tile_tree_oak")).toBe(0);
    expect(countKey(s1.grid, "tile_fruit_apple")).toBe(ROWS * COLS);
  });

  it("golden_carrot turns every grass tile into a carrot tile", () => {
    const grid = blankGrid("tile_grass_hay");
    const s0 = { ...createInitialState(), grid, tools: { ...createInitialState().tools, golden_carrot: 1 } };
    const s1 = useTool(s0, "golden_carrot");
    expect(countKey(s1.grid, "tile_grass_hay")).toBe(0);
    expect(countKey(s1.grid, "tile_veg_carrot")).toBe(ROWS * COLS);
  });

  it("golden_idol turns every grass tile into a cow tile", () => {
    const grid = blankGrid("tile_grass_hay");
    const s0 = { ...createInitialState(), grid, tools: { ...createInitialState().tools, golden_idol: 1 } };
    const s1 = useTool(s0, "golden_idol");
    expect(countKey(s1.grid, "tile_cattle_cow")).toBe(ROWS * COLS);
  });

  it("golden_sheep turns every grass tile into a sheep tile", () => {
    const grid = blankGrid("tile_grass_hay");
    const s0 = { ...createInitialState(), grid, tools: { ...createInitialState().tools, golden_sheep: 1 } };
    const s1 = useTool(s0, "golden_sheep");
    expect(countKey(s1.grid, "tile_herd_sheep")).toBe(ROWS * COLS);
  });

  it("philosophers_stone turns every stone tile into a gold tile", () => {
    const grid = blankGrid("tile_mine_stone");
    const s0 = { ...createInitialState(), grid, tools: { ...createInitialState().tools, philosophers_stone: 1 } };
    const s1 = useTool(s0, "philosophers_stone");
    expect(countKey(s1.grid, "tile_mine_stone")).toBe(0);
    expect(countKey(s1.grid, "tile_mine_gold")).toBe(ROWS * COLS);
  });
});

describe("Phase 3 — tap-target tools arm then fire", () => {
  it("magnet arms transform_adjacent and converts in-radius ore on TOOL_FIRED", () => {
    const grid = blankGrid();
    grid[1][1].key = "tile_mine_coal";
    grid[2][2].key = "tile_mine_gold";
    grid[2][3].key = "tile_mine_iron_ore";
    grid[4][4].key = "tile_mine_coal"; // outside radius 1 from (2,2)
    const s0 = { ...createInitialState(), grid, tools: { ...createInitialState().tools, magnet: 1 } };
    const armed = useTool(s0, "magnet");
    expect(armed.toolPendingPower?.id).toBe("transform_adjacent");
    expect(armed.tools.magnet).toBe(1); // deferred

    const fired = rootReducer(armed, { type: "TOOL_FIRED", key: "magnet", row: 2, col: 2 });
    // In-radius ores → stone
    expect(fired.grid[1][1].key).toBe("tile_mine_stone");
    expect(fired.grid[2][2].key).toBe("tile_mine_stone");
    expect(fired.grid[2][3].key).toBe("tile_mine_stone");
    // Out-of-radius ore preserved
    expect(fired.grid[4][4].key).toBe("tile_mine_coal");
    // Charge consumed on fire
    expect(fired.tools.magnet).toBe(0);
  });

  it("coal_transmuter arms then converts in-radius stone/ore into coal", () => {
    const grid = blankGrid();
    grid[2][2].key = "tile_mine_stone";
    grid[2][3].key = "tile_mine_iron_ore";
    grid[3][2].key = "tile_mine_gold";
    grid[5][5].key = "tile_mine_stone"; // outside radius
    const s0 = { ...createInitialState(), grid, tools: { ...createInitialState().tools, coal_transmuter: 1 } };
    const armed = useTool(s0, "coal_transmuter");
    expect(armed.toolPendingPower?.id).toBe("transform_adjacent");

    const fired = rootReducer(armed, { type: "TOOL_FIRED", key: "coal_transmuter", row: 2, col: 2 });
    expect(fired.grid[2][2].key).toBe("tile_mine_coal");
    expect(fired.grid[2][3].key).toBe("tile_mine_coal");
    expect(fired.grid[3][2].key).toBe("tile_mine_coal");
    expect(fired.grid[5][5].key).toBe("tile_mine_stone");
    expect(fired.tools.coal_transmuter).toBe(0);
  });
});

describe("Phase 3 — magic-tier tools resolve via ITEMS[key].power lookup", () => {
  it("miners_hat reveals hidden ore tiles when the field is present", () => {
    const grid = blankGrid();
    grid[1][1] = { key: "tile_mine_coal", hidden: true };
    grid[2][2] = { key: "tile_mine_gold", hidden: true };
    grid[3][3] = { key: "tile_mine_stone", hidden: true }; // not in reveal target
    const s0 = { ...createInitialState(), grid, tools: { ...createInitialState().tools, miners_hat: 1 } };
    const s1 = useTool(s0, "miners_hat");
    expect(s1.grid[1][1].hidden).toBe(false);
    expect(s1.grid[2][2].hidden).toBe(false);
    // Stone is not in the reveal target (["coal","iron","gold","gem"]).
    expect(s1.grid[3][3].hidden).toBe(true);
    expect(s1.tools.miners_hat).toBe(0);
  });
});
