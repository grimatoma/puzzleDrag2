import { z } from "zod";

/** Balance story section — presentation patches; full beat shape validated by applyStoryOverrides. */
export const storyOverridesSchema = z
  .object({
    beats: z.record(z.string(), z.record(z.string(), z.unknown())).optional(),
    newBeats: z.array(z.record(z.string(), z.unknown())).optional(),
    suppressedBeats: z.array(z.string()).optional(),
    repeatCooldowns: z.record(z.string(), z.number()).optional(),
  })
  .strict();
