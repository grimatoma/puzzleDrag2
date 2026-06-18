import { z } from "zod";

/** Balance story section — authoring patches; merged onto the built-in beats at runtime by applyStoryOverrides (src/state/applyStoryOverrides.ts). */
export const storyOverridesSchema = z
  .object({
    beats: z.record(z.string(), z.record(z.string(), z.unknown())).optional(),
    newBeats: z.array(z.record(z.string(), z.unknown())).optional(),
    suppressedBeats: z.array(z.string()).optional(),
    repeatCooldowns: z.record(z.string(), z.number()).optional(),
  })
  .strict();
