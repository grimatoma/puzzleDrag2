import { z } from "zod";

/** Loose record used for ability/tool params and legacy effect blobs. */
export const looseParamsSchema = z.record(z.string(), z.unknown());

export const swayParamsSchema = z
  .object({
    amp: z.number().describe("Sway animation amplitude in pixels"),
    freq: z.number().describe("Sway frequency (radians per ms, small values)"),
    gust: z.number().describe("Random gust strength multiplier"),
  })
  .describe("Wind sway applied to tile sprites on the board");

export type SwayParams = z.infer<typeof swayParamsSchema>;

export const toolPowerDefinitionSchema = z
  .object({
    id: z.string().describe("Tool power catalog id (see config/toolPowers.ts)"),
    params: looseParamsSchema.optional(),
    anim: z.string().optional().describe("Board animation preset id"),
    ms: z.number().optional().describe("Animation duration override in ms"),
    tint: z.number().optional(),
    bubble: z.string().optional(),
  })
  .passthrough()
  .describe("Runtime tool-power binding on a tool item");

export type ToolPowerDefinition = z.infer<typeof toolPowerDefinitionSchema>;

export const abilityInstanceSchema = z
  .object({
    id: z.string().describe("Ability catalog id"),
    params: looseParamsSchema.optional(),
  })
  .describe("Attached passive/active ability on a building, worker, or tile");

/** Legacy hook shape still accepted in balance tilePowers patches. */
export const legacyHookSchema = z
  .object({
    id: z.string(),
    params: looseParamsSchema.optional(),
  })
  .describe("Deprecated hooks[] form; translated to abilities at apply time");

const itemLookCommon = {
  iconKey: z.string().optional().describe("Icon registry key"),
  anim: z.string().optional().describe("Board animation name played for this item"),
  ms: z.number().optional().describe("Animation duration override in ms"),
};

export const tileLookSchema = z
  .object({
    color: z.number().describe("Primary fill color (0xRRGGBB)"),
    dark: z.number().describe("Dark/outline color (0xRRGGBB)"),
    sway: swayParamsSchema.optional(),
    ...itemLookCommon,
  })
  .describe("Visual appearance of a board tile");

export const resourceLookSchema = z
  .object({
    color: z.number().describe("Primary fill color (0xRRGGBB)"),
    dark: z.number().describe("Dark/outline color (0xRRGGBB)"),
    ...itemLookCommon,
  })
  .describe("Visual appearance of an inventory resource");

export const toolLookSchema = z
  .object({
    color: z.number().optional().describe("Primary fill color (0xRRGGBB)"),
    dark: z.number().optional().describe("Dark/outline color (0xRRGGBB)"),
    ...itemLookCommon,
  })
  .describe("Visual appearance of a tool");

export type TileLook = z.infer<typeof tileLookSchema>;
export type ResourceLook = z.infer<typeof resourceLookSchema>;
export type ToolLook = z.infer<typeof toolLookSchema>;
