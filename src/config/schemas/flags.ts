import { z } from "zod";

export const flagsOverridesSchema = z
  .object({
    byId: z.record(z.string(), z.record(z.string(), z.unknown())).optional(),
    new: z.array(z.record(z.string(), z.unknown())).optional(),
  })
  .strict();
