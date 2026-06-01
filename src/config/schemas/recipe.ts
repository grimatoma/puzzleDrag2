import { z } from "zod";

export const recipeDefinitionSchema = z
  .object({
    item: z.string().describe("Output item key"),
    station: z.string().describe("Crafting station id"),
    tier: z.number().int().optional(),
    inputs: z.record(z.string(), z.number()).describe("Resource keys → quantities"),
    coins: z.number().optional(),
    craftMs: z.number().optional().describe("Queue duration override in ms"),
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
