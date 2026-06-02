import { z } from "zod";

export const recipeDefinitionSchema = z
  .object({
    item: z.string().describe("Output item key"),
    station: z.string().describe("Crafting station id"),
    tier: z.number().int().optional().describe("Crafting tier; tier 2 recipes require town level 3+"),
    inputs: z.record(z.string(), z.number()).describe("Resource keys → quantities"),
    coins: z.number().optional().describe("Coin reward credited to the player on craft completion"),
    craftMs: z.number().describe("Queue duration in ms"),
  })
  .passthrough();

export const recipeOverrideSchema = z
  .object({
    item: z.string().optional(),
    inputs: z.record(z.string(), z.number()).optional().describe("Replaces inputs wholesale"),
    tier: z.number().optional(),
    station: z.string().optional(),
    coins: z.number().optional(),
  })
  .strict();

export const recipesOverridesSchema = z.record(z.string(), recipeOverrideSchema);

export type RecipeDefinition = z.infer<typeof recipeDefinitionSchema>;
export type RecipeOverride = z.infer<typeof recipeOverrideSchema>;
