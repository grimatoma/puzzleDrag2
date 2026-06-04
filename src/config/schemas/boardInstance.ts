import { z } from "zod";
import { BuildingId } from "../../types/catalog/buildings.js";
import { SeasonId, SEASON_ID_VALUES } from "../../types/catalog/seasons.js";
import { ZoneCategoryId, ZONE_CATEGORY_VALUES } from "../../types/catalog/tileCategories.js";
import { schemaTypeName } from "./schemaTypeName.js";

/** Board-only coin tile target — not a zone category or inventory resource. */
export const ZONE_UPGRADE_TARGET_GOLD = "gold" as const;

export type FarmUpgradeTarget = ZoneCategoryId | typeof ZONE_UPGRADE_TARGET_GOLD;

/** Zone drop-table category id (farm upgradeMap keys and seasonDrops columns). */
export const zoneCategoryIdSchema = schemaTypeName(
  "ZoneCategoryId",
  z.nativeEnum(ZoneCategoryId),
);

const seasonIdSchema = schemaTypeName("SeasonId", z.nativeEnum(SeasonId));

/** Zone category or the gold-tile sentinel used in upgrade maps. */
export const farmUpgradeTargetSchema = schemaTypeName(
  "FarmUpgradeTarget",
  z.union([zoneCategoryIdSchema, z.literal(ZONE_UPGRADE_TARGET_GOLD)]),
);

const farmSeasonDropRowShape = Object.fromEntries(
  ZONE_CATEGORY_VALUES.map((cat) => [cat, z.number().min(0)]),
) as { [K in ZoneCategoryId]: z.ZodNumber };

/** One season row: every farm zone category must be present (use 0 when unused). */
export const farmSeasonDropRowSchema = schemaTypeName(
  "FarmSeasonDropRow",
  z.object(farmSeasonDropRowShape).strict(),
);

/** Full farm drop table: all four calendar seasons, each with a complete category row. */
const farmSeasonDropsShape = Object.fromEntries(
  SEASON_ID_VALUES.map((season) => [season, farmSeasonDropRowSchema]),
) as { [K in SeasonId]: typeof farmSeasonDropRowSchema };

export const farmSeasonDropsSchema = schemaTypeName(
  "FarmSeasonDrops",
  z.object(farmSeasonDropsShape).strict(),
);

export type FarmSeasonDropRow = z.infer<typeof farmSeasonDropRowSchema>;
export type FarmSeasonDrops = z.infer<typeof farmSeasonDropsSchema>;

/** Source zone category → upgraded zone category (or gold sentinel). */
export const farmUpgradeMapSchema = schemaTypeName(
  "FarmUpgradeMap",
  z
    .partialRecord(zoneCategoryIdSchema, farmUpgradeTargetSchema)
    .describe(
      "Source zone category → upgraded zone category spawned after a chain (or gold sentinel)",
    ),
);

export type FarmUpgradeMap = Partial<Record<ZoneCategoryId, FarmUpgradeTarget>>;

/** Dev Panel / balance.json patch — partial category rows per season. */
export const farmSeasonDropRowPatchSchema = schemaTypeName(
  "FarmSeasonDropRowPatch",
  z
    .partialRecord(zoneCategoryIdSchema, z.number().min(0))
    .describe("Partial category weights for one season patch"),
);

export const farmSeasonDropsPatchSchema = schemaTypeName(
  "FarmSeasonDropsPatch",
  z
    .partialRecord(seasonIdSchema, farmSeasonDropRowPatchSchema)
    .describe("Partial per-season drop patches merged into the live table"),
);

/** @deprecated Use farmSeasonDropsSchema — kept for wiki/schema re-exports. */
export const seasonDropsSchema = farmSeasonDropsSchema;

/** Assert a complete season drop row at compile time. */
export function farmSeasonDropRow(row: FarmSeasonDropRow): FarmSeasonDropRow {
  return row;
}

/** Assert a complete four-season drop table at compile time. */
export function farmSeasonDrops(table: FarmSeasonDrops): FarmSeasonDrops {
  return table;
}

/** Canonical shape of a farm board instance attached to a zone. */
export const farmBoardInstanceSchema = z
  .object({
    baseTurns: z
      .number()
      .int()
      .min(1)
      .describe("Turn budget for a farm session at this zone before worker bonuses"),
    upgradeMap: farmUpgradeMapSchema,
    seasonDrops: farmSeasonDropsSchema,
  })
  .strict()
  .describe("Farm board configuration for one zone");

/** Partial farm board patch accepted via balance.json zone overrides. */
export const farmBoardInstancePatchSchema = z
  .object({
    baseTurns: farmBoardInstanceSchema.shape.baseTurns.optional(),
    upgradeMap: farmUpgradeMapSchema.optional().describe("Replaced wholesale"),
    seasonDrops: farmSeasonDropsPatchSchema.optional().describe("Merged per season"),
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

type FarmBoardInstanceBase = z.infer<typeof farmBoardInstanceSchema>;

export type FarmBoardInstance = Omit<FarmBoardInstanceBase, "upgradeMap"> & {
  upgradeMap: FarmUpgradeMap;
};
export type MineBoardInstance = z.infer<typeof mineBoardInstanceSchema>;
export type FishBoardInstance = z.infer<typeof fishBoardInstanceSchema>;

/** Deep-copy a farm board template so each zone owns an independent instance. */
export function cloneFarmBoard(template: FarmBoardInstance): FarmBoardInstance {
  return {
    baseTurns: template.baseTurns,
    upgradeMap: { ...template.upgradeMap },
    seasonDrops: Object.fromEntries(
      SEASON_ID_VALUES.map((season) => [
        season,
        { ...template.seasonDrops[season] },
      ]),
    ) as FarmSeasonDrops,
  };
}

export function cloneMineBoard(template: MineBoardInstance): MineBoardInstance {
  return { baseTurns: template.baseTurns };
}

export function cloneFishBoard(template: FishBoardInstance): FishBoardInstance {
  return { baseTurns: template.baseTurns };
}

export const buildingIdSchema = z.nativeEnum(BuildingId);
