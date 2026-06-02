import { z } from "zod";

export const bossOverrideSchema = z
  .object({
    name: z.string().min(1).optional().describe("Display name shown in the boss encounter UI"),
    season: z.string().min(1).optional().describe("Season id in which this boss appears"),
    description: z.string().optional().describe("Flavour text describing the boss encounter narrative"),
    modifierDescription: z.string().optional().describe("Player-facing explanation of the board modifier this boss applies"),
    targetAmount: z.number().int().min(1).optional().describe("Number of the target resource the player must collect to defeat the boss"),
  })
  .strict();

export const bossesOverridesSchema = z.record(z.string(), bossOverrideSchema);
