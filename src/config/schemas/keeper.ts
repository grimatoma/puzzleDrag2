import { z } from "zod";

const keeperPathPatchSchema = z
  .object({
    label: z.string().optional(),
    pitch: z.array(z.string()).optional(),
    embers: z.number().int().min(0).optional(),
    coreIngots: z.number().int().min(0).optional(),
  })
  .strict();

export const keeperOverrideSchema = z
  .object({
    name: z.string().optional(),
    title: z.string().optional(),
    look: z.object({ icon: z.string().optional() }).strict().optional().describe("Appearance overrides"),
    appearsAfterBuildings: z.number().int().min(0).optional(),
    intro: z.array(z.string()).optional(),
    coexist: keeperPathPatchSchema.optional(),
    driveout: keeperPathPatchSchema.optional(),
  })
  .strict();

export const keepersOverridesSchema = z.record(z.string(), keeperOverrideSchema);
