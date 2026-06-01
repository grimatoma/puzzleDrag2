import { z } from "zod";
import { itemsOverridesSchema } from "./itemOverride.js";
import {
  tileDescriptionsOverridesSchema,
  tilePowersOverridesSchema,
  tileUnlocksOverridesSchema,
} from "./tilePower.js";
import { tuningSchema } from "./tuning.js";
import { recipesOverridesSchema } from "./recipe.js";
import { buildingsOverridesSchema } from "./building.js";
import { zonesOverridesSchema } from "./zone.js";
import { workersOverridesSchema } from "./worker.js";
import { keepersOverridesSchema } from "./keeper.js";
import { expeditionOverrideSchema } from "./expedition.js";
import { biomesOverridesSchema } from "./biome.js";
import { npcsOverridesSchema } from "./npc.js";
import { storyOverridesSchema } from "./story.js";
import { flagsOverridesSchema } from "./flags.js";
import { bossesOverridesSchema } from "./boss.js";
import { achievementsOverridesSchema } from "./achievement.js";
import { dailyRewardsOverridesSchema } from "./dailyReward.js";

export const upgradeThresholdsOverridesSchema = z.record(
  z.string(),
  z.number().int().min(1),
);

/**
 * Full Dev Panel / balance.json document shape.
 * Canonical game data lives in TS; this only describes override patches.
 */
export const balanceSchema = z
  .object({
    $schema: z.string().optional().describe("JSON schema hint for editors (ignored at runtime)"),
    version: z.number().finite().optional().default(1),
    upgradeThresholds: upgradeThresholdsOverridesSchema.optional(),
    items: itemsOverridesSchema.optional(),
    /** @deprecated Use `items` — merged at load when items is absent */
    resources: itemsOverridesSchema.optional(),
    recipes: recipesOverridesSchema.optional(),
    buildings: buildingsOverridesSchema.optional(),
    tilePowers: tilePowersOverridesSchema.optional(),
    tileUnlocks: tileUnlocksOverridesSchema.optional(),
    tileDescriptions: tileDescriptionsOverridesSchema.optional(),
    zones: zonesOverridesSchema.optional(),
    workers: workersOverridesSchema.optional(),
    keepers: keepersOverridesSchema.optional(),
    expedition: expeditionOverrideSchema.optional(),
    biomes: biomesOverridesSchema.optional(),
    tuning: tuningSchema.optional(),
    npcs: npcsOverridesSchema.optional(),
    story: storyOverridesSchema.optional(),
    flags: flagsOverridesSchema.optional(),
    bosses: bossesOverridesSchema.optional(),
    achievements: achievementsOverridesSchema.optional(),
    dailyRewards: dailyRewardsOverridesSchema.optional(),
  })
  .strict();

export type BalanceOverrides = z.infer<typeof balanceSchema>;

/** Dev Panel draft — all sections present (may be empty objects). */
export type BalanceDraft = {
  version: number;
  upgradeThresholds: z.infer<typeof upgradeThresholdsOverridesSchema>;
  items: z.infer<typeof itemsOverridesSchema>;
  recipes: z.infer<typeof recipesOverridesSchema>;
  buildings: z.infer<typeof buildingsOverridesSchema>;
  tilePowers: z.infer<typeof tilePowersOverridesSchema>;
  tileUnlocks: z.infer<typeof tileUnlocksOverridesSchema>;
  tileDescriptions: z.infer<typeof tileDescriptionsOverridesSchema>;
  zones: z.infer<typeof zonesOverridesSchema>;
  workers: z.infer<typeof workersOverridesSchema>;
  keepers: z.infer<typeof keepersOverridesSchema>;
  expedition: z.infer<typeof expeditionOverrideSchema>;
  biomes: z.infer<typeof biomesOverridesSchema>;
  tuning: z.infer<typeof tuningSchema>;
  npcs: z.infer<typeof npcsOverridesSchema>;
  story: z.infer<typeof storyOverridesSchema>;
  flags: z.infer<typeof flagsOverridesSchema>;
  bosses: z.infer<typeof bossesOverridesSchema>;
  achievements: z.infer<typeof achievementsOverridesSchema>;
  dailyRewards: z.infer<typeof dailyRewardsOverridesSchema>;
};
