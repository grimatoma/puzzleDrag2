// Apply Dev Panel overrides on top of the default game constants.
//
// The override JSON lives in `src/config/balance.json` (committed) and is
// optionally augmented by a localStorage draft (`hearth.balance.draft`) that
// the in-game Dev Panel writes for fast iteration. The committed file
// is always the source of truth in production builds.
//
// All merge functions are pure and mutate-in-place on the passed-in
// targets — that's deliberate, because the targets are the live module
// objects exported from constants.js (UPGRADE_THRESHOLDS, BIOMES, RECIPES,
// BUILDINGS, TILE_TYPES) and downstream code already imported references to
// them. Reassigning the bindings would not propagate.

import { expandAbilitiesToEffects } from "./abilitiesAggregate.js";
import { rejectUnknownOverrideKeys, rejectUnknownOverrideTarget } from "./overrideStrict.js";
import { ALL_ITEM_KEY_VALUES, type ItemKey } from "../types/catalog/itemKeys.js";
import type { BalanceOverrides } from "./schemas/balance.js";
import { upgradeThresholdsOverridesSchema } from "./schemas/balance.js";
import { achievementsOverridesSchema } from "./schemas/achievement.js";
import { biomesOverridesSchema } from "./schemas/biome.js";
import { bossesOverridesSchema } from "./schemas/boss.js";
import { buildingsOverridesSchema } from "./schemas/building.js";
import { dailyRewardsOverridesSchema } from "./schemas/dailyReward.js";
import { expeditionOverrideSchema } from "./schemas/expedition.js";
import { flagsOverridesSchema, type FlagPatch } from "./schemas/flags.js";
import { itemsOverridesSchema } from "./schemas/itemOverride.js";
import { keepersOverridesSchema } from "./schemas/keeper.js";
import { npcsOverridesSchema } from "./schemas/npc.js";
import { parseOptionalOverrideSection } from "./schemas/parseOverrideSection.js";
import { recipesOverridesSchema } from "./schemas/recipe.js";
import { storyOverridesSchema } from "./schemas/story.js";
import {
  tileDescriptionsOverridesSchema,
  tilePowersOverridesSchema,
  tileUnlocksOverridesSchema,
} from "./schemas/tilePower.js";
import { tuningSchema } from "./schemas/tuning.js";
import type { TuningOverrides } from "./schemas/tuning.js";
import { workersOverridesSchema } from "./schemas/worker.js";
import { zonesOverridesSchema } from "./schemas/zone.js";

// Map legacy power-hook ids → unified ability ids. Some ids stayed the
// same; a few were renamed during the abilities unification.
const LEGACY_HOOK_TO_ABILITY = Object.freeze({
  free_moves: "free_moves",
  free_turn_after_n: "free_turn_if_chain",
  coin_bonus_flat: "coin_bonus_flat",
  coin_bonus_per_tile: "coin_bonus_per_tile",
  pool_weight_boost: "pool_weight",
  threshold_reduction: "threshold_reduce",
});

const ITEM_KEY_SET = new Set<string>(ALL_ITEM_KEY_VALUES);

function isKnownRecipeInputKey(key: string): key is ItemKey {
  return ITEM_KEY_SET.has(key);
}

interface LegacyHook { id: string; params?: Record<string, unknown> }
interface AbilityShape { id: string; params: Record<string, unknown> }

/** Convert a legacy `hooks: [{ id, params }]` array into the new abilities shape. */
function hooksToAbilities(hooks: unknown): AbilityShape[] {
  if (!Array.isArray(hooks)) return [];
  const out: AbilityShape[] = [];
  const map = LEGACY_HOOK_TO_ABILITY as Record<string, string | undefined>;
  for (const h of hooks as LegacyHook[]) {
    if (!h || typeof h !== "object") continue;
    const newId = map[h.id];
    if (!newId) {
      rejectUnknownOverrideTarget("tilePowers.hooks", h.id);
      continue;
    }
    const params = { ...(h.params || {}) };
    // Param renames: pool_weight_boost / threshold_reduction used `target` already.
    out.push({ id: newId, params });
  }
  return out;
}

export {
  BALANCE_DRAFT_KEY,
  readBalanceDraft,
  writeBalanceDraft,
  mergeOverrides,
} from "./balance/load.js";

/** @deprecated Use BalanceOverrides from config/schemas */
type Overrides = BalanceOverrides | Record<string, unknown> | null | undefined;

/** Apply numeric upgrade-threshold overrides in place. */
export function applyUpgradeThresholdOverrides(target: Record<string, number>, overrides: Overrides): void {
  const parsed = parseOptionalOverrideSection("upgradeThresholds", upgradeThresholdsOverridesSchema, overrides);
  if (!parsed) return;
  rejectUnknownOverrideKeys("upgradeThresholds", Object.keys(parsed), new Set(Object.keys(target)));
  for (const [key, value] of Object.entries(parsed)) {
    target[key] = value;
  }
}

type AnyRecord = Record<string, unknown>;

function asRecord(v: unknown): AnyRecord {
  return (v && typeof v === "object" && !Array.isArray(v)) ? (v as AnyRecord) : {};
}

/**
 * Apply per-item overrides to ITEMS. Allowed fields:
 * label, value, next, glyph, description, effect, target, desc, look ({ color, dark, iconKey, anim, ms })
 * The item is patched in place.
 */
export function applyItemOverrides(items: Record<string, AnyRecord> | unknown, overrides: Overrides): void {
  const parsed = parseOptionalOverrideSection("items", itemsOverridesSchema, overrides);
  if (!parsed) return;
  const itemMap = (items ?? {}) as Record<string, AnyRecord | undefined>;
  for (const [key, patch] of Object.entries(parsed)) {
    const item = itemMap[key];
    if (!item) {
      rejectUnknownOverrideTarget("items", key);
      continue;
    }
    if (patch.label !== undefined) item.label = patch.label;
    if (patch.value !== undefined) item.value = patch.value;
    if (patch.next !== undefined) item.next = patch.next ?? null;
    if (patch.glyph !== undefined) item.glyph = patch.glyph;
    if (patch.description !== undefined) item.description = patch.description;
    if (patch.desc !== undefined) item.desc = patch.desc;
    if (patch.effect !== undefined) item.effect = patch.effect;
    if (patch.target !== undefined) item.target = patch.target;
    if (patch.look) {
      item.look = { ...asRecord(item.look), ...patch.look };
    }
  }
}

/** Apply patches to RECIPES entries. Fields: item, inputs, tier, station, coins. */
export function applyRecipeOverrides(recipes: Record<string, AnyRecord> | unknown, overrides: Overrides): void {
  const parsed = parseOptionalOverrideSection("recipes", recipesOverridesSchema, overrides);
  if (!parsed) return;
  const recipeMap = (recipes ?? {}) as Record<string, AnyRecord | undefined>;
  for (const [key, patch] of Object.entries(parsed)) {
    const r = recipeMap[key];
    if (!r) {
      rejectUnknownOverrideTarget("recipes", key);
      continue;
    }
    if (patch.item !== undefined && isKnownRecipeInputKey(patch.item)) r.item = patch.item;
    if (patch.inputs !== undefined) {
      const cleaned: Record<string, number> = {};
      for (const [resKey, qty] of Object.entries(patch.inputs)) {
        if (!isKnownRecipeInputKey(resKey)) {
          rejectUnknownOverrideTarget(`recipes.${key}.inputs`, resKey);
          continue;
        }
        cleaned[resKey] = qty;
      }
      r.inputs = cleaned;
    }
    if (patch.tier !== undefined) r.tier = patch.tier;
    if (patch.station !== undefined) r.station = patch.station;
    if (patch.coins !== undefined) r.coins = patch.coins;
  }
}

/** Apply patches to BUILDINGS entries (matched by id). Fields: name, desc,
 *  cost, lv, look.color, abilities. */
export function applyBuildingOverrides(buildings: AnyRecord[] | unknown, overrides: Overrides): void {
  const parsed = parseOptionalOverrideSection("buildings", buildingsOverridesSchema, overrides);
  if (!parsed) return;
  const list = Array.isArray(buildings) ? buildings as AnyRecord[] : [];
  const buildingIds = new Set(list.map((b) => b.id as string));
  rejectUnknownOverrideKeys("buildings", Object.keys(parsed), buildingIds);
  for (const b of list) {
    const patch = parsed[b.id as string];
    if (!patch) continue;
    if (patch.name !== undefined) b.name = patch.name;
    if (patch.desc !== undefined) b.desc = patch.desc;
    if (patch.cost !== undefined) b.cost = { ...patch.cost };
    if (patch.lv !== undefined) b.lv = patch.lv;
    if (patch.look?.color != null) b.look = { ...asRecord(b.look), color: patch.look.color };
    if (patch.abilities !== undefined) b.abilities = [...patch.abilities];
  }
}

/**
 * Apply tile-level overrides to a TILE_TYPES array in place:
 *   - tilePowers[id] = { abilities: [...] }  →  replaces tile.abilities,
 *                                                recompiles tile.effects
 *   - tilePowers[id] = { hooks: [...] }      →  legacy form, translated to
 *                                                abilities (1:1 id mapping
 *                                                with a few renames)
 *   - tilePowers[id].producesResource = key  →  tile.effects.producesResource
 *   - tileUnlocks[id] = { ... }              →  patched onto tile.discovery
 *   - tileDescriptions[id] = string          →  replaces tile.description
 */
export function applyTileOverrides(tileTypes: unknown, overrides: Overrides): void {
  if (!tileTypes || !Array.isArray(tileTypes)) return;
  const o = asRecord(overrides);
  const powers = parseOptionalOverrideSection("tilePowers", tilePowersOverridesSchema, o.tilePowers) ?? {};
  const unlocks = parseOptionalOverrideSection("tileUnlocks", tileUnlocksOverridesSchema, o.tileUnlocks) ?? {};
  const descs = parseOptionalOverrideSection("tileDescriptions", tileDescriptionsOverridesSchema, o.tileDescriptions) ?? {};
  const tileIds = new Set((tileTypes as AnyRecord[]).map((t) => t.id as string));
  rejectUnknownOverrideKeys("tilePowers", Object.keys(powers), tileIds);
  rejectUnknownOverrideKeys("tileUnlocks", Object.keys(unlocks), tileIds);
  rejectUnknownOverrideKeys("tileDescriptions", Object.keys(descs), tileIds);

  for (const tile of tileTypes as AnyRecord[]) {
    const id = tile.id as string;

    // Description.
    if (typeof descs[id] === "string") tile.description = descs[id];

    // Power hooks / abilities → replace tile.abilities and recompile tile.effects.
    // Legacy `hooks` arrays are translated into the new abilities shape.
    const powerPatch = powers[id];
    if (powerPatch) {
      let newAbilities: AbilityShape[] | null = null;
      if (Array.isArray(powerPatch.abilities)) {
        newAbilities = (powerPatch.abilities as unknown[]).filter(
          (a: unknown): a is AbilityShape => !!a && typeof a === "object" && typeof (a as AnyRecord).id === "string",
        );
      } else if (Array.isArray(powerPatch.hooks)) {
        // Legacy round-trip — translate hook ids to ability ids.
        newAbilities = hooksToAbilities(powerPatch.hooks);
      }
      if (newAbilities) {
        tile.abilities = newAbilities;
        // Strip prior hook/ability-derived fields and recompile from base.
        const base = stripHookDerivedFields(asRecord(tile.effects));
        tile.effects = expandAbilitiesToEffects(newAbilities, base);
      }
    }

    // Per-tile produces-resource override. GameScene.nextResource consults
    // tile.effects.producesResource before applying the zone redirect or the
    // resource's native `.next`. Setting an empty string clears the override.
    if (powerPatch && Object.prototype.hasOwnProperty.call(powerPatch, "producesResource")) {
      const v = powerPatch.producesResource;
      const newEffects: AnyRecord = { ...asRecord(tile.effects) };
      if (typeof v === "string" && v.length > 0) {
        newEffects.producesResource = v;
      } else {
        delete newEffects.producesResource;
      }
      tile.effects = newEffects;
    }

    // Unlock / discovery.
    const unlockPatch = unlocks[id];
    if (unlockPatch && typeof unlockPatch === "object") {
      tile.discovery = sanitizeDiscovery(unlockPatch, asRecord(tile.discovery));
    }
  }
}

/**
 * Apply patches to ZONES entries (Phase 6, Dev Panel Zones tab).
 * Allowed fields per zone: name, buildings, entryCost.coins, boards.{farm,mine,fish}.
 *
 * Farm board: `upgradeMap` is replaced wholesale; `seasonDrops` is merged per-season.
 * Mine/fish boards: only `baseTurns` is patchable.
 */
export function applyZoneOverrides(zones: unknown, overrides: Overrides): void {
  const parsed = parseOptionalOverrideSection("zones", zonesOverridesSchema, overrides);
  if (!parsed) return;
  const zoneMap = asRecord(zones) as Record<string, AnyRecord | undefined>;
  for (const [zoneId, patch] of Object.entries(parsed)) {
    const zone = zoneMap[zoneId];
    if (!zone) {
      rejectUnknownOverrideTarget("zones", zoneId);
      continue;
    }
    if (patch.name !== undefined) zone.name = patch.name;
    if (patch.buildings !== undefined) zone.buildings = [...patch.buildings];
    if (patch.entryCost !== undefined) {
      zone.entryCost = { ...asRecord(zone.entryCost), coins: patch.entryCost.coins };
    }
    if (patch.boards !== undefined) {
      const boards = asRecord(zone.boards ?? (zone.boards = {}));
      const patchBoards = patch.boards;

      if (patchBoards.farm !== undefined) {
        const farm = asRecord(boards.farm ?? (boards.farm = {}));
        const farmPatch = patchBoards.farm;
        if (farmPatch.baseTurns !== undefined) farm.baseTurns = farmPatch.baseTurns;
        if (farmPatch.upgradeMap !== undefined) farm.upgradeMap = { ...farmPatch.upgradeMap };
        if (farmPatch.seasonDrops !== undefined) {
          const out: Record<string, Record<string, number>> = {
            ...(asRecord(farm.seasonDrops) as Record<string, Record<string, number>>),
          };
          for (const [seasonName, table] of Object.entries(farmPatch.seasonDrops)) {
            out[seasonName] = { ...table };
          }
          farm.seasonDrops = out;
        }
      }

      if (patchBoards.mine !== undefined) {
        const mine = asRecord(boards.mine ?? (boards.mine = {}));
        if (patchBoards.mine.baseTurns !== undefined) mine.baseTurns = patchBoards.mine.baseTurns;
      }

      if (patchBoards.fish !== undefined) {
        const fish = asRecord(boards.fish ?? (boards.fish = {}));
        if (patchBoards.fish.baseTurns !== undefined) fish.baseTurns = patchBoards.fish.baseTurns;
      }
    }
  }
}

/**
 * Apply patches to TYPE_WORKERS entries (Phase 6, Dev Panel Workers
 * tab), keyed by id. Whitelisted fields:
 *
 *   hireCost.coins, hireCost.coinsStep, hireCost.coinsMult,
 *   hireCost.resources, hireCost.resourcesStepEvery — see
 *     `nextHireCost` in src/features/workers/data.js
 *   maxCount   — clamps the slider in WorkersPanel
 *   abilities  — replaced wholesale; an array of `{ id, params }` entries
 *                drawn from the unified abilities catalog
 *
 * Mutates the supplied workers array in place.
 */
export function applyWorkerOverrides(workers: unknown, overrides: Overrides): void {
  if (!Array.isArray(workers)) return;
  const parsed = parseOptionalOverrideSection("workers", workersOverridesSchema, overrides);
  if (!parsed) return;
  const workerIds = new Set((workers as AnyRecord[]).map((w) => w.id as string));
  rejectUnknownOverrideKeys("workers", Object.keys(parsed), workerIds);
  for (const w of workers as AnyRecord[]) {
    const patch = parsed[w.id as string];
    if (!patch) continue;
    if (patch.hireCost !== undefined) {
      const hc = patch.hireCost;
      const next: AnyRecord = { ...asRecord(w.hireCost) };
      if (Object.prototype.hasOwnProperty.call(hc, "coinsStep") && hc.coinsStep === null) {
        delete next.coinsStep;
      } else if (hc.coinsStep != null) {
        next.coinsStep = hc.coinsStep;
      }
      if (Object.prototype.hasOwnProperty.call(hc, "coinsMult") && hc.coinsMult === null) {
        delete next.coinsMult;
      } else if (hc.coinsMult != null) {
        next.coinsMult = hc.coinsMult;
      }
      if (hc.coins != null) next.coins = hc.coins;
      if (hc.resources != null) next.resources = { ...hc.resources };
      if (hc.resourcesStepEvery != null) next.resourcesStepEvery = hc.resourcesStepEvery;
      w.hireCost = next;
    }
    if (patch.maxCount !== undefined) w.maxCount = patch.maxCount;
    if (patch.abilities !== undefined) w.abilities = [...patch.abilities];
  }
}

/**
 * Apply patches to the KEEPERS table (Phase 6, Dev Panel Keepers tab),
 * keyed by settlement type ('farm' | 'mine' | 'harbor'). Whitelisted fields:
 *   name, title, icon, appearsAfterBuildings,
 *   intro (array of strings — replaced wholesale),
 *   coexist/driveout: { label, pitch (array), embers, coreIngots }
 * Mutates the supplied keepers object in place.
 */
export function applyKeeperOverrides(keepers: unknown, overrides: Overrides): void {
  const parsed = parseOptionalOverrideSection("keepers", keepersOverridesSchema, overrides);
  if (!parsed || !keepers) return;
  const keeperMap = keepers as Record<string, AnyRecord | undefined>;
  const patchPath = (target: AnyRecord | undefined, patch: NonNullable<typeof parsed[string]["coexist"]>) => {
    if (!target || !patch) return;
    if (patch.label !== undefined) target.label = patch.label;
    if (patch.pitch !== undefined) target.pitch = [...patch.pitch];
    if (patch.embers !== undefined) target.embers = patch.embers;
    if (patch.coreIngots !== undefined) target.coreIngots = patch.coreIngots;
  };
  for (const [type, patch] of Object.entries(parsed)) {
    const k = keeperMap[type];
    if (!k) {
      rejectUnknownOverrideTarget("keepers", type);
      continue;
    }
    if (patch.name !== undefined) k.name = patch.name;
    if (patch.title !== undefined) k.title = patch.title;
    if (patch.look?.icon != null) k.look = { ...asRecord(k.look), icon: patch.look.icon };
    if (patch.appearsAfterBuildings !== undefined) k.appearsAfterBuildings = patch.appearsAfterBuildings;
    if (patch.intro !== undefined) k.intro = [...patch.intro];
    if (patch.coexist !== undefined) patchPath(k.coexist as AnyRecord, patch.coexist);
    if (patch.driveout !== undefined) patchPath(k.driveout as AnyRecord, patch.driveout);
  }
}

/**
 * Apply patches to the expedition-ration tables (Phase 6, Dev Panel
 * Expedition Rations tab). `overrides`:
 *   { foodTurns: { <foodKey>: turns }, meatFoods: [<foodKey>...] }
 * `foodTurns` is merged (so existing keys can be tuned and new keys added);
 * `meatFoods`, if an array, replaces wholesale. Mutates both targets in place.
 */
export function applyExpeditionOverrides(
  foodTurns: Record<string, number> | unknown,
  meatFoods: string[] | unknown,
  overrides: Overrides,
): void {
  const parsed = parseOptionalOverrideSection("expedition", expeditionOverrideSchema, overrides);
  if (!parsed) return;
  if (parsed.foodTurns && foodTurns) {
    const ft = foodTurns as Record<string, number>;
    const knownFood = new Set(Object.keys(ft));
    rejectUnknownOverrideKeys("expedition.foodTurns", Object.keys(parsed.foodTurns), knownFood);
    for (const [key, val] of Object.entries(parsed.foodTurns)) {
      ft[key] = val;
    }
  }
  if (parsed.meatFoods && Array.isArray(meatFoods)) {
    (meatFoods as string[]).length = 0;
    (meatFoods as string[]).push(...parsed.meatFoods);
  }
}

/**
 * Apply patches to the SETTLEMENT_BIOMES table (Phase 6, Dev Panel
 * Settlement Biomes tab), keyed by type then biome id:
 *   { farm: { prairie: { name, icon, hazards: [a, b], bonus } }, mine: {...}, harbor: {...} }
 * Each matched biome is patched in place (hazards replace wholesale).
 */
export function applyBiomeOverrides(
  settlementBiomes: Record<string, AnyRecord[]> | unknown,
  overrides: Overrides,
): void {
  const parsed = parseOptionalOverrideSection("biomes", biomesOverridesSchema, overrides);
  if (!parsed || !settlementBiomes) return;
  const biomeMap = settlementBiomes as Record<string, AnyRecord[] | undefined>;
  for (const [type, byId] of Object.entries(parsed)) {
    const list = biomeMap[type];
    if (!Array.isArray(list)) {
      rejectUnknownOverrideTarget("biomes", type);
      continue;
    }
    const biomeIds = new Set(list.map((x) => x.id as string));
    rejectUnknownOverrideKeys(`biomes.${type}`, Object.keys(byId), biomeIds);
    for (const [biomeId, patch] of Object.entries(byId)) {
      const b = list.find((x) => x.id === biomeId);
      if (!b) continue;
      if (patch.name !== undefined) b.name = patch.name;
      if (patch.look?.icon != null) b.look = { ...asRecord(b.look), icon: patch.look.icon };
      if (patch.bonus !== undefined) b.bonus = patch.bonus;
      if (patch.hazards !== undefined && patch.hazards.length > 0) b.hazards = [...patch.hazards];
    }
  }
}

/**
 * Validate the Dev Panel "Tuning" section (loose top-level constants).
 * Returns a clean object containing only the keys that passed validation; the
 * caller (constants.js / zones/data.js) reassigns the matching `export let`s.
 *   craftQueueHours, craftGemSkipCost, minExpeditionTurns,
 *   foundingBaseCoins                      — positive integers
 *   foundingGrowth                         — positive number
 *   homeBiome                              — non-empty string
 */
/** Validate tuning section; throws if invalid. Returns `{}` when absent. */
export function sanitizeTuning(raw: unknown): TuningOverrides {
  return parseOptionalOverrideSection("tuning", tuningSchema, raw) ?? {};
}

/**
 * Apply patches to NPC data (Phase 6, Dev Panel NPCs tab). `overrides`:
 *   { byId: { <npcId>: { displayName, loves: [itemKey], likes: [itemKey] } },
 *     bands: [ { name, modifier }, ... ]   (positional — matches BOND_BANDS) }
 * `loves`/`likes` replace wholesale; `favoriteGift` is re-derived from
 * `loves[0]`. Band `lo`/`hi` ranges are intentionally not editable. Mutates the
 * passed-in `npcData` / `bondBands` in place.
 */
export function applyNpcOverrides(npcData: unknown, bondBands: unknown, overrides: Overrides): void {
  const parsed = parseOptionalOverrideSection("npcs", npcsOverridesSchema, overrides);
  if (!parsed) return;
  if (parsed.byId && npcData) {
    const npcMap = npcData as Record<string, AnyRecord | undefined>;
    for (const [id, patch] of Object.entries(parsed.byId)) {
      const d = npcMap[id];
      if (!d) {
        rejectUnknownOverrideTarget("npcs.byId", id);
        continue;
      }
      if (patch.displayName !== undefined) d.displayName = patch.displayName;
      if (patch.loves !== undefined) d.loves = [...patch.loves];
      if (patch.likes !== undefined) d.likes = [...patch.likes];
      if (Array.isArray(d.loves) && d.loves.length > 0) d.favoriteGift = d.loves[0];
    }
  }
  if (parsed.bands && Array.isArray(bondBands)) {
    parsed.bands.forEach((patch, i) => {
      const band = (bondBands as AnyRecord[])[i];
      if (!band) return;
      if (patch.name !== undefined) band.name = patch.name;
      if (patch.modifier !== undefined) band.modifier = patch.modifier;
    });
  }
}

// ─── Story-beat sanitizers ───────────────────────────────────────────────────
// Shared by applyStoryOverrides and the /story/ editor's draft schema.

/** A story flag list value: trims, drops blanks, collapses a 1-element array to a string. */
function sanitizeFlagList(v: unknown): string | string[] | null {
  const arr: unknown[] = Array.isArray(v) ? (v as unknown[]) : (typeof v === "string" ? [v] : []);
  const clean: string[] = [];
  for (const s of arr) {
    if (typeof s !== "string") continue;
    const t = s.trim();
    if (t.length > 0 && !clean.includes(t)) clean.push(t);
  }
  if (clean.length === 0) return null;
  return clean.length === 1 ? clean[0] : clean;
}

interface BeatLineShape { speaker: string | null; text: string }

/** Normalised dialogue line list, or undefined if empty. */
export function sanitizeBeatLines(raw: unknown): BeatLineShape[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const cleaned: BeatLineShape[] = (raw as unknown[])
    .filter((l): l is AnyRecord => !!l && typeof l === "object" && typeof (l as AnyRecord).text === "string" && ((l as AnyRecord).text as string).length > 0)
    .map((l) => ({
      speaker: (typeof l.speaker === "string" && (l.speaker as string).length > 0) ? l.speaker as string : null,
      text: l.text as string,
    }));
  return cleaned.length > 0 ? cleaned : undefined;
}

/**
 * Whitelist a choice `outcome` to the keys the editor exposes:
 *   setFlag / clearFlag (string | string[]), bondDelta { npc, amount },
 *   embers / coreIngots / gems (int), queueBeat (string).
 * Returns undefined if nothing survives.
 */
export function sanitizeChoiceOutcome(raw: unknown): AnyRecord | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const r = raw as AnyRecord;
  const out: AnyRecord = {};
  const sf = sanitizeFlagList(r.setFlag); if (sf) out.setFlag = sf;
  const cf = sanitizeFlagList(r.clearFlag); if (cf) out.clearFlag = cf;
  if (r.bondDelta && typeof r.bondDelta === "object") {
    const bd = r.bondDelta as AnyRecord;
    if (typeof bd.npc === "string" && (bd.npc as string).length > 0) {
      const amt = Number(bd.amount);
      if (Number.isFinite(amt) && amt !== 0) out.bondDelta = { npc: bd.npc, amount: amt };
    }
  }
  for (const k of ["embers", "coreIngots", "gems"] as const) {
    const n = Number(r[k]);
    if (Number.isFinite(n) && n !== 0) out[k] = Math.trunc(n);
  }
  if (typeof r.queueBeat === "string" && (r.queueBeat as string).trim().length > 0) out.queueBeat = (r.queueBeat as string).trim();
  return Object.keys(out).length === 0 ? undefined : out;
}

interface ChoiceShape { id: string; label: string; outcome?: AnyRecord }

/** Sanitised choice list (array form): `[{ id, label, outcome? }]`. */
export function sanitizeChoiceArray(raw: unknown): ChoiceShape[] | null {
  if (!Array.isArray(raw)) return null;
  const out: ChoiceShape[] = [];
  const seen = new Set<string>();
  (raw as unknown[]).forEach((cRaw, i) => {
    if (!cRaw || typeof cRaw !== "object") return;
    const c = cRaw as AnyRecord;
    let id = (typeof c.id === "string" && (c.id as string).trim().length > 0) ? (c.id as string).trim() : `choice_${i + 1}`;
    if (seen.has(id)) id = `${id}_${i + 1}`;
    seen.add(id);
    const choice: ChoiceShape = { id, label: (typeof c.label === "string" && (c.label as string).length > 0) ? c.label as string : "Continue" };
    const outcome = sanitizeChoiceOutcome(c.outcome);
    if (outcome) choice.outcome = outcome;
    out.push(choice);
  });
  return out;
}

/**
 * Sanitise a trigger condition to the known vocabulary — shared by beat triggers
 * (`beat.trigger`, one per beat) and flag triggers (`STORY_FLAGS[i].triggers[]`),
 * since both speak the same language (see `conditionMatches` in src/story.js):
 *   session_start | session_ended | all_buildings_built          (no args)
 *   act_entered          { act }
 *   resource_total       { key, amount }
 *   resource_total_multi { req: { key: amount, … } }
 *   craft_made           { item, count? }
 *   building_built       { id }
 *   boss_defeated        { id }
 *   bond_at_least        { npc, amount }      (state — fires at the next settle)
 *   flag_set / flag_cleared { flag }          (state — checked on the next event)
 * Returns undefined if the shape is unrecognised / incomplete.
 */
export function sanitizeTrigger(raw: unknown): AnyRecord | undefined {
  if (!raw || typeof raw !== "object" || typeof (raw as AnyRecord).type !== "string") return undefined;
  const r = raw as AnyRecord;
  const posInt = (v: unknown): number | null => { const n = Number(v); return Number.isFinite(n) && n > 0 ? Math.trunc(n) : null; };
  const str = (v: unknown): string | null => (typeof v === "string" && (v as string).trim().length > 0 ? (v as string).trim() : null);
  switch (r.type as string) {
    case "session_start":
    case "session_ended":
    case "all_buildings_built":
      return { type: r.type };
    case "act_entered": {
      const act = posInt(r.act); return act ? { type: "act_entered", act } : undefined;
    }
    case "resource_total": {
      const key = str(r.key), amount = posInt(r.amount);
      return key && amount ? { type: "resource_total", key, amount } : undefined;
    }
    case "resource_total_multi": {
      if (!r.req || typeof r.req !== "object") return undefined;
      const req: Record<string, number> = {};
      for (const [k, v] of Object.entries(r.req as AnyRecord)) { const a = posInt(v); if (str(k) && a) req[k] = a; }
      return Object.keys(req).length > 0 ? { type: "resource_total_multi", req } : undefined;
    }
    case "craft_made": {
      const item = str(r.item); if (!item) return undefined;
      const count = posInt(r.count); return count ? { type: "craft_made", item, count } : { type: "craft_made", item };
    }
    case "building_built": {
      const id = str(r.id); return id ? { type: "building_built", id } : undefined;
    }
    case "boss_defeated": {
      const id = str(r.id); return id ? { type: "boss_defeated", id } : undefined;
    }
    case "bond_at_least": {
      const npc = str(r.npc), amount = posInt(r.amount);
      return npc && amount ? { type: "bond_at_least", npc, amount } : undefined;
    }
    case "flag_set":
    case "flag_cleared": {
      const flag = str(r.flag); return flag ? { type: r.type, flag } : undefined;
    }
    default:
      return undefined;
  }
}

// Back-compat aliases — `applyStoryOverrides` (one trigger per beat) and
// `applyFlagOverrides` (an array of triggers) both want the same vocabulary.
export const sanitizeBeatTrigger = sanitizeTrigger;
export const sanitizeFlagTrigger = sanitizeTrigger;

/** `repeat` field on a beat: true (re-fires) or undefined (one-shot). */
export function sanitizeBeatRepeat(raw: unknown): true | undefined {
  return raw === true ? true : undefined;
}

/** Optional repeat cooldown, measured in story-evaluation events after fire. */
export function sanitizeBeatRepeatCooldown(raw: unknown): number | undefined {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : undefined;
}

/** Sanitised array of flag triggers (drops bad entries). */
export function sanitizeFlagTriggerArray(raw: unknown): AnyRecord[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out: AnyRecord[] = [];
  for (const t of raw as unknown[]) { const s = sanitizeFlagTrigger(t); if (s) out.push(s); }
  return out;
}

/** Sanitised `onComplete` — only `setFlag` is editable from the /story/ editor. */
export function sanitizeBeatOnComplete(raw: unknown): { setFlag: string | string[] } | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const sf = sanitizeFlagList((raw as AnyRecord).setFlag);
  return sf ? { setFlag: sf } : undefined;
}

/**
 * Apply patches to story beats (Dev Panel / `/story/` editor). `overrides`:
 *   {
 *     suppressedBeats: [ <built-in side beat id> ],
 *     newBeats: [ { id, title, scene?, body?|lines?, choices?, trigger?, repeat?, repeatCooldown?, onComplete? } ],
 *     beats:    { <beatId>: { title?, scene?, body?, lines?,
 *                             choices?: { <choiceId>: { label } } | [ { id, label, outcome? } ],
 *                             trigger?, repeat?, repeatCooldown?, onComplete? } }
 *   }
 * `newBeats` entries are appended to SIDE_BEATS (a draft side beat — optional
 * `bond_at_least` trigger, or no trigger for a resolution branch queued by a
 * choice's `queueBeat`). `beats` patches existing *and* just-created beats:
 *   - presentation: title / scene / body / lines (lines replace wholesale)
 *   - choices: an ARRAY replaces the choice list wholesale (label + whitelisted
 *     outcome editable); an OBJECT is the legacy label-only patch map
 *   - trigger / onComplete: only the editor-exposed forms (see sanitizers)
 * Searches both STORY_BEATS and SIDE_BEATS. Mutates beats in place.
 */
export function applyStoryOverrides(storyBeats: unknown, sideBeats: unknown, overrides: Overrides): void {
  const o = parseOptionalOverrideSection("story", storyOverridesSchema, overrides);
  if (!o) return;
  const story = Array.isArray(storyBeats) ? storyBeats as AnyRecord[] : [];
  const side = Array.isArray(sideBeats) ? sideBeats as AnyRecord[] : [];
  const suppressed = new Set(Array.isArray(o.suppressedBeats)
    ? (o.suppressedBeats as unknown[]).map((id) => (typeof id === "string" ? id.trim() : "")).filter(Boolean)
    : []);

  if (suppressed.size > 0) {
    for (let i = side.length - 1; i >= 0; i -= 1) {
      if (side[i] && !side[i].draft && suppressed.has(side[i].id as string)) side.splice(i, 1);
    }
  }

  // 1 — author-created beats (always side beats).
  if (Array.isArray(o.newBeats)) {
    const taken = new Set([...story, ...side].map((b) => b && b.id).filter((x): x is string => typeof x === "string"));
    for (const rawRaw of o.newBeats as unknown[]) {
      if (!rawRaw || typeof rawRaw !== "object") continue;
      const raw = rawRaw as AnyRecord;
      const id = typeof raw.id === "string" ? (raw.id as string).trim() : "";
      if (!id || taken.has(id)) continue;
      taken.add(id);
      const beat: AnyRecord = { id, side: true, draft: true };
      beat.title = (typeof raw.title === "string" && (raw.title as string).length > 0) ? raw.title : id;
      if (typeof raw.scene === "string" && (raw.scene as string).length > 0) beat.scene = raw.scene;
      const lines = sanitizeBeatLines(raw.lines);
      if (lines) beat.lines = lines;
      else if (typeof raw.body === "string" && (raw.body as string).length > 0) beat.body = raw.body;
      const choices = sanitizeChoiceArray(raw.choices);
      if (choices && choices.length > 0) beat.choices = choices;
      const trigger = sanitizeBeatTrigger(raw.trigger);
      if (trigger) beat.trigger = trigger;
      if (sanitizeBeatRepeat(raw.repeat)) beat.repeat = true;
      const repeatCooldown = sanitizeBeatRepeatCooldown(raw.repeatCooldown);
      if (repeatCooldown) beat.repeatCooldown = repeatCooldown;
      const onComplete = sanitizeBeatOnComplete(raw.onComplete);
      if (onComplete) beat.onComplete = onComplete;
      side.push(beat);
    }
  }

  // 2 — patch existing / just-created beats.
  if (o.beats && typeof o.beats === "object") {
    const all = [...story, ...side];
    for (const [beatId, patchRaw] of Object.entries(o.beats as AnyRecord)) {
      const patch = asRecord(patchRaw);
      const beat = all.find((b) => b && b.id === beatId);
      if (!beat) {
        rejectUnknownOverrideTarget("story.beats", beatId);
        continue;
      }
      if (!patch || typeof patch !== "object") continue;
      if (typeof patch.title === "string" && (patch.title as string).length > 0) beat.title = patch.title;
      if (typeof patch.scene === "string") beat.scene = (patch.scene as string).length > 0 ? patch.scene : undefined;
      if (typeof patch.body === "string") beat.body = (patch.body as string).length > 0 ? patch.body : undefined;
      if (Array.isArray(patch.lines)) beat.lines = sanitizeBeatLines(patch.lines);
      if (Array.isArray(patch.choices)) {
        const arr = sanitizeChoiceArray(patch.choices);
        beat.choices = (arr && arr.length > 0) ? arr : undefined;
      } else if (patch.choices && typeof patch.choices === "object" && Array.isArray(beat.choices)) {
        for (const [choiceId, cpRaw] of Object.entries(patch.choices as AnyRecord)) {
          const cp = asRecord(cpRaw);
          const ch = (beat.choices as AnyRecord[]).find((c) => c && c.id === choiceId);
          if (ch && cp && typeof cp.label === "string" && (cp.label as string).length > 0) ch.label = cp.label;
        }
      }
      if (patch.trigger) { const t = sanitizeBeatTrigger(patch.trigger); if (t) beat.trigger = t; }
      if (Object.prototype.hasOwnProperty.call(patch, "repeat")) {
        if (sanitizeBeatRepeat(patch.repeat)) beat.repeat = true; else delete beat.repeat;
      }
      if (Object.prototype.hasOwnProperty.call(patch, "repeatCooldown")) {
        const cd = sanitizeBeatRepeatCooldown(patch.repeatCooldown);
        if (cd) beat.repeatCooldown = cd; else delete beat.repeatCooldown;
      }
      if (Object.prototype.hasOwnProperty.call(patch, "onComplete")) {
        const oc = sanitizeBeatOnComplete(patch.onComplete);
        if (oc) beat.onComplete = { ...(asRecord(beat.onComplete)), ...oc };
      }
    }
  }
}

/**
 * Apply patches to the STORY_FLAGS registry. `overrides`:
 *   {
 *     byId: { <flagId>: { label?, description?, category?, default?, triggers?:[…] } },
 *     new:  [ { id, label?, description?, category?, default?, triggers?:[…] } ]
 *   }
 * Editable: label / description / category (story|frostmaw|mira|misc) / default
 * (boolean) / triggers (replaced wholesale, each sanitized to the known event
 * vocabulary). `new` entries are appended (dup / blank ids skipped). The flag
 * `id`s and `source` are not editable here. Mutates the registry array in place.
 */
export function applyFlagOverrides(flags: unknown, overrides: Overrides): void {
  if (!Array.isArray(flags)) return;
  const o = parseOptionalOverrideSection("flags", flagsOverridesSchema, overrides);
  if (!o) return;
  const flagList = flags as AnyRecord[];
  const patchOne = (def: AnyRecord | undefined, patch: FlagPatch) => {
    if (!def) return;
    if (patch.label !== undefined) def.label = patch.label;
    if (patch.description !== undefined) def.description = patch.description;
    if (patch.category !== undefined) def.category = patch.category;
    if (patch.default !== undefined) def.default = patch.default;
    if (patch.triggers !== undefined) {
      const t = sanitizeFlagTriggerArray(patch.triggers);
      if (!t || t.length !== patch.triggers.length) {
        throw new Error("Invalid balance overrides (flags): unrecognized trigger shape in triggers");
      }
      def.triggers = t;
    }
    if (!Array.isArray(def.triggers)) def.triggers = [];
  };
  if (o.byId) {
    for (const [id, patch] of Object.entries(o.byId)) {
      const def = flagList.find((f) => f && f.id === id);
      if (!def) {
        rejectUnknownOverrideTarget("flags.byId", id);
        continue;
      }
      patchOne(def, patch);
    }
  }
  if (o.new) {
    const taken = new Set(flagList.map((f) => f && f.id).filter((x): x is string => typeof x === "string"));
    for (const raw of o.new) {
      const id = raw.id.trim();
      if (!id || taken.has(id)) continue;
      taken.add(id);
      const def: AnyRecord = {
        id,
        label: raw.label ?? id,
        category: raw.category ?? "misc",
        default: raw.default ?? false,
        source: "override",
        triggers: [],
      };
      patchOne(def, raw);
      flagList.push(def);
    }
  }
}

/**
 * Apply patches to BOSSES entries (Phase 6, Dev Panel Bosses tab), by id.
 * Editable: name, season, description, modifierDescription, targetAmount
 * (→ target.amount). The modifier type/params drive board logic — left alone.
 */
export function applyBossOverrides(bosses: unknown, overrides: Overrides): void {
  if (!Array.isArray(bosses)) return;
  const parsed = parseOptionalOverrideSection("bosses", bossesOverridesSchema, overrides);
  if (!parsed) return;
  const bossIds = new Set((bosses as AnyRecord[]).map((b) => b.id as string));
  rejectUnknownOverrideKeys("bosses", Object.keys(parsed), bossIds);
  for (const b of bosses as AnyRecord[]) {
    const patch = parsed[b.id as string];
    if (!patch) continue;
    if (patch.name !== undefined) b.name = patch.name;
    if (patch.season !== undefined) b.season = patch.season;
    if (patch.description !== undefined) b.description = patch.description;
    if (patch.modifierDescription !== undefined) b.modifierDescription = patch.modifierDescription;
    if (patch.targetAmount !== undefined) b.target = { ...asRecord(b.target), amount: patch.targetAmount };
  }
}

/**
 * Apply patches to ACHIEVEMENTS entries (Phase 6, Dev Panel Achievements
 * tab), by id. Editable: name, desc, threshold, target, rewardCoins
 * (→ reward.coins). The `counter` it watches is left alone.
 */
export function applyAchievementOverrides(achievements: unknown, overrides: Overrides): void {
  if (!Array.isArray(achievements)) return;
  const parsed = parseOptionalOverrideSection("achievements", achievementsOverridesSchema, overrides);
  if (!parsed) return;
  const achIds = new Set((achievements as AnyRecord[]).map((a) => a.id as string));
  rejectUnknownOverrideKeys("achievements", Object.keys(parsed), achIds);
  for (const a of achievements as AnyRecord[]) {
    const patch = parsed[a.id as string];
    if (!patch) continue;
    if (patch.name !== undefined) a.name = patch.name;
    if (patch.desc !== undefined) a.desc = patch.desc;
    if (patch.threshold !== undefined) a.threshold = patch.threshold;
    if (patch.target !== undefined) a.target = patch.target;
    if (patch.rewardCoins !== undefined) a.reward = { ...asRecord(a.reward), coins: patch.rewardCoins };
    if (patch.look?.icon != null) a.look = { ...asRecord(a.look), icon: patch.look.icon };
  }
}

/**
 * Apply patches to DAILY_REWARDS entries (Phase 6, Dev Panel Daily
 * Rewards tab), keyed by day number. Editable: coins, runes (added if absent).
 * Tool / unlockTile drops are left alone.
 */
export function applyDailyRewardOverrides(dailyRewards: unknown, overrides: Overrides): void {
  const parsed = parseOptionalOverrideSection("dailyRewards", dailyRewardsOverridesSchema, overrides);
  if (!parsed || !dailyRewards || typeof dailyRewards !== "object") return;
  const rewardMap = dailyRewards as Record<string, AnyRecord | undefined>;
  rejectUnknownOverrideKeys("dailyRewards", Object.keys(parsed), new Set(Object.keys(rewardMap)));
  for (const [day, patch] of Object.entries(parsed)) {
    const entry = rewardMap[day];
    if (!entry) continue;
    if (patch.coins !== undefined) entry.coins = patch.coins;
    if (patch.runes !== undefined) entry.runes = patch.runes;
  }
}

const HOOK_DERIVED_FIELDS = new Set([
  "freeMoves", "freeMovesIfChain", "coinBonusFlat", "coinBonusPerTile",
  "thresholdReduce", "hooks", "abilities",
]);

function stripHookDerivedFields(effects: AnyRecord): AnyRecord {
  const out: AnyRecord = {};
  for (const k of Object.keys(effects)) {
    if (!HOOK_DERIVED_FIELDS.has(k)) out[k] = effects[k];
  }
  return out;
}

function sanitizeDiscovery(patch: AnyRecord, prev: AnyRecord | undefined): AnyRecord {
  const method = (patch.method as string) || (prev?.method as string) || "default";
  switch (method) {
    case "default":
      return { method: "default" };
    case "chain": {
      const chainLengthOf = patch.chainLengthOf || prev?.chainLengthOf;
      const chainLength = Number.isFinite(patch.chainLength as number)
        ? patch.chainLength
        : (prev?.chainLength ?? 6);
      return { method: "chain", chainLengthOf, chainLength };
    }
    case "research": {
      const researchOf = patch.researchOf || prev?.researchOf;
      const researchAmount = Number.isFinite(patch.researchAmount as number)
        ? patch.researchAmount
        : (prev?.researchAmount ?? 30);
      return { method: "research", researchOf, researchAmount };
    }
    case "buy": {
      const coinCost = Number.isFinite(patch.coinCost as number)
        ? patch.coinCost
        : (prev?.coinCost ?? 100);
      return { method: "buy", coinCost };
    }
    default:
      return prev || { method: "default" };
  }
}
