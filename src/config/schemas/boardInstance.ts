import { z } from "zod";

/** Shared season drop table shape used by farm board instances. */
export const seasonDropsSchema = z
  .record(z.string(), z.record(z.string(), z.number().min(0)))
  .describe("Per-season drop weights: season name → zone category → weight (0–1 fraction)");

/** Canonical shape of a farm board instance attached to a zone. */
export const farmBoardInstanceSchema = z
  .object({
    baseTurns: z
      .number()
      .int()
      .min(1)
      .describe("Turn budget for a farm session at this zone before worker bonuses"),
    upgradeMap: z
      .record(z.string(), z.string().min(1))
      .describe("Source zone category → upgraded zone category spawned after a chain"),
    seasonDrops: seasonDropsSchema,
  })
  .strict()
  .describe("Farm board configuration for one zone");

/** Partial farm board patch accepted via balance.json zone overrides. */
export const farmBoardInstancePatchSchema = z
  .object({
    baseTurns: farmBoardInstanceSchema.shape.baseTurns.optional(),
    upgradeMap: z
      .record(z.string(), z.string().min(1))
      .optional()
      .describe("Replaced wholesale"),
    seasonDrops: seasonDropsSchema.optional().describe("Merged per season"),
  })
  .strict();

/** Canonical shape of a mine board instance attached to a zone. */
export const mineBoardInstanceSchema = z
  .object({
    baseTurns: z
      .number()
      .int()
      .min(1)
      .describe("Default turn budget for a mine expedition at this zone"),
  })
  .strict()
  .describe("Mine board configuration for one zone");

export const mineBoardInstancePatchSchema = z
  .object({
    baseTurns: mineBoardInstanceSchema.shape.baseTurns.optional(),
  })
  .strict();

/** Canonical shape of a harbor / fish board instance attached to a zone. */
export const fishBoardInstanceSchema = z
  .object({
    baseTurns: z
      .number()
      .int()
      .min(1)
      .describe("Default turn budget for a harbor fishing session at this zone"),
  })
  .strict()
  .describe("Harbor board configuration for one zone");

export const fishBoardInstancePatchSchema = z
  .object({
    baseTurns: fishBoardInstanceSchema.shape.baseTurns.optional(),
  })
  .strict();

export const zoneBoardsPatchSchema = z
  .object({
    farm: farmBoardInstancePatchSchema.optional(),
    mine: mineBoardInstancePatchSchema.optional(),
    fish: fishBoardInstancePatchSchema.optional(),
  })
  .strict()
  .describe("Per-board-kind instances enabled at this zone");

export type FarmBoardInstance = z.infer<typeof farmBoardInstanceSchema>;
export type MineBoardInstance = z.infer<typeof mineBoardInstanceSchema>;
export type FishBoardInstance = z.infer<typeof fishBoardInstanceSchema>;
