import { z } from "zod";
import { abilityInstanceSchema } from "./shared.js";

const hireCostPatchSchema = z
  .object({
    coins: z.number().min(0).optional(),
    coinsStep: z.union([z.number().min(0), z.null()]).optional(),
    coinsMult: z.union([z.number().positive(), z.null()]).optional(),
    resources: z.record(z.string(), z.number()).optional(),
    resourcesStepEvery: z.number().int().min(1).optional(),
  })
  .strict();

export const workerOverrideSchema = z
  .object({
    hireCost: hireCostPatchSchema.optional(),
    maxCount: z.number().int().min(1).optional(),
    abilities: z.array(abilityInstanceSchema).optional(),
  })
  .strict();

export const workersOverridesSchema = z.record(z.string(), workerOverrideSchema);
