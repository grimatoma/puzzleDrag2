import { z } from "zod";

export const bossOverrideSchema = z
  .object({
    name: z.string().min(1).optional(),
    season: z.string().min(1).optional(),
    description: z.string().optional(),
    modifierDescription: z.string().optional(),
    targetAmount: z.number().int().min(1).optional(),
  })
  .strict();

export const bossesOverridesSchema = z.record(z.string(), bossOverrideSchema);
