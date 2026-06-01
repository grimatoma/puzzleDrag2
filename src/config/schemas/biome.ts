import { z } from "zod";

export const settlementBiomeEntrySchema = z.object({
  id: z.string(),
  name: z.string(),
  icon: z.string(),
  hazards: z.tuple([z.string(), z.string()]).or(z.array(z.string()).min(2).max(2)),
  bonus: z.string(),
});

export const settlementBiomePatchSchema = z
  .object({
    name: z.string().optional(),
    icon: z.string().optional(),
    hazards: z.array(z.string()).min(1).optional(),
    bonus: z.string().optional(),
  })
  .strict();

export const biomesOverridesSchema = z.record(
  z.string(),
  z.record(z.string(), settlementBiomePatchSchema),
);
