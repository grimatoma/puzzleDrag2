import { z } from "zod";

/**
 * Fields balance.json may patch on an existing ITEMS row (see applyItemOverrides).
 * Keys must already exist in ITEMS — unknown ids are skipped at apply time.
 */
export const itemOverrideSchema = z
  .object({
    label: z.string().describe("Display name override").optional(),
    color: z.number().describe("Primary color (0xRRGGBB)").optional(),
    dark: z.number().describe("Dark color (0xRRGGBB)").optional(),
    value: z.number().describe("Chain value weight").optional(),
    next: z.union([z.string(), z.null()]).describe("Produced resource / upgrade key").optional(),
    glyph: z.string().optional(),
    description: z.string().optional(),
    desc: z.string().optional(),
    effect: z.string().describe("Tool power id").optional(),
    target: z.string().optional(),
    anim: z.string().optional(),
    ms: z.number().optional(),
  })
  .strict();

export const itemsOverridesSchema = z
  .record(z.string(), itemOverrideSchema)
  .describe("balance.json → items (and legacy resources alias)");

export type ItemOverride = z.infer<typeof itemOverrideSchema>;
export type ItemsOverrides = z.infer<typeof itemsOverridesSchema>;
