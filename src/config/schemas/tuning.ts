import { z } from "zod";
import { TuningKey } from "../../types/catalog/tuningKeys.js";

export const tuningSchema = z
  .object({
    [TuningKey.CraftQueueHours]: z
      .number()
      .int()
      .min(1)
      .optional()
      .describe("Default craft queue duration in hours"),
    [TuningKey.CraftGemSkipCost]: z
      .number()
      .int()
      .min(0)
      .optional()
      .describe("Gems to skip the head of a craft queue (0 = free)"),
    [TuningKey.MinExpeditionTurns]: z
      .number()
      .int()
      .min(1)
      .optional()
      .describe("Minimum food turns required to start an expedition"),
    [TuningKey.FoundingBaseCoins]: z
      .number()
      .int()
      .min(1)
      .optional()
      .describe("Base coin cost for founding a new settlement biome"),
    [TuningKey.FoundingGrowth]: z
      .number()
      .positive()
      .optional()
      .describe("Exponential multiplier per founded biome"),
    [TuningKey.HomeBiome]: z
      .string()
      .min(1)
      .optional()
      .describe("Settlement biome id treated as home (e.g. prairie)"),
    [TuningKey.FireHazardEnabled]: z
      .boolean()
      .optional()
      .describe("Runtime mirror of fire hazard feature flag"),
  })
  .strict()
  .describe("Dev Panel tuning section → reassigned export lets");

export type TuningOverrides = z.infer<typeof tuningSchema>;
