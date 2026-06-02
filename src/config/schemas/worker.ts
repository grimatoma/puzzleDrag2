import { z } from "zod";
import { abilityInstanceSchema } from "./shared.js";

const hireCostPatchSchema = z
  .object({
    coins: z.number().int().min(0).optional(),
    coinsStep: z.union([z.number().int().min(0), z.null()]).optional(),
    coinsMult: z.union([z.number().positive(), z.null()]).optional(),
    resources: z.record(z.string().min(1), z.number().int().positive()).optional(),
    resourcesStepEvery: z.number().int().min(1).optional(),
  })
  .strict();

export const workerOverrideSchema = z
  .object({
    hireCost: hireCostPatchSchema.optional().describe("Partial patch to the coin/resource cost fields for hiring this worker"),
    maxCount: z.number().int().min(1).optional().describe("Maximum number of this worker type the player can hire"),
    abilities: z.array(abilityInstanceSchema).optional().describe("Passive ability modifiers granted per hired worker"),
    look: z.object({ iconKey: z.string().optional(), color: z.string().optional() }).strict().optional().describe("Appearance overrides"),
  })
  .strict();

export const workersOverridesSchema = z.record(z.string(), workerOverrideSchema);
