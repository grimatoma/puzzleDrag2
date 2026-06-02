import { z } from "zod";

export const abilityParamDefSchema = z.object({
  key: z.string(),
  label: z.string(),
  type: z.string(),
  default: z.union([z.string(), z.number()]).optional(),
  min: z.number().optional(),
  max: z.number().optional(),
});

export const abilityCatalogEntrySchema = z
  .object({
    id: z.string().describe("Stable ability key used in building/worker/tile data"),
    name: z.string().describe("Human-readable name shown in the Dev Panel"),
    iconKey: z.string().describe("Icon registry key used to render the ability badge"),
    desc: z.string().describe("Short description of what the ability does"),
    scope: z.array(z.string()).describe("Entity kinds that may attach this ability (building, worker, tile)"),
    trigger: z.string().describe("Lifecycle moment when the ability fires (e.g. passive, on_chain_collect, season_end)"),
    channel: z.string().describe("Aggregator output bucket this ability contributes to"),
    params: z.array(abilityParamDefSchema).describe("Parameter schema for the Dev Panel editor and runtime arguments"),
  })
  .passthrough();
