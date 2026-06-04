// src/config/progression/triggers.ts
import type { ProgTrigger } from "./types.js";

// Status is honest: WIRED = the unlock is enforced somewhere today;
// PARTIAL = half-wired; PLANNED = not in code yet (exempt from ref checks).
//
// Authoring rule: an event never lists itself as an unlock. A *founding*
// milestone lists the buildings it makes available (Buildings:); a *build*
// event lists only what that building ENABLES (recipes / tools / tiles /
// effects) — never the building itself.
export const PROGRESSION_TRIGGERS: ProgTrigger[] = [
  // ── Spine: arrival ──
  {
    id: "arrive_home", label: "Arrive at Hearthwood Vale", milestone: true, zone: "home",
    status: "WIRED", blurb: "The hearth is cold and the fields untended — but the soil is good.",
    when: { fact: "event.type", op: "eq", value: "session_start" },
    effects: [
      { kind: "unlockZone", zone: "home" },
      { kind: "note", consequence: "tile", label: "Grass, grain & oak tiles" },
      // The farm buildings become available to build here.
      { kind: "unlockBuilding", building: "granary" },
      { kind: "unlockBuilding", building: "mill" },
      { kind: "unlockBuilding", building: "kitchen" },
      { kind: "note", consequence: "system", label: "Orders & the Almanac" },
    ],
  },
  // ── Farm economy (each build event shows only what the building enables) ──
  {
    id: "build_granary", label: "Build the Granary", zone: "home", requires: ["arrive_home"],
    status: "WIRED",
    when: { fact: "building.granary.built" },
    effects: [{ kind: "note", consequence: "effect", label: "+1 turn / season, higher inventory cap" }],
  },
  {
    id: "build_mill", label: "Build the Mill", zone: "home", requires: ["arrive_home"],
    status: "WIRED",
    when: { fact: "building.mill.built" },
    effects: [{ kind: "note", consequence: "effect", label: "Bread costs less flour" }],
  },
  {
    id: "build_kitchen", label: "Build the Kitchen", zone: "home", requires: ["arrive_home"],
    status: "WIRED",
    when: { fact: "building.kitchen.built" },
    effects: [
      { kind: "unlockRecipe", recipe: "supplies" },
      { kind: "note", consequence: "effect", label: "Supplies pay for Mine trips" },
    ],
  },
  {
    id: "build_coop", label: "Build the Chicken Coop", zone: "home", requires: ["arrive_home"],
    status: "PLANNED", blurb: "Reporters confirm: the valley has chickens. Feathers everywhere.",
    when: { fact: "building.coop.built" },
    effects: [
      { kind: "discoverTile", tile: "tile_bird_chicken" },
      { kind: "note", consequence: "resource", label: "Eggs (chain chickens)" },
    ],
  },
  // ── Spine: the Mine opens ──
  {
    id: "open_mine", label: "Open the way to the Mine", milestone: true, zone: "quarry",
    requires: ["build_kitchen"], status: "PARTIAL",
    blurb: "Scouts return from the eastern crossroads — the old quarry road is passable.",
    when: { all: [
      { fact: "resource.supplies.total", op: "gte", value: 3 },
      { any: [ { fact: "building.pit_props.built" }, { fact: "level", op: "gte", value: 2 } ] },
    ]},
    effects: [{ kind: "note", consequence: "effect", label: "TODAY: reach Lv2 · PLANNED: supplies / Pit Props" }],
  },
  {
    id: "found_quarry", label: "Found the Cracked Quarry (Zone 2)", milestone: true, zone: "quarry",
    requires: ["open_mine"], status: "WIRED",
    blurb: "A second settlement takes root in the stone. The mine yawns open.",
    when: { fact: "zone.quarry.founded" },
    effects: [
      { kind: "unlockZone", zone: "quarry" },
      { kind: "note", consequence: "tile", label: "Stone, coal, iron & gold ore, gems" },
      { kind: "note", consequence: "resource", label: "Block, coke, iron bar, gold bar" },
      // Mine buildings become available to build here.
      { kind: "unlockBuilding", building: "workshop" },
      { kind: "unlockBuilding", building: "forge" },
      { kind: "unlockBuilding", building: "bakery" },
      { kind: "unlockWorker", worker: "miner" },
    ],
  },
  // ── Mine production tier (each build event shows only what it enables) ──
  {
    id: "build_workshop", label: "Build the Workshop", zone: "quarry", requires: ["found_quarry"],
    status: "WIRED",
    when: { fact: "building.workshop.built" },
    effects: [{ kind: "note", consequence: "tool", label: "All tools (Iron Pick, Drill, …)" }],
  },
  {
    id: "build_forge", label: "Build the Forge", zone: "quarry", requires: ["found_quarry"],
    status: "WIRED",
    when: { fact: "building.forge.built" },
    effects: [{ kind: "note", consequence: "recipe", label: "Iron Hinge, Lantern, Gold Ring…" }],
  },
  {
    id: "build_bakery", label: "Build the Bakery", zone: "quarry", requires: ["found_quarry"],
    status: "WIRED", blurb: "Needs block from the Mine — baking waits on stone.",
    when: { fact: "building.bakery.built" },
    effects: [{ kind: "unlockRecipe", recipe: "bread" }],
  },
  // ── Spine: reach the sea (PLANNED zone) ──
  {
    id: "found_harbor", label: "Found Saltspray Harbor (Zone 3)", milestone: true, zone: "harbor",
    requires: ["found_quarry"], status: "PLANNED",
    blurb: "Salt on the wind, nets out at dawn.",
    when: { fact: "zone.harbor.founded" },
    effects: [
      { kind: "unlockZone", zone: "harbor" },
      { kind: "note", consequence: "tile", label: "Fish shoals, kelp, pearls" },
      { kind: "note", consequence: "resource", label: "Fish fillet, fish oil, pearl" },
      { kind: "note", consequence: "building", label: "Fishmonger, Harbor Dock, Lighthouse" },
    ],
  },
];
