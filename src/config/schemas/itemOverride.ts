import { z } from "zod";

/**
 * Fields balance.json may patch on an existing ITEMS row (see applyItemOverrides).
 * Keys must already exist in ITEMS — unknown ids are skipped at apply time.
 */
const itemLookOverrideSchema = z
  .object({
    color: z.number().optional(),
    dark: z.number().optional(),
    iconKey: z.string().optional(),
    anim: z.string().optional(),
    ms: z.number().optional(),
  })
  .strict();

export const itemOverrideSchema = z
  .object({
    label: z.string().optional(),
    value: z.number().optional(),
    next: z.union([z.string(), z.null()]).optional(),
    glyph: z.string().optional(),
    description: z.string().optional(),
    desc: z.string().optional(),
    effect: z.string().optional(),
    target: z.string().optional(),
    look: itemLookOverrideSchema.optional(),
  })
  .strict();

export const itemsOverridesSchema = z
  .record(z.string(), itemOverrideSchema)
  .describe("balance.json → items (and legacy resources alias)");

export type ItemOverride = z.infer<typeof itemOverrideSchema>;
export type ItemsOverrides = z.infer<typeof itemsOverridesSchema>;
