import { z } from "zod";

export const zoneOverrideSchema = z
  .object({
    name: z.string().optional(),
    hasFarm: z.boolean().optional(),
    hasMine: z.boolean().optional(),
    hasWater: z.boolean().optional(),
    buildings: z.array(z.string().min(1)).optional(),
    baseTurns: z.number().int().min(1).optional(),
    entryCost: z.object({ coins: z.number().int().min(0) }).strict().optional(),
    upgradeMap: z.record(z.string(), z.string().min(1)).optional().describe("Replaced wholesale"),
    seasonDrops: z
      .record(z.string(), z.record(z.string(), z.number().min(0)))
      .optional(),
  })
  .strict();

export const zonesOverridesSchema = z.record(z.string(), zoneOverrideSchema);
