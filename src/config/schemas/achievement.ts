import { z } from "zod";

export const achievementEntrySchema = z
  .object({
    id: z.string().describe("Stable achievement id"),
    name: z.string().describe("Display name"),
    desc: z.string().describe("Description shown in the achievements panel"),
    counter: z.string().describe("Stat counter key this achievement tracks"),
    threshold: z.number().describe("Counter value that unlocks the achievement"),
    target: z.number().describe("Target value shown in progress UI"),
    reward: z
      .object({
        coins: z.number().optional().describe("Coins granted on unlock"),
        xp: z.number().optional().describe("XP granted on unlock"),
        tools: z.record(z.string(), z.number()).optional().describe("Tools granted on unlock, keyed by tool id"),
      })
      .optional()
      .describe("Reward granted when the achievement unlocks"),
    trigger: z.string().optional().describe("Optional trigger id"),
    look: z
      .object({ icon: z.string().describe("Icon registry key (ach_<id>) for the badge") })
      .describe("Achievement visual appearance"),
  })
  .passthrough()
  .describe("One achievement definition");
export type AchievementEntry = z.infer<typeof achievementEntrySchema>;

export const achievementOverrideSchema = z
  .object({
    name: z.string().min(1).optional(),
    desc: z.string().optional(),
    threshold: z.number().int().min(1).optional(),
    target: z.number().int().min(1).optional(),
    rewardCoins: z.number().int().min(0).optional(),
    look: z
      .object({ icon: z.string().optional() })
      .strict()
      .optional()
      .describe("Appearance overrides"),
  })
  .strict();

export const achievementsOverridesSchema = z.record(z.string(), achievementOverrideSchema);
