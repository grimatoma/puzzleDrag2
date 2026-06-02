import { z } from "zod";

export const toolPowerParamDefSchema = z.object({
  key: z.string(),
  label: z.string(),
  type: z.string(),
  default: z.union([z.string(), z.number()]).optional(),
});

export const toolPowerCatalogEntrySchema = z
  .object({
    id: z.string().describe("Stable tool-power key matched by the effect field on tool items"),
    name: z.string().describe("Human-readable name shown in the Dev Panel"),
    desc: z.string().describe("Short description of the active effect triggered when the tool is spent"),
    params: z.array(toolPowerParamDefSchema).describe("Parameter schema for the Dev Panel editor and runtime arguments"),
    isTapTarget: z.boolean().optional().describe("True if the player must tap a board tile to target this power"),
    dimStrategy: z.string().optional().describe("Board dimming strategy applied while this tap-target power is armed"),
    note: z.string().optional().describe("Optional caveat surfaced in the Wiki (e.g. availability or platform notes)"),
    defaultBoardAnim: z
      .object({
        anim: z.string(),
        ms: z.number(),
      })
      .optional()
      .describe("Default board animation name and duration used when a tool with this power is activated"),
  })
  .passthrough();
