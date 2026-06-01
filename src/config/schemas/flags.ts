import { z } from "zod";

const flagCategories = ["story", "frostmaw", "mira", "misc"] as const;

/** Single flag metadata patch (Dev Panel / story editor). */
export const flagPatchSchema = z
  .object({
    label: z.string().min(1).optional(),
    description: z.string().optional(),
    category: z.enum(flagCategories).optional(),
    default: z.boolean().optional(),
    triggers: z.array(z.record(z.string(), z.unknown())).optional(),
  })
  .strict();

/** Author-created flag row appended via `flags.new`. */
export const flagNewEntrySchema = flagPatchSchema.extend({
  id: z.string().min(1),
});

export const flagsOverridesSchema = z
  .object({
    byId: z.record(z.string(), flagPatchSchema).optional(),
    new: z.array(flagNewEntrySchema).optional(),
  })
  .strict();

export type FlagPatch = z.infer<typeof flagPatchSchema>;
