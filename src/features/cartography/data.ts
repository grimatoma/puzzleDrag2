// Map node positions are in a 0..100 SVG viewBox.
// Each node IS a zone: boards, dangers, entryCost, buildings.

import type {
  FarmBoardInstance,
  FishBoardInstance,
  MineBoardInstance,
} from "../../config/schemas/boardInstance.js";

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

export interface SeasonDrops {
  [season: string]: Record<string, number>;
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
  buildings: string[];
  plotCount: number;
  requiresHearthTokens?: boolean;
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

const GOLD = "gold";

const FARM_SEASON_DROPS_TEMPERATE = {
  Spring: { grass: 0.38, grain: 0.20, trees: 0.20, birds: 0.05, vegetables: 0.13, fruits: 0.04 },
  Summer: { grass: 0.12, grain: 0.38, trees: 0.10, birds: 0.15, vegetables: 0.21, fruits: 0.04 },
  Autumn: { grass: 0.10, grain: 0.15, trees: 0.42, birds: 0.15, vegetables: 0.15, fruits: 0.03 },
  Winter: { grass: 0.05, grain: 0.05, trees: 0.73, birds: 0.10, vegetables: 0.05, fruits: 0.02 },
};

const FARM_SEASON_DROPS_ORCHARD = {
  Spring: { grass: 0.10, grain: 0.10, trees: 0.25, birds: 0.10, vegetables: 0.05, fruits: 0.40 },
  Summer: { grass: 0.05, grain: 0.10, trees: 0.20, birds: 0.20, vegetables: 0.05, fruits: 0.40 },
  Autumn: { grass: 0.05, grain: 0.10, trees: 0.35, birds: 0.10, vegetables: 0.05, fruits: 0.35 },
  Winter: { grass: 0.05, grain: 0.05, trees: 0.60, birds: 0.15, vegetables: 0.05, fruits: 0.10 },
};

const FARM_BOARD_TEMPERATE: FarmBoardInstance = {
  baseTurns: 10,
  upgradeMap: {
    grass: "birds", grain: "vegetables", trees: "birds",
    birds: "herd_animals", vegetables: "fruits", fruits: GOLD,
  },
  seasonDrops: FARM_SEASON_DROPS_TEMPERATE,
};

const FARM_BOARD_ORCHARD: FarmBoardInstance = {
  baseTurns: 12,
  upgradeMap: {
    grass: "grain", grain: "vegetables", trees: "fruits",
    birds: "herd_animals", vegetables: "fruits", fruits: GOLD,
    herd_animals: GOLD,
  },
  seasonDrops: FARM_SEASON_DROPS_ORCHARD,
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
    boards: { farm: FARM_BOARD_TEMPERATE },
    entryCost: { coins: 50 },
    dangers: [],
    buildings: [
      "hearth", "mill", "bakery", "inn", "granary", "larder",
      "forge", "caravan_post", "kitchen", "workshop", "powder_store",
      "portal", "housing", "housing2", "housing3", "silo",
      "clock_tower", "apothecary", "sawmill", "watchtower", "stable",
      "apiary", "chapel", "brewery", "observatory",
    ],
    plotCount: 20,
  },
  {
    id: "meadow", name: "Greenmeadow", kind: "farm", icon: "🌾",
    x: 24, y: 28, level: 1, region: "farm",
    description: "Sun-drenched fields. Easy harvests for new farmers.",
    activities: ["Harvest farm tiles", "Common resources"],
    boards: { farm: FARM_BOARD_TEMPERATE },
    entryCost: { coins: 50 },
    dangers: [],
    buildings: [
      "hearth", "mill", "granary", "silo", "bakery", "larder",
      "inn", "housing", "housing2", "housing3",
      "stable", "apiary", "sawmill", "brewery", "watchtower",
    ],
    plotCount: 8,
  },
  {
    id: "orchard", name: "Wild Orchard", kind: "farm", icon: "🍎",
    x: 24, y: 72, level: 2, region: "farm",
    description: "Tangled rows of fruit trees. Richer farm yields.",
    activities: ["Harvest farm tiles", "Higher-tier crops"],
    boards: { farm: FARM_BOARD_ORCHARD },
    entryCost: { coins: 50 },
    dangers: [],
    buildings: [
      "hearth", "mill", "granary", "silo", "bakery", "larder",
      "inn", "caravan_post", "housing", "housing2", "housing3",
      "stable", "apiary", "sawmill", "brewery", "chapel",
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
    buildings: ["hearth", "inn", "caravan_post"],
    plotCount: 3,
  },
  {
    id: "quarry", name: "Cracked Quarry", kind: "mine", icon: "⛏️",
    x: 56, y: 26, level: 2, region: "mine",
    description: "A wide, shattered pit. Stone, ore, and a few coins lost in cracks.",
    activities: ["Harvest mine tiles", "Ore & stone"],
    boards: { mine: MINE_BOARD_STANDARD },
    entryCost: { coins: 100 },
    dangers: ["cave_in", "gas_vent", "mole"],
    buildings: [
      "hearth", "kitchen", "workshop", "forge", "barn",
      "powder_store", "inn", "housing", "housing2", "housing3",
      "watchtower", "apothecary", "observatory",
    ],
    plotCount: 8,
  },
  {
    id: "caves", name: "Lanternlit Caves", kind: "mine", icon: "🪨",
    x: 56, y: 74, level: 4, region: "mine",
    description: "Twisting tunnels lit by old miners’ lanterns. Rare gems hide deep within.",
    activities: ["Harvest mine tiles", "Rare gems"],
    boards: { mine: MINE_BOARD_EXTENDED },
    entryCost: { coins: 100 },
    dangers: ["cave_in", "gas_vent", "lava", "mole"],
    buildings: [
      "hearth", "kitchen", "workshop", "forge", "barn",
      "powder_store", "inn", "caravan_post", "housing", "housing2", "housing3",
      "watchtower", "apothecary", "observatory", "chapel",
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
    buildings: ["hearth", "inn", "caravan_post"],
    plotCount: 3,
  },
  {
    id: "forge", name: "Black Forge", kind: "mine", icon: "🔥",
    x: 86, y: 28, level: 5, region: "mine",
    description: "A roaring smithy at the foot of the mountain. Where heroes’ tools are born.",
    activities: ["Advanced crafting", "Boss-tier resources"],
    boards: { mine: MINE_BOARD_EXTENDED },
    entryCost: { coins: 200 },
    dangers: [],
    buildings: [
      "hearth", "forge", "workshop", "barn", "powder_store",
      "portal", "caravan_post", "housing", "housing2", "housing3",
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
    buildings: ["hearth", "inn"],
    plotCount: 2,
  },
  {
    id: "harbor", name: "Saltspray Harbor", kind: "fish", icon: "⚓",
    x: 16, y: 86, level: 3, region: "coast",
    description: "A weather-bleached pier with nets full of sardines and clams. Tide and luck do most of the work.",
    activities: ["Harvest fish tiles", "Sardine, mackerel & clams"],
    boards: { fish: FISH_BOARD_HARBOR },
    entryCost: { coins: 50 },
    dangers: [],
    buildings: [
      "hearth", "harbor_dock", "fishmonger", "smokehouse", "lighthouse",
      "inn", "caravan_post", "housing", "housing2", "housing3", "watchtower",
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
