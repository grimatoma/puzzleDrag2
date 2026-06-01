import { z } from "zod";
import { abilityInstanceSchema } from "./shared.js";

export const buildingDefinitionSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    desc: z.string(),
    cost: z.record(z.string(), z.number()),
    lv: z.number(),
    x: z.number(),
    y: z.number(),
    w: z.number(),
    h: z.number(),
    color: z.string(),
    built: z.boolean().optional(),
    biome: z.string().optional(),
    requires: z.string().optional(),
    abilities: z.array(abilityInstanceSchema).optional(),
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
