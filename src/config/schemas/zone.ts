import { z } from "zod";

export const zoneOverrideSchema = z
  .object({
    name: z.string().optional(),
    hasFarm: z.boolean().optional(),
    hasMine: z.boolean().optional(),
    hasWater: z.boolean().optional(),
    buildings: z.array(z.string()).optional(),
    baseTurns: z.number().int().min(1).optional(),
    entryCost: z.object({ coins: z.number().min(0) }).strict().optional(),
    upgradeMap: z.record(z.string(), z.string()).optional().describe("Replaced wholesale"),
    seasonDrops: z.record(z.string(), z.record(z.string(), z.number())).optional(),
  })
  .strict();

export const zonesOverridesSchema = z.record(z.string(), zoneOverrideSchema);
