import { UPGRADE_THRESHOLDS } from "../../constants.js";

export const CATEGORIES = ["grass", "grain", "wood", "berry", "bird"];

export const SPECIES = [
  // Grass
  {
    id: "hay", category: "grass", displayName: "Hay", baseResource: "hay", tier: 0,
    discovery: { method: "default" },
    effects: {},
    description: "The common meadow grass of the vale, harvested as fodder for livestock and thatch for roofs.",
  },
  {
    id: "meadow_grass", category: "grass", displayName: "Meadow Grass",
    baseResource: "meadow_grass", tier: 1,
    discovery: { method: "chain", chainLengthOf: "hay", chainLength: 20 },
    effects: { poolWeightDelta: { hay: 1 } },
    description: "A lush grass variety that grows in dense clumps, boosting hay tile spawn frequency on the board.",
  },
  {
    id: "spiky_grass", category: "grass", displayName: "Spiky Grass",
    baseResource: "spiky_grass", tier: 2,
    discovery: { method: "research", researchOf: "hay", researchAmount: 50 },
    effects: { poolWeightDelta: { hay: 2 } },
    description: "A hardy, drought-tolerant grass that spreads quickly, adding two extra hay tiles to every board fill.",
  },

  // Grain — no "default" species; grain category starts null
  {
    id: "wheat", category: "grain", displayName: "Wheat", baseResource: "wheat", tier: 0,
    discovery: { method: "chain", chainLengthOf: "hay", chainLength: UPGRADE_THRESHOLDS.hay },
    effects: {},
    description: "Golden stalks of grain unlocked when hay chains grow long enough to harvest properly.",
  },
  {
    id: "grain", category: "grain", displayName: "Grain", baseResource: "grain", tier: 1,
    discovery: { method: "research", researchOf: "wheat", researchAmount: 30 },
    effects: {},
    description: "Threshed and hulled wheat, ready for the mill. A key ingredient in bread and baked goods.",
  },
  {
    id: "flour", category: "grain", displayName: "Flour", baseResource: "flour", tier: 2,
    discovery: { method: "research", researchOf: "grain", researchAmount: 50 },
    effects: {},
    description: "Finely milled flour, the foundation of the Bakery's most valuable recipes.",
  },

  // Wood
  {
    id: "log", category: "wood", displayName: "Log", baseResource: "log", tier: 0,
    discovery: { method: "default" },
    effects: {},
    description: "Freshly felled timber from the vale's surrounding woodland, used in construction and fuel.",
  },
  {
    id: "plank", category: "wood", displayName: "Plank", baseResource: "plank", tier: 1,
    discovery: { method: "chain", chainLengthOf: "log", chainLength: UPGRADE_THRESHOLDS.log },
    effects: {},
    description: "Sawn and smoothed planks ready for carpentry, unlocked through long log chains.",
  },
  {
    id: "beam", category: "wood", displayName: "Beam", baseResource: "beam", tier: 2,
    discovery: { method: "research", researchOf: "plank", researchAmount: 30 },
    effects: {},
    description: "Heavy structural beams for buildings and forge frames, crafted from seasoned planks.",
  },

  // Berry
  {
    id: "berry", category: "berry", displayName: "Berry", baseResource: "berry", tier: 0,
    discovery: { method: "default" },
    effects: {},
    description: "Wild berries gathered from hedgerows and thickets throughout the vale.",
  },
  {
    id: "jam", category: "berry", displayName: "Jam", baseResource: "jam", tier: 1,
    discovery: { method: "chain", chainLengthOf: "berry", chainLength: UPGRADE_THRESHOLDS.berry },
    effects: {},
    description: "Sweet fruit preserves made from long berry harvests, sold for good coin at the Larder.",
  },

  // Bird
  {
    id: "egg", category: "bird", displayName: "Egg", baseResource: "egg", tier: 0,
    discovery: { method: "default" },
    effects: {},
    description: "Farm eggs gathered from the yard, a staple ingredient in the Bakery's recipes.",
  },
  {
    id: "turkey", category: "bird", displayName: "Turkey", baseResource: "turkey", tier: 1,
    discovery: { method: "research", researchOf: "egg", researchAmount: 20 },
    effects: { freeMoves: 2 },
    description: "Broad-winged turkeys that startle and shuffle the board — each active turkey grants 2 free moves per season.",
  },
  {
    id: "clover", category: "bird", displayName: "Clover", baseResource: "clover", tier: 2,
    discovery: { method: "buy", coinCost: 200 },
    effects: { freeMoves: 2 },
    description: "Lucky clover patches that nest small songbirds, granting 2 extra free moves per season.",
  },
  {
    id: "melon", category: "bird", displayName: "Melon", baseResource: "melon", tier: 3,
    discovery: { method: "buy", coinCost: 500 },
    effects: { freeMoves: 5 },
    description: "Plump summer melons that attract whole flocks of birds, granting 5 free moves per season.",
  },
];

export const SPECIES_MAP = Object.fromEntries(SPECIES.map((s) => [s.id, s]));

export const SPECIES_BY_CATEGORY = Object.fromEntries(
  CATEGORIES.map((c) => [c, SPECIES.filter((s) => s.category === c)]),
);

/** Quick O(1) lookup: resource key → category (or null if not in catalog). */
export const CATEGORY_OF = Object.fromEntries(
  SPECIES.map((s) => [s.baseResource, s.category]),
);
