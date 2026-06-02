import { z } from "zod";

export const settlementBiomeEntrySchema = z.object({
  id: z.string().describe("Stable biome key used in state and SETTLEMENT_BIOMES map"),
  name: z.string().describe("Display name shown in the biome picker and zone info modal"),
  look: z.object({ icon: z.string().describe("Emoji rendered beside the biome name") }).describe("Biome visual appearance"),
  hazards: z.tuple([z.string(), z.string()]).or(z.array(z.string()).min(2).max(2)).describe("Exactly two hazard ids fixed at founding that affect this settlement"),
  bonus: z.string().describe("Resource bonus description shown in the biome picker (e.g. 'wheat')"),
});

export const settlementBiomePatchSchema = z
  .object({
    name: z.string().optional(),
    look: z.object({ icon: z.string().optional() }).strict().optional().describe("Appearance overrides"),
    hazards: z.array(z.string()).min(1).optional(),
    bonus: z.string().optional(),
  })
  .strict();

export const biomesOverridesSchema = z.record(
  z.string(),
  z.record(z.string(), settlementBiomePatchSchema),
);
