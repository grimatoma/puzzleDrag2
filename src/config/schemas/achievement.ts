import { z } from "zod";

export const achievementOverrideSchema = z
  .object({
    name: z.string().min(1).optional(),
    desc: z.string().optional(),
    threshold: z.number().int().min(1).optional(),
    target: z.number().int().min(1).optional(),
    rewardCoins: z.number().int().min(0).optional(),
  })
  .strict();

export const achievementsOverridesSchema = z.record(z.string(), achievementOverrideSchema);
