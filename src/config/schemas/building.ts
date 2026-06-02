import { z } from "zod";
import { abilityInstanceSchema } from "./shared.js";

export const buildingDefinitionSchema = z
  .object({
    id: z.string().describe("Stable building key used in state.built and BUILDINGS map"),
    name: z.string().describe("Display name shown in the town UI and tooltips"),
    desc: z.string().describe("Short description of the building's purpose"),
    cost: z.record(z.string(), z.number()).describe("Resource keys → quantities required to construct"),
    lv: z.number().describe("Minimum town level required before this building can be constructed"),
    x: z.number().describe("Horizontal plot position on the town layout stage"),
    y: z.number().describe("Vertical plot position on the town layout stage"),
    w: z.number().describe("Plot width in layout units"),
    h: z.number().describe("Plot height in layout units"),
    color: z.string().describe("Accent color used for the building illustration"),
    built: z.boolean().optional().describe("True if the building starts pre-constructed (e.g. the Hearth)"),
    biome: z.string().optional().describe("Biome id that must be active at the zone for this building to appear"),
    requires: z.string().optional().describe("Building id that must already be constructed before this one unlocks"),
    abilities: z.array(abilityInstanceSchema).optional().describe("Passive ability modifiers granted while this building is constructed"),
  })
  .passthrough();

export const buildingOverrideSchema = z
  .object({
    name: z.string().optional(),
    desc: z.string().optional(),
    cost: z.record(z.string(), z.number()).optional(),
    lv: z.number().optional(),
    color: z.string().optional(),
    abilities: z.array(abilityInstanceSchema).optional().describe("Replaces abilities wholesale"),
  })
  .strict();

export const buildingsOverridesSchema = z.record(z.string(), buildingOverrideSchema);
