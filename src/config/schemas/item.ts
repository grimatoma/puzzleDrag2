import { z } from "zod";
import { ItemKind } from "./itemKind.js";
import { swayParamsSchema, toolPowerDefinitionSchema } from "./shared.js";

const itemCommonOptional = {
  desc: z.string().optional().describe("Short description"),
  description: z.string().optional().describe("Longer description (Dev Panel)"),
  glyph: z.string().optional().describe("Legacy glyph label"),
  iconKey: z.string().optional().describe("Icon registry key"),
  sellable: z.boolean().optional(),
  power: toolPowerDefinitionSchema.optional(),
  effect: z.string().optional().describe("Tool power id when power object is absent"),
  target: z.string().optional().describe("Default target for tap-target tools"),
  anim: z.string().optional(),
  ms: z.number().optional(),
};

export const tileItemSchema = z
  .object({
    kind: z.literal(ItemKind.Tile),
    label: z.string().describe("Display name in UI, wiki, and tooltips"),
    biome: z.string().describe("Biome id this tile belongs to"),
    color: z.number().describe("Primary fill color (0xRRGGBB)"),
    dark: z.number().describe("Dark/outline color (0xRRGGBB)"),
    value: z.number().describe("Chain length contribution / sort weight"),
    next: z.union([z.string(), z.null()]).optional().describe("Produced resource key"),
    sway: swayParamsSchema.optional(),
    effects: z.record(z.string(), z.unknown()).optional(),
    ...itemCommonOptional,
  })
  .passthrough()
  .describe("Board tile entry in ITEMS");

export const resourceItemSchema = z
  .object({
    kind: z.literal(ItemKind.Resource),
    label: z.string(),
    color: z.number(),
    dark: z.number(),
    value: z.number(),
    next: z.null().optional(),
    biome: z.string().optional(),
    ...itemCommonOptional,
  })
  .passthrough()
  .describe("Inventory resource entry in ITEMS");

export const toolItemSchema = z
  .object({
    kind: z.literal(ItemKind.Tool),
    label: z.string(),
    color: z.number().optional(),
    dark: z.number().optional(),
    value: z.number().optional(),
    ...itemCommonOptional,
  })
  .passthrough()
  .describe("Consumable tool entry in ITEMS");

export const itemEntrySchema = z
  .discriminatedUnion("kind", [tileItemSchema, resourceItemSchema, toolItemSchema])
  .describe("Single row from constants ITEMS — discriminated by kind");

export type TileItemEntry = z.infer<typeof tileItemSchema>;
export type ResourceItemEntry = z.infer<typeof resourceItemSchema>;
export type ToolItemEntry = z.infer<typeof toolItemSchema>;
export type ItemEntry = z.infer<typeof itemEntrySchema>;
