import { z } from "zod";

export const npcOverrideSchema = z
  .object({
    displayName: z.string().min(1).optional(),
    loves: z.array(z.string()).optional(),
    likes: z.array(z.string()).optional(),
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
