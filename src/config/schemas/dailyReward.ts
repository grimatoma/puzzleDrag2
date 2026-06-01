import { z } from "zod";

export const dailyRewardOverrideSchema = z
  .object({
    coins: z.number().int().min(0).optional(),
    runes: z.number().int().min(0).optional(),
  })
  .strict();

export const dailyRewardsOverridesSchema = z.record(z.string(), dailyRewardOverrideSchema);
