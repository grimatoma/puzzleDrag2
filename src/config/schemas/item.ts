import { z } from "zod";
import { ItemKind } from "./itemKind.js";
import { swayParamsSchema, toolPowerDefinitionSchema } from "./shared.js";

const itemCommonOptional = {
  desc: z.string().optional().describe("Short description"),
  description: z.string().optional().describe("Longer description (Dev Panel)"),
  glyph: z.string().optional().describe("Legacy glyph label"),
  iconKey: z.string().optional().describe("Icon registry key"),
  sellable: z.boolean().optional().describe("Whether the item can be sold at the market"),
  power: toolPowerDefinitionSchema.optional(),
  effect: z.string().optional().describe("Tool power id when power object is absent"),
  target: z.string().optional().describe("Default target for tap-target tools"),
  anim: z.string().optional().describe("Board animation name played when the tool is used"),
  ms: z.number().optional().describe("Duration in ms for the board animation override"),
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
    effects: z.record(z.string(), z.unknown()).optional().describe("Compiled per-tile effect channels derived from abilities (e.g. producesResource, freeMoves, coinBonus*)"),
    ...itemCommonOptional,
  })
  .passthrough()
  .describe("Board tile entry in ITEMS");

export const resourceItemSchema = z
  .object({
    kind: z.literal(ItemKind.Resource),
    label: z.string().describe("Display name in UI, wiki, and tooltips"),
    color: z.number().describe("Primary fill color (0xRRGGBB)"),
    dark: z.number().describe("Dark/outline color (0xRRGGBB)"),
    value: z.number().describe("Sort weight / base sell-price factor"),
    next: z.null().optional().describe("Always null for resources (no board upgrade)"),
    biome: z.string().optional().describe("Biome id this resource is associated with"),
    ...itemCommonOptional,
  })
  .passthrough()
  .describe("Inventory resource entry in ITEMS");

export const toolItemSchema = z
  .object({
    kind: z.literal(ItemKind.Tool),
    label: z.string().describe("Display name in UI, wiki, and tooltips"),
    color: z.number().optional().describe("Primary fill color (0xRRGGBB)"),
    dark: z.number().optional().describe("Dark/outline color (0xRRGGBB)"),
    value: z.number().optional().describe("Sort weight used in inventory ordering"),
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
