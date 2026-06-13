// Map node positions are in a 0..100 SVG viewBox.
// Each node IS a zone: boards, dangers, entryCost, buildings.

import {
  cloneFarmBoard,
  cloneFishBoard,
  cloneMineBoard,
  farmSeasonDropRow,
  farmSeasonDrops,
  ZONE_UPGRADE_TARGET_GOLD,
  type FarmBoardInstance,
  type FishBoardInstance,
  type MineBoardInstance,
} from "../../config/schemas/boardInstance.js";
import { BuildingId } from "../../types/catalog/buildings.js";
import { SeasonId } from "../../types/catalog/seasons.js";
import { ZoneCategoryId } from "../../types/catalog/tileCategories.js";

export type MapNodeKind = "home" | "farm" | "mine" | "fish" | "festival" | "boss" | "event" | "capital";
export type MapRegionId = "hearth" | "farm" | "mine" | "coast" | "wilds" | "boss" | "capital";
export type BoardKind = "farm" | "mine" | "fish";

export interface ZoneBoards {
  farm?: FarmBoardInstance;
  mine?: MineBoardInstance;
  fish?: FishBoardInstance;
}

export interface MapEntryCost {
  coins?: number;
}

/**
 * Cost to reach a tier rung. Coins are spent from `state.coins`; resources are
 * spent from the zone's own inventory (same shape the BUILD action validates).
 */
export interface ResourceCost {
  coins?: number;
  resources?: Record<string, number>;
}

/**
 * One rung of a zone's settlement-tier ladder. The position in `MapNode.tiers`
 * IS the tier number (0-based); the array length is the zone's rung count.
 *
 *  - `plots`   — TOTAL building plots at this rung (must equal the authored
 *                town map's lot count for `(zone, tier)` — test-enforced).
 *  - `unlocks` — buildings *newly* buildable at this rung. The buildings
 *                available at tier N are the union of `unlocks` for rungs ≤ N,
 *                and that union must equal the node's flat `buildings[]`
 *                superset (test-enforced).
 *  - `upgradeCost` — cost to REACH this rung. Rung 0 (founding) has none.
 */
export interface ZoneTier {
  id: string;
  name: string;
  plots: number;
  unlocks: BuildingId[];
  upgradeCost?: ResourceCost;
}

export interface MapNode {
  id: string;
  name: string;
  kind: MapNodeKind;
  icon: string;
  x: number;
  y: number;
  level: number;
  region: MapRegionId;
  description: string;
  activities: string[];
  boards: ZoneBoards;
  entryCost: MapEntryCost;
  dangers?: string[];
  buildings: BuildingId[];
  plotCount: number;
  requiresHearthTokens?: boolean;
  /** Optional per-zone settlement-tier ladder. Absent → single fixed layout. */
  tiers?: ZoneTier[];
  /**
   * Gate this zone's founding on another zone reaching a tier. Mirrors
   * `requiresHearthTokens` but generalised: e.g. quarry requires home at City.
   */
  requiresZoneTier?: { zone: string; tier: number };
}

export interface MapRegion {
  id: MapRegionId;
  label: string;
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  fill: string;
}

const GOLD = ZONE_UPGRADE_TARGET_GOLD;

const TEMPERATE_FARM_TEMPLATE: FarmBoardInstance = {
  baseTurns: 10,
  upgradeMap: {
    [ZoneCategoryId.Grass]: ZoneCategoryId.Birds,
    [ZoneCategoryId.Grain]: ZoneCategoryId.Vegetables,
    [ZoneCategoryId.Trees]: ZoneCategoryId.Birds,
    [ZoneCategoryId.Birds]: ZoneCategoryId.HerdAnimals,
    [ZoneCategoryId.Vegetables]: ZoneCategoryId.Fruits,
    [ZoneCategoryId.Fruits]: GOLD,
  },
  seasonDrops: farmSeasonDrops({
    [SeasonId.Spring]: farmSeasonDropRow({
      [ZoneCategoryId.Grass]: 0.38,
      [ZoneCategoryId.Grain]: 0.20,
      [ZoneCategoryId.Trees]: 0.20,
      [ZoneCategoryId.Birds]: 0.05,
      [ZoneCategoryId.Vegetables]: 0.13,
      [ZoneCategoryId.Fruits]: 0.04,
      [ZoneCategoryId.Flowers]: 0,
      [ZoneCategoryId.HerdAnimals]: 0,
      [ZoneCategoryId.Cattle]: 0,
      [ZoneCategoryId.Mounts]: 0,
    }),
    [SeasonId.Summer]: farmSeasonDropRow({
      [ZoneCategoryId.Grass]: 0.12,
      [ZoneCategoryId.Grain]: 0.38,
      [ZoneCategoryId.Trees]: 0.10,
      [ZoneCategoryId.Birds]: 0.15,
      [ZoneCategoryId.Vegetables]: 0.21,
      [ZoneCategoryId.Fruits]: 0.04,
      [ZoneCategoryId.Flowers]: 0,
      [ZoneCategoryId.HerdAnimals]: 0,
      [ZoneCategoryId.Cattle]: 0,
      [ZoneCategoryId.Mounts]: 0,
    }),
    [SeasonId.Autumn]: farmSeasonDropRow({
      [ZoneCategoryId.Grass]: 0.10,
      [ZoneCategoryId.Grain]: 0.15,
      [ZoneCategoryId.Trees]: 0.42,
      [ZoneCategoryId.Birds]: 0.15,
      [ZoneCategoryId.Vegetables]: 0.15,
      [ZoneCategoryId.Fruits]: 0.03,
      [ZoneCategoryId.Flowers]: 0,
      [ZoneCategoryId.HerdAnimals]: 0,
      [ZoneCategoryId.Cattle]: 0,
      [ZoneCategoryId.Mounts]: 0,
    }),
    [SeasonId.Winter]: farmSeasonDropRow({
      [ZoneCategoryId.Grass]: 0.05,
      [ZoneCategoryId.Grain]: 0.05,
      [ZoneCategoryId.Trees]: 0.73,
      [ZoneCategoryId.Birds]: 0.10,
      [ZoneCategoryId.Vegetables]: 0.05,
      [ZoneCategoryId.Fruits]: 0.02,
      [ZoneCategoryId.Flowers]: 0,
      [ZoneCategoryId.HerdAnimals]: 0,
      [ZoneCategoryId.Cattle]: 0,
      [ZoneCategoryId.Mounts]: 0,
    }),
  }),
};

const ORCHARD_FARM_TEMPLATE: FarmBoardInstance = {
  baseTurns: 12,
  upgradeMap: {
    [ZoneCategoryId.Grass]: ZoneCategoryId.Grain,
    [ZoneCategoryId.Grain]: ZoneCategoryId.Vegetables,
    [ZoneCategoryId.Trees]: ZoneCategoryId.Fruits,
    [ZoneCategoryId.Birds]: ZoneCategoryId.HerdAnimals,
    [ZoneCategoryId.Vegetables]: ZoneCategoryId.Fruits,
    [ZoneCategoryId.Fruits]: GOLD,
    [ZoneCategoryId.HerdAnimals]: GOLD,
  },
  seasonDrops: farmSeasonDrops({
    [SeasonId.Spring]: farmSeasonDropRow({
      [ZoneCategoryId.Grass]: 0.10,
      [ZoneCategoryId.Grain]: 0.10,
      [ZoneCategoryId.Trees]: 0.25,
      [ZoneCategoryId.Birds]: 0.10,
      [ZoneCategoryId.Vegetables]: 0.05,
      [ZoneCategoryId.Fruits]: 0.40,
      [ZoneCategoryId.Flowers]: 0,
      [ZoneCategoryId.HerdAnimals]: 0,
      [ZoneCategoryId.Cattle]: 0,
      [ZoneCategoryId.Mounts]: 0,
    }),
    [SeasonId.Summer]: farmSeasonDropRow({
      [ZoneCategoryId.Grass]: 0.05,
      [ZoneCategoryId.Grain]: 0.10,
      [ZoneCategoryId.Trees]: 0.20,
      [ZoneCategoryId.Birds]: 0.20,
      [ZoneCategoryId.Vegetables]: 0.05,
      [ZoneCategoryId.Fruits]: 0.40,
      [ZoneCategoryId.Flowers]: 0,
      [ZoneCategoryId.HerdAnimals]: 0,
      [ZoneCategoryId.Cattle]: 0,
      [ZoneCategoryId.Mounts]: 0,
    }),
    [SeasonId.Autumn]: farmSeasonDropRow({
      [ZoneCategoryId.Grass]: 0.05,
      [ZoneCategoryId.Grain]: 0.10,
      [ZoneCategoryId.Trees]: 0.35,
      [ZoneCategoryId.Birds]: 0.10,
      [ZoneCategoryId.Vegetables]: 0.05,
      [ZoneCategoryId.Fruits]: 0.35,
      [ZoneCategoryId.Flowers]: 0,
      [ZoneCategoryId.HerdAnimals]: 0,
      [ZoneCategoryId.Cattle]: 0,
      [ZoneCategoryId.Mounts]: 0,
    }),
    [SeasonId.Winter]: farmSeasonDropRow({
      [ZoneCategoryId.Grass]: 0.05,
      [ZoneCategoryId.Grain]: 0.05,
      [ZoneCategoryId.Trees]: 0.60,
      [ZoneCategoryId.Birds]: 0.15,
      [ZoneCategoryId.Vegetables]: 0.05,
      [ZoneCategoryId.Fruits]: 0.10,
      [ZoneCategoryId.Flowers]: 0,
      [ZoneCategoryId.HerdAnimals]: 0,
      [ZoneCategoryId.Cattle]: 0,
      [ZoneCategoryId.Mounts]: 0,
    }),
  }),
};

const MINE_BOARD_STANDARD: MineBoardInstance = { baseTurns: 10 };
const MINE_BOARD_EXTENDED: MineBoardInstance = { baseTurns: 12 };
const FISH_BOARD_HARBOR: FishBoardInstance = { baseTurns: 12 };

export const MAP_NODES: MapNode[] = [
  {
    id: "home", name: "Hearthwood Vale", kind: "home", icon: "🏡",
    x: 10, y: 50, level: 1, region: "hearth",
    description: "Your home village. Build, craft, and rest by the hearth.",
    activities: ["Manage town", "Craft & build", "Turn in orders"],
    boards: { farm: cloneFarmBoard(TEMPERATE_FARM_TEMPLATE) },
    entryCost: { coins: 50 },
    dangers: [],
    buildings: [
      BuildingId.Hearth, BuildingId.Mill, BuildingId.Bakery, BuildingId.Inn, BuildingId.Granary, BuildingId.Larder,
      BuildingId.Forge, BuildingId.CaravanPost, BuildingId.Kitchen, BuildingId.Workshop, BuildingId.PowderStore,
      BuildingId.Portal, BuildingId.Housing, BuildingId.Housing2, BuildingId.Housing3, BuildingId.Silo,
      BuildingId.Barn, BuildingId.HarborDock, BuildingId.Fishmonger, BuildingId.Smokehouse,
      BuildingId.ClockTower, BuildingId.Lighthouse, BuildingId.Apothecary, BuildingId.Sawmill,
      BuildingId.Watchtower, BuildingId.Stable, BuildingId.Apiary, BuildingId.Chapel,
      BuildingId.Brewery, BuildingId.Observatory,
    ],
    plotCount: 20,
    // ── Town 1 ladder · 3 rungs (Hamlet → Village → City). The City rung
    // equals today's flat home (20 plots + full buildings), so a fully-grown
    // home is unchanged. Costs/plots are first-pass (see docs/zone-tier-ladder.html).
    tiers: [
      {
        id: "hamlet", name: "Hamlet", plots: 6,
        unlocks: [
          BuildingId.Hearth, BuildingId.Mill, BuildingId.Granary, BuildingId.Larder,
          BuildingId.Bakery, BuildingId.Inn, BuildingId.Housing,
        ],
      },
      {
        id: "village", name: "Village", plots: 12,
        unlocks: [
          BuildingId.Silo, BuildingId.Stable, BuildingId.Sawmill, BuildingId.Apiary,
          BuildingId.Brewery, BuildingId.Watchtower, BuildingId.Chapel,
        ],
        upgradeCost: { coins: 300, resources: { hay_bundle: 15 } },
      },
      {
        id: "city", name: "City", plots: 20,
        unlocks: [
          BuildingId.Forge, BuildingId.CaravanPost, BuildingId.Kitchen, BuildingId.Workshop,
          BuildingId.PowderStore, BuildingId.Portal, BuildingId.ClockTower, BuildingId.Lighthouse,
          BuildingId.Apothecary, BuildingId.Observatory, BuildingId.Housing2, BuildingId.Housing3,
          BuildingId.Barn, BuildingId.HarborDock, BuildingId.Fishmonger, BuildingId.Smokehouse,
        ],
        upgradeCost: { coins: 1000, resources: { plank: 18 } },
      },
    ],
  },
  {
    id: "meadow", name: "Greenmeadow", kind: "farm", icon: "🌾",
    x: 24, y: 28, level: 1, region: "farm",
    description: "Sun-drenched fields. Easy harvests for new farmers.",
    activities: ["Harvest farm tiles", "Common resources"],
    boards: { farm: cloneFarmBoard(TEMPERATE_FARM_TEMPLATE) },
    entryCost: { coins: 50 },
    dangers: [],
    buildings: [
      BuildingId.Hearth, BuildingId.Mill, BuildingId.Granary, BuildingId.Silo, BuildingId.Bakery, BuildingId.Larder,
      BuildingId.Inn, BuildingId.Housing, BuildingId.Housing2, BuildingId.Housing3,
      BuildingId.Stable, BuildingId.Apiary, BuildingId.Sawmill, BuildingId.Brewery, BuildingId.Watchtower,
    ],
    plotCount: 8,
  },
  {
    id: "orchard", name: "Wild Orchard", kind: "farm", icon: "🍎",
    x: 24, y: 72, level: 2, region: "farm",
    description: "Tangled rows of fruit trees. Richer farm yields.",
    activities: ["Harvest farm tiles", "Higher-tier crops"],
    boards: { farm: cloneFarmBoard(ORCHARD_FARM_TEMPLATE) },
    entryCost: { coins: 50 },
    dangers: [],
    buildings: [
      BuildingId.Hearth, BuildingId.Mill, BuildingId.Granary, BuildingId.Silo, BuildingId.Bakery, BuildingId.Larder,
      BuildingId.Inn, BuildingId.CaravanPost, BuildingId.Housing, BuildingId.Housing2, BuildingId.Housing3,
      BuildingId.Stable, BuildingId.Apiary, BuildingId.Sawmill, BuildingId.Brewery, BuildingId.Chapel,
    ],
    plotCount: 9,
  },
  {
    id: "crossroads", name: "The Crossroads", kind: "event", icon: "🎲",
    x: 40, y: 50, level: 2, region: "wilds",
    description: "A windswept junction where strangers and rumors meet.",
    activities: ["Random encounters", "Story bits"],
    boards: {},
    entryCost: { coins: 0 },
    dangers: [],
    buildings: [BuildingId.Hearth, BuildingId.Inn, BuildingId.CaravanPost],
    plotCount: 3,
  },
  {
    id: "quarry", name: "Cracked Quarry", kind: "mine", icon: "⛏️",
    x: 56, y: 26, level: 2, region: "mine",
    description: "A wide, shattered pit. Stone, ore, and a few coins lost in cracks.",
    activities: ["Harvest mine tiles", "Ore & stone"],
    boards: { mine: cloneMineBoard(MINE_BOARD_STANDARD) },
    entryCost: { coins: 100 },
    dangers: ["cave_in", "gas_vent", "mole"],
    buildings: [
      BuildingId.Hearth, BuildingId.Kitchen, BuildingId.Workshop, BuildingId.Forge, BuildingId.Barn,
      BuildingId.PowderStore, BuildingId.Inn, BuildingId.Housing, BuildingId.Housing2, BuildingId.Housing3,
      BuildingId.Watchtower, BuildingId.Apothecary, BuildingId.Observatory, BuildingId.CaravanPost,
    ],
    plotCount: 12,
    // ── Town 2 ladder · 4 rungs (Dig Site → Mining Camp → Boomtown → Foundry
    // City). Locked until home reaches its City rung. plotCount above is the
    // top rung (12). Costs/plots are first-pass (see docs/zone-tier-ladder.html).
    requiresZoneTier: { zone: "home", tier: 2 },
    tiers: [
      {
        id: "dig_site", name: "Dig Site", plots: 4,
        unlocks: [BuildingId.Hearth, BuildingId.Kitchen, BuildingId.Housing],
      },
      {
        id: "mining_camp", name: "Mining Camp", plots: 6,
        unlocks: [BuildingId.Workshop, BuildingId.Forge, BuildingId.Inn, BuildingId.Watchtower],
        upgradeCost: { coins: 250, resources: { block: 12 } },
      },
      {
        id: "boomtown", name: "Boomtown", plots: 8,
        unlocks: [BuildingId.Barn, BuildingId.PowderStore, BuildingId.Housing2, BuildingId.Apothecary],
        upgradeCost: { coins: 800, resources: { iron_bar: 12 } },
      },
      {
        id: "foundry_city", name: "Foundry City", plots: 12,
        unlocks: [BuildingId.Observatory, BuildingId.Housing3, BuildingId.CaravanPost],
        upgradeCost: { coins: 1800, resources: { gold_bar: 8 } },
      },
    ],
  },
  {
    id: "caves", name: "Lanternlit Caves", kind: "mine", icon: "🪨",
    x: 56, y: 74, level: 4, region: "mine",
    description: "Twisting tunnels lit by old miners’ lanterns. Rare gems hide deep within.",
    activities: ["Harvest mine tiles", "Rare gems"],
    boards: { mine: cloneMineBoard(MINE_BOARD_EXTENDED) },
    entryCost: { coins: 100 },
    dangers: ["cave_in", "gas_vent", "lava", "mole"],
    buildings: [
      BuildingId.Hearth, BuildingId.Kitchen, BuildingId.Workshop, BuildingId.Forge, BuildingId.Barn,
      BuildingId.PowderStore, BuildingId.Inn, BuildingId.CaravanPost, BuildingId.Housing, BuildingId.Housing2, BuildingId.Housing3,
      BuildingId.Watchtower, BuildingId.Apothecary, BuildingId.Observatory, BuildingId.Chapel,
    ],
    plotCount: 9,
  },
  {
    id: "fairground", name: "Drifter's Fairground", kind: "festival", icon: "🎪",
    x: 72, y: 50, level: 3, region: "wilds",
    description: "A rolling fair of music, trinkets, and seasonal contests.",
    activities: ["Festival rewards", "Limited-time offers"],
    boards: {},
    entryCost: { coins: 0 },
    dangers: [],
    buildings: [BuildingId.Hearth, BuildingId.Inn, BuildingId.CaravanPost],
    plotCount: 3,
  },
  {
    id: "forge", name: "Black Forge", kind: "mine", icon: "🔥",
    x: 86, y: 28, level: 5, region: "mine",
    description: "A roaring smithy at the foot of the mountain. Where heroes’ tools are born.",
    activities: ["Advanced crafting", "Boss-tier resources"],
    boards: { mine: cloneMineBoard(MINE_BOARD_EXTENDED) },
    entryCost: { coins: 200 },
    dangers: [],
    buildings: [
      BuildingId.Hearth, BuildingId.Forge, BuildingId.Workshop, BuildingId.Barn, BuildingId.PowderStore,
      BuildingId.Portal, BuildingId.CaravanPost, BuildingId.Housing, BuildingId.Housing2, BuildingId.Housing3,
    ],
    plotCount: 8,
  },
  {
    id: "pit", name: "The Pit", kind: "boss", icon: "⚔️",
    x: 90, y: 72, level: 6, region: "boss",
    description: "Something stirs in the dark. Bring your best chains.",
    activities: ["Boss battles", "Rare loot"],
    boards: {},
    entryCost: { coins: 0 },
    dangers: [],
    buildings: [BuildingId.Hearth, BuildingId.Inn],
    plotCount: 2,
  },
  {
    id: "harbor", name: "Saltspray Harbor", kind: "fish", icon: "⚓",
    x: 16, y: 86, level: 3, region: "coast",
    description: "A weather-bleached pier with nets full of sardines and clams. Tide and luck do most of the work.",
    activities: ["Harvest fish tiles", "Sardine, mackerel & clams"],
    boards: { fish: cloneFishBoard(FISH_BOARD_HARBOR) },
    entryCost: { coins: 50 },
    dangers: [],
    buildings: [
      BuildingId.Hearth, BuildingId.HarborDock, BuildingId.Fishmonger, BuildingId.Smokehouse, BuildingId.Lighthouse,
      BuildingId.Inn, BuildingId.CaravanPost, BuildingId.Housing, BuildingId.Housing2, BuildingId.Housing3, BuildingId.Watchtower,
    ],
    plotCount: 8,
  },
  {
    id: "oldcapital", name: "The Old Capital", kind: "capital", icon: "🏛️",
    x: 93, y: 50, level: 1, region: "capital",
    description: "The first hearth of the old kingdom — dark for an age. They say the Ember still waits there.",
    activities: ["Requires all 3 Hearth-Tokens", "The Long Return ends here"],
    requiresHearthTokens: true,
    boards: {},
    entryCost: { coins: 0 },
    buildings: [],
    plotCount: 0,
  },
];

export const MAP_EDGES: ReadonlyArray<readonly [string, string]> = [
  ["home", "meadow"],
  ["home", "orchard"],
  ["home", "harbor"],
  ["meadow", "crossroads"],
  ["orchard", "crossroads"],
  ["crossroads", "quarry"],
  ["crossroads", "caves"],
  ["quarry", "fairground"],
  ["caves", "fairground"],
  ["fairground", "forge"],
  ["fairground", "pit"],
  ["forge", "pit"],
  ["forge", "oldcapital"],
  ["pit", "oldcapital"],
];

export const NODE_COLORS: Record<MapNodeKind, string> = {
  home: "#bb3b2f",
  farm: "#91bf24",
  mine: "#7c8388",
  fish: "#4a8aaa",
  festival: "#c8923a",
  boss: "#3a1a1a",
  event: "#5a7a9a",
  capital: "#d4af37",
};

export const REGIONS: MapRegion[] = [
  { id: "hearth", label: "Hearthlands", cx: 12, cy: 50, rx: 16, ry: 22, fill: "#d8b878" },
  { id: "farm", label: "Greenfields", cx: 26, cy: 50, rx: 14, ry: 32, fill: "#b8c878" },
  { id: "wilds", label: "The Wilds", cx: 56, cy: 50, rx: 22, ry: 30, fill: "#c4b888" },
  { id: "mine", label: "Stoneholds", cx: 72, cy: 30, rx: 22, ry: 18, fill: "#a8a4a0" },
  { id: "coast", label: "The Coast", cx: 16, cy: 86, rx: 14, ry: 12, fill: "#9ab8c4" },
  { id: "boss", label: "The Deep", cx: 90, cy: 72, rx: 12, ry: 16, fill: "#8a5050" },
  { id: "capital", label: "The Old Capital", cx: 93, cy: 50, rx: 7, ry: 18, fill: "#cdb56a" },
];

export const KIND_LABELS: Record<MapNodeKind, string> = {
  home: "Home Village",
  farm: "Farm Region",
  mine: "Mine Region",
  fish: "Fishing Harbor",
  festival: "Festival",
  boss: "Boss Arena",
  event: "Wayside Event",
  capital: "The Old Capital",
};
