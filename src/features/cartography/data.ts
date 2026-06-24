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
   * Gate this zone on another zone reaching a tier — applies to BOTH founding
   * this settlement and travelling to its map node. Mirrors `requiresHearthTokens`
   * but generalised: e.g. quarry (Town 2) requires home at City, and the
   * post-Town-2 branch zones (harbor, caves, forge) require the quarry.
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
    x: 10, y: 50, region: "hearth",
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
    // ── Town 1 ladder · 4 rungs, Outpost→City — ported from
    // reference/docs/town-layout/index.html (the roads-first growing-outpost mockup) and
    // matching the authored maps in src/ui/town/townMaps.ts (test-enforced).
    // Plots grow 3 → 6 → 12 → 20. Each rung absorbs one or two rungs of the old
    // 6-rung PC2 Camp→Manor ladder: its `unlocks` are the union of the absorbed
    // rungs (so the cumulative union still equals `buildings[]`, test-enforced)
    // and its `upgradeCost` is FARM-ONLY (softlock fix, 2026-06-23): Town 1 climbs
    // Outpost→City on farm goods alone — mine goods first appear in Town 2 — so the
    // farm→bread→tier-up loop cannot deadlock. Costs are resource-only (coins=0).
    tiers: [
      {
        id: "outpost", name: "Outpost", plots: 3,
        unlocks: [BuildingId.Hearth, BuildingId.Mill, BuildingId.Bakery, BuildingId.Granary, BuildingId.Inn],
      },
      {
        id: "hamlet", name: "Hamlet", plots: 6,
        unlocks: [BuildingId.Larder, BuildingId.Housing, BuildingId.Silo],
        upgradeCost: { resources: { hay_bundle: 3, plank: 5, bread: 10, eggs: 4, soup: 2 } },
      },
      {
        id: "village", name: "Village", plots: 12,
        unlocks: [
          BuildingId.Stable, BuildingId.Apiary, BuildingId.Sawmill, BuildingId.Watchtower,
          BuildingId.Brewery, BuildingId.Chapel, BuildingId.Housing2, BuildingId.Apothecary, BuildingId.Kitchen,
        ],
        upgradeCost: { resources: { eggs: 12, soup: 14, bread: 16, pie: 6, plank: 14, hay_bundle: 10 } },
      },
      {
        id: "city", name: "City", plots: 20,
        unlocks: [
          BuildingId.Workshop, BuildingId.Forge, BuildingId.CaravanPost, BuildingId.Housing3, BuildingId.ClockTower,
          BuildingId.PowderStore, BuildingId.Portal, BuildingId.Observatory, BuildingId.Lighthouse,
          BuildingId.Barn, BuildingId.HarborDock, BuildingId.Fishmonger, BuildingId.Smokehouse,
        ],
        upgradeCost: { resources: { bread: 28, pie: 14, soup: 18, eggs: 18, plank: 18, flour: 12 } },
      },
    ],
  },
  {
    id: "meadow", name: "Greenmeadow", kind: "farm", icon: "🌾",
    x: 24, y: 28, region: "farm",
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
    x: 24, y: 72, region: "farm",
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
    x: 40, y: 50, region: "wilds",
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
    x: 56, y: 26, region: "mine",
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
    // ── Town 2 ladder · 6 rungs, mine-themed (Dig Site → Foundry City). Locked
    // until home reaches its City rung (now tier 3, the top of the 4-rung home
    // ladder). plotCount above is the top rung (12). Costs resource-only (mine goods).
    requiresZoneTier: { zone: "home", tier: 3 },
    tiers: [
      {
        id: "dig_site", name: "Dig Site", plots: 2,
        unlocks: [BuildingId.Hearth, BuildingId.Kitchen],
      },
      {
        id: "prospect", name: "Prospect Camp", plots: 4,
        unlocks: [BuildingId.Workshop, BuildingId.Inn],
        upgradeCost: { resources: { block: 12, dirt: 8 } },
      },
      {
        id: "mining_camp", name: "Mining Camp", plots: 6,
        unlocks: [BuildingId.Forge, BuildingId.Housing],
        upgradeCost: { resources: { block: 16, iron_bar: 8, coke: 2 } },
      },
      {
        id: "boomtown", name: "Boomtown", plots: 8,
        unlocks: [BuildingId.Barn, BuildingId.Watchtower],
        upgradeCost: { resources: { iron_bar: 12, coke: 6, silver_bar: 2 } },
      },
      {
        id: "smeltworks", name: "Smeltworks", plots: 10,
        unlocks: [BuildingId.PowderStore, BuildingId.Apothecary, BuildingId.Housing2],
        upgradeCost: { resources: { iron_bar: 16, coke: 10, silver_bar: 6, cut_gem: 1 } },
      },
      {
        id: "foundry_city", name: "Foundry City", plots: 12,
        unlocks: [BuildingId.Observatory, BuildingId.CaravanPost, BuildingId.Housing3],
        upgradeCost: { resources: { iron_bar: 20, gold_bar: 4, cut_gem: 3, silver_bar: 8 } },
      },
    ],
  },
  {
    id: "caves", name: "Lanternlit Caves", kind: "mine", icon: "🪨",
    x: 56, y: 74, region: "mine",
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
    // Post-Town-2 branch: the deep mine opens once the quarry is established.
    requiresZoneTier: { zone: "quarry", tier: 1 },
    // ── Caves ladder · 4 rungs (Lantern Camp → Deephold), the deep gem-mine's
    // answer to the quarry's Dig Site → Foundry City climb. plotCount above is the
    // top rung (9). The cumulative `unlocks` union MUST equal the flat buildings[]
    // superset (test-enforced). Costs are resource-only (coins=0) and gate ONLY on
    // mine-board-producible goods the Caves itself stocks (block/coke/iron_bar/
    // silver_bar/cut_gem/gold_bar) — the per-zone inventory is siloed, so a deep
    // mine can only ever bank mine goods. They skew toward gems/gold (the Caves'
    // signature seam) where the quarry leaned on stone + iron, so the two mines
    // climb on different currencies.
    tiers: [
      {
        id: "lantern_camp", name: "Lantern Camp", plots: 3,
        unlocks: [BuildingId.Hearth, BuildingId.Kitchen, BuildingId.Inn],
      },
      {
        id: "tunnel_works", name: "Tunnel Works", plots: 5,
        unlocks: [BuildingId.Workshop, BuildingId.Housing, BuildingId.Watchtower],
        upgradeCost: { resources: { block: 14, coke: 4 } },
      },
      {
        id: "gem_galleries", name: "Gem Galleries", plots: 7,
        unlocks: [BuildingId.Forge, BuildingId.Barn, BuildingId.Apothecary, BuildingId.Chapel],
        upgradeCost: { resources: { iron_bar: 12, coke: 8, cut_gem: 1 } },
      },
      {
        id: "deephold", name: "Deephold", plots: 9,
        unlocks: [
          BuildingId.PowderStore, BuildingId.Observatory, BuildingId.CaravanPost,
          BuildingId.Housing2, BuildingId.Housing3,
        ],
        upgradeCost: { resources: { iron_bar: 18, silver_bar: 6, cut_gem: 3, gold_bar: 2 } },
      },
    ],
  },
  {
    id: "fairground", name: "Drifter's Fairground", kind: "festival", icon: "🎪",
    x: 72, y: 50, region: "wilds",
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
    x: 86, y: 28, region: "mine",
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
    // Deeper still — the Black Forge needs a maturing mine behind it.
    requiresZoneTier: { zone: "quarry", tier: 2 },
  },
  {
    id: "pit", name: "The Pit", kind: "boss", icon: "⚔️",
    x: 90, y: 72, region: "boss",
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
    x: 16, y: 86, region: "coast",
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
    // Post-Town-2 branch: the coast/fishing line opens once the quarry is established.
    requiresZoneTier: { zone: "quarry", tier: 1 },
  },
  {
    id: "mirefen", name: "Mirefen Hollow", kind: "fish", icon: "🪷",
    x: 34, y: 90, region: "coast",
    description: "A stilt-town strung across black water on golden boardwalks. Fish the misty fen, then grow the boardwalk into a town.",
    activities: ["Harvest fish tiles", "Grow the stilt-town rung by rung"],
    boards: { fish: cloneFishBoard(FISH_BOARD_HARBOR) },
    entryCost: { coins: 100 },
    dangers: [],
    // The flat buildings[] MUST equal the deduped union of every tier's `unlocks`
    // below (test-enforced superset invariant). Listed rung-by-rung to keep them
    // in sync with the ladder.
    buildings: [
      BuildingId.Hearth, BuildingId.Housing, BuildingId.Fishmonger,            // Fishing Stilt (tier 0)
      BuildingId.Larder, BuildingId.HarborDock, BuildingId.Watchtower,         // Bogwalk Hamlet (tier 1)
      BuildingId.Apiary, BuildingId.Brewery, BuildingId.Apothecary, BuildingId.Smokehouse, // Mire Village (tier 2)
      BuildingId.Inn, BuildingId.Chapel, BuildingId.CaravanPost, BuildingId.Granary, BuildingId.Observatory, // Fen Town (tier 3)
    ],
    plotCount: 15,
    // ── Mirefen ladder · 4 rungs (Fishing Stilt → Fen Town), ported from
    // reference/docs/zones (mirefen design: plots 3/6/10/15). Costs are resource-only
    // (matching home/quarry convention) and gate ONLY on fish-board-producible
    // resources — the per-zone inventory is siloed, so a fish settlement can only
    // ever stock fish goods. The design's `plank`/`fenmead` gates were swapped for
    // real fish resources (fish_fillet/fish_oil/pearls) to avoid an un-upgradeable
    // rung; the signature mechanic, hazards and new resources are deferred.
    tiers: [
      {
        id: "stilt", name: "Fishing Stilt", plots: 3,
        unlocks: [BuildingId.Hearth, BuildingId.Housing, BuildingId.Fishmonger],
      },
      {
        id: "bogwalk", name: "Bogwalk Hamlet", plots: 6,
        unlocks: [BuildingId.Larder, BuildingId.HarborDock, BuildingId.Watchtower],
        upgradeCost: { resources: { fish_fillet: 8, fish_oil: 6 } },
      },
      {
        id: "village", name: "Mire Village", plots: 10,
        unlocks: [BuildingId.Apiary, BuildingId.Brewery, BuildingId.Apothecary, BuildingId.Smokehouse],
        upgradeCost: { resources: { fish_fillet: 14, fish_oil: 10 } },
      },
      {
        id: "town", name: "Fen Town", plots: 15,
        unlocks: [BuildingId.Inn, BuildingId.Chapel, BuildingId.CaravanPost, BuildingId.Granary, BuildingId.Observatory],
        upgradeCost: { resources: { fish_fillet: 22, pearls: 1 } },
      },
    ],
  },
  {
    id: "oldcapital", name: "The Old Capital", kind: "capital", icon: "🏛️",
    x: 93, y: 50, region: "capital",
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
  ["harbor", "mirefen"],
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
  { id: "coast", label: "The Coast", cx: 24, cy: 87, rx: 22, ry: 13, fill: "#9ab8c4" },
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
