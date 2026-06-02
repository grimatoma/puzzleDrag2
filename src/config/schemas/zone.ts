import { z } from "zod";

export const zoneOverrideSchema = z
  .object({
    name: z.string().optional().describe("Display name shown on the map and zone info modal"),
    hasFarm: z.boolean().optional().describe("Whether this zone has farm-type board tiles available"),
    hasMine: z.boolean().optional().describe("Whether this zone has mine-type board tiles available"),
    hasWater: z.boolean().optional().describe("Whether this zone has water/fish-type board tiles available"),
    buildings: z.array(z.string().min(1)).optional().describe("Ordered list of building ids available to construct at this zone"),
    baseTurns: z.number().int().min(1).optional().describe("Number of turns per session at this zone before the expedition ends"),
    entryCost: z.object({ coins: z.number().int().min(0) }).strict().optional().describe("Coin cost paid each time the player travels to this zone"),
    upgradeMap: z.record(z.string(), z.string().min(1)).optional().describe("Replaced wholesale"),
    seasonDrops: z
      .record(z.string(), z.record(z.string(), z.number().min(0)))
      .optional()
      .describe("Per-season bonus drop table: season name → resource key → drop weight"),
  })
  .strict();

export const zonesOverridesSchema = z.record(z.string(), zoneOverrideSchema);
