// Apply Balance-Manager overrides on top of the default game constants.
//
// The override JSON lives in `src/config/balance.json` (committed) and is
// optionally augmented by a localStorage draft (`hearth.balance.draft`) that
// the in-game Balance Manager writes for fast iteration. The committed file
// is always the source of truth in production builds.
//
// All merge functions are pure and mutate-in-place on the passed-in
// targets — that's deliberate, because the targets are the live module
// objects exported from constants.js (UPGRADE_THRESHOLDS, BIOMES, RECIPES,
// BUILDINGS, TILE_TYPES) and downstream code already imported references to
// them. Reassigning the bindings would not propagate.

import { expandAbilitiesToEffects } from "./abilitiesAggregate.js";

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

/** Convert a legacy `hooks: [{ id, params }]` array into the new abilities shape. */
function hooksToAbilities(hooks) {
  if (!Array.isArray(hooks)) return [];
  const out = [];
  for (const h of hooks) {
    if (!h || typeof h !== "object") continue;
    const newId = LEGACY_HOOK_TO_ABILITY[h.id];
    if (!newId) continue;
    const params = { ...(h.params || {}) };
    // Param renames: pool_weight_boost / threshold_reduction used `target` already.
    out.push({ id: newId, params });
  }
  return out;
}

const BALANCE_DRAFT_KEY = "hearth.balance.draft";

/** Read the localStorage draft, if any. Safe in non-browser environments. */
export function readBalanceDraft() {
  try {
    if (typeof localStorage === "undefined") return null;
    const raw = localStorage.getItem(BALANCE_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch { return null; }
}

export function writeBalanceDraft(draft) {
  try {
    if (typeof localStorage === "undefined") return;
    if (draft == null) localStorage.removeItem(BALANCE_DRAFT_KEY);
    else localStorage.setItem(BALANCE_DRAFT_KEY, JSON.stringify(draft));
  } catch { /* storage unavailable */ }
}

/** Shallow-merge two override objects. Values from `b` win. */
export function mergeOverrides(a, b) {
  if (!a) return b || {};
  if (!b) return a || {};
  const out = { ...a };
  for (const k of Object.keys(b)) {
    const av = a[k];
    const bv = b[k];
    if (av && typeof av === "object" && !Array.isArray(av)
        && bv && typeof bv === "object" && !Array.isArray(bv)) {
      out[k] = { ...av, ...bv };
    } else {
      out[k] = bv;
    }
  }
  return out;
}

/** Apply numeric upgrade-threshold overrides in place. */
export function applyUpgradeThresholdOverrides(target, overrides) {
  if (!overrides || typeof overrides !== "object") return;
  for (const [key, value] of Object.entries(overrides)) {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 1) continue;
    target[key] = Math.floor(n);
  }
}

/**
 * Apply per-resource overrides to BIOMES.*.resources. Allowed fields:
 * label, color, dark, value, next, glyph, description.
 * The resource is patched in place across whichever biome it lives in.
 */
export function applyResourceOverrides(biomes, overrides) {
  if (!overrides || typeof overrides !== "object") return;
  for (const biomeKey of Object.keys(biomes)) {
    const list = biomes[biomeKey]?.resources;
    if (!Array.isArray(list)) continue;
    for (let i = 0; i < list.length; i++) {
      const r = list[i];
      const patch = overrides[r.key];
      if (!patch) continue;
      if (typeof patch.label === "string") r.label = patch.label;
      if (Number.isFinite(patch.color)) r.color = patch.color;
      if (Number.isFinite(patch.dark)) r.dark = patch.dark;
      if (Number.isFinite(patch.value)) r.value = patch.value;
      if (Object.prototype.hasOwnProperty.call(patch, "next")) {
        r.next = patch.next || null;
      }
      if (typeof patch.glyph === "string") r.glyph = patch.glyph;
      if (typeof patch.description === "string") r.description = patch.description;
    }
  }
}

/** Apply patches to RECIPES entries. Fields: name, inputs, tier, station,
 *  coins, glyph, color, dark, desc, output. */
export function applyRecipeOverrides(recipes, overrides) {
  if (!overrides || typeof overrides !== "object") return;
  for (const [key, patch] of Object.entries(overrides)) {
    const r = recipes[key];
    if (!r) continue;
    if (typeof patch.name === "string") r.name = patch.name;
    if (patch.inputs && typeof patch.inputs === "object") {
      // Replace inputs wholesale (rather than merge) so removed lines don't linger.
      const cleaned = {};
      for (const [resKey, qty] of Object.entries(patch.inputs)) {
        const n = Number(qty);
        if (Number.isFinite(n) && n > 0) cleaned[resKey] = Math.floor(n);
      }
      r.inputs = cleaned;
    }
    if (Number.isFinite(patch.tier)) r.tier = patch.tier;
    if (typeof patch.station === "string") r.station = patch.station;
    if (Number.isFinite(patch.coins)) r.coins = patch.coins;
    if (typeof patch.glyph === "string") r.glyph = patch.glyph;
    if (Number.isFinite(patch.color)) r.color = patch.color;
    if (Number.isFinite(patch.dark)) r.dark = patch.dark;
    if (typeof patch.desc === "string") r.desc = patch.desc;
    if (typeof patch.output === "string") r.output = patch.output;
  }
}

/** Apply patches to BUILDINGS entries (matched by id). Fields: name, desc,
 *  cost, lv, color, abilities. */
export function applyBuildingOverrides(buildings, overrides) {
  if (!overrides || typeof overrides !== "object") return;
  for (const b of buildings) {
    const patch = overrides[b.id];
    if (!patch) continue;
    if (typeof patch.name === "string") b.name = patch.name;
    if (typeof patch.desc === "string") b.desc = patch.desc;
    if (patch.cost && typeof patch.cost === "object") {
      const cleaned = {};
      for (const [k, v] of Object.entries(patch.cost)) {
        const n = Number(v);
        if (Number.isFinite(n) && n >= 0) cleaned[k] = Math.floor(n);
      }
      b.cost = cleaned;
    }
    if (Number.isFinite(patch.lv)) b.lv = patch.lv;
    if (typeof patch.color === "string") b.color = patch.color;
    // Abilities replace wholesale (rather than merge) so designers can
    // remove an ability by leaving it out of the override.
    if (Array.isArray(patch.abilities)) {
      b.abilities = patch.abilities.filter((a) => a && typeof a === "object" && typeof a.id === "string");
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
export function applyTileOverrides(tileTypes, overrides) {
  if (!tileTypes || !Array.isArray(tileTypes)) return;
  const powers = overrides?.tilePowers || {};
  const unlocks = overrides?.tileUnlocks || {};
  const descs = overrides?.tileDescriptions || {};

  for (const tile of tileTypes) {
    const id = tile.id;

    // Description.
    if (typeof descs[id] === "string") tile.description = descs[id];

    // Power hooks / abilities → replace tile.abilities and recompile tile.effects.
    // Legacy `hooks` arrays are translated into the new abilities shape.
    const powerPatch = powers[id];
    if (powerPatch) {
      let newAbilities = null;
      if (Array.isArray(powerPatch.abilities)) {
        newAbilities = powerPatch.abilities.filter(
          (a) => a && typeof a === "object" && typeof a.id === "string",
        );
      } else if (Array.isArray(powerPatch.hooks)) {
        // Legacy round-trip — translate hook ids to ability ids.
        newAbilities = hooksToAbilities(powerPatch.hooks);
      }
      if (newAbilities) {
        tile.abilities = newAbilities;
        // Strip prior hook/ability-derived fields and recompile from base.
        const base = stripHookDerivedFields(tile.effects || {});
        tile.effects = expandAbilitiesToEffects(newAbilities, base);
      }
    }

    // Per-tile produces-resource override. GameScene.nextResource consults
    // tile.effects.producesResource before applying the zone redirect or the
    // resource's native `.next`. Setting an empty string clears the override.
    if (powerPatch && Object.prototype.hasOwnProperty.call(powerPatch, "producesResource")) {
      const v = powerPatch.producesResource;
      tile.effects = { ...(tile.effects || {}) };
      if (typeof v === "string" && v.length > 0) {
        tile.effects.producesResource = v;
      } else {
        delete tile.effects.producesResource;
      }
    }

    // Unlock / discovery.
    const unlockPatch = unlocks[id];
    if (unlockPatch && typeof unlockPatch === "object") {
      tile.discovery = sanitizeDiscovery(unlockPatch, tile.discovery);
    }
  }
}

/**
 * Apply patches to ZONES entries (Phase 6, Balance Manager Zones tab).
 * Allowed fields per zone: startingTurns, entryCost.coins, upgradeMap,
 * seasonDrops. Each is whitelisted so unrelated keys can't bleed in.
 *
 * `upgradeMap` is replaced wholesale (rather than merged) so the designer
 * can clear an entry by leaving it absent. `seasonDrops` is merged
 * per-season so a partial patch only clobbers the named seasons.
 */
export function applyZoneOverrides(zones, overrides) {
  if (!overrides || typeof overrides !== "object") return;
  for (const [zoneId, patch] of Object.entries(overrides)) {
    const zone = zones[zoneId];
    if (!zone || !patch || typeof patch !== "object") continue;

    if (typeof patch.name === "string" && patch.name.length > 0) {
      zone.name = patch.name;
    }
    if (typeof patch.hasFarm === "boolean") zone.hasFarm = patch.hasFarm;
    if (typeof patch.hasMine === "boolean") zone.hasMine = patch.hasMine;
    if (typeof patch.hasWater === "boolean") zone.hasWater = patch.hasWater;
    if (Array.isArray(patch.buildings)) {
      zone.buildings = patch.buildings.filter((id) => typeof id === "string" && id.length > 0);
    }
    if (Number.isFinite(patch.startingTurns) && patch.startingTurns >= 1) {
      zone.startingTurns = Math.floor(patch.startingTurns);
    }
    if (patch.entryCost && typeof patch.entryCost === "object") {
      const coins = Number(patch.entryCost.coins);
      if (Number.isFinite(coins) && coins >= 0) {
        zone.entryCost = { ...(zone.entryCost ?? {}), coins: Math.floor(coins) };
      }
    }
    if (patch.upgradeMap && typeof patch.upgradeMap === "object") {
      const cleaned = {};
      for (const [src, target] of Object.entries(patch.upgradeMap)) {
        if (typeof target === "string" && target.length > 0) cleaned[src] = target;
      }
      zone.upgradeMap = cleaned;
    }
    if (patch.seasonDrops && typeof patch.seasonDrops === "object") {
      const out = { ...(zone.seasonDrops ?? {}) };
      for (const [seasonName, table] of Object.entries(patch.seasonDrops)) {
        if (!table || typeof table !== "object") continue;
        const cleaned = {};
        for (const [cat, pct] of Object.entries(table)) {
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
 * Apply patches to TYPE_WORKERS entries (Phase 6, Balance Manager Workers
 * tab), keyed by id. Whitelisted fields:
 *
 *   hireCost.coins, hireCost.coinsStep, hireCost.coinsMult — see
 *     `nextHireCost` in src/features/workers/data.js
 *   maxCount   — clamps the slider in WorkersPanel
 *   abilities  — replaced wholesale; an array of `{ id, params }` entries
 *                drawn from the unified abilities catalog
 *
 * Mutates the supplied workers array in place.
 */
export function applyWorkerOverrides(workers, overrides) {
  if (!Array.isArray(workers) || !overrides || typeof overrides !== "object") return;
  for (const w of workers) {
    const patch = overrides[w.id];
    if (!patch) continue;
    if (patch.hireCost && typeof patch.hireCost === "object") {
      const next = { ...(w.hireCost ?? {}) };

      // Explicit-null sentinel removes a ramp field entirely. Null must be
      // checked before any Number() coercion (Number(null) === 0).
      if (Object.prototype.hasOwnProperty.call(patch.hireCost, "coinsStep")
          && patch.hireCost.coinsStep === null) {
        delete next.coinsStep;
      } else if (patch.hireCost.coinsStep != null) {
        const step = Number(patch.hireCost.coinsStep);
        if (Number.isFinite(step) && step >= 0) next.coinsStep = step;
      }

      if (Object.prototype.hasOwnProperty.call(patch.hireCost, "coinsMult")
          && patch.hireCost.coinsMult === null) {
        delete next.coinsMult;
      } else if (patch.hireCost.coinsMult != null) {
        const mult = Number(patch.hireCost.coinsMult);
        if (Number.isFinite(mult) && mult > 0) next.coinsMult = mult;
      }

      if (patch.hireCost.coins != null) {
        const coins = Number(patch.hireCost.coins);
        if (Number.isFinite(coins) && coins >= 0) next.coins = Math.floor(coins);
      }

      w.hireCost = next;
    }
    if (Number.isFinite(patch.maxCount) && patch.maxCount >= 1) {
      w.maxCount = Math.floor(patch.maxCount);
    }
    if (Array.isArray(patch.abilities)) {
      // Replace wholesale — designers may swap or remove abilities.
      w.abilities = patch.abilities.filter((a) => a && typeof a === "object" && typeof a.id === "string");
    }
  }
}

const HOOK_DERIVED_FIELDS = new Set([
  "freeMoves", "freeMovesIfChain", "coinBonusFlat", "coinBonusPerTile",
  "thresholdReduce", "hooks", "abilities",
]);

function stripHookDerivedFields(effects) {
  const out = {};
  for (const k of Object.keys(effects)) {
    if (!HOOK_DERIVED_FIELDS.has(k)) out[k] = effects[k];
  }
  return out;
}

function sanitizeDiscovery(patch, prev) {
  const method = patch.method || prev?.method || "default";
  switch (method) {
    case "default":
      return { method: "default" };
    case "chain": {
      const chainLengthOf = patch.chainLengthOf || prev?.chainLengthOf;
      const chainLength = Number.isFinite(patch.chainLength)
        ? patch.chainLength
        : (prev?.chainLength ?? 6);
      return { method: "chain", chainLengthOf, chainLength };
    }
    case "research": {
      const researchOf = patch.researchOf || prev?.researchOf;
      const researchAmount = Number.isFinite(patch.researchAmount)
        ? patch.researchAmount
        : (prev?.researchAmount ?? 30);
      return { method: "research", researchOf, researchAmount };
    }
    case "buy": {
      const coinCost = Number.isFinite(patch.coinCost)
        ? patch.coinCost
        : (prev?.coinCost ?? 100);
      return { method: "buy", coinCost };
    }
    default:
      return prev || { method: "default" };
  }
}
