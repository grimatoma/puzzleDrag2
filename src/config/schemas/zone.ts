import { z } from "zod";
import { buildingIdSchema, zoneBoardsPatchSchema } from "./boardInstance.js";

export const zoneOverrideSchema = z
  .object({
    name: z.string().optional().describe("Display name shown on the map and zone info modal"),
    buildings: z
      .array(buildingIdSchema)
      .optional()
      .describe("Ordered list of building ids available to construct at this zone"),
    entryCost: z
      .object({ coins: z.number().int().min(0) })
      .strict()
      .optional()
      .describe("Coin cost paid each time the player travels to this zone"),
    boards: zoneBoardsPatchSchema
      .optional()
      .describe("Per-board-kind instances enabled at this zone (presence of farm/mine/fish keys)"),
  })
  .strict();

export const zonesOverridesSchema = z.record(z.string(), zoneOverrideSchema);
