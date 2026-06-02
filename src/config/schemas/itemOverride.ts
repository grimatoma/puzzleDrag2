import { z } from "zod";

/**
 * Fields balance.json may patch on an existing ITEMS row (see applyItemOverrides).
 * Keys must already exist in ITEMS — unknown ids are skipped at apply time.
 */
const itemLookOverrideSchema = z
  .object({
    color: z.number().optional().describe("Primary color (0xRRGGBB)"),
    dark: z.number().optional().describe("Dark color (0xRRGGBB)"),
    iconKey: z.string().optional().describe("Icon registry key"),
    anim: z.string().optional().describe("Board animation name"),
    ms: z.number().optional().describe("Animation duration override (ms)"),
  })
  .strict();

export const itemOverrideSchema = z
  .object({
    label: z.string().optional().describe("Display name override"),
    value: z.number().optional().describe("Chain value weight"),
    next: z.union([z.string(), z.null()]).optional().describe("Produced resource / upgrade key"),
    glyph: z.string().optional().describe("Legacy glyph label"),
    description: z.string().optional().describe("Longer description (Dev Panel)"),
    desc: z.string().optional().describe("Short description"),
    effect: z.string().optional().describe("Tool power id"),
    target: z.string().optional().describe("Default target for tap-target tools"),
    look: itemLookOverrideSchema.optional().describe("Appearance overrides"),
  })
  .strict();

export const itemsOverridesSchema = z
  .record(z.string(), itemOverrideSchema)
  .describe("balance.json → items (and legacy resources alias)");

export type ItemOverride = z.infer<typeof itemOverrideSchema>;
export type ItemsOverrides = z.infer<typeof itemsOverridesSchema>;
