import { z } from "zod";
import { abilityInstanceSchema, legacyHookSchema } from "./shared.js";

export const tilePowerPatchSchema = z
  .object({
    abilities: z.array(abilityInstanceSchema).optional().describe("Replaces tile.abilities; recompiles effects"),
    hooks: z.array(legacyHookSchema).optional().describe("Legacy form; translated to abilities"),
    producesResource: z
      .union([z.string(), z.literal("")])
      .optional()
      .describe("Overrides tile.effects.producesResource; empty string clears"),
  })
  .strict();

export const tilePowersOverridesSchema = z.record(z.string(), tilePowerPatchSchema);

export const tileUnlocksOverridesSchema = z.record(z.string(), z.record(z.string(), z.unknown()));

export const tileDescriptionsOverridesSchema = z.record(z.string(), z.string());

export type TilePowerPatch = z.infer<typeof tilePowerPatchSchema>;
