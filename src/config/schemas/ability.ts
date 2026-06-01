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
    id: z.string(),
    name: z.string(),
    iconKey: z.string(),
    desc: z.string(),
    scope: z.array(z.string()),
    trigger: z.string(),
    channel: z.string(),
    params: z.array(abilityParamDefSchema),
  })
  .passthrough();
