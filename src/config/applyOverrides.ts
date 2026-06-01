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
import { ALL_ITEM_KEY_VALUES, type ItemKey } from "../types/catalog/itemKeys.js";
import type { BalanceOverrides } from "./schemas/balance.js";
import { itemOverrideSchema } from "./schemas/itemOverride.js";
import { recipeOverrideSchema } from "./schemas/recipe.js";
import { tuningSchema } from "./schemas/tuning.js";

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
    if (!newId) continue;
    const params = { ...(h.params || {}) };
    // Param renames: pool_weight_boost / threshold_reduction used `target` already.
    out.push({ id: newId, params });
  }
  return out;
}

const BALANCE_DRAFT_KEY = "hearth.balance.draft";

/** @deprecated Use BalanceOverrides from config/schemas */
type Overrides = BalanceOverrides | Record<string, unknown> | null | undefined;

/** Read the localStorage draft, if any. Safe in non-browser environments. */
export function readBalanceDraft(): Record<string, unknown> | null {
  try {
    if (typeof localStorage === "undefined") return null;
    const raw = localStorage.getItem(BALANCE_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed as Record<string, unknown> : null;
  } catch { return null; }
}

export function writeBalanceDraft(draft: unknown): void {
  try {
    if (typeof localStorage === "undefined") return;
    if (draft == null) localStorage.removeItem(BALANCE_DRAFT_KEY);
    else localStorage.setItem(BALANCE_DRAFT_KEY, JSON.stringify(draft));
  } catch { /* storage unavailable */ }
}

/** Shallow-merge two override objects. Values from `b` win. */
export function mergeOverrides(a: Overrides, b: Overrides): Record<string, unknown> {
  if (!a) return (b ?? {}) as Record<string, unknown>;
  if (!b) return (a ?? {}) as Record<string, unknown>;
  const out: Record<string, unknown> = { ...a };
  for (const k of Object.keys(b)) {
    const av = (a as Record<string, unknown>)[k];
    const bv = (b as Record<string, unknown>)[k];
    if (av && typeof av === "object" && !Array.isArray(av)
        && bv && typeof bv === "object" && !Array.isArray(bv)) {
      out[k] = { ...(av as Record<string, unknown>), ...(bv as Record<string, unknown>) };
    } else {
      out[k] = bv;
    }
  }
  return out;
}

/** Apply numeric upgrade-threshold overrides in place. */
export function applyUpgradeThresholdOverrides(target: Record<string, number>, overrides: Overrides): void {
  if (!overrides || typeof overrides !== "object") return;
  for (const [key, value] of Object.entries(overrides)) {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 1) continue;
    target[key] = Math.floor(n);
  }
}

type AnyRecord = Record<string, unknown>;

function asRecord(v: unknown): AnyRecord {
  return (v && typeof v === "object" && !Array.isArray(v)) ? (v as AnyRecord) : {};
}

/**
 * Apply per-item overrides to ITEMS. Allowed fields:
 * label, color, dark, value, next, glyph, description, effect, target, anim, ms, desc
 * The item is patched in place.
 */
export function applyItemOverrides(items: Record<string, AnyRecord> | unknown, overrides: Overrides): void {
  if (!overrides || typeof overrides !== "object") return;
  const itemMap = (items ?? {}) as Record<string, AnyRecord | undefined>;
  for (const [key, patchRaw] of Object.entries(overrides)) {
    const item = itemMap[key];
    if (!item) continue;
    const parsed = itemOverrideSchema.safeParse(patchRaw);
    if (!parsed.success) continue;
    const patch = parsed.data;
    if (patch.label !== undefined) item.label = patch.label;
    if (patch.color !== undefined) item.color = patch.color;
    if (patch.dark !== undefined) item.dark = patch.dark;
    if (patch.value !== undefined) item.value = patch.value;
    if (patch.next !== undefined) item.next = patch.next ?? null;
    if (patch.glyph !== undefined) item.glyph = patch.glyph;
    if (patch.description !== undefined) item.description = patch.description;
    if (patch.desc !== undefined) item.desc = patch.desc;
    if (patch.effect !== undefined) item.effect = patch.effect;
    if (patch.target !== undefined) item.target = patch.target;
    if (patch.anim !== undefined) item.anim = patch.anim;
    if (patch.ms !== undefined) item.ms = patch.ms;
  }
}

/** Apply patches to RECIPES entries. Fields: item, inputs, tier, station, coins. */
export function applyRecipeOverrides(recipes: Record<string, AnyRecord> | unknown, overrides: Overrides): void {
  if (!overrides || typeof overrides !== "object") return;
  const recipeMap = (recipes ?? {}) as Record<string, AnyRecord | undefined>;
  for (const [key, patchRaw] of Object.entries(overrides)) {
    const r = recipeMap[key];
    if (!r) continue;
    const parsed = recipeOverrideSchema.safeParse(patchRaw);
    if (!parsed.success) continue;
    const patch = parsed.data;
    if (patch.item !== undefined && isKnownRecipeInputKey(patch.item)) r.item = patch.item;
    if (patch.inputs !== undefined) {
      const cleaned: Record<string, number> = {};
      for (const [resKey, qty] of Object.entries(patch.inputs)) {
        if (!isKnownRecipeInputKey(resKey)) continue;
        const n = Number(qty);
        if (Number.isFinite(n) && n > 0) cleaned[resKey] = Math.floor(n);
      }
      r.inputs = cleaned;
    }
    if (patch.tier !== undefined) r.tier = patch.tier;
    if (patch.station !== undefined) r.station = patch.station;
    if (patch.coins !== undefined) r.coins = patch.coins;
  }
}

/** Apply patches to BUILDINGS entries (matched by id). Fields: name, desc,
 *  cost, lv, color, abilities. */
export function applyBuildingOverrides(buildings: AnyRecord[] | unknown, overrides: Overrides): void {
  if (!overrides || typeof overrides !== "object") return;
  const list = Array.isArray(buildings) ? buildings as AnyRecord[] : [];
  const overrideMap = overrides as AnyRecord;
  for (const b of list) {
    const patchRaw = overrideMap[b.id as string];
    if (!patchRaw) continue;
    const patch = asRecord(patchRaw);
    if (typeof patch.name === "string") b.name = patch.name;
    if (typeof patch.desc === "string") b.desc = patch.desc;
    if (patch.cost && typeof patch.cost === "object") {
      const cleaned: Record<string, number> = {};
      for (const [k, v] of Object.entries(patch.cost as AnyRecord)) {
        const n = Number(v);
        if (Number.isFinite(n) && n >= 0) cleaned[k] = Math.floor(n);
      }
      b.cost = cleaned;
    }
    if (Number.isFinite(patch.lv as number)) b.lv = patch.lv;
    if (typeof patch.color === "string") b.color = patch.color;
    // Abilities replace wholesale (rather than merge) so designers can
    // remove an ability by leaving it out of the override.
    if (Array.isArray(patch.abilities)) {
      b.abilities = patch.abilities.filter((a: unknown): a is AnyRecord => !!a && typeof a === "object" && typeof (a as AnyRecord).id === "string");
    }
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
  const powers = (o.tilePowers as Record<string, AnyRecord | undefined> | undefined) || {};
  const unlocks = (o.tileUnlocks as Record<string, AnyRecord | undefined> | undefined) || {};
  const descs = (o.tileDescriptions as Record<string, string | undefined> | undefined) || {};

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
 * Allowed fields per zone: baseTurns, entryCost.coins, upgradeMap,
 * seasonDrops. Each is whitelisted so unrelated keys can't bleed in.
 *
 * `upgradeMap` is replaced wholesale (rather than merged) so the designer
 * can clear an entry by leaving it absent. `seasonDrops` is merged
 * per-season so a partial patch only clobbers the named seasons.
 */
export function applyZoneOverrides(zones: unknown, overrides: Overrides): void {
  if (!overrides || typeof overrides !== "object") return;
  const zoneMap = asRecord(zones) as Record<string, AnyRecord | undefined>;
  for (const [zoneId, patchRaw] of Object.entries(overrides)) {
    const patch = asRecord(patchRaw);
    const zone = zoneMap[zoneId];
    if (!zone) continue;

    if (typeof patch.name === "string" && (patch.name as string).length > 0) {
      zone.name = patch.name;
    }
    if (typeof patch.hasFarm === "boolean") zone.hasFarm = patch.hasFarm;
    if (typeof patch.hasMine === "boolean") zone.hasMine = patch.hasMine;
    if (typeof patch.hasWater === "boolean") zone.hasWater = patch.hasWater;
    if (Array.isArray(patch.buildings)) {
      zone.buildings = (patch.buildings as unknown[]).filter(
        (id): id is string => typeof id === "string" && id.length > 0,
      );
    }
    if (Number.isFinite(patch.baseTurns as number) && (patch.baseTurns as number) >= 1) {
      zone.baseTurns = Math.floor(patch.baseTurns as number);
    }
    if (patch.entryCost && typeof patch.entryCost === "object") {
      const coins = Number((patch.entryCost as AnyRecord).coins);
      if (Number.isFinite(coins) && coins >= 0) {
        zone.entryCost = { ...asRecord(zone.entryCost), coins: Math.floor(coins) };
      }
    }
    if (patch.upgradeMap && typeof patch.upgradeMap === "object") {
      const cleaned: Record<string, string> = {};
      for (const [src, target] of Object.entries(patch.upgradeMap as AnyRecord)) {
        if (typeof target === "string" && target.length > 0) cleaned[src] = target;
      }
      zone.upgradeMap = cleaned;
    }
    if (patch.seasonDrops && typeof patch.seasonDrops === "object") {
      const out: Record<string, Record<string, number>> = {
        ...(asRecord(zone.seasonDrops) as Record<string, Record<string, number>>),
      };
      for (const [seasonName, table] of Object.entries(patch.seasonDrops as AnyRecord)) {
        if (!table || typeof table !== "object") continue;
        const cleaned: Record<string, number> = {};
        for (const [cat, pct] of Object.entries(table as AnyRecord)) {
          const n = Number(pct);
          if (Number.isFinite(n) && n >= 0) cleaned[cat] = n;
        }
        out[seasonName] = cleaned;
      }
      zone.seasonDrops = out;
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
  if (!Array.isArray(workers) || !overrides || typeof overrides !== "object") return;
  const overrideMap = overrides as AnyRecord;
  for (const w of workers as AnyRecord[]) {
    const patchRaw = overrideMap[w.id as string];
    if (!patchRaw) continue;
    const patch = asRecord(patchRaw);
    if (patch.hireCost && typeof patch.hireCost === "object") {
      const hc = patch.hireCost as AnyRecord;
      const next: AnyRecord = { ...asRecord(w.hireCost) };

      // Explicit-null sentinel removes a ramp field entirely. Null must be
      // checked before any Number() coercion (Number(null) === 0).
      if (Object.prototype.hasOwnProperty.call(hc, "coinsStep")
          && hc.coinsStep === null) {
        delete next.coinsStep;
      } else if (hc.coinsStep != null) {
        const step = Number(hc.coinsStep);
        if (Number.isFinite(step) && step >= 0) next.coinsStep = step;
      }

      if (Object.prototype.hasOwnProperty.call(hc, "coinsMult")
          && hc.coinsMult === null) {
        delete next.coinsMult;
      } else if (hc.coinsMult != null) {
        const mult = Number(hc.coinsMult);
        if (Number.isFinite(mult) && mult > 0) next.coinsMult = mult;
      }

      if (hc.coins != null) {
        const coins = Number(hc.coins);
        if (Number.isFinite(coins) && coins >= 0) next.coins = Math.floor(coins);
      }

      if (hc.resources && typeof hc.resources === "object") {
        const resources: Record<string, number> = {};
        for (const [key, value] of Object.entries(hc.resources as AnyRecord)) {
          const amount = Number(value);
          if (key && Number.isFinite(amount) && amount > 0) resources[key] = Math.floor(amount);
        }
        next.resources = resources;
      }

      if (hc.resourcesStepEvery != null) {
        const step = Number(hc.resourcesStepEvery);
        if (Number.isFinite(step) && step >= 1) next.resourcesStepEvery = Math.floor(step);
      }

      w.hireCost = next;
    }
    if (Number.isFinite(patch.maxCount as number) && (patch.maxCount as number) >= 1) {
      w.maxCount = Math.floor(patch.maxCount as number);
    }
    if (Array.isArray(patch.abilities)) {
      // Replace wholesale — designers may swap or remove abilities.
      w.abilities = (patch.abilities as unknown[]).filter(
        (a): a is AnyRecord => !!a && typeof a === "object" && typeof (a as AnyRecord).id === "string",
      );
    }
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
  if (!keepers || !overrides || typeof overrides !== "object") return;
  const keeperMap = keepers as Record<string, AnyRecord | undefined>;
  const strArray = (v: unknown): string[] | null => (Array.isArray(v) ? (v as unknown[]).map((x) => String(x)).filter((s) => s.length > 0) : null);
  const patchPath = (target: AnyRecord | undefined, patch: AnyRecord) => {
    if (!target || !patch || typeof patch !== "object") return;
    if (typeof patch.label === "string") target.label = patch.label;
    const pitch = strArray(patch.pitch);
    if (pitch) target.pitch = pitch;
    if (Number.isFinite(patch.embers as number) && (patch.embers as number) >= 0) target.embers = Math.floor(patch.embers as number);
    if (Number.isFinite(patch.coreIngots as number) && (patch.coreIngots as number) >= 0) target.coreIngots = Math.floor(patch.coreIngots as number);
  };
  for (const [type, patchRaw] of Object.entries(overrides)) {
    const patch = asRecord(patchRaw);
    const k = keeperMap[type];
    if (!k) continue;
    if (typeof patch.name === "string") k.name = patch.name;
    if (typeof patch.title === "string") k.title = patch.title;
    if (typeof patch.icon === "string") k.icon = patch.icon;
    if (Number.isFinite(patch.appearsAfterBuildings as number) && (patch.appearsAfterBuildings as number) >= 0) {
      k.appearsAfterBuildings = Math.floor(patch.appearsAfterBuildings as number);
    }
    const intro = strArray(patch.intro);
    if (intro) k.intro = intro;
    if (patch.coexist) patchPath(k.coexist as AnyRecord, asRecord(patch.coexist));
    if (patch.driveout) patchPath(k.driveout as AnyRecord, asRecord(patch.driveout));
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
  if (!overrides || typeof overrides !== "object") return;
  const o = overrides as AnyRecord;
  if (o.foodTurns && typeof o.foodTurns === "object" && foodTurns) {
    const ft = foodTurns as Record<string, number>;
    for (const [key, val] of Object.entries(o.foodTurns as AnyRecord)) {
      const n = Number(val);
      if (typeof key === "string" && key.length > 0 && Number.isFinite(n) && n >= 0) ft[key] = Math.floor(n);
    }
  }
  if (Array.isArray(o.meatFoods) && Array.isArray(meatFoods)) {
    const cleaned = (o.meatFoods as unknown[]).filter((k): k is string => typeof k === "string" && k.length > 0);
    (meatFoods as string[]).length = 0;
    (meatFoods as string[]).push(...cleaned);
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
  if (!settlementBiomes || !overrides || typeof overrides !== "object") return;
  const biomeMap = settlementBiomes as Record<string, AnyRecord[] | undefined>;
  for (const [type, byIdRaw] of Object.entries(overrides)) {
    const list = biomeMap[type];
    if (!Array.isArray(list) || !byIdRaw || typeof byIdRaw !== "object") continue;
    for (const [biomeId, patchRaw] of Object.entries(byIdRaw as AnyRecord)) {
      const patch = asRecord(patchRaw);
      const b = list.find((x) => x.id === biomeId);
      if (!b || !patch || typeof patch !== "object") continue;
      if (typeof patch.name === "string" && (patch.name as string).length > 0) b.name = patch.name;
      if (typeof patch.icon === "string" && (patch.icon as string).length > 0) b.icon = patch.icon;
      if (typeof patch.bonus === "string" && (patch.bonus as string).length > 0) b.bonus = patch.bonus;
      if (Array.isArray(patch.hazards)) {
        const cleaned = (patch.hazards as unknown[]).filter((h): h is string => typeof h === "string" && h.length > 0);
        if (cleaned.length > 0) b.hazards = cleaned;
      }
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
export function sanitizeTuning(raw: unknown): AnyRecord {
  const parsed = tuningSchema.safeParse(raw);
  if (!parsed.success) return {};
  return { ...parsed.data } as AnyRecord;
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
  if (!overrides || typeof overrides !== "object") return;
  const o = overrides as AnyRecord;
  const strArr = (v: unknown): string[] | null => (Array.isArray(v) ? (v as unknown[]).filter((x): x is string => typeof x === "string" && x.length > 0) : null);
  if (o.byId && typeof o.byId === "object" && npcData) {
    const npcMap = npcData as Record<string, AnyRecord | undefined>;
    for (const [id, patchRaw] of Object.entries(o.byId as AnyRecord)) {
      const patch = asRecord(patchRaw);
      const d = npcMap[id];
      if (!d) continue;
      if (typeof patch.displayName === "string" && (patch.displayName as string).length > 0) d.displayName = patch.displayName;
      const loves = strArr(patch.loves); if (loves) d.loves = loves;
      const likes = strArr(patch.likes); if (likes) d.likes = likes;
      if (Array.isArray(d.loves) && (d.loves as unknown[]).length > 0) d.favoriteGift = (d.loves as string[])[0];
    }
  }
  if (Array.isArray(o.bands) && Array.isArray(bondBands)) {
    (o.bands as unknown[]).forEach((patchRaw, i) => {
      const band = (bondBands as AnyRecord[])[i];
      const patch = asRecord(patchRaw);
      if (!band || !patch) return;
      if (typeof patch.name === "string" && (patch.name as string).length > 0) band.name = patch.name;
      const m = Number(patch.modifier);
      if (Number.isFinite(m) && m > 0) band.modifier = m;
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
  if (!overrides || typeof overrides !== "object") return;
  const o = overrides as AnyRecord;
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
      if (!beat || !patch || typeof patch !== "object") continue;
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

const FLAG_CATEGORY_KEYS = new Set(["story", "frostmaw", "mira", "misc"]);

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
  if (!Array.isArray(flags) || !overrides || typeof overrides !== "object") return;
  const o = overrides as AnyRecord;
  const flagList = flags as AnyRecord[];
  const patchOne = (def: AnyRecord | undefined, patchRaw: unknown) => {
    if (!def) return;
    const patch = asRecord(patchRaw);
    if (!patch || typeof patch !== "object") return;
    if (typeof patch.label === "string" && (patch.label as string).length > 0) def.label = patch.label;
    if (typeof patch.description === "string") def.description = patch.description;
    if (typeof patch.category === "string" && FLAG_CATEGORY_KEYS.has(patch.category as string)) def.category = patch.category;
    if (typeof patch.default === "boolean") def.default = patch.default;
    if ("triggers" in patch) { const t = sanitizeFlagTriggerArray(patch.triggers); if (t) def.triggers = t; }
    if (!Array.isArray(def.triggers)) def.triggers = [];
  };
  if (o.byId && typeof o.byId === "object") {
    for (const [id, patch] of Object.entries(o.byId as AnyRecord)) {
      const def = flagList.find((f) => f && f.id === id);
      if (def) patchOne(def, patch);
    }
  }
  if (Array.isArray(o.new)) {
    const taken = new Set(flagList.map((f) => f && f.id).filter((x): x is string => typeof x === "string"));
    for (const rawRaw of o.new as unknown[]) {
      if (!rawRaw || typeof rawRaw !== "object") continue;
      const raw = rawRaw as AnyRecord;
      const id = typeof raw.id === "string" ? (raw.id as string).trim() : "";
      if (!id || taken.has(id)) continue;
      taken.add(id);
      const def: AnyRecord = { id, label: (typeof raw.label === "string" && (raw.label as string).length > 0) ? raw.label : id,
        category: "misc", default: false, source: "override", triggers: [] };
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
  if (!Array.isArray(bosses) || !overrides || typeof overrides !== "object") return;
  const overrideMap = overrides as AnyRecord;
  for (const b of bosses as AnyRecord[]) {
    const patchRaw = overrideMap[b.id as string];
    if (!patchRaw || typeof patchRaw !== "object") continue;
    const patch = patchRaw as AnyRecord;
    if (typeof patch.name === "string" && (patch.name as string).length > 0) b.name = patch.name;
    if (typeof patch.season === "string" && (patch.season as string).length > 0) b.season = patch.season;
    if (typeof patch.description === "string") b.description = patch.description;
    if (typeof patch.modifierDescription === "string") b.modifierDescription = patch.modifierDescription;
    const ta = Number(patch.targetAmount);
    if (Number.isFinite(ta) && ta >= 1) b.target = { ...asRecord(b.target), amount: Math.floor(ta) };
  }
}

/**
 * Apply patches to ACHIEVEMENTS entries (Phase 6, Dev Panel Achievements
 * tab), by id. Editable: name, desc, threshold, target, rewardCoins
 * (→ reward.coins). The `counter` it watches is left alone.
 */
export function applyAchievementOverrides(achievements: unknown, overrides: Overrides): void {
  if (!Array.isArray(achievements) || !overrides || typeof overrides !== "object") return;
  const overrideMap = overrides as AnyRecord;
  for (const a of achievements as AnyRecord[]) {
    const patchRaw = overrideMap[a.id as string];
    if (!patchRaw || typeof patchRaw !== "object") continue;
    const patch = patchRaw as AnyRecord;
    if (typeof patch.name === "string" && (patch.name as string).length > 0) a.name = patch.name;
    if (typeof patch.desc === "string") a.desc = patch.desc;
    const th = Number(patch.threshold), tg = Number(patch.target), rc = Number(patch.rewardCoins);
    if (Number.isFinite(th) && th >= 1) a.threshold = Math.floor(th);
    if (Number.isFinite(tg) && tg >= 1) a.target = Math.floor(tg);
    if (Number.isFinite(rc) && rc >= 0) a.reward = { ...asRecord(a.reward), coins: Math.floor(rc) };
  }
}

/**
 * Apply patches to DAILY_REWARDS entries (Phase 6, Dev Panel Daily
 * Rewards tab), keyed by day number. Editable: coins, runes (added if absent).
 * Tool / unlockTile drops are left alone.
 */
export function applyDailyRewardOverrides(dailyRewards: unknown, overrides: Overrides): void {
  if (!dailyRewards || typeof dailyRewards !== "object" || !overrides || typeof overrides !== "object") return;
  const rewardMap = dailyRewards as Record<string, AnyRecord | undefined>;
  for (const [day, patchRaw] of Object.entries(overrides as AnyRecord)) {
    const entry = rewardMap[day];
    if (!entry || typeof entry !== "object" || !patchRaw || typeof patchRaw !== "object") continue;
    const patch = patchRaw as AnyRecord;
    if ("coins" in patch) { const n = Number(patch.coins); if (Number.isFinite(n) && n >= 0) entry.coins = Math.floor(n); }
    if ("runes" in patch) { const n = Number(patch.runes); if (Number.isFinite(n) && n >= 0) entry.runes = Math.floor(n); }
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
