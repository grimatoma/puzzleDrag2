import { UPGRADE_THRESHOLDS } from "../../constants.js";

export const CATEGORIES = ["grass", "grain", "wood", "berry", "bird"];

export const SPECIES = [
  // Grass
  {
    id: "hay", category: "grass", displayName: "Hay", baseResource: "hay", tier: 0,
    discovery: { method: "default" },
    effects: {},
  },
  {
    id: "meadow_grass", category: "grass", displayName: "Meadow Grass",
    baseResource: "meadow_grass", tier: 1,
    discovery: { method: "chain", chainLengthOf: "hay", chainLength: 20 },
    effects: { poolWeightDelta: { hay: 1 } },
  },
  {
    id: "spiky_grass", category: "grass", displayName: "Spiky Grass",
    baseResource: "spiky_grass", tier: 2,
    discovery: { method: "research", researchOf: "hay", researchAmount: 50 },
    effects: { poolWeightDelta: { hay: 2 } },
  },

  // Grain — no "default" species; grain category starts null
  {
    id: "wheat", category: "grain", displayName: "Wheat", baseResource: "wheat", tier: 0,
    discovery: { method: "chain", chainLengthOf: "hay", chainLength: UPGRADE_THRESHOLDS.hay },
    effects: {},
  },
  {
    id: "grain", category: "grain", displayName: "Grain", baseResource: "grain", tier: 1,
    discovery: { method: "research", researchOf: "wheat", researchAmount: 30 },
    effects: {},
  },
  {
    id: "flour", category: "grain", displayName: "Flour", baseResource: "flour", tier: 2,
    discovery: { method: "research", researchOf: "grain", researchAmount: 50 },
    effects: {},
  },

  // Wood
  {
    id: "log", category: "wood", displayName: "Log", baseResource: "log", tier: 0,
    discovery: { method: "default" },
    effects: {},
  },
  {
    id: "plank", category: "wood", displayName: "Plank", baseResource: "plank", tier: 1,
    discovery: { method: "chain", chainLengthOf: "log", chainLength: UPGRADE_THRESHOLDS.log },
    effects: {},
  },
  {
    id: "beam", category: "wood", displayName: "Beam", baseResource: "beam", tier: 2,
    discovery: { method: "research", researchOf: "plank", researchAmount: 30 },
    effects: {},
  },

  // Berry
  {
    id: "berry", category: "berry", displayName: "Berry", baseResource: "berry", tier: 0,
    discovery: { method: "default" },
    effects: {},
  },
  {
    id: "jam", category: "berry", displayName: "Jam", baseResource: "jam", tier: 1,
    discovery: { method: "chain", chainLengthOf: "berry", chainLength: UPGRADE_THRESHOLDS.berry },
    effects: {},
  },

  // Bird
  {
    id: "egg", category: "bird", displayName: "Egg", baseResource: "egg", tier: 0,
    discovery: { method: "default" },
    effects: {},
  },
  {
    id: "turkey", category: "bird", displayName: "Turkey", baseResource: "turkey", tier: 1,
    discovery: { method: "research", researchOf: "egg", researchAmount: 20 },
    effects: { freeMoves: 2 },
  },
  {
    id: "clover", category: "bird", displayName: "Clover", baseResource: "clover", tier: 2,
    discovery: { method: "buy", coinCost: 200 },
    effects: { freeMoves: 2 },
  },
  {
    id: "melon", category: "bird", displayName: "Melon", baseResource: "melon", tier: 3,
    discovery: { method: "buy", coinCost: 500 },
    effects: { freeMoves: 5 },
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
