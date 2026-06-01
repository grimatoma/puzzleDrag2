import { z } from "zod";

export const toolPowerParamDefSchema = z.object({
  key: z.string(),
  label: z.string(),
  type: z.string(),
  default: z.union([z.string(), z.number()]).optional(),
});

export const toolPowerCatalogEntrySchema = z
  .object({
    id: z.string(),
    name: z.string(),
    desc: z.string(),
    params: z.array(toolPowerParamDefSchema),
    isTapTarget: z.boolean().optional(),
    dimStrategy: z.string().optional(),
    note: z.string().optional(),
    defaultBoardAnim: z
      .object({
        anim: z.string(),
        ms: z.number(),
      })
      .optional(),
  })
  .passthrough();
