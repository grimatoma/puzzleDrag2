import { z } from "zod";

export const npcOverrideSchema = z
  .object({
    displayName: z.string().min(1).optional().describe("Name shown in NPC dialogue and town UI"),
    loves: z.array(z.string()).optional().describe("Item keys this NPC loves as gifts (highest affinity tier)"),
    likes: z.array(z.string()).optional().describe("Item keys this NPC likes as gifts (medium affinity tier)"),
  })
  .strict();

export const npcsOverridesSchema = z.object({
  byId: z.record(z.string(), npcOverrideSchema).optional(),
  bands: z
    .array(
      z.object({
        name: z.string().optional(),
        modifier: z.number().optional(),
      }).strict(),
    )
    .optional(),
}).strict();
