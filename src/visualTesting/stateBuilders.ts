import { getItem } from "../constants.js";
import { parseHash } from "../router.js";
import { createFreshState } from "../state/init.js";
import { defaultTileCollectionSlice } from "../state/helpers.js";
import { TILE_TYPES, CATEGORIES } from "../features/tileCollection/data.js";
import { findBeat, INITIAL_STORY_STATE } from "../story.js";
import { initialFlagState } from "../flags.js";
import * as runSummarySlice from "../features/runSummary/slice.js";
import type { GameState, Grid } from "../types/state.js";
import type { VisualScenario } from "./matrix.js";

/**
 * Synthetic visual-test state. We deliberately keep this looser than the
 * canonical `GameState`: the harness builds *fragments* of state (no save
 * version, sometimes no biome, sometimes additional UI-only fields like
 * `runSummary`, `bespokeSeasonWidget`, etc). Builders compose by spreading,
 * so an open shape with an index signature is more practical than the
 * full GameState surface.
 */
export type VisualStateTree = Partial<GameState> & { [k: string]: unknown };

export const VISUAL_FIXED_NOW = 1_700_000_000_000;

const HOME_PLOTS = {
  0: "hearth",
  1: "mill",
  2: "bakery",
  3: "inn",
  4: "granary",
  5: "larder",
  6: "forge",
  7: "caravan_post",
  8: "kitchen",
  9: "workshop",
  10: "powder_store",
  11: "portal",
};

const MINE_PLOTS = {
  0: "hearth",
  1: "kitchen",
  2: "workshop",
  3: "forge",
  4: "barn",
  5: "powder_store",
  6: "inn",
  7: "housing",
};

const HARBOR_PLOTS = {
  0: "hearth",
  1: "harbor_dock",
  2: "fishmonger",
  3: "smokehouse",
  4: "inn",
  5: "caravan_post",
  6: "housing",
  7: "housing2",
};

function builtFromPlots(plots: Record<string, string>, extras: Record<string, unknown> = {}): Record<string, unknown> {
  const out: Record<string, unknown> = { decorations: {}, _plots: { ...plots }, ...extras };
  for (const id of Object.values(plots)) out[id] = true;
  return out;
}

function quietStory(extraFlags = {}) {
  return {
    ...INITIAL_STORY_STATE,
    flags: {
      ...initialFlagState(),
      intro_seen: true,
      _fired_act1_arrival: true,
      ...extraFlags,
    },
    queuedBeat: null,
    beatQueue: [],
    choiceLog: [],
    sandbox: false,
  };
}

function fullTileCollection(overrides = {}) {
  const tc = defaultTileCollectionSlice();
  const discovered = { ...tc.discovered };
  const researchProgress = { ...tc.researchProgress };
  const activeByCategory = { ...tc.activeByCategory };
  for (const tile of TILE_TYPES) {
    discovered[tile.id] = true;
    if (activeByCategory[tile.category] == null) activeByCategory[tile.category] = tile.id;
    if (tile.discovery?.method === "research") researchProgress[tile.id] = tile.discovery.researchAmount ?? 1;
  }
  return {
    discovered,
    researchProgress,
    activeByCategory,
    freeMoves: 0,
    ...overrides,
  };
}

/**
 * Visual orders use stable string ids (so the harness can target them) and
 * a `_visualHave` field that's read by builders to populate inventory; only
 * the `_visualHave` is not on the canonical `Order` type. We expose the
 * synthetic shape to builders, then store as `Order` once `_visualHave` has
 * been consumed.
 */
interface VisualOrder {
  id: string;
  npc: string;
  key: string;
  need: number;
  amount: number;
  reward: number;
  baseReward: number;
  line: string;
  _visualHave: number;
  [extra: string]: unknown;
}

function order(id: string, npc: string, key: string, need: number, have: number, reward = 80): VisualOrder {
  return {
    id,
    npc,
    key,
    need,
    amount: need,
    reward,
    baseReward: reward,
    line: `Could you bring ${need} ${getItem(key)?.label ?? key}?`,
    _visualHave: have,
  };
}

function visualOrders() {
  return [
    order("order-ready", "mira", "tile_grass_grass", 12, 40, 90),
    order("order-partial", "tomas", "plank", 18, 8, 130),
    order("order-crafted", "bram", "bread", 2, 3, 180),
  ];
}

function visualQuests() {
  return [
    { id: "quest-incomplete", category: "collect", label: "Harvest 30 hay", progress: 12, target: 30, reward: { coins: 50, almanacXp: 10 }, claimed: false },
    { id: "quest-claimable", category: "order", label: "Deliver 1 order", progress: 1, target: 1, reward: { coins: 75, almanacXp: 20 }, claimed: false },
    { id: "quest-claimed", category: "chain", label: "Chain 5 resources", progress: 5, target: 5, reward: { coins: 40, almanacXp: 10 }, claimed: true },
  ];
}

function richInventory() {
  return {
    supplies: 12,
    tile_grass_grass: 40,
    tile_grain_wheat: 22,
    flour: 12,
    tile_tree_oak: 28,
    plank: 80,
    tile_fruit_blackberry: 19,
    jam: 5,
    tile_mine_stone: 95,
    tile_mine_iron_ore: 36,
    iron_bar: 24,
    tile_mine_coal: 30,
    tile_mine_gem: 8,
    eggs: 12,
    tile_fruit_apple: 14,
    bread: 3,
    soup: 7,
    meat: 4,
    tile_fish_sardine: 12,
    fish_fillet: 9,
  };
}

/** Rich inventory mirrored into every founded settlement bucket for visual scenarios. */
function allZoneInventory(patch: Record<string, number> = {}) {
  const inv = { ...richInventory(), ...patch };
  return { home: inv, meadow: inv, quarry: inv, harbor: inv };
}

interface ParsedRoute {
  view?: string;
  modal?: string | null;
  viewParams?: Record<string, unknown>;
  modalParams?: Record<string, unknown>;
}

function applyRoute(state: VisualStateTree, scenario: VisualScenario): VisualStateTree {
  const hash = scenario.hash ?? null;
  let next: VisualStateTree = { ...state };
  if (hash) {
    const route = parseHash(hash) as ParsedRoute;
    const modalParamsTab = (route.modalParams as { tab?: string } | undefined)?.tab;
    const viewParamsTab = (route.viewParams as { tab?: string } | undefined)?.tab;
    next = {
      ...next,
      view: route.view ?? next.view,
      modal: route.modal ?? null,
      viewParams: route.viewParams ?? {},
      settingsTab: route.modal === "menu" ? modalParamsTab ?? "main" : (next as { settingsTab?: string }).settingsTab ?? "main",
      craftingTab: route.view === "crafting"
        ? viewParamsTab ?? (next as { craftingTab?: string | null }).craftingTab ?? null
        : (next as { craftingTab?: string | null }).craftingTab ?? null,
    };
  }
  if (scenario.view) {
    next.view = scenario.view;
    next.viewParams = scenario.viewParams ?? {};
    next.modal = scenario.modal ?? null;
  }
  return next;
}

function baseState(): VisualStateTree {
  const state = createFreshState({ saveSeed: "visual-seed-0001" });
  const orders = visualOrders();
  const homeInv: Record<string, number> = { ...(state.inventory.home ?? {}) };
  for (const o of orders) homeInv[o.key] = o._visualHave;
  const inventory = { ...state.inventory, home: homeInv };
  return {
    ...state,
    saveSeed: "visual-seed-0001",
    coins: 150,
    level: 1,
    xp: 0,
    view: "town",
    viewParams: {},
    modal: null,
    bubble: null,
    // The visual harness uses string order ids so DOM queries can target
    // them; the canonical Order.id is numeric. We keep the structural shape
    // loose at the state-tree boundary.
    orders: orders as unknown as GameState["orders"],
    quests: visualQuests() as unknown as GameState["quests"],
    inventory,
    story: quietStory(),
    market: { seed: 42, season: 0, prices: {}, prevPrices: null },
    built: { home: builtFromPlots({ 0: "hearth" }) },
    mapCurrent: "home",
    activeZone: "home",
    mapVisited: ["home", "meadow", "orchard"],
    mapDiscovered: ["home", "meadow", "orchard", "crossroads", "quarry", "harbor", "oldcapital"],
    settlements: { home: { founded: true, biome: "prairie" } },
    tileCollection: defaultTileCollectionSlice() as GameState["tileCollection"],
    runSummary: runSummarySlice.initial.runSummary,
  };
}

function richState(): VisualStateTree {
  const state = baseState();
  const unlocked = { ...(state.achievements?.unlocked ?? {}) };
  Object.keys(unlocked).slice(0, 4).forEach((key) => { unlocked[key] = true; });
  return {
    ...state,
    coins: 12_500,
    level: 8,
    xp: 120,
    runes: 9,
    gems: 4,
    embers: 12,
    coreIngots: 9,
    influence: 180,
    inventory: allZoneInventory(),
    tools: {
      ...state.tools,
      clear: 5,
      basic: 4,
      rare: 3,
      shuffle: 2,
      bomb: 3,
      fertilizer: 2,
      magic_wand: 1,
      hourglass: 1,
      magic_seed: 1,
      magic_fertilizer: 0,
    },
    built: {
      home: builtFromPlots(HOME_PLOTS, { housing: true, housing2: true, housing3: true, silo: true }),
      meadow: builtFromPlots({ 0: "hearth", 1: "mill", 2: "granary", 3: "bakery" }),
      quarry: builtFromPlots(MINE_PLOTS),
      harbor: builtFromPlots(HARBOR_PLOTS),
    },
    settlements: {
      home: { founded: true, biome: "prairie", keeperPath: "coexist" },
      meadow: { founded: true, biome: "forest", keeperPath: "coexist" },
      quarry: { founded: true, biome: "mountain", keeperPath: "driveout" },
      harbor: { founded: true, biome: "coastal" },
    },
    story: quietStory({
      first_harvest: true,
      hearth_lit: true,
      first_order: true,
      granary_built: true,
      bram_arrived: true,
      keeper_home_coexist: true,
      keeper_meadow_coexist: true,
      keeper_quarry_driveout: true,
      frostmaw_defeated: true,
      ember_drake_active: true,
    }),
    npcs: {
      roster: ["wren", "mira", "tomas", "bram", "liss"],
      bonds: { wren: 7.2, mira: 9.1, tomas: 5.8, bram: 6.4, liss: 4.2 },
      giftCooldown: { wren: 0, mira: 0, tomas: 0, bram: 0, liss: 0 },
    },
    workers: { hired: { farmer: 2, lumberjack: 1, miner: 1, baker: 3 } },
    tileCollection: fullTileCollection(),
    almanac: { xp: 260, level: 3, claimed: { 1: true, 2: false, 3: false, 4: false, 5: false } },
    almanacClaimed: [1],
    achievements: {
      ...(state.achievements ?? { counters: {}, unlocked: {}, seenResources: {}, seenBuildings: {} }),
      counters: {
        ...(state.achievements?.counters ?? {}),
        chains_committed: 12,
        orders_fulfilled: 3,
        bosses_defeated: 1,
        distinct_resources_chained: 7,
        distinct_buildings_built: 8,
        supplies_converted: 4,
      },
      unlocked,
    },
    collected: {
      tile_grass_grass: 120,
      tile_grain_wheat: 44,
      tile_tree_oak: 31,
      plank: 18,
      tile_mine_stone: 75,
      tile_mine_iron_ore: 22,
      tile_fish_sardine: 9,
    },
  };
}

type GridCellInput = string | { key: string; [k: string]: unknown };

function grid(rows: GridCellInput[][]): Grid {
  return rows.map((row) => row.map((cell) => (typeof cell === "string" ? { key: cell } : { ...cell }))) as Grid;
}

const farmGrid = grid([
  ["tile_grass_grass", "tile_grass_grass", "tile_grass_grass", "tile_grass_grass", "tile_grass_grass", "tile_grass_grass"],
  ["tile_grass_grass", "tile_grass_grass", "tile_grass_grass", "tile_grass_grass", "tile_grass_grass", "tile_grass_grass"],
  ["tile_grain_wheat", "tile_veg_carrot", "tile_fruit_apple", "tile_tree_oak", "tile_herd_pig", "tile_cattle_cow"],
  ["tile_grain_wheat", "tile_veg_carrot", "tile_fruit_apple", "tile_tree_oak", "tile_herd_pig", "tile_cattle_cow"],
  ["tile_flower_pansy", "tile_bird_pheasant", "tile_mount_horse", "tile_grain_wheat", "tile_veg_carrot", "tile_fruit_apple"],
  ["tile_flower_pansy", "tile_bird_pheasant", "tile_mount_horse", "tile_grain_wheat", "tile_veg_carrot", "tile_fruit_apple"],
]);

const mineGrid = grid([
  ["tile_mine_stone", "tile_mine_stone", "tile_mine_iron_ore", "tile_mine_coal", "tile_mine_gem", "tile_special_dirt"],
  ["tile_mine_stone", "tile_mine_iron_ore", "tile_mine_iron_ore", "tile_mine_coal", "tile_mine_gem", "tile_special_dirt"],
  ["tile_mine_stone", "tile_mine_stone", "tile_mine_iron_ore", "tile_mine_coal", "tile_mine_gem", "tile_special_dirt"],
  ["tile_mine_stone", "tile_mine_iron_ore", "tile_mine_coal", "tile_mine_coal", "tile_mine_gem", "tile_special_dirt"],
  ["tile_mine_stone", "tile_mine_stone", "tile_mine_iron_ore", "tile_mine_coal", "tile_mine_gem", "tile_special_dirt"],
  ["tile_mine_stone", "tile_mine_iron_ore", "tile_mine_iron_ore", "tile_mine_coal", "tile_mine_gem", "tile_special_dirt"],
]);

const fishGrid = grid([
  ["tile_fish_sardine", "tile_fish_sardine", "tile_fish_mackerel", "tile_fish_clam", "tile_fish_kelp", "tile_fish_oyster"],
  ["tile_fish_sardine", "tile_fish_mackerel", "tile_fish_mackerel", "tile_fish_clam", "tile_fish_kelp", "tile_fish_oyster"],
  ["tile_fish_sardine", "tile_fish_sardine", "tile_fish_mackerel", "tile_fish_clam", "tile_fish_kelp", "tile_fish_oyster"],
  ["tile_fish_sardine", "tile_fish_mackerel", "tile_fish_clam", "tile_fish_clam", "tile_fish_kelp", "tile_fish_oyster"],
  ["tile_fish_sardine", "tile_fish_sardine", "tile_fish_mackerel", "tile_fish_clam", "tile_fish_kelp", "tile_fish_oyster"],
  ["tile_fish_sardine", "tile_fish_mackerel", "tile_fish_mackerel", "tile_fish_clam", "tile_fish_kelp", "tile_fish_oyster"],
]);

function boardState(kind: "farm" | "mine" | "fish" = "farm"): VisualStateTree {
  const rich = richState();
  const biomeKey = kind === "mine" ? "mine" : kind === "fish" ? "fish" : "farm";
  const zoneId = kind === "mine" ? "quarry" : kind === "fish" ? "harbor" : "home";
  const boardGrid = kind === "mine" ? mineGrid : kind === "fish" ? fishGrid : farmGrid;
  return {
    ...rich,
    view: "board",
    modal: null,
    biomeKey,
    biome: biomeKey,
    mapCurrent: zoneId,
    activeZone: zoneId,
    grid: boardGrid,
    turnsUsed: 2,
    farmRun: {
      zoneId,
      turnBudget: 10,
      turnsRemaining: 8,
      startedAt: VISUAL_FIXED_NOW,
      mode: kind === "farm" ? "normal" : "expedition",
    },
    session: (kind === "farm"
      ? { selectedTiles: ["grass", "grain", "trees", "birds", "vegetables", "fruits"], fertilizerUsed: false }
      : { selectedTiles: [], fertilizerUsed: false, expedition: { zoneId, supply: { supplies: 4 }, turns: 10 } }) as GameState["session"],
  };
}

// Mid-season variant of boardState — `turnsUsed` lands the season indicator
// inside a specific season (Spring 0-1, Summer 2-4, Autumn 5-6, Winter 7-9
// with the default 10-turn budget) and `bespoke` flips the season widget.
function boardWithSeason(turnsUsed: number, bespoke: boolean) {
  const base = boardState("farm") as Record<string, unknown> & { farmRun?: { turnsRemaining?: number } };
  const baseSettings = (base.settings as Record<string, unknown> | undefined) ?? {};
  return {
    ...base,
    turnsUsed,
    farmRun: { ...(base.farmRun ?? {}), turnsRemaining: 10 - turnsUsed },
    settings: { ...baseSettings, bespokeSeasonWidget: !!bespoke },
  };
}

function withBeat(state: VisualStateTree, beatId: string): VisualStateTree {
  const beat = findBeat(beatId);
  const story = (state.story ?? {}) as Record<string, unknown>;
  return {
    ...state,
    story: {
      ...story,
      queuedBeat: beat ? { ...beat } : null,
      beatQueue: [],
    },
    modal: null,
  };
}

function withRunSummary(state: VisualStateTree): VisualStateTree {
  return {
    ...state,
    modal: "runSummary",
    runSummary: {
      open: true,
      biome: "farm",
      zoneId: "home",
      mode: "normal",
      turnsAtStart: 10,
      chainsPlayed: 5,
      biggestChain: { count: 12, key: "tile_grass_grass", coinGain: 28, upgrades: 2, gained: 12 },
      totalUpgrades: 4,
      totalCoinGain: 140,
      resourcesGained: { tile_grass_grass: 34, tile_grain_wheat: 8, tile_fruit_apple: 5 },
      bondsAtStart: { wren: 5, mira: 5 },
      bondDeltas: { wren: 0.5, mira: 0.3 },
      beatsTriggered: [{ id: "act1_first_harvest", title: "The First Harvest" }],
      suppliesConsumed: {},
      fertilizerUsed: true,
    },
  };
}

function profileState(profile: string): VisualStateTree {
  switch (profile) {
    case "fresh": return baseState();
    case "rich": return richState();
    case "bubble": return { ...richState(), bubble: { id: 101, npc: "wren", text: "A visual check toast is on the wind.", ms: 10_000 } };
    case "buildReady": return { ...richState(), built: { ...richState().built, home: builtFromPlots({ 0: "hearth" }) } };
    case "lowResource": return { ...baseState(), coins: 25, level: 1, inventory: { home: { supplies: 0 } } };
    case "unfoundedBlocked": return { ...richState(), mapCurrent: "orchard", activeZone: "orchard", settlements: { home: { founded: true, biome: "prairie" } }, coins: 50 };
    case "unfoundedReady": return { ...richState(), mapCurrent: "meadow", activeZone: "meadow", settlements: { home: { founded: true, biome: "prairie", keeperPath: "coexist" } } };
    case "mineTown": return { ...richState(), mapCurrent: "quarry", activeZone: "quarry", biomeKey: "mine", biome: "mine" };
    case "harborTown": return { ...richState(), mapCurrent: "harbor", activeZone: "harbor", biomeKey: "fish", biome: "fish" };
    case "fertilizerEntry": return { ...richState(), tools: { ...richState().tools, fertilizer: 3 } };
    case "farmDangersEntry": return { ...richState(), mapCurrent: "meadow", activeZone: "meadow", settlements: { ...richState().settlements, meadow: { founded: true, biome: "prairie" } } };
    case "mineLocked": return { ...baseState(), level: 1, mapCurrent: "quarry", activeZone: "quarry", settlements: { home: { founded: true, biome: "prairie" }, quarry: { founded: true, biome: "mountain" } } };
    case "mineTownNoFood": return { ...richState(), level: 2, mapCurrent: "quarry", activeZone: "quarry", inventory: { ...allZoneInventory(), quarry: { ...richInventory(), supplies: 0, bread: 0, tile_fruit_apple: 0 } } };
    case "mineTownFood": return { ...richState(), level: 2, mapCurrent: "quarry", activeZone: "quarry" };
    case "harborTownFood": return { ...richState(), level: 3, mapCurrent: "harbor", activeZone: "harbor", biomeKey: "fish" };
    case "boardFarm": return boardState("farm");
    case "boardFarmLong": return { ...boardState("farm"), grid: farmGrid };
    case "boardFarmBoss": return { ...boardState("farm"), boss: { key: "frostmaw", name: "The Frostmaw", emoji: "❄️", resource: "tile_tree_oak", targetCount: 30, progress: 8, turnsLeft: 6, minChain: 5, goal: "Bring 30 logs in 10 turns.", description: null, modifierDescription: null, spawnBias: null, modifier: { type: "", params: {} } } };
    case "boardFarmHazards": return { ...boardState("farm"), hazards: { ...boardState("farm").hazards, fire: { cells: [{ row: 0, col: 4 }, { row: 1, col: 4 }] }, rats: [{ row: 4, col: 0, age: 1 }, { row: 4, col: 1, age: 1 }, { row: 5, col: 0, age: 1 }] } };
    case "boardFarmBomb": return { ...boardState("farm"), toolPending: "bomb", toolPendingPower: { id: "area_blast", params: { radius: 1 }, tint: 0xff4444 }, tools: { ...boardState("farm").tools, bomb: 3 } };
    case "boardFarmSickle": return { ...boardState("farm"), toolPending: "sickle", toolPendingPower: { id: "clear_row", params: {}, tint: 0xff9900 }, tools: { ...boardState("farm").tools, sickle: 2 } };
    case "boardFarmRake": return { ...boardState("farm"), toolPending: "rake", toolPendingPower: { id: "clear_component", params: {}, tint: 0x88ff88 }, tools: { ...boardState("farm").tools, rake: 2 } };
    case "boardFarmFertilizer": return { ...boardState("farm"), fillBiasTarget: { key: "tile_grain_wheat" }, magicFertilizerCharges: 3, session: { selectedTiles: ["grass", "grain"], fertilizerUsed: true } };
    case "boardMine": return boardState("mine");
    case "boardMineHazards": {
      const st = boardState("mine");
      const grid0 = (st.grid ?? []) as Grid;
      const g = grid0.map((row) => row.map((cell) => ({ ...cell }))) as Grid;
      g[1][1] = { key: "tile_mine_stone", rubble: true };
      g[2][2] = { key: "mysterious_ore" };
      g[3][3] = { key: "lava" };
      return { ...st, grid: g, hazards: { ...(st.hazards ?? {}), caveIn: { row: 1, col: 1 }, gasVent: { row: 0, col: 3, turnsLeft: 3 }, lava: { cells: [{ row: 3, col: 3 }], turnsToSpread: 1 } }, mysteriousOre: { row: 2, col: 2 } };
    }
    case "boardFish": return boardState("fish");
    case "boardSeasonSpringWheel":   return boardWithSeason(1, false);
    case "boardSeasonSpringBespoke": return boardWithSeason(1, true);
    case "boardSeasonSummerWheel":   return boardWithSeason(3, false);
    case "boardSeasonSummerBespoke": return boardWithSeason(3, true);
    case "boardSeasonAutumnWheel":   return boardWithSeason(5, false);
    case "boardSeasonAutumnBespoke": return boardWithSeason(5, true);
    case "boardSeasonWinterWheel":   return boardWithSeason(8, false);
    case "boardSeasonWinterBespoke": return boardWithSeason(8, true);
    case "boardFishPearl": {
      const st = boardState("fish");
      const grid0 = (st.grid ?? []) as Grid;
      const g = grid0.map((row) => row.map((cell) => ({ ...cell }))) as Grid;
      g[2][2] = { key: "tile_special_giant_pearl" };
      return { ...st, grid: g, fish: { tide: "low", tideTurn: 2 }, fishPearl: { row: 2, col: 2 } };
    }
    case "boardBossMinimized": return { ...boardState("farm"), bossMinimized: true, boss: { key: "quagmire", name: "The Quagmire", emoji: "🌿", resource: "tile_grass_grass", targetCount: 50, progress: 22, turnsLeft: 4, goal: "Drain the bog: harvest 50 hay.", description: null, modifierDescription: null, minChain: null, spawnBias: null, modifier: { type: "", params: {} } } };
    case "boardBossWeather": return { ...boardState("fish"), boss: { key: "storm", name: "The Storm", emoji: "🌩", resource: "fish_fillet", targetCount: 6, progress: 2, turnsLeft: 5, minChain: 4, goal: "Land 6 fish fillets in 10 turns. Short chains slip the line.", description: null, modifierDescription: "Chains of fewer than 4 fish tiles slip the line: they consume a turn but yield nothing.", spawnBias: null, modifier: { type: "", params: {} } }, fish: { tide: "high", tideTurn: 3 } };
    case "craftQueue": {
      // Multi-station queue snapshot: bakery has two stacked, forge has
      // one mid-progress, larder has a ready-to-claim item. Anchored to
      // VISUAL_FIXED_NOW so buildVisualState remains deterministic across
      // repeated calls (matches the rest of the visual matrix). Note: the
      // queue UI compares each `readyAt` against real wall-clock time, so
      // every entry will render as "ready" when this scenario is loaded
      // live — the DOM is still deterministic for the visual diff suite.
      const NOW = VISUAL_FIXED_NOW;
      const MIN = 60_000;
      const SEC = 1_000;
      // Bakery: head mid-progress, one waiting behind it.
      const bread     = { key: "bread",     queuedAt: NOW - 90 * SEC, startAt: NOW - 90 * SEC, readyAt: NOW + 30 * SEC,            durationMs: 2 * MIN };
      const honeyroll = { key: "honeyroll", queuedAt: NOW - 90 * SEC, startAt: bread.readyAt,  readyAt: bread.readyAt + 20 * MIN,  durationMs: 20 * MIN };
      // Forge: a long iron hinge mid-progress.
      const ironHinge = { key: "iron_hinge", queuedAt: NOW - 5 * MIN, startAt: NOW - 5 * MIN, readyAt: NOW + 40 * MIN, durationMs: 45 * MIN };
      // Larder: a ready-to-claim preserve.
      const preserve  = { key: "preserve",  queuedAt: NOW - 5 * MIN, startAt: NOW - 5 * MIN, readyAt: NOW - 2 * SEC, durationMs: 4 * MIN };
      return {
        ...richState(),
        gems: 3,
        craftQueues: {
          bakery: [bread, honeyroll],
          forge:  [ironHinge],
          larder: [preserve],
        },
      };
    }
    case "portalInsufficient": return { ...richState(), influence: 10, tools: { ...richState().tools, magic_wand: 0, hourglass: 0, magic_seed: 0, magic_fertilizer: 0 } };
    case "marketNews": return { ...richState(), bubble: { id: 202, npc: "tomas", text: "Market News: Wood Shortage! Timber supplies are low. Logs and Planks are worth double!", ms: 10_000 }, market: { ...(richState().market ?? { seed: 0, season: 0, prices: {}, prevPrices: null }), season: 2, event: { id: "wood_shortage", label: "Wood Shortage", desc: "Timber supplies are low. Logs and Planks are worth double!", mults: { tile_tree_oak: 2, plank: 2 } } } };
    case "tileActivate": return { ...richState(), tileCollection: fullTileCollection({ activeByCategory: { ...fullTileCollection().activeByCategory, grass: "tile_grass_grass" } }) };
    case "tileBuy": {
      const tc = fullTileCollection();
      delete tc.discovered.tile_bird_clover;
      tc.activeByCategory.flowers = "tile_flower_pansy";
      return { ...richState(), coins: 1_000, tileCollection: tc };
    }
    case "tileResearch": {
      const tc = fullTileCollection();
      delete tc.discovered.tile_grass_spiky;
      tc.researchProgress.tile_grass_spiky = 32;
      return { ...richState(), tileCollection: tc };
    }
    case "tileFreeMoves": return { ...richState(), tileCollection: fullTileCollection({ freeMoves: 3 }) };
    case "mapReady": return { ...richState(), mapCurrent: "home", activeZone: "home", level: 2, mapVisited: ["home"], mapDiscovered: ["home", "meadow", "orchard"] };
    case "mapLevelLocked": return { ...richState(), level: 1, mapCurrent: "home", activeZone: "home", mapVisited: ["home"], mapDiscovered: ["home", "meadow", "orchard"] };
    case "mapUnreachable": return { ...richState(), level: 8, mapCurrent: "home", activeZone: "home", mapVisited: ["home"], mapDiscovered: ["home", "meadow", "orchard", "quarry"] };
    case "mapComplete": return richState();
    case "mapFounder": return { ...richState(), mapVisited: ["home", "meadow"], settlements: { home: { founded: true, biome: "prairie", keeperPath: "coexist" } } };
    case "mapKeeper": return { ...richState(), settlements: { ...richState().settlements, meadow: { founded: true, biome: "forest" } }, built: { ...richState().built, meadow: builtFromPlots({ 0: "hearth", 1: "mill", 2: "granary", 3: "bakery" }) } };
    case "mapCapitalLocked": return { ...richState(), heirlooms: { heirloomSeed: 1, pactIron: 0, tidesingerPearl: 0 } };
    case "mapCapitalReady": return { ...richState(), heirlooms: { heirloomSeed: 1, pactIron: 1, tidesingerPearl: 1, seed: 1, iron: 1, pearl: 1 } };
    case "storyProgressed": return { ...richState(), story: quietStory({ first_harvest: true, hearth_lit: true, first_order: true, granary_built: true, bram_arrived: true }) };
    case "charter": {
      const r = richState();
      const story = (r.story ?? {}) as { flags?: Record<string, unknown>; [k: string]: unknown };
      return {
        ...r,
        turnsUsed: 27,
        story: {
          ...story,
          flags: { ...(story.flags ?? {}), keeper_path_driveout: true, keeper_path_coexist: true },
          choiceLog: [
            { beatId: "act1_arrival", choiceId: "continue", ts: VISUAL_FIXED_NOW - 300_000, value: "Hearthwood Vale" },
            { beatId: "frostmaw_keeper", choiceId: "drive_out", ts: VISUAL_FIXED_NOW - 200_000 },
            { beatId: "mira_letter_1", choiceId: "send", ts: VISUAL_FIXED_NOW - 100_000 },
          ],
        },
      };
    }
    case "bossGallery": return { ...richState(), story: quietStory({ frostmaw_defeated: true, ember_drake_active: true }) };
    case "bossModal": return { ...richState(), modal: "boss", boss: { key: "frostmaw", name: "The Frostmaw", emoji: "❄️", resource: "tile_tree_oak", targetCount: 30, progress: 11, turnsLeft: 7, minChain: 5, goal: "Bring 30 logs in 10 turns to keep the hearth lit.", flavor: "A frozen titan stirs in the deep winter wood.", description: null, modifierDescription: null, spawnBias: null, modifier: { type: "", params: {} } } };
    case "runSummary": return withRunSummary(richState());
    case "boons": return { ...richState(), story: quietStory({ keeper_anyzone_coexist: true, keeper_anyzone_driveout: true }), boons: { deer_blessing: true } };
    case "storyBar": return withBeat(richState(), "act1_light_hearth");
    case "storyChoices": return withBeat(richState(), "frostmaw_keeper");
    case "storyPrompt": return withBeat(richState(), "act1_arrival");
    case "storyWin": return withBeat({ ...richState(), story: quietStory({ isWon: true }) }, "act3_win");
    case "tutorialCenter": return { ...richState(), tutorial: { active: true, step: 0, seen: false }, modal: null, story: quietStory() };
    case "tutorialCorner": return { ...boardState("farm"), tutorial: { active: true, step: 1, seen: false }, modal: null, story: quietStory() };
    // Inventory progress display scenarios (Task D)
    case "inventoryMidProgress": return {
      ...richState(),
      inventory: { ...allZoneInventory(), home: { ...richInventory(), hay_bundle: 0 } },
      resourceProgress: { home: { hay_bundle: 4 } },
    };
    case "inventoryFullWithProgress": return {
      ...richState(),
      inventory: { ...allZoneInventory(), home: { ...richInventory(), eggs: 15 } },
      resourceProgress: { home: { eggs: 2 } },
    };
    default: return richState();
  }
}

export function buildVisualState(scenario: VisualScenario): VisualStateTree {
  const profile = scenario.state ?? "fresh";
  const state = profileState(profile);
  return applyRoute(state, scenario);
}

export function validateVisualState(state: VisualStateTree | null | undefined): string[] {
  if (!state || typeof state !== "object") return ["state is not an object"];
  const errors: string[] = [];
  const story = state.story as { flags?: Record<string, unknown>; queuedBeat?: unknown } | undefined;
  if (!state.view) errors.push("state.view is missing");
  if (!story?.flags?.intro_seen && !story?.queuedBeat) errors.push("quiet scenario is missing intro_seen");
  if (state.view === "board") {
    if (!state.farmRun?.turnsRemaining) errors.push("board scenario needs an active farmRun");
    if (!Array.isArray(state.grid) || state.grid.length !== 6) errors.push("board scenario needs a 6-row grid");
  }
  const active = (state.tileCollection?.activeByCategory ?? {}) as Record<string, string | null>;
  for (const [category, tileId] of Object.entries(active)) {
    if (!CATEGORIES.includes(category)) errors.push(`unknown tile category ${category}`);
    if (tileId) {
      const tile = TILE_TYPES.find((t) => t.id === tileId);
      if (!tile) errors.push(`unknown active tile ${tileId}`);
      else if (tile.category !== category) errors.push(`${tileId} is not in category ${category}`);
    }
  }
  return errors;
}

export { farmGrid, mineGrid, fishGrid };
