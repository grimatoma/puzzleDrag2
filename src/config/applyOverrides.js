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
 * Apply per-item overrides to ITEMS. Allowed fields:
 * label, color, dark, value, next, glyph, description, effect, target, anim, ms, desc
 * The item is patched in place.
 */
export function applyItemOverrides(items, overrides) {
  if (!overrides || typeof overrides !== "object") return;
  for (const [key, patch] of Object.entries(overrides)) {
    const item = items[key];
    if (!item) continue;
    if (typeof patch.label === "string") item.label = patch.label;
    if (Number.isFinite(patch.color)) item.color = patch.color;
    if (Number.isFinite(patch.dark)) item.dark = patch.dark;
    if (Number.isFinite(patch.value)) item.value = patch.value;
    if (Object.prototype.hasOwnProperty.call(patch, "next")) {
      item.next = patch.next || null;
    }
    if (typeof patch.glyph === "string") item.glyph = patch.glyph;
    if (typeof patch.description === "string") item.description = patch.description;
    if (typeof patch.desc === "string") item.desc = patch.desc;
    if (typeof patch.effect === "string") item.effect = patch.effect;
    if (typeof patch.target === "string") item.target = patch.target;
    if (typeof patch.anim === "string") item.anim = patch.anim;
    if (Number.isFinite(patch.ms)) item.ms = patch.ms;
  }
}

/**
 * Legacy compat — applyResourceOverrides patches BIOMES.*.resources entries.
 * The new code uses applyItemOverrides on the ITEMS dict, but some tests
 * still call this on the old { farm: { resources: [...] } } shape.
 */
export function applyResourceOverrides(biomes, overrides) {
  if (!overrides || typeof overrides !== "object") return;
  for (const b of Object.values(biomes)) {
    if (!Array.isArray(b.resources)) continue;
    for (const r of b.resources) {
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

/** Apply patches to RECIPES entries. Fields: item, inputs, tier, station, coins. */
export function applyRecipeOverrides(recipes, overrides) {
  if (!overrides || typeof overrides !== "object") return;
  for (const [key, patch] of Object.entries(overrides)) {
    const r = recipes[key];
    if (!r) continue;
    if (typeof patch.item === "string") r.item = patch.item;
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
    // Legacy compat: coins can be patched directly on the recipe object.
    if (Number.isFinite(patch.coins)) r.coins = patch.coins;
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

/**
 * Apply patches to the KEEPERS table (Phase 6, Balance Manager Keepers tab),
 * keyed by settlement type ('farm' | 'mine' | 'harbor'). Whitelisted fields:
 *   name, title, icon, appearsAfterBuildings,
 *   intro (array of strings — replaced wholesale),
 *   coexist/driveout: { label, pitch (array), embers, coreIngots }
 * Mutates the supplied keepers object in place.
 */
export function applyKeeperOverrides(keepers, overrides) {
  if (!keepers || !overrides || typeof overrides !== "object") return;
  const strArray = (v) => (Array.isArray(v) ? v.map((x) => String(x)).filter((s) => s.length > 0) : null);
  const patchPath = (target, patch) => {
    if (!target || !patch || typeof patch !== "object") return;
    if (typeof patch.label === "string") target.label = patch.label;
    const pitch = strArray(patch.pitch);
    if (pitch) target.pitch = pitch;
    if (Number.isFinite(patch.embers) && patch.embers >= 0) target.embers = Math.floor(patch.embers);
    if (Number.isFinite(patch.coreIngots) && patch.coreIngots >= 0) target.coreIngots = Math.floor(patch.coreIngots);
  };
  for (const [type, patch] of Object.entries(overrides)) {
    const k = keepers[type];
    if (!k || !patch || typeof patch !== "object") continue;
    if (typeof patch.name === "string") k.name = patch.name;
    if (typeof patch.title === "string") k.title = patch.title;
    if (typeof patch.icon === "string") k.icon = patch.icon;
    if (Number.isFinite(patch.appearsAfterBuildings) && patch.appearsAfterBuildings >= 0) {
      k.appearsAfterBuildings = Math.floor(patch.appearsAfterBuildings);
    }
    const intro = strArray(patch.intro);
    if (intro) k.intro = intro;
    if (patch.coexist) patchPath(k.coexist, patch.coexist);
    if (patch.driveout) patchPath(k.driveout, patch.driveout);
  }
}

/**
 * Apply patches to the expedition-ration tables (Phase 6, Balance Manager
 * Expedition Rations tab). `overrides`:
 *   { foodTurns: { <foodKey>: turns }, meatFoods: [<foodKey>...] }
 * `foodTurns` is merged (so existing keys can be tuned and new keys added);
 * `meatFoods`, if an array, replaces wholesale. Mutates both targets in place.
 */
export function applyExpeditionOverrides(foodTurns, meatFoods, overrides) {
  if (!overrides || typeof overrides !== "object") return;
  if (overrides.foodTurns && typeof overrides.foodTurns === "object" && foodTurns) {
    for (const [key, val] of Object.entries(overrides.foodTurns)) {
      const n = Number(val);
      if (typeof key === "string" && key.length > 0 && Number.isFinite(n) && n >= 0) foodTurns[key] = Math.floor(n);
    }
  }
  if (Array.isArray(overrides.meatFoods) && Array.isArray(meatFoods)) {
    const cleaned = overrides.meatFoods.filter((k) => typeof k === "string" && k.length > 0);
    meatFoods.length = 0;
    meatFoods.push(...cleaned);
  }
}

/**
 * Apply patches to the SETTLEMENT_BIOMES table (Phase 6, Balance Manager
 * Settlement Biomes tab), keyed by type then biome id:
 *   { farm: { prairie: { name, icon, hazards: [a, b], bonus } }, mine: {...}, harbor: {...} }
 * Each matched biome is patched in place (hazards replace wholesale).
 */
export function applyBiomeOverrides(settlementBiomes, overrides) {
  if (!settlementBiomes || !overrides || typeof overrides !== "object") return;
  for (const [type, byId] of Object.entries(overrides)) {
    const list = settlementBiomes[type];
    if (!Array.isArray(list) || !byId || typeof byId !== "object") continue;
    for (const [biomeId, patch] of Object.entries(byId)) {
      const b = list.find((x) => x.id === biomeId);
      if (!b || !patch || typeof patch !== "object") continue;
      if (typeof patch.name === "string" && patch.name.length > 0) b.name = patch.name;
      if (typeof patch.icon === "string" && patch.icon.length > 0) b.icon = patch.icon;
      if (typeof patch.bonus === "string" && patch.bonus.length > 0) b.bonus = patch.bonus;
      if (Array.isArray(patch.hazards)) {
        const cleaned = patch.hazards.filter((h) => typeof h === "string" && h.length > 0);
        if (cleaned.length > 0) b.hazards = cleaned;
      }
    }
  }
}

/**
 * Validate the Balance Manager "Tuning" section (loose top-level constants).
 * Returns a clean object containing only the keys that passed validation; the
 * caller (constants.js / zones/data.js) reassigns the matching `export let`s.
 *   maxTurns, auditBossCooldownDays, craftQueueHours, craftGemSkipCost,
 *   minExpeditionTurns, foundingBaseCoins  — positive integers
 *   foundingGrowth                         — positive number
 *   homeBiome                              — non-empty string
 */
export function sanitizeTuning(o) {
  const out = {};
  if (!o || typeof o !== "object") return out;
  const posInt = (v) => (Number.isFinite(Number(v)) && Number(v) >= 1 ? Math.floor(Number(v)) : undefined);
  const intFields = {
    maxTurns: "maxTurns", auditBossCooldownDays: "auditBossCooldownDays",
    craftQueueHours: "craftQueueHours", craftGemSkipCost: "craftGemSkipCost",
    minExpeditionTurns: "minExpeditionTurns", foundingBaseCoins: "foundingBaseCoins",
  };
  for (const k of Object.keys(intFields)) {
    const n = posInt(o[k]);
    if (n !== undefined) out[k] = n;
  }
  // craftGemSkipCost may be 0 (free skip); allow it explicitly.
  if (Number.isFinite(Number(o.craftGemSkipCost)) && Number(o.craftGemSkipCost) >= 0) {
    out.craftGemSkipCost = Math.floor(Number(o.craftGemSkipCost));
  }
  if (Number.isFinite(Number(o.foundingGrowth)) && Number(o.foundingGrowth) > 0) out.foundingGrowth = Number(o.foundingGrowth);
  if (typeof o.homeBiome === "string" && o.homeBiome.length > 0) out.homeBiome = o.homeBiome;
  return out;
}

/**
 * Apply patches to NPC data (Phase 6, Balance Manager NPCs tab). `overrides`:
 *   { byId: { <npcId>: { displayName, loves: [itemKey], likes: [itemKey] } },
 *     bands: [ { name, modifier }, ... ]   (positional — matches BOND_BANDS) }
 * `loves`/`likes` replace wholesale; `favoriteGift` is re-derived from
 * `loves[0]`. Band `lo`/`hi` ranges are intentionally not editable. Mutates the
 * passed-in `npcData` / `bondBands` in place.
 */
export function applyNpcOverrides(npcData, bondBands, overrides) {
  if (!overrides || typeof overrides !== "object") return;
  const strArr = (v) => (Array.isArray(v) ? v.filter((x) => typeof x === "string" && x.length > 0) : null);
  if (overrides.byId && typeof overrides.byId === "object" && npcData) {
    for (const [id, patch] of Object.entries(overrides.byId)) {
      const d = npcData[id];
      if (!d || !patch || typeof patch !== "object") continue;
      if (typeof patch.displayName === "string" && patch.displayName.length > 0) d.displayName = patch.displayName;
      const loves = strArr(patch.loves); if (loves) d.loves = loves;
      const likes = strArr(patch.likes); if (likes) d.likes = likes;
      if (Array.isArray(d.loves) && d.loves.length > 0) d.favoriteGift = d.loves[0];
    }
  }
  if (Array.isArray(overrides.bands) && Array.isArray(bondBands)) {
    overrides.bands.forEach((patch, i) => {
      const band = bondBands[i];
      if (!band || !patch || typeof patch !== "object") return;
      if (typeof patch.name === "string" && patch.name.length > 0) band.name = patch.name;
      const m = Number(patch.modifier);
      if (Number.isFinite(m) && m > 0) band.modifier = m;
    });
  }
}

// ─── Story-beat sanitizers ───────────────────────────────────────────────────
// Shared by applyStoryOverrides and the /story/ editor's draft schema.

/** A story flag list value: trims, drops blanks, collapses a 1-element array to a string. */
function sanitizeFlagList(v) {
  const arr = Array.isArray(v) ? v : (typeof v === "string" ? [v] : []);
  const clean = [];
  for (const s of arr) {
    if (typeof s !== "string") continue;
    const t = s.trim();
    if (t.length > 0 && !clean.includes(t)) clean.push(t);
  }
  if (clean.length === 0) return null;
  return clean.length === 1 ? clean[0] : clean;
}

/** Normalised dialogue line list, or undefined if empty. */
export function sanitizeBeatLines(raw) {
  if (!Array.isArray(raw)) return undefined;
  const cleaned = raw
    .filter((l) => l && typeof l === "object" && typeof l.text === "string" && l.text.length > 0)
    .map((l) => ({ speaker: (typeof l.speaker === "string" && l.speaker.length > 0) ? l.speaker : null, text: l.text }));
  return cleaned.length > 0 ? cleaned : undefined;
}

/**
 * Whitelist a choice `outcome` to the keys the editor exposes:
 *   setFlag / clearFlag (string | string[]), bondDelta { npc, amount },
 *   embers / coreIngots / gems (int), queueBeat (string).
 * Returns undefined if nothing survives.
 */
export function sanitizeChoiceOutcome(raw) {
  if (!raw || typeof raw !== "object") return undefined;
  const out = {};
  const sf = sanitizeFlagList(raw.setFlag); if (sf) out.setFlag = sf;
  const cf = sanitizeFlagList(raw.clearFlag); if (cf) out.clearFlag = cf;
  if (raw.bondDelta && typeof raw.bondDelta === "object" && typeof raw.bondDelta.npc === "string" && raw.bondDelta.npc.length > 0) {
    const amt = Number(raw.bondDelta.amount);
    if (Number.isFinite(amt) && amt !== 0) out.bondDelta = { npc: raw.bondDelta.npc, amount: amt };
  }
  for (const k of ["embers", "coreIngots", "gems"]) {
    const n = Number(raw[k]);
    if (Number.isFinite(n) && n !== 0) out[k] = Math.trunc(n);
  }
  if (typeof raw.queueBeat === "string" && raw.queueBeat.trim().length > 0) out.queueBeat = raw.queueBeat.trim();
  return Object.keys(out).length === 0 ? undefined : out;
}

/** Sanitised choice list (array form): `[{ id, label, outcome? }]`. */
export function sanitizeChoiceArray(raw) {
  if (!Array.isArray(raw)) return null;
  const out = [];
  const seen = new Set();
  raw.forEach((c, i) => {
    if (!c || typeof c !== "object") return;
    let id = (typeof c.id === "string" && c.id.trim().length > 0) ? c.id.trim() : `choice_${i + 1}`;
    if (seen.has(id)) id = `${id}_${i + 1}`;
    seen.add(id);
    const choice = { id, label: (typeof c.label === "string" && c.label.length > 0) ? c.label : "Continue" };
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
export function sanitizeTrigger(raw) {
  if (!raw || typeof raw !== "object" || typeof raw.type !== "string") return undefined;
  const posInt = (v) => { const n = Number(v); return Number.isFinite(n) && n > 0 ? Math.trunc(n) : null; };
  const str = (v) => (typeof v === "string" && v.trim().length > 0 ? v.trim() : null);
  switch (raw.type) {
    case "session_start":
    case "session_ended":
    case "all_buildings_built":
      return { type: raw.type };
    case "act_entered": {
      const act = posInt(raw.act); return act ? { type: "act_entered", act } : undefined;
    }
    case "resource_total": {
      const key = str(raw.key), amount = posInt(raw.amount);
      return key && amount ? { type: "resource_total", key, amount } : undefined;
    }
    case "resource_total_multi": {
      if (!raw.req || typeof raw.req !== "object") return undefined;
      const req = {};
      for (const [k, v] of Object.entries(raw.req)) { const a = posInt(v); if (str(k) && a) req[k] = a; }
      return Object.keys(req).length > 0 ? { type: "resource_total_multi", req } : undefined;
    }
    case "craft_made": {
      const item = str(raw.item); if (!item) return undefined;
      const count = posInt(raw.count); return count ? { type: "craft_made", item, count } : { type: "craft_made", item };
    }
    case "building_built": {
      const id = str(raw.id); return id ? { type: "building_built", id } : undefined;
    }
    case "boss_defeated": {
      const id = str(raw.id); return id ? { type: "boss_defeated", id } : undefined;
    }
    case "bond_at_least": {
      const npc = str(raw.npc), amount = posInt(raw.amount);
      return npc && amount ? { type: "bond_at_least", npc, amount } : undefined;
    }
    case "flag_set":
    case "flag_cleared": {
      const flag = str(raw.flag); return flag ? { type: raw.type, flag } : undefined;
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
export function sanitizeBeatRepeat(raw) {
  return raw === true ? true : undefined;
}

/** Sanitised array of flag triggers (drops bad entries). */
export function sanitizeFlagTriggerArray(raw) {
  if (!Array.isArray(raw)) return undefined;
  const out = [];
  for (const t of raw) { const s = sanitizeFlagTrigger(t); if (s) out.push(s); }
  return out;
}

/** Sanitised `onComplete` — only `setFlag` is editable from the /story/ editor. */
export function sanitizeBeatOnComplete(raw) {
  if (!raw || typeof raw !== "object") return undefined;
  const sf = sanitizeFlagList(raw.setFlag);
  return sf ? { setFlag: sf } : undefined;
}

/**
 * Apply patches to story beats (Balance Manager / `/story/` editor). `overrides`:
 *   {
 *     newBeats: [ { id, title, scene?, body?|lines?, choices?, trigger?, onComplete? } ],
 *     beats:    { <beatId>: { title?, scene?, body?, lines?,
 *                             choices?: { <choiceId>: { label } } | [ { id, label, outcome? } ],
 *                             trigger?, onComplete? } }
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
export function applyStoryOverrides(storyBeats, sideBeats, overrides) {
  if (!overrides || typeof overrides !== "object") return;
  const story = Array.isArray(storyBeats) ? storyBeats : [];
  const side = Array.isArray(sideBeats) ? sideBeats : [];

  // 1 — author-created beats (always side beats).
  if (Array.isArray(overrides.newBeats)) {
    const taken = new Set([...story, ...side].map((b) => b && b.id).filter(Boolean));
    for (const raw of overrides.newBeats) {
      if (!raw || typeof raw !== "object") continue;
      const id = typeof raw.id === "string" ? raw.id.trim() : "";
      if (!id || taken.has(id)) continue;
      taken.add(id);
      const beat = { id, side: true, draft: true };
      beat.title = (typeof raw.title === "string" && raw.title.length > 0) ? raw.title : id;
      if (typeof raw.scene === "string" && raw.scene.length > 0) beat.scene = raw.scene;
      const lines = sanitizeBeatLines(raw.lines);
      if (lines) beat.lines = lines;
      else if (typeof raw.body === "string" && raw.body.length > 0) beat.body = raw.body;
      const choices = sanitizeChoiceArray(raw.choices);
      if (choices && choices.length > 0) beat.choices = choices;
      const trigger = sanitizeBeatTrigger(raw.trigger);
      if (trigger) beat.trigger = trigger;
      if (sanitizeBeatRepeat(raw.repeat)) beat.repeat = true;
      const onComplete = sanitizeBeatOnComplete(raw.onComplete);
      if (onComplete) beat.onComplete = onComplete;
      side.push(beat);
    }
  }

  // 2 — patch existing / just-created beats.
  if (overrides.beats && typeof overrides.beats === "object") {
    const all = [...story, ...side];
    for (const [beatId, patch] of Object.entries(overrides.beats)) {
      const beat = all.find((b) => b && b.id === beatId);
      if (!beat || !patch || typeof patch !== "object") continue;
      if (typeof patch.title === "string" && patch.title.length > 0) beat.title = patch.title;
      if (typeof patch.scene === "string") beat.scene = patch.scene.length > 0 ? patch.scene : undefined;
      if (typeof patch.body === "string") beat.body = patch.body.length > 0 ? patch.body : undefined;
      if (Array.isArray(patch.lines)) beat.lines = sanitizeBeatLines(patch.lines);
      if (Array.isArray(patch.choices)) {
        const arr = sanitizeChoiceArray(patch.choices);
        beat.choices = (arr && arr.length > 0) ? arr : undefined;
      } else if (patch.choices && typeof patch.choices === "object" && Array.isArray(beat.choices)) {
        for (const [choiceId, cp] of Object.entries(patch.choices)) {
          const ch = beat.choices.find((c) => c && c.id === choiceId);
          if (ch && cp && typeof cp.label === "string" && cp.label.length > 0) ch.label = cp.label;
        }
      }
      if (patch.trigger) { const t = sanitizeBeatTrigger(patch.trigger); if (t) beat.trigger = t; }
      if (Object.prototype.hasOwnProperty.call(patch, "repeat")) {
        if (sanitizeBeatRepeat(patch.repeat)) beat.repeat = true; else delete beat.repeat;
      }
      if (Object.prototype.hasOwnProperty.call(patch, "onComplete")) {
        const oc = sanitizeBeatOnComplete(patch.onComplete);
        if (oc) beat.onComplete = { ...(beat.onComplete || {}), ...oc };
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
export function applyFlagOverrides(flags, overrides) {
  if (!Array.isArray(flags) || !overrides || typeof overrides !== "object") return;
  const patchOne = (def, patch) => {
    if (!def || !patch || typeof patch !== "object") return;
    if (typeof patch.label === "string" && patch.label.length > 0) def.label = patch.label;
    if (typeof patch.description === "string") def.description = patch.description;
    if (typeof patch.category === "string" && FLAG_CATEGORY_KEYS.has(patch.category)) def.category = patch.category;
    if (typeof patch.default === "boolean") def.default = patch.default;
    if ("triggers" in patch) { const t = sanitizeFlagTriggerArray(patch.triggers); if (t) def.triggers = t; }
    if (!Array.isArray(def.triggers)) def.triggers = [];
  };
  if (overrides.byId && typeof overrides.byId === "object") {
    for (const [id, patch] of Object.entries(overrides.byId)) {
      const def = flags.find((f) => f && f.id === id);
      if (def) patchOne(def, patch);
    }
  }
  if (Array.isArray(overrides.new)) {
    const taken = new Set(flags.map((f) => f && f.id).filter(Boolean));
    for (const raw of overrides.new) {
      if (!raw || typeof raw !== "object") continue;
      const id = typeof raw.id === "string" ? raw.id.trim() : "";
      if (!id || taken.has(id)) continue;
      taken.add(id);
      const def = { id, label: (typeof raw.label === "string" && raw.label.length > 0) ? raw.label : id,
        category: "misc", default: false, source: "override", triggers: [] };
      patchOne(def, raw);
      flags.push(def);
    }
  }
}

/**
 * Apply patches to BOSSES entries (Phase 6, Balance Manager Bosses tab), by id.
 * Editable: name, season, description, modifierDescription, targetAmount
 * (→ target.amount). The modifier type/params drive board logic — left alone.
 */
export function applyBossOverrides(bosses, overrides) {
  if (!Array.isArray(bosses) || !overrides || typeof overrides !== "object") return;
  for (const b of bosses) {
    const patch = overrides[b.id];
    if (!patch || typeof patch !== "object") continue;
    if (typeof patch.name === "string" && patch.name.length > 0) b.name = patch.name;
    if (typeof patch.season === "string" && patch.season.length > 0) b.season = patch.season;
    if (typeof patch.description === "string") b.description = patch.description;
    if (typeof patch.modifierDescription === "string") b.modifierDescription = patch.modifierDescription;
    const ta = Number(patch.targetAmount);
    if (Number.isFinite(ta) && ta >= 1) b.target = { ...(b.target ?? {}), amount: Math.floor(ta) };
  }
}

/**
 * Apply patches to ACHIEVEMENTS entries (Phase 6, Balance Manager Achievements
 * tab), by id. Editable: name, desc, threshold, target, rewardCoins
 * (→ reward.coins). The `counter` it watches is left alone.
 */
export function applyAchievementOverrides(achievements, overrides) {
  if (!Array.isArray(achievements) || !overrides || typeof overrides !== "object") return;
  for (const a of achievements) {
    const patch = overrides[a.id];
    if (!patch || typeof patch !== "object") continue;
    if (typeof patch.name === "string" && patch.name.length > 0) a.name = patch.name;
    if (typeof patch.desc === "string") a.desc = patch.desc;
    const th = Number(patch.threshold), tg = Number(patch.target), rc = Number(patch.rewardCoins);
    if (Number.isFinite(th) && th >= 1) a.threshold = Math.floor(th);
    if (Number.isFinite(tg) && tg >= 1) a.target = Math.floor(tg);
    if (Number.isFinite(rc) && rc >= 0) a.reward = { ...(a.reward ?? {}), coins: Math.floor(rc) };
  }
}

/**
 * Apply patches to DAILY_REWARDS entries (Phase 6, Balance Manager Daily
 * Rewards tab), keyed by day number. Editable: coins, runes (added if absent).
 * Tool / unlockTile drops are left alone.
 */
export function applyDailyRewardOverrides(dailyRewards, overrides) {
  if (!dailyRewards || typeof dailyRewards !== "object" || !overrides || typeof overrides !== "object") return;
  for (const [day, patch] of Object.entries(overrides)) {
    const entry = dailyRewards[day];
    if (!entry || typeof entry !== "object" || !patch || typeof patch !== "object") continue;
    if ("coins" in patch) { const n = Number(patch.coins); if (Number.isFinite(n) && n >= 0) entry.coins = Math.floor(n); }
    if ("runes" in patch) { const n = Number(patch.runes); if (Number.isFinite(n) && n >= 0) entry.runes = Math.floor(n); }
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
